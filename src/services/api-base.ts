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
  // 归一化：去掉 hash、query 里的动态时间戳等，保留核心路径+参数
  return url.split('?')[0] + '?' + (url.split('?')[1] ?? '')
}

// ============ 检测运行环境 ============
export function isTauri(): boolean {
  return !!(window as any).__TAURI__
}

// ============ API 基础 URL ============
function getBaseUrl(platform: Platform): string {
  if (isTauri()) {
    switch (platform) {
      case 'spigot': return 'https://api.spiget.org/v2'
      case 'hangar': return 'https://hangar.papermc.io/api/v1'
      case 'modrinth': return 'https://api.modrinth.com/v2'
    }
  }

  if (import.meta.env.DEV) {
    switch (platform) {
      case 'spigot': return '/api/spiget'
      case 'hangar': return '/api/hangar'
      case 'modrinth': return '/api/modrinth'
    }
  }

  // 生产环境用 CORS 代理
  const store = useAppStore.getState()
  const proxy = store.corsProxy
  switch (platform) {
    case 'spigot': return `${proxy}${encodeURIComponent('https://api.spiget.org/v2')}`
    case 'hangar': return `${proxy}${encodeURIComponent('https://hangar.papermc.io/api/v1')}`
    case 'modrinth': return `${proxy}${encodeURIComponent('https://api.modrinth.com/v2')}`
  }
}

function buildUrl(platform: Platform, path: string): string {
  const base = getBaseUrl(platform)
  if (import.meta.env.DEV || isTauri()) {
    return `${base}${path}`
  }
  // 生产 CORS 代理模式：把完整 URL 编码进 proxy
  const directUrls: Record<Platform, string> = {
    spigot: 'https://api.spiget.org/v2',
    hangar: 'https://hangar.papermc.io/api/v1',
    modrinth: 'https://api.modrinth.com/v2',
  }
  const store = useAppStore.getState()
  return `${store.corsProxy}${encodeURIComponent(directUrls[platform] + path)}`
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
async function apiFetch<T>(platform: Platform, path: string, init?: RequestInit): Promise<T> {
  const url = buildUrl(platform, path)
  const key = cacheKey(url)

  // 1) 命中内存缓存
  const cached = MEM_CACHE.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }

  // 2) 并发去重：同 key 已经在飞，直接等那个 Promise
  const inflight = INFLIGHT.get(key)
  if (inflight) return inflight as Promise<T>

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(url, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...init?.headers,
        },
      })

      if (!res.ok) {
        throw new Error(`API Error [${platform}] ${res.status} ${res.statusText}`)
      }

      const data = await res.json()
      // 3) 写入缓存
      MEM_CACHE.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
      return data as T
    } finally {
      INFLIGHT.delete(key)
    }
  })()

  INFLIGHT.set(key, promise)
  return promise
}

// 手动清缓存（给刷新按钮用）
export function clearApiCache() {
  MEM_CACHE.clear()
  INFLIGHT.clear()
}

export { apiFetch, getBaseUrl }
