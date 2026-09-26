import { apiFetch } from './api-base'
import type { PluginBase, SpigetResource, SpigetCategory, SpigetAuthor } from '@/types'

function spigetIconUrl(resource: SpigetResource): string {
  if (resource.icon?.url) {
    return `https://www.spigotmc.org/${resource.icon.url}`
  }
  return ''
}

function toPluginBase(r: SpigetResource): PluginBase {
  return {
    id: `spigot-${r.id}`,
    platformId: String(r.id),
    platform: 'spigot',
    name: r.name,
    tag: r.tag,
    author: r.author?.name || r.contributors || '未知',
    authorId: r.author?.id ? String(r.author.id) : undefined,
    icon: spigetIconUrl(r),
    rating: r.rating?.average,
    downloads: r.downloads,
    categories: r.category?.name ? [r.category.name] : [],
    version: r.testedVersions?.[r.testedVersions.length - 1],
    lastUpdate: r.updateDate * 1000,
    sourceUrl: `https://www.spigotmc.org/resources/${r.id}/`,
    // Spigot 只有 testedVersions，没有明确的 loader 分类——默认 Bukkit/Spigot 兼容
    serverTypes: ['bukkit', 'spigot'],
    gameVersions: r.testedVersions || [],
  }
}

// Base64 解码函数
function decodeBase64(str: string): string {
  try {
    // 处理 URL-safe base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return str
  }
}

export async function searchSpiget(query: string, page = 1, size = 10): Promise<PluginBase[]> {
  const resources = await apiFetch<SpigetResource[]>(
    'spigot',
    `/search/resources/${encodeURIComponent(query)}?size=${size}&page=${page}&sort=-downloads`
  )
  return resources.map(toPluginBase)
}

export async function getSpigetResource(id: string): Promise<PluginBase> {
  const r = await apiFetch<SpigetResource>('spigot', `/resources/${id}`, { cacheType: 'detail' })
  return toPluginBase(r)
}

export async function getSpigetResourceDescription(id: string): Promise<string> {
  const r = await apiFetch<{ id: number; description: string }>('spigot', `/resources/${id}`, { cacheType: 'detail' })
  // Spiget API 返回的描述是 base64 编码的 HTML
  if (r.description) {
    return decodeBase64(r.description)
  }
  return ''
}

export async function getSpigetCategories(): Promise<SpigetCategory[]> {
  return apiFetch<SpigetCategory[]>('spigot', '/categories?size=50', { cacheType: 'meta' })
}

export async function getSpigetCategoryResources(categoryId: number, page = 1, size = 10): Promise<PluginBase[]> {
  const resources = await apiFetch<SpigetResource[]>(
    'spigot',
    `/categories/${categoryId}/resources?size=${size}&page=${page}&sort=-downloads`
  )
  return resources.map(toPluginBase)
}

export async function getSpigetAuthor(authorId: string): Promise<SpigetAuthor> {
  return apiFetch<SpigetAuthor>('spigot', `/authors/${authorId}`, { cacheType: 'meta' })
}

export async function getSpigetAuthorResources(authorId: string, page = 1, size = 10): Promise<PluginBase[]> {
  const resources = await apiFetch<SpigetResource[]>(
    'spigot',
    `/authors/${authorId}/resources?size=${size}&page=${page}&sort=-downloads`
  )
  return resources.map(toPluginBase)
}

export async function getSpigetNewResources(page = 1, size = 10): Promise<PluginBase[]> {
  const resources = await apiFetch<SpigetResource[]>(
    'spigot',
    `/resources/new?size=${size}&page=${page}`
  )
  return resources.map(toPluginBase)
}

export async function getSpigetPopularResources(page = 1, size = 10): Promise<PluginBase[]> {
  const resources = await apiFetch<SpigetResource[]>(
    'spigot',
    `/resources?size=${size}&page=${page}&sort=-downloads`
  )
  return resources.map(toPluginBase)
}
