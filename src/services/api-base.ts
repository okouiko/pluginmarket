import { useAppStore } from '@/store'
import type { Platform } from '@/types'

// ============ 缓存分类 ============
export type CacheType = 'search' | 'popular' | 'detail' | 'version' | 'meta'

export interface CacheTypeConfig {
  ttl: number
  enabled: boolean
  label: string
  desc: string
}

export const DEFAULT_CACHE_CONFIG: Record<CacheType, CacheTypeConfig> = {
  search:  { ttl: 2 * 60 * 1000,          enabled: true, label: '搜索结果',  desc: '关键词搜索的插件列表（2 分钟）' },
  popular: { ttl: 10 * 60 * 1000,         enabled: true, label: '热门列表',  desc: '首页热门/推荐插件（10 分钟）' },
  detail:  { ttl: 30 * 60 * 1000,         enabled: true, label: '插件详情',  desc: '插件描述、评分、作者（30 分钟）' },
  version: { ttl: 15 * 60 * 1000,         enabled: true, label: '版本历史',  desc: '版本列表 + changelog（15 分钟）' },
  meta:    { ttl: 2 * 60 * 60 * 1000,     enabled: true, label: '元数据',    desc: '分类标签、作者信息（2 小时）' },
}

const LS_CACHE_PREFIX = 'mc-cache-v1:'
const STALE_WINDOW = 24 * 60 * 60 * 1000

interface CacheEntry {
  data: unknown
  savedAt: number
  expiresAt: number
  staleUntil: number
  type: CacheType
  size: number
}

const MEM_CACHE = new Map<string, CacheEntry>()
const INFLIGHT = new Map<string, Promise<unknown>>()

function loadFromStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(LS_CACHE_PREFIX)) continue
      try {
        const raw = localStorage.getItem(key)!
        const entry = JSON.parse(raw) as CacheEntry
        if (entry.expiresAt + STALE_WINDOW < Date.now()) { localStorage.removeItem(key); continue }
        const id = key.slice(LS_CACHE_PREFIX.length)
        MEM_CACHE.set(id, entry)
      } catch { localStorage.removeItem(key) }
    }
  } catch { /* ignore */ }
}
loadFromStorage()

function persist(key: string, entry: CacheEntry) {
  MEM_CACHE.set(key, entry)
  try { localStorage.setItem(LS_CACHE_PREFIX + key, JSON.stringify(entry)) } catch { /* quota */ }
}

function removePersisted(key: string) {
  MEM_CACHE.delete(key)
  try { localStorage.removeItem(LS_CACHE_PREFIX + key) } catch { /* ignore */ }
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  byType: Record<CacheType, { count: number; size: number }>
  expiredEntries: number
}

export function getCacheStats(): CacheStats {
  const r: CacheStats = {
    totalEntries: MEM_CACHE.size, totalSize: 0, expiredEntries: 0,
    byType: { search: { count: 0, size: 0 }, popular: { count: 0, size: 0 }, detail: { count: 0, size: 0 }, version: { count: 0, size: 0 }, meta: { count: 0, size: 0 } },
  }
  const now = Date.now()
  for (const e of MEM_CACHE.values()) {
    r.totalSize += e.size
    r.byType[e.type].count++; r.byType[e.type].size += e.size
    if (e.expiresAt < now) r.expiredEntries++
  }
  return r
}

export function evictExpiredCache() {
  const now = Date.now()
  for (const [k, e] of MEM_CACHE) if (e.expiresAt + STALE_WINDOW < now) removePersisted(k)
}

export function clearApiCache(type?: CacheType) {
  if (!type) { for (const k of Array.from(MEM_CACHE.keys())) removePersisted(k); INFLIGHT.clear(); return }
  for (const [k, e] of MEM_CACHE) if (e.type === type) removePersisted(k)
}

export function isTauri(): boolean { return !!(window as any).__TAURI__ }

function getBaseUrl(platform: Platform): string {
  const store = useAppStore.getState()
  const corsProxy = store.corsProxy
  const useCorsProxy = store.useCorsProxy ?? false

  if (isTauri()) {
    switch (platform) {
      case 'spigot': return 'https://api.spiget.org/v2'
      case 'hangar': return 'https://hangar.papermc.io/api/v1'
      case 'modrinth': return 'https://api.modrinth.com/v2'
    }
  }

  // 优先走相对路径 /api/xxx：
  //   DEV → vite proxy 转发
  //   Vercel PROD → vercel.json rewrite 转发（边缘节点去请求，不受 CORS 限制）
  //   GitHub Pages / 无 rewrite 的静态托管 → 设置里切换 corsProxy 绕过
  if (!useCorsProxy) {
    switch (platform) {
      case 'spigot': return '/api/spiget'
      case 'hangar': return '/api/hangar'
      case 'modrinth': return '/api/modrinth'
    }
  }

  // 最后 fallback：浏览器端 corsProxy
  switch (platform) {
    case 'spigot': return `${corsProxy}${encodeURIComponent('https://api.spiget.org/v2')}`
    case 'hangar': return `${corsProxy}${encodeURIComponent('https://hangar.papermc.io/api/v1')}`
    case 'modrinth': return `${corsProxy}${encodeURIComponent('https://api.modrinth.com/v2')}`
  }
}

function buildUrl(platform: Platform, path: string): string {
  const base = getBaseUrl(platform)
  if (!base.startsWith('http://') && !base.startsWith('https://')) return `${base}${path}`
  return `${base}${encodeURIComponent(path)}`
}

const FETCH_TIMEOUT = 12_000
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  finally { clearTimeout(timer) }
}

// ============ FetchOptions（第三参数统一入口）============
interface FetchOptions {
  /** 请求体（作为 RequestInit） */
  init?: RequestInit
  /** 缓存分类 */
  cacheType?: CacheType
  /** 跳过缓存 */
  skipCache?: boolean
  /** 强制刷新 */
  forceRefresh?: boolean
  /** cache key 后缀 */
  cacheKeySuffix?: string
}

// 兼容旧签名：第三参数也可以直接是 RequestInit
function normalizeOpts(optsOrInit?: FetchOptions | RequestInit): FetchOptions {
  if (!optsOrInit) return {}
  if (isRequestInit(optsOrInit)) return { init: optsOrInit }
  return optsOrInit as FetchOptions
}

function isRequestInit(obj: any): obj is RequestInit {
  if (!obj || typeof obj !== 'object') return false
  // RequestInit 的典型字段
  const initFields = ['method', 'headers', 'body', 'mode', 'credentials', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity', 'keepalive', 'signal', 'window']
  return initFields.some(f => f in obj)
}

async function apiFetchCore<T>(
  platform: Platform,
  path: string,
  parser: (res: Response) => Promise<T>,
  optsOrInit?: FetchOptions | RequestInit,
): Promise<T> {
  const opts = normalizeOpts(optsOrInit)
  const cacheType = opts.cacheType ?? 'detail'
  const store = useAppStore.getState()
  const typeConfig = (store.cacheByType as Record<string, CacheTypeConfig>)?.[cacheType] ?? DEFAULT_CACHE_CONFIG[cacheType]
  const cachingEnabled = (store.cacheEnabled ?? true) && typeConfig.enabled

  const url = buildUrl(platform, path)
  const key = url + (opts.cacheKeySuffix ?? '')
  const now = Date.now()

  if (!opts.skipCache) {
    const cached = MEM_CACHE.get(key)
    if (cached && cachingEnabled) {
      if (cached.expiresAt > now) return cached.data as T
      if (!opts.forceRefresh && cached.staleUntil > now) {
        silentRefresh(platform, path, parser, opts, key)
        return cached.data as T
      }
    }
  }

  const inflight = INFLIGHT.get(key)
  if (inflight) return inflight as Promise<T>

  const init: RequestInit = { ...opts.init, headers: { ...(opts.init?.headers ?? {}) } }
  const build = (accept: string) => ({ ...init, headers: { Accept: accept, ...init.headers } })

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(url, init)
      if (!res.ok) throw new Error(`API Error [${platform}] ${res.status} ${res.statusText}`)
      const data = await parser(res)

      if (cachingEnabled) {
        const serialized = JSON.stringify(data)
        persist(key, {
          data, savedAt: now, expiresAt: now + typeConfig.ttl,
          staleUntil: now + typeConfig.ttl + STALE_WINDOW,
          type: cacheType, size: new Blob([serialized]).size,
        })
      }
      return data
    } catch (err) {
      if (!opts.skipCache) {
        const cached = MEM_CACHE.get(key)
        if (cached && cached.staleUntil > now) {
          console.warn('[apiFetch] 网络失败，返回过期缓存:', platform, path.substring(0, 60))
          return cached.data as T
        }
      }
      console.error('[apiFetch]', platform, '失败:', (err as any)?.message || err, 'URL:', url.substring(0, 120))
      throw err
    } finally { INFLIGHT.delete(key) }
  })()

  INFLIGHT.set(key, promise)
  return promise
}

function silentRefresh<T>(platform: Platform, path: string, parser: (res: Response) => Promise<T>, opts: FetchOptions, key: string) {
  if (INFLIGHT.has(key)) return
  INFLIGHT.set(key, (async () => {
    try {
      const url = buildUrl(platform, path)
      const init: RequestInit = { ...opts.init, headers: { ...(opts.init?.headers ?? {}) } }
      const res = await fetchWithTimeout(url, init)
      if (!res.ok) return
      const data = await parser(res)
      const cacheType = opts.cacheType ?? 'detail'
      const store = useAppStore.getState()
      const typeConfig = (store.cacheByType as Record<string, CacheTypeConfig>)?.[cacheType] ?? DEFAULT_CACHE_CONFIG[cacheType]
      const now = Date.now()
      const serialized = JSON.stringify(data)
      persist(key, { data, savedAt: now, expiresAt: now + typeConfig.ttl, staleUntil: now + typeConfig.ttl + STALE_WINDOW, type: cacheType, size: new Blob([serialized]).size })
    } catch { /* ignore */ }
  })())
}

// ============ 公开 API ============
// 签名：apiFetch<T>(platform, path, optsOrInit?)
// optsOrInit 可以是 FetchOptions { init?, cacheType?, ... } 也可以直接是 RequestInit
async function apiFetch<T>(platform: Platform, path: string, optsOrInit?: FetchOptions | RequestInit): Promise<T> {
  return apiFetchCore(platform, path, (res) => res.json() as Promise<T>, optsOrInit)
}

async function apiFetchText(platform: Platform, path: string, optsOrInit?: FetchOptions | RequestInit): Promise<string> {
  const merged = normalizeOpts(optsOrInit)
  merged.cacheKeySuffix = ':text' + (merged.cacheKeySuffix ?? '')
  // text 类型：给默认 header
  if (!merged.init) merged.init = {}
  merged.init.headers = { Accept: 'text/plain', ...(merged.init.headers ?? {}) }
  return apiFetchCore(platform, path, (res) => res.text(), merged)
}

export { apiFetch, apiFetchText, getBaseUrl }
