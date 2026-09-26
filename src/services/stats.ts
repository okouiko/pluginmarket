import { apiFetch } from './api-base'
import type { SpigetResource, HangarSearchResult, ModrinthSearchResult, PluginBase } from '@/types'

export interface CategoryStat {
  name: string
  label: string
  totalPlugins: number
  totalDownloads: number
  platforms: { spigot?: number; hangar?: number; modrinth?: number }
  topPlugin?: PluginBase
  color: string
}

// 分类归一化 + 中文名
const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  management: { label: '管理工具', color: 'bg-orange-500' },
  'tools and utilities': { label: '实用工具', color: 'bg-blue-500' },
  utility: { label: '实用工具', color: 'bg-blue-500' },
  libraries: { label: 'API/库', color: 'bg-purple-500' },
  'libraries / apis': { label: 'API/库', color: 'bg-purple-500' },
  api: { label: 'API/库', color: 'bg-purple-500' },
  economy: { label: '经济系统', color: 'bg-green-500' },
  chat: { label: '聊天社交', color: 'bg-pink-500' },
  protection: { label: '领地保护', color: 'bg-amber-500' },
  world: { label: '世界生成', color: 'bg-emerald-500' },
  teleport: { label: '传送系统', color: 'bg-cyan-500' },
  gameplay: { label: '游戏玩法', color: 'bg-rose-500' },
  minigame: { label: '小游戏', color: 'bg-red-500' },
  pvp: { label: 'PvP 战斗', color: 'bg-yellow-500' },
  quest: { label: '任务系统', color: 'bg-indigo-500' },
  skill: { label: '技能/职业', color: 'bg-teal-500' },
  cosmetic: { label: '装饰美化', color: 'bg-fuchsia-500' },
  npc: { label: 'NPC 系统', color: 'bg-lime-500' },
  misc: { label: '杂项', color: 'bg-gray-500' },
  transportation: { label: '交通工具', color: 'bg-sky-500' },
  adventure: { label: '冒险', color: 'bg-red-500' },
  bedwars: { label: '起床战争', color: 'bg-orange-500' },
  kitpvp: { label: 'PvP 竞技', color: 'bg-yellow-500' },
  factions: { label: '派系', color: 'bg-violet-500' },
  'game-mechanics': { label: '游戏机制', color: 'bg-rose-500' },
  library: { label: 'API/库', color: 'bg-purple-500' },
}

function normalizeCat(raw: string | undefined | null): string {
  if (!raw) return 'misc'
  return raw.toLowerCase().trim()
}

function catLabel(key: string): { label: string; color: string } {
  const map = CATEGORY_MAP[key]
  if (map) return map
  // 没匹配到的，给默认
  return { label: key.replace(/-/g, ' '), color: 'bg-gray-500' }
}

/** 聚合三平台分类统计 */
export async function getCategoryStats(): Promise<{
  totalPlugins: number
  totalDownloads: number
  totalAuthors: number
  platforms: { spigot: number; hangar: number; modrinth: number }
  categories: CategoryStat[]
}> {
  const stats = new Map<string, CategoryStat>()
  const authors = new Set<string>()

  // 1) 拉各平台热门
  const [spigot, hangar, modrinth] = await Promise.allSettled([
    apiFetch<SpigetResource[]>('spigot', '/resources?size=40&sort=-downloads'),
    apiFetch<HangarSearchResult>('hangar', '/projects?limit=40&offset=0&sort=-downloads'),
    apiFetch<ModrinthSearchResult>('modrinth', '/search?limit=40&index=downloads'),
  ])

  const spigotRes = spigot.status === 'fulfilled' ? spigot.value : []
  const hangarRes = hangar.status === 'fulfilled' ? hangar.value.result : []
  const modrinthRes = modrinth.status === 'fulfilled' ? modrinth.value.hits : []

  const platformCounts = { spigot: spigotRes.length, hangar: hangarRes.length, modrinth: modrinthRes.length }
  let totalPlugins = 0, totalDownloads = 0

  // Spigot
  for (const r of spigotRes) {
    const catKey = normalizeCat(r.category?.name)
    const c = catLabel(catKey)
    totalPlugins++
    totalDownloads += r.downloads
    if (r.author?.id) authors.add(String(r.author.id))

    let stat = stats.get(catKey)
    if (!stat) {
      stat = { name: catKey, label: c.label, color: c.color, totalPlugins: 0, totalDownloads: 0, platforms: {} }
      stats.set(catKey, stat)
    }
    stat.totalPlugins++
    stat.totalDownloads += r.downloads
    stat.platforms.spigot = (stat.platforms.spigot ?? 0) + 1
    if (!stat.topPlugin || r.downloads > stat.topPlugin.downloads) {
      stat.topPlugin = {
        id: `spigot-${r.id}`, platformId: String(r.id), platform: 'spigot',
        name: r.name, tag: r.tag, author: r.author?.name || '',
        downloads: r.downloads, categories: [r.category?.name || ''],
        icon: r.icon ? `https://www.spigotmc.org/${r.icon.url}` : undefined,
      }
    }
  }

  // Hangar
  for (const r of hangarRes) {
    const catKey = normalizeCat(r.category)
    const c = catLabel(catKey)
    totalPlugins++
    totalDownloads += r.stats.downloads
    authors.add(r.namespace.owner)

    let stat = stats.get(catKey)
    if (!stat) {
      stat = { name: catKey, label: c.label, color: c.color, totalPlugins: 0, totalDownloads: 0, platforms: {} }
      stats.set(catKey, stat)
    }
    stat.totalPlugins++
    stat.totalDownloads += r.stats.downloads
    stat.platforms.hangar = (stat.platforms.hangar ?? 0) + 1
    if (!stat.topPlugin || r.stats.downloads > stat.topPlugin.downloads) {
      stat.topPlugin = {
        id: `hangar-${r.namespace.owner}-${r.namespace.slug}`, platformId: `${r.namespace.owner}/${r.namespace.slug}`,
        platform: 'hangar', name: r.name, tag: r.description,
        author: r.namespace.owner, downloads: r.stats.downloads,
        categories: [r.category], icon: r.avatarUrl,
      }
    }
  }

  // Modrinth
  for (const r of modrinthRes) {
    // 只取第一个 category 作为主分类
    const catKey = normalizeCat(r.categories?.[0])
    const c = catLabel(catKey)
    totalPlugins++
    totalDownloads += r.downloads
    authors.add(r.author)

    let stat = stats.get(catKey)
    if (!stat) {
      stat = { name: catKey, label: c.label, color: c.color, totalPlugins: 0, totalDownloads: 0, platforms: {} }
      stats.set(catKey, stat)
    }
    stat.totalPlugins++
    stat.totalDownloads += r.downloads
    stat.platforms.modrinth = (stat.platforms.modrinth ?? 0) + 1
    if (!stat.topPlugin || r.downloads > stat.topPlugin.downloads) {
      stat.topPlugin = {
        id: `modrinth-${r.project_id}`, platformId: r.project_id, platform: 'modrinth',
        name: r.title, tag: r.description, author: r.author,
        downloads: r.downloads, categories: r.categories || [], icon: r.icon_url,
      }
    }
  }

  const categories = Array.from(stats.values())
    .sort((a, b) => b.totalDownloads - a.totalDownloads)

  return {
    totalPlugins,
    totalDownloads,
    totalAuthors: authors.size,
    platforms: platformCounts,
    categories,
  }
}
