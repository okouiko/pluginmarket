import type { PluginBase } from '@/types'

export type SortOption = 'popular' | 'newest' | 'updated' | 'downloads' | 'rating' | 'name' | 'relevance'

export interface PluginFilters {
  category?: string
  serverType?: string
  version?: string
  sortBy?: SortOption
  minDownloads?: number
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  gameplay: ['gameplay', 'game', 'adventure', 'rpg', '生存', '玩法', '游戏'],
  admin: ['admin', 'administration', 'management', 'manager', '管理', '管理工具'],
  chat: ['chat', 'social', 'message', '聊天', '社交'],
  economy: ['economy', 'currency', 'money', 'vault', '经济', '货币'],
  protection: ['protection', 'protect', 'guard', 'region', 'grief', '领地', '保护', 'worldguard'],
  world: ['world', 'generation', 'worldgen', 'multiverse', '世界', '生成'],
  teleport: ['teleport', 'warp', 'portal', '传送', 'warps'],
  pvp: ['pvp', 'combat', 'battle', '战斗', 'pvp'],
  minigame: ['minigame', 'mini-game', 'minigames', '小游戏'],
  utility: ['utility', 'utilities', 'tool', 'tools', '实用', '工具'],
  api: ['api', 'library', 'lib', 'development', '开发者', '开发', '库'],
  cosmetic: ['cosmetic', 'decoration', 'appearance', 'skin', '装饰', '美化', '皮肤'],
  npc: ['npc', 'citizen', 'citizens', '角色'],
  quest: ['quest', 'quests', '任务'],
  skill: ['skill', 'skills', 'class', 'classes', '技能', '职业', '等级'],
}

const SERVER_KEYWORDS: Record<string, string[]> = {
  paper: ['paper'],
  spigot: ['spigot'],
  bukkit: ['bukkit'],
  folia: ['folia'],
  velocity: ['velocity'],
  bungeecord: ['bungeecord', 'bungee'],
  waterfall: ['waterfall'],
  fabric: ['fabric'],
  forge: ['forge'],
  sponge: ['sponge'],
}

function pluginText(plugin: PluginBase): string {
  return [
    plugin.name,
    plugin.tag,
    plugin.description || '',
    plugin.version || '',
    ...plugin.categories,
  ].join(' ').toLowerCase()
}

function matchesKeywords(plugin: PluginBase, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const text = pluginText(plugin)
  return keywords.some(keyword => text.includes(keyword.toLowerCase()))
}

export function matchesCategory(plugin: PluginBase, category?: string): boolean {
  if (!category || category === 'all') return true
  return matchesKeywords(plugin, CATEGORY_KEYWORDS[category] || [category])
}

export function matchesServerType(plugin: PluginBase, serverType?: string): boolean {
  if (!serverType || serverType === 'all') return true
  return matchesKeywords(plugin, SERVER_KEYWORDS[serverType] || [serverType])
}

export function matchesVersion(plugin: PluginBase, version?: string): boolean {
  if (!version) return true
  const normalized = version.toLowerCase().trim()
  const text = pluginText(plugin)
  return text.includes(normalized) || text.includes(`1.${normalized}`)
}

export function sortPlugins(plugins: PluginBase[], sortBy: SortOption = 'popular'): PluginBase[] {
  const sorted = [...plugins]
  switch (sortBy) {
    case 'newest':
    case 'updated':
      sorted.sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0))
      break
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.downloads - a.downloads)
      break
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
      break
    case 'relevance':
      break
    case 'popular':
    case 'downloads':
    default:
      sorted.sort((a, b) => b.downloads - a.downloads)
      break
  }
  return sorted
}

export function applyPluginFilters(plugins: PluginBase[], filters: PluginFilters = {}): PluginBase[] {
  const filtered = plugins.filter((plugin) => {
    if (filters.minDownloads !== undefined && plugin.downloads < filters.minDownloads) return false
    return matchesCategory(plugin, filters.category)
      && matchesServerType(plugin, filters.serverType)
      && matchesVersion(plugin, filters.version)
  })
  return sortPlugins(filtered, filters.sortBy)
}
