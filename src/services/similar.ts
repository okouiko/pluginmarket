import { apiFetch } from './api-base'
import type { Platform, PluginBase, ModrinthSearchResult, HangarSearchResult, SpigetResource, ServerType } from '@/types'
import { normalizeServerType } from './versions'
import { apiFetchText } from './api-base'

// ============ 辅助 ============
function searchKeywordsFromPlugin(p: PluginBase): string {
  // 提取插件名里的关键词，去掉特殊字符
  return p.name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim()
}

// ============ Modrinth 相似（按关键词搜索 + 排除自己） ============
async function findModrinthSimilar(plugin: PluginBase, limit = 5): Promise<PluginBase[]> {
  const q = searchKeywordsFromPlugin(plugin).split(/\s+/).slice(0, 2).join(' ') || plugin.name
  if (!q) return []
  try {
    const result = await apiFetch<ModrinthSearchResult>(
      'modrinth',
      `/search?query=${encodeURIComponent(q)}&limit=${limit + 5}&index=downloads`
    )
    return result.hits
      .filter(h => h.project_id !== plugin.platformId)
      .slice(0, limit)
      .map(h => ({
        id: `modrinth-${h.project_id}`,
        platformId: h.project_id,
        platform: 'modrinth',
        name: h.title,
        tag: h.description,
        author: h.author,
        icon: h.icon_url,
        downloads: h.downloads,
        categories: h.categories || [],
        version: h.versions?.[h.versions.length - 1],
        lastUpdate: new Date(h.date_modified).getTime(),
        sourceUrl: `https://modrinth.com/plugin/${h.slug}`,
        images: h.gallery,
        serverTypes: h.categories?.map(normalizeServerType).filter(Boolean) as ServerType[] | undefined,
      }))
  } catch {
    return []
  }
}

// ============ Hangar 相似（按关键词搜索） ============
async function findHangarSimilar(plugin: PluginBase, limit = 5): Promise<PluginBase[]> {
  const q = searchKeywordsFromPlugin(plugin).split(/\s+/).slice(0, 2).join(' ') || plugin.name
  if (!q) return []
  const ownerSlug = plugin.platformId // e.g. "ViaVersion/ViaBackwards"
  try {
    const result = await apiFetch<HangarSearchResult>(
      'hangar',
      `/projects?q=${encodeURIComponent(q)}&limit=${limit + 5}&offset=0&sort=-downloads`
    )
    return result.result
      .filter(p => `${p.namespace.owner}/${p.namespace.slug}` !== ownerSlug)
      .slice(0, limit)
      .map(p => {
        const serverTypes: ServerType[] = []
        const gameVersions: string[] = []
        if (p.supportedPlatforms) {
          for (const plat of Object.keys(p.supportedPlatforms)) {
            const t = normalizeServerType(plat)
            if (t) serverTypes.push(t)
            for (const g of p.supportedPlatforms[plat]) if (!gameVersions.includes(g)) gameVersions.push(g)
          }
        }
        return {
          id: `hangar-${p.namespace.owner}-${p.namespace.slug}`,
          platformId: `${p.namespace.owner}/${p.namespace.slug}`,
          platform: 'hangar',
          name: p.name,
          tag: p.description,
          author: p.namespace.owner,
          icon: p.avatarUrl,
          downloads: p.stats.downloads,
          categories: [p.category, ...(p.settings?.tags || [])],
          lastUpdate: new Date(p.lastUpdated).getTime(),
          sourceUrl: `https://hangar.papermc.io/${p.namespace.owner}/${p.namespace.slug}`,
          serverTypes,
          gameVersions,
        }
      })
  } catch {
    return []
  }
}

// ============ Spigot 相似（同作者 OR 同关键词） ============
async function findSpigotSimilar(plugin: PluginBase, limit = 5): Promise<PluginBase[]> {
  // 优先：同作者的其他作品
  if (plugin.authorId) {
    try {
      const resources = await apiFetch<SpigetResource[]>(
        'spigot',
        `/authors/${plugin.authorId}/resources?size=${limit + 5}&sort=-downloads`
      )
      const currentId = String(plugin.platformId)
      const sameAuthor = resources.filter(r => String(r.id) !== currentId).slice(0, limit)
      if (sameAuthor.length > 0) {
        return sameAuthor.map(r => ({
          id: `spigot-${r.id}`,
          platformId: String(r.id),
          platform: 'spigot',
          name: r.name,
          tag: r.tag,
          author: r.author?.name || 'Unknown',
          authorId: r.author?.id ? String(r.author.id) : undefined,
          icon: r.icon ? `https://www.spigotmc.org/${r.icon.url}` : undefined,
          rating: r.rating?.average,
          downloads: r.downloads,
          categories: [],
          version: r.testedVersions?.[r.testedVersions.length - 1],
          lastUpdate: r.updateDate * 1000,
          sourceUrl: `https://www.spigotmc.org/resources/${r.id}/`,
          gameVersions: r.testedVersions || [],
        }))
      }
    } catch {
      // author API 失败也没关系，fallback 到关键词搜索
    }
  }

  // Fallback：关键词搜索
  const q = searchKeywordsFromPlugin(plugin).split(/\s+/).slice(0, 2).join(' ') || plugin.name
  if (!q) return []
  try {
    const resources = await apiFetch<SpigetResource[]>(
      'spigot',
      `/search/resources/${encodeURIComponent(q)}?size=${limit + 5}`
    )
    const currentId = String(plugin.platformId)
    return resources
      .filter(r => String(r.id) !== currentId)
      .slice(0, limit)
      .map(r => ({
        id: `spigot-${r.id}`,
        platformId: String(r.id),
        platform: 'spigot',
        name: r.name,
        tag: r.tag,
        author: r.author?.name || 'Unknown',
        authorId: r.author?.id ? String(r.author.id) : undefined,
        icon: r.icon ? `https://www.spigotmc.org/${r.icon.url}` : undefined,
        rating: r.rating?.average,
        downloads: r.downloads,
        categories: [],
        version: r.testedVersions?.[r.testedVersions.length - 1],
        lastUpdate: r.updateDate * 1000,
        sourceUrl: `https://www.spigotmc.org/resources/${r.id}/`,
        gameVersions: r.testedVersions || [],
      }))
  } catch {
    return []
  }
}

// ============ 聚合：跨平台找相似 ============

export async function findSimilarPlugins(
  plugin: PluginBase,
  maxPerPlatform = 3
): Promise<PluginBase[]> {
  const promises: Promise<PluginBase[]>[] = []
  const platforms: Platform[] = ['modrinth', 'hangar', 'spigot']

  for (const platform of platforms) {
    if (platform === plugin.platform) continue
    promises.push(
      (async () => {
        try {
          if (platform === 'modrinth') return await findModrinthSimilar(plugin, maxPerPlatform)
          if (platform === 'hangar') return await findHangarSimilar(plugin, maxPerPlatform)
          return await findSpigotSimilar(plugin, maxPerPlatform)
        } catch {
          return []
        }
      })()
    )
  }

  const results = await Promise.all(promises)
  return results.flat().sort((a, b) => b.downloads - a.downloads)
}
