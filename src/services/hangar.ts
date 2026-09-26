import { apiFetch, apiFetchText } from './api-base'
import type { PluginBase, HangarProject, HangarSearchResult } from '@/types'
import { hangarProjectToCompat } from './versions'

function toPluginBase(p: HangarProject): PluginBase {
  const { serverTypes, gameVersions } = hangarProjectToCompat(p.supportedPlatforms)
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
    serverTypes,
    gameVersions,
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
 * Hangar API v1 提供了 pages/main 端点返回完整 Markdown 描述（text/plain）。
 * 使用 GET /api/v1/pages/main/{owner}/{slugOrId} 获取。
 * 如果 pages/main 失败（项目无主页内容等情况），则回退到项目短描述 + 官网引导链接。
 */
export async function getHangarProjectDescription(owner: string, slug: string): Promise<string> {
  try {
    // 1) 优先尝试获取完整 Markdown 主页
    const markdown = await apiFetchText('hangar', `/pages/main/${owner}/${slug}`)
    if (markdown && markdown.trim().length > 0) {
      return markdown.trim()
    }
  } catch {
    // pages/main 可能对某些项目 404，继续走 fallback
  }

  // 2) Fallback：项目短描述 + 官网引导链接
  try {
    const p = await apiFetch<HangarProject>('hangar', `/projects/${owner}/${slug}`)
    const projectUrl = `https://hangar.papermc.io/${owner}/${slug}`
    const shortDesc = p.description || ''
    if (shortDesc) {
      return `${shortDesc}\n\n> [在 Hangar 官网查看完整说明 →](${projectUrl})`
    }
  } catch {
    // 项目详情也失败了
  }
  return ''
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
