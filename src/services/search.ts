import type { PluginBase, Platform } from '@/types'
import { useAppStore } from '@/store'
import { searchSpiget } from './spiget'
import { searchHangar } from './hangar'
import { searchModrinth } from './modrinth'

export interface SearchAllOptions {
  onError?: (platform: Platform, error: unknown) => void
}

/**
 * 各平台的分页参数语义不同：Spigot 是 1 基页码，Hangar/Modrinth 是 0 基页码。
 */
export function getPlatformPage(platform: Platform, page: number): number {
  return platform === 'spigot' ? page : page - 1
}

// 统一搜索：并发查询所有启用的平台
export async function searchAll(
  query: string,
  page = 1,
  size = 10,
  options: SearchAllOptions = {},
): Promise<PluginBase[]> {
  const platforms = useAppStore.getState().enabledPlatforms
  const results: PluginBase[] = []

  const run = (platform: Platform, promise: Promise<PluginBase[]>): Promise<PluginBase[]> =>
    promise.catch((error) => {
      options.onError?.(platform, error)
      return []
    })

  const promises: Promise<PluginBase[]>[] = []

  if (platforms.includes('spigot')) {
    promises.push(run('spigot', searchSpiget(query, getPlatformPage('spigot', page), size)))
  }
  if (platforms.includes('hangar')) {
    promises.push(run('hangar', searchHangar(query, getPlatformPage('hangar', page), size)))
  }
  if (platforms.includes('modrinth')) {
    promises.push(run('modrinth', searchModrinth(query, getPlatformPage('modrinth', page), size)))
  }

  const allResults = await Promise.all(promises)
  for (const r of allResults) {
    results.push(...r)
  }

  // 按下载量排序
  results.sort((a, b) => b.downloads - a.downloads)

  return results
}

// 格式化下载量
export function formatDownloads(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

// 格式化评分为星星
export function formatRating(rating?: number): number {
  if (!rating) return 0
  return Math.round(rating * 10) / 10
}

// 获取平台颜色
export function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'spigot': return 'bg-spigot'
    case 'hangar': return 'bg-hangar'
    case 'modrinth': return 'bg-modrinth'
  }
}

// 获取平台名称
export function getPlatformName(platform: Platform): string {
  switch (platform) {
    case 'spigot': return 'Spigot'
    case 'hangar': return 'Hangar'
    case 'modrinth': return 'Modrinth'
  }
}
