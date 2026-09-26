// 统一插件数据类型
export type Platform = 'spigot' | 'hangar' | 'modrinth'

// 服务端/加载器类型
export type ServerType =
  | 'paper' | 'spigot' | 'bukkit' | 'folia'
  | 'velocity' | 'bungeecord' | 'waterfall'
  | 'fabric' | 'forge' | 'neoforge' | 'quilt' | 'sponge'

export interface PluginBase {
  id: string
  platformId: string // 原始平台ID
  platform: Platform
  name: string
  tag: string // 简短描述
  description?: string // 完整描述（HTML/Markdown）
  author: string
  authorId?: string
  icon?: string
  rating?: number
  downloads: number
  categories: string[]
  version?: string
  lastUpdate?: number
  sourceUrl?: string // 原始链接
  images?: string[]
  // 版本 / 兼容性（详情页才有，搜索结果里可能为空）
  serverTypes?: ServerType[]      // 支持的服务端/加载器
  gameVersions?: string[]        // 支持的 Minecraft 版本
}

// Spiget API 类型
export interface SpigetResource {
  id: number
  name: string
  tag: string
  contributors: string
  likes: number
  file: { type: string; size: number; sizeUnit: string; url: string }
  testedVersions: string[]
  links: Record<string, string>
  rating: { count: number; average: number }
  icon?: { url: string; data: string }
  releaseDate: number
  updateDate: number
  downloads: number
  external: boolean
  premium: boolean
  price: number
  currency: string
  description?: string
  documentation?: string
  sourceCodeLink?: string
  category: { id: number; name: string }
  version: { id: number }
  versions: { id: number }[]
  author: { id: number; name: string }
  reviews?: { rating: number; description: string }
}

export interface SpigetCategory {
  id: number
  name: string
}

export interface SpigetAuthor {
  id: number
  name: string
  icon?: { url: string; data: string }
}

// Hangar API 类型
export interface HangarProject {
  id: number
  createdAt: string
  publishedAt: string
  name: string
  namespace: { owner: string; slug: string }
  stats: { views: number; downloads: number; recentViews: number; recentDownloads: number; stars: number; watchers: number }
  category: string
  lastUpdated: string
  visibility: string
  avatarUrl: string
  description: string
  settings: { tags: string[]; links: { id: number; name: string; url: string }[] }
  supportedPlatforms: Record<string, string[]>
  mainPageContent: string | null
  memberNames: string[] | null
}

export interface HangarSearchResult {
  pagination: { limit: number; offset: number; count: number }
  result: HangarProject[]
}

// Modrinth API 类型
export interface ModrinthProject {
  slug: string
  title: string
  description: string
  categories: string[]
  loaders: string[]
  game_versions: string[]
  client_side: string
  server_side: string
  body: string
  additional_categories: string[]
  project_type: string
  downloads: number
  icon_url: string
  color: number
  id: string
  team: string
  published: string
  updated: string
  followers: number
  license: { id: string; name: string; url: string }
  versions: string[]
  gallery: { url: string; featured: boolean; title: string; description: string }[]
}

export interface ModrinthSearchResult {
  hits: ModrinthSearchHit[]
  offset: number
  limit: number
  total_hits: number
}

export interface ModrinthSearchHit {
  slug: string
  title: string
  description: string
  categories: string[]
  project_type: string
  downloads: number
  icon_url: string
  color: number
  project_id: string
  author: string
  display_categories: string[]
  versions: string[]
  follows: number
  date_created: string
  date_modified: string
  latest_version: string
  license: string
  gallery: string[]
}

// AI 相关类型
export type AIProvider = 'zhipu' | 'openai-compatible'

export interface AIModelConfig {
  id: string
  name: string
  provider: AIProvider
  model: string
  apiKey: string
  baseUrl: string
  maxConcurrency: number
  maxContext: number
  enabled: boolean
}

export type AIRole = 'search' | 'translate' | 'chat' | 'vision' | 'decision'

export interface AIRoleAssignment {
  role: AIRole
  modelId: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatContentPart[]
}

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface AIStreamChunk {
  choices: { delta: { content?: string; role?: string }; finish_reason?: string }[]
}

// 收藏
export interface Favorite {
  plugin: PluginBase
  addedAt: number
}

// 设置
export interface AppSettings {
  models: AIModelConfig[]
  roleAssignments: AIRoleAssignment[]
  corsProxy: string
  enabledPlatforms: Platform[]
}

// 搜索
export interface SearchFilters {
  platforms: Platform[]
  categories: string[]
  version?: string
  sortBy: 'relevance' | 'downloads' | 'rating' | 'updated' | 'name'
  minDownloads?: number
}

// ============== 版本历史 ==============

export interface PluginVersion {
  id: string | number
  version: string
  changelog?: string        // 更新日志（Markdown）
  releaseDate: number       // Unix 毫秒时间戳
  downloads: number
  sizeBytes?: number
  channel?: string          // release / snapshot / beta
  serverType?: ServerType
  gameVersions: string[]    // 该版本支持的 MC 版本
  downloadUrl?: string      // 直接下载链接
  externalDownloadUrl?: string // 外部下载链接
}

// Spiget 版本
export interface SpigetVersion {
  id: number
  name: string              // 版本号
  url: string               // 相对路径，需拼 Spigot 域名
  resource: number          // 资源 ID
  downloads: number
  rating: { count: number; average: number }
  releaseDate: number       // Unix 秒
  uuid: string
}

// Hangar 版本
export interface HangarVersion {
  id: number
  projectId: number
  name: string
  createdAt: string
  description: string
  visibility: string
  channel: { name: string; color: string }
  stats: { totalDownloads: number; platformDownloads: Record<string, number> }
  downloads: Record<string, {
    fileInfo: { name: string; sizeBytes: number; sha256Hash: string }
    directDownloadUrl?: string
    externalUrl?: string
  }>
  platformDependencies: Record<string, string[]>
  platformDependenciesFormatted: Record<string, string[]>
  pluginDependencies: Record<string, { name: string; required: boolean }[]>
}

export interface HangarVersionResult {
  pagination: { count: number; limit: number; offset: number }
  result: HangarVersion[]
}

// Modrinth 版本
export interface ModrinthVersion {
  id: string
  project_id: string
  name: string                    // 显示的版本名
  version_number: string          // 版本号
  version_type: 'release' | 'beta' | 'alpha' | 'snapshot'
  date_published: string
  downloads: number
  game_versions: string[]
  loaders: string[]               // ['paper','spigot','fabric',...]
  changelog?: string
  files: {
    id: string
    url: string
    filename: string
    primary: boolean
    size: number
    hashes: { sha1: string; sha512: string }
    file_type?: string
  }[]
}
