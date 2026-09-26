import { useAppStore } from '@/store'
import type { Platform } from '@/types'

// ============ 内存层请求缓存（按 URL key，TTL 60s）============
interface CacheEntry {
  data: unknown
  expiresAt: number
}

const MEM_CACHE = new Map<string, CacheEntry>()
const CACHE_TTL = 60_000 // 60s
const INFLIGHT = new Map<string, Promise<unknown>>() // 并发去重

function cacheKey(url: string): string {
  return url
}

// ============ 检测运行环境 ============
export function isTauri(): boolean {
  return !!(window as any).__TAURI__
}

// ============ API 基础 URL ============
function getBaseUrl(platform: Platform): string {
  const store = useAppStore.getState()
  const corsProxy = store.corsProxy

  if (isTauri()) {
    switch (platform) {
      case 'spigot': return 'https://api.spiget.org/v2'
      case 'hangar': return 'https://hangar.papermc.io/api/v1'
      case 'modrinth': return 'https://api.modrinth.com/v2'
    }
  }

  // 开发模式：始终走 vite proxy（vite.config.ts 配置了 HttpsProxyAgent，
  // 沙箱环境下可以通过 HTTP_PROXY 正确访问外部 API；
  // 而 allorigins.win 等 CORS 代理的后端服务器访问 Hangar/Spigot 不通）
  if (import.meta.env.DEV) {
    switch (platform) {
      case 'spigot': return '/api/spiget'
      case 'hangar': return '/api/hangar'
      case 'modrinth': return '/api/modrinth'
    }
  }

  // 生产环境用 CORS 代理
  switch (platform) {
    case 'spigot': return `${corsProxy}${encodeURIComponent('https://api.spiget.org/v2')}`
    case 'hangar': return `${corsProxy}${encodeURIComponent('https://hangar.papermc.io/api/v1')}`
    case 'modrinth': return `${corsProxy}${encodeURIComponent('https://api.modrinth.com/v2')}`
  }
}

function buildUrl(platform: Platform, path: string): string {
  const base = getBaseUrl(platform)
  // vite proxy 或 tauri：base 已经是相对/完整基础路径，直接拼
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    return `${base}${path}`
  }
  // CORS 代理：base 里已经编码了目标基础路径，再把 path 拼上去重新编码
  // （CORS 代理格式是 proxy + encodeURIComponent(fullTargetUrl)）
  // 所以 base = proxy + encoded(完整目标基础URL)
  // path 还没被编码，直接拼在 base 后面即可，因为 base 里的 encoded URL 最后一段
  // 就是 "v2"，path 比如 "/search?...query=xxx" 直接拼在后面就是合法 URL
  return `${base}${encodeURIComponent(path)}`
}

// ============ 带超时的 fetch ============
const FETCH_TIMEOUT = 12_000 // 12s

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ============ 通用 fetch 封装（带缓存 + 并发去重）============
async function apiFetchCore<T>(
  platform: Platform,
  path: string,
  init: RequestInit | undefined,
  parser: (res: Response) => Promise<T>,
  cacheKeySuffix = ''
): Promise<T> {
  const url = buildUrl(platform, path)
  const key = cacheKey(url + cacheKeySuffix)

  // 1) 命中内存缓存
  const cached = MEM_CACHE.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }

  // 2) 并发去重：同 key 已经在飞，直接等那个 Promise
  const inflight = INFLIGHT.get(key)
  if (inflight) {
    return inflight as Promise<T>
  }

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(url, init)

      if (!res.ok) {
        throw new Error(`API Error [${platform}] ${res.status} ${res.statusText}`)
      }

      const data = await parser(res)
      // 3) 写入缓存
      MEM_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
      return data
    } catch (err) {
      console.error('[apiFetch]', platform, '失败:', (err as any)?.message || err, 'URL:', url.substring(0, 120))
      throw err
    } finally {
      INFLIGHT.delete(key)
    }
  })()

  INFLIGHT.set(key, promise)
  return promise
}

// JSON 版本（默认）
async function apiFetch<T>(platform: Platform, path: string, init?: RequestInit): Promise<T> {
  return apiFetchCore(
    platform,
    path,
    {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    },
    (res) => res.json() as Promise<T>
  )
}

// 纯文本版本（Hangar pages/main 返回 text/plain）
async function apiFetchText(platform: Platform, path: string, init?: RequestInit): Promise<string> {
  return apiFetchCore(
    platform,
    path,
    {
      ...init,
      headers: {
        Accept: 'text/plain',
        ...init?.headers,
      },
    },
    (res) => res.text(),
    ':text'
  )
}

// 手动清缓存（给刷新按钮用）
export function clearApiCache() {
  MEM_CACHE.clear()
  INFLIGHT.clear()
}

export { apiFetch, apiFetchText, getBaseUrl }
