import { apiFetch } from './api-base'
import type {
  PluginVersion,
  ServerType,
  SpigetVersion,
  HangarVersion,
  HangarVersionResult,
  ModrinthVersion,
  Platform,
} from '@/types'

// ============ 服务端标准化 ============

// 各种服务端名称 → ServerType 的映射
const SERVER_TYPE_MAP: Record<string, ServerType> = {
  PAPER: 'paper',
  SPIGOT: 'spigot',
  BUKKIT: 'bukkit',
  FOLIA: 'folia',
  VELOCITY: 'velocity',
  BUNGEECORD: 'bungeecord',
  WATERFALL: 'waterfall',
  FABRIC: 'fabric',
  FORGE: 'forge',
  NEOFORGE: 'neoforge',
  QUILT: 'quilt',
  SPONGE: 'sponge',
  paper: 'paper',
  spigot: 'spigot',
  bukkit: 'bukkit',
  folia: 'folia',
  velocity: 'velocity',
  bungeecord: 'bungeecord',
  waterfall: 'waterfall',
  fabric: 'fabric',
  forge: 'forge',
  neoforge: 'neoforge',
  quilt: 'quilt',
  sponge: 'sponge',
}

export function normalizeServerType(raw: string | undefined | null): ServerType | undefined {
  if (!raw) return undefined
  // Modrinth 的 loaders 有时候是 'bukkit', 'paper', 有时候 'paper-api' 这种后缀
  const cleaned = raw.replace(/-api$/, '').toUpperCase()
  return SERVER_TYPE_MAP[cleaned] || SERVER_TYPE_MAP[raw.toLowerCase()]
}

export function serverTypeLabel(t: ServerType): string {
  const map: Record<ServerType, string> = {
    paper: 'Paper', spigot: 'Spigot', bukkit: 'Bukkit', folia: 'Folia',
    velocity: 'Velocity', bungeecord: 'BungeeCord', waterfall: 'Waterfall',
    fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt', sponge: 'Sponge',
  }
  return map[t] ?? t
}

export function serverTypeColor(t: ServerType): string {
  const map: Record<ServerType, string> = {
    paper: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    spigot: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    bukkit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    folia: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    velocity: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    bungeecord: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    waterfall: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    fabric: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    forge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    neoforge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    quilt: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    sponge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  }
  return map[t] ?? 'bg-gray-100 text-gray-700'
}

// 去重合并
function mergeUnique<T>(...arrs: (T[] | undefined)[]): T[] {
  const seen = new Set<T>()
  const out: T[] = []
  for (const arr of arrs) {
    if (!arr) continue
    for (const x of arr) {
      if (!seen.has(x)) { seen.add(x); out.push(x) }
    }
  }
  return out
}

// 文件大小格式化
export function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

// ============ Spigot / Spiget ============

// Spiget 下载 URL 必须用 https://www.spigotmc.org/ 前缀
const SPIGOT_BASE = 'https://www.spigotmc.org'

export async function getSpigetVersions(resourceId: string): Promise<PluginVersion[]> {
  const versions = await apiFetch<SpigetVersion[]>('spigot', `/resources/${resourceId}/versions?size=50`)
  // Spiget 的版本不直接带 gameVersions，但 resource 详情有 testedVersions
  const versionsWithMeta = await apiFetch<{ testedVersions: string[] }>('spigot', `/resources/${resourceId}`)
  const gameVersions = versionsWithMeta?.testedVersions ?? []

  return versions.map(v => ({
    id: v.id,
    version: v.name,
    releaseDate: v.releaseDate * 1000,
    downloads: v.downloads,
    gameVersions, // Spigot 所有版本共享同一组 testedVersions
    downloadUrl: `${SPIGOT_BASE}/${v.url}`,
  }))
}

// ============ Hangar ============

// Hangar 项目详情里的 supportedPlatforms → serverTypes + gameVersions
export function hangarProjectToCompat(supportedPlatforms: Record<string, string[]> | undefined): {
  serverTypes: ServerType[]
  gameVersions: string[]
} {
  if (!supportedPlatforms) return { serverTypes: [], gameVersions: [] }
  const serverTypes = new Set<ServerType>()
  const gameVersions = new Set<string>()
  for (const platform of Object.keys(supportedPlatforms)) {
    const st = normalizeServerType(platform)
    if (st) serverTypes.add(st)
    for (const gv of supportedPlatforms[platform]) gameVersions.add(gv)
  }
  return { serverTypes: [...serverTypes], gameVersions: [...gameVersions] }
}

export async function getHangarVersions(
  owner: string,
  slug: string,
  limit = 20
): Promise<PluginVersion[]> {
  const data = await apiFetch<HangarVersionResult>(
    'hangar',
    `/projects/${owner}/${slug}/versions?limit=${limit}&offset=0`
  )
  return data.result.map(v => {
    // 下载链接（Hangar API 给的是 relative path，要走 vite proxy 或直接拼 CDN）
    // 走 API 下载：/api/v1/projects/{owner}/{slug}/versions/{versionId}/{platform}/download
    // 让前端直接用完整 URL：https://hangar.papermc.io/api/v1/projects/{owner}/{slug}/versions/{v.id}/download
    // 但注意：Hangar 版本可能多平台，这里取 PAPER / VELOCITY 等任意一个
    const platforms = Object.keys(v.downloads ?? {})
    const primaryPlatform = platforms[0]
    const fileInfo = primaryPlatform ? v.downloads[primaryPlatform]?.fileInfo : undefined
    const deps = v.platformDependencies?.[primaryPlatform] ?? []

    // 生成每个平台的 downloadUrl
    const downloadUrl = primaryPlatform
      ? `https://hangar.papermc.io/api/v1/projects/${owner}/${slug}/versions/${v.id}/${primaryPlatform}/download`
      : undefined

    return {
      id: v.id,
      version: v.name,
      changelog: v.description || undefined,
      releaseDate: new Date(v.createdAt).getTime(),
      downloads: v.stats?.totalDownloads ?? 0,
      sizeBytes: fileInfo?.sizeBytes,
      channel: v.channel?.name,
      serverType: primaryPlatform ? normalizeServerType(primaryPlatform) : undefined,
      gameVersions: deps,
      downloadUrl,
    } as PluginVersion
  })
}

// ============ Modrinth ============

export async function getModrinthVersions(
  projectId: string,
  limit = 20
): Promise<PluginVersion[]> {
  const versions = await apiFetch<ModrinthVersion[]>(
    'modrinth',
    `/project/${projectId}/version?limit=${limit}`
  )
  return versions.map(v => {
    // 每个文件对应一个 loader / game_versions 子集；挑 primary 的当主文件
    const primaryFile = v.files?.find(f => f.primary) ?? v.files?.[0]
    return {
      id: v.id,
      version: v.version_number,
      changelog: v.changelog || undefined,
      releaseDate: new Date(v.date_published).getTime(),
      downloads: v.downloads,
      sizeBytes: primaryFile?.size,
      channel: v.version_type,
      // loaders 里可能有多个，第一个作为 primary server type
      serverType: v.loaders?.[0] ? normalizeServerType(v.loaders[0]) : undefined,
      gameVersions: v.game_versions ?? [],
      downloadUrl: primaryFile?.url,
    } as PluginVersion
  })
}

// ============ 聚合版本 ============

export async function getPluginVersions(
  platform: Platform,
  id: string,
  subId?: string
): Promise<PluginVersion[]> {
  if (platform === 'spigot') return getSpigetVersions(id)
  if (platform === 'hangar') {
    // id = owner, subId = slug
    const slug = subId ?? ''
    return getHangarVersions(id, slug)
  }
  return getModrinthVersions(id)
}
