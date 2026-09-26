import { apiFetch } from './api-base'
import type { PluginBase, HangarProject, HangarSearchResult } from '@/types'

function toPluginBase(p: HangarProject): PluginBase {
  return {
    id: `hangar-${p.namespace.owner}-${p.namespace.slug}`,
    platformId: `${p.namespace.owner}/${p.namespace.slug}`,
    platform: 'hangar',
    name: p.name,
    tag: p.description,
    author: p.namespace.owner,
    authorId: p.namespace.owner,
    icon: p.avatarUrl,
    rating: undefined, // Hangar 用 stars 代替
    downloads: p.stats.downloads,
    categories: [p.category, ...(p.settings?.tags || [])],
    lastUpdate: new Date(p.lastUpdated).getTime(),
    sourceUrl: `https://hangar.papermc.io/${p.namespace.owner}/${p.namespace.slug}`,
  }
}

export async function searchHangar(query: string, page = 0, size = 10): Promise<PluginBase[]> {
  const result = await apiFetch<HangarSearchResult>(
    'hangar',
    `/projects?q=${encodeURIComponent(query)}&limit=${size}&offset=${page * size}&sort=-downloads`
  )
  return result.result.map(toPluginBase)
}

export async function getHangarProject(owner: string, slug: string): Promise<PluginBase> {
  const p = await apiFetch<HangarProject>('hangar', `/projects/${owner}/${slug}`)
  return toPluginBase(p)
}

/**
 * Hangar API v1 不暴露完整 Markdown 描述（mainPageContent 恒为 null，/pages 端点不存在）。
 * 这里只返回项目简短 description + 引导链接，让用户跳 Hangar 官网看完整内容。
 */
export async function getHangarProjectDescription(owner: string, slug: string): Promise<string> {
  try {
    const p = await apiFetch<HangarProject>('hangar', `/projects/${owner}/${slug}`)
    const projectUrl = `https://hangar.papermc.io/${owner}/${slug}`
    const shortDesc = p.description || ''
    return `${shortDesc}\n\n> **注：** Hangar API 不提供完整项目描述，[点击前往官网查看完整说明 →](${projectUrl})`
  } catch {
    return ''
  }
}

export async function getHangarPopular(page = 0, size = 10): Promise<PluginBase[]> {
  const result = await apiFetch<HangarSearchResult>(
    'hangar',
    `/projects?limit=${size}&offset=${page * size}&sort=-downloads`
  )
  return result.result.map(toPluginBase)
}

export async function getHangarAuthorProjects(author: string, page = 0, size = 10): Promise<PluginBase[]> {
  const result = await apiFetch<HangarSearchResult>(
    'hangar',
    `/projects?owner=${encodeURIComponent(author)}&limit=${size}&offset=${page * size}&sort=-downloads`
  )
  return result.result.map(toPluginBase)
}
