// 文档单一数据源：目录树、检索索引、AI 文档清单都从这里派生
export interface DocItem {
  id: string
  title: string
  content?: string
  children?: DocItem[]
}

export interface DocEntry {
  id: string
  path: string
  title: string
  content: string
  section: string
  subsection?: string
}

const rawDocs = import.meta.glob('../assets/docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SECTION_ORDER: Record<string, number> = {
  java: 10,
  core: 20,
  config: 30,
  network: 40,
  ops: 50,
  plugins: 60,
  mods: 70,
  faq: 80,
  root: 99,
}

const SECTION_TITLES: Record<string, string> = {
  java: '📚 Java 环境',
  core: '📚 服务端核心',
  config: '📚 服务器配置',
  network: '📚 网络配置',
  ops: '📚 运维管理',
  plugins: '📚 插件',
  mods: '📚 模组',
  faq: '📚 常见问题',
  root: '📚 手册目录',
}

const SUBSECTION_ORDER: Record<string, number> = {
  'core-plugin': 1,
  'core-mod': 2,
  'core-hybrid': 3,
  'core-proxy': 4,
  'core-cross': 5,
  'config-general': 1,
  'config-server-properties': 2,
  'config-bukkit-yml': 3,
  'config-spigot-yml': 4,
  'config-paper-yml': 5,
  'config-purpur-yml': 6,
}

const SUBSECTION_TITLES: Record<string, string> = {
  'core-plugin': '📁 插件端',
  'core-mod': '📁 模组端',
  'core-hybrid': '📁 混合端',
  'core-proxy': '📁 代理端',
  'core-cross': '📁 跨平台',
  'config-general': '📁 通用配置',
  'config-server-properties': '📁 server.properties',
  'config-bukkit-yml': '📁 bukkit.yml',
  'config-spigot-yml': '📁 spigot.yml',
  'config-paper-yml': '📁 paper 配置',
  'config-purpur-yml': '📁 purpur.yml',
}

const CORE_SERVER_GROUPS: Record<string, string> = {
  paper: 'core-plugin',
  spigot: 'core-plugin',
  purpur: 'core-plugin',
  folia: 'core-plugin',
  pufferfish: 'core-plugin',
  leaves: 'core-plugin',
  forge: 'core-mod',
  neoforge: 'core-mod',
  fabric: 'core-mod',
  quilt: 'core-mod',
  mohist: 'core-hybrid',
  catserver: 'core-hybrid',
  arclight: 'core-hybrid',
  banner: 'core-hybrid',
  bungeecord: 'core-proxy',
  velocity: 'core-proxy',
  geyser: 'core-cross',
}

const CONFIG_GROUPS: Record<string, string> = {
  'server-properties': 'config-server-properties',
  'bukkit-yml': 'config-bukkit-yml',
  'spigot-yml': 'config-spigot-yml',
  'paper-yml': 'config-paper-yml',
  'purpur-yml': 'config-purpur-yml',
}

/** Vite glob 的 key 可能是 /src/assets/docs/... 或 ../assets/docs/... */
function normalizeGlobPath(key: string): string {
  const normalized = key.replace(/\\/g, '/')
  const marker = '/assets/docs/'
  const markerIndex = normalized.indexOf(marker)
  if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length)
  return normalized.replace(/^\.\.?\/assets\/docs\//, '').replace(/^\.\//, '')
}

function docIdFromPath(path: string): string {
  return path.replace(/\.md$/i, '').replace(/[\\/]/g, '-')
}

function extractTitle(content: string, path: string): string {
  const heading = content.match(/^#\s+(.+)$/m)
  if (heading?.[1]) return heading[1].trim()
  return path.split('/').pop()?.replace(/\.md$/i, '') || path
}

function classify(path: string): { section: string; subsection?: string } {
  if (path === '目录.md') return { section: 'root' }

  if (path.startsWith('java/')) return { section: 'java' }

  if (path.startsWith('core/config/')) {
    const rest = path.slice('core/config/'.length)
    const folder = rest.split('/')[0]
    return { section: 'config', subsection: CONFIG_GROUPS[folder] || 'config-general' }
  }

  if (path.startsWith('core/')) {
    const fileName = path.slice('core/'.length).replace(/\.md$/i, '')
    return { section: 'core', subsection: CORE_SERVER_GROUPS[fileName] }
  }

  if (path.startsWith('config/')) return { section: 'config', subsection: 'config-general' }
  if (path.startsWith('network/')) return { section: 'network' }
  if (path.startsWith('ops/')) return { section: 'ops' }
  if (path.startsWith('plugins/')) return { section: 'plugins' }
  if (path.startsWith('mods/')) return { section: 'mods' }
  if (path.startsWith('faq/')) return { section: 'faq' }

  return { section: 'root' }
}

const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

export const DOC_CATALOG: DocEntry[] = Object.entries(rawDocs)
  .map(([globKey, content]) => {
    const path = normalizeGlobPath(globKey)
    const { section, subsection } = classify(path)
    return {
      id: docIdFromPath(path),
      path,
      title: extractTitle(content, path),
      content,
      section,
      subsection,
    }
  })
  .sort((a, b) => {
    const sectionDiff = (SECTION_ORDER[a.section] || 100) - (SECTION_ORDER[b.section] || 100)
    if (sectionDiff !== 0) return sectionDiff
    const subDiff = (SUBSECTION_ORDER[a.subsection || ''] || 0) - (SUBSECTION_ORDER[b.subsection || ''] || 0)
    if (subDiff !== 0) return subDiff
    return collator.compare(a.path, b.path)
  })

function buildDocsTree(entries: DocEntry[]): DocItem[] {
  const sections = new Map<string, DocItem>()
  const subsections = new Map<string, DocItem>()

  for (const entry of entries) {
    let section = sections.get(entry.section)
    if (!section) {
      section = {
        id: `section-${entry.section}`,
        title: SECTION_TITLES[entry.section] || entry.section,
        children: [],
      }
      sections.set(entry.section, section)
    }

    const node: DocItem = { id: entry.id, title: entry.title, content: entry.content }

    if (entry.subsection) {
      const key = `${entry.section}|${entry.subsection}`
      let subsection = subsections.get(key)
      if (!subsection) {
        subsection = {
          id: `section-${entry.section}-${entry.subsection}`,
          title: SUBSECTION_TITLES[entry.subsection] || entry.subsection,
          children: [],
        }
        subsections.set(key, subsection)
        section.children!.push(subsection)
      }
      subsection.children!.push(node)
    } else {
      section.children!.push(node)
    }
  }

  return [...sections.values()].sort(
    (a, b) => (SECTION_ORDER[a.id.replace('section-', '')] || 100) - (SECTION_ORDER[b.id.replace('section-', '')] || 100),
  )
}

export const docsTree: DocItem[] = buildDocsTree(DOC_CATALOG)

/**
 * 供 AI 使用的文档清单：标题（含分组）→ 路径。
 * DocsSearch 与 GuidePage 共用，避免多份手写索引漂移。
 */
export const DOC_INDEX_TEXT = DOC_CATALOG.map((entry) => {
  const section = (SECTION_TITLES[entry.section] || entry.section).replace(/^📚\s*/, '')
  const subsection = entry.subsection
    ? (SUBSECTION_TITLES[entry.subsection] || entry.subsection).replace(/^📁\s*/, '')
    : ''
  const context = [section, subsection].filter(Boolean).join(' / ')
  return `- ${context ? `${context} / ` : ''}${entry.title} → ${entry.path}`
}).join('\n')

export const PLUGIN_DOCS: DocEntry[] = DOC_CATALOG.filter((entry) => entry.path.startsWith('plugins/'))

export function resolveDocEntry(input: string): DocEntry | undefined {
  const normalized = input
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
  if (!normalized) return undefined

  return DOC_CATALOG.find((entry) => entry.path === normalized)
    || DOC_CATALOG.find((entry) => entry.path.endsWith(`/${normalized}`))
    || DOC_CATALOG.find((entry) => entry.path.split('/').pop() === normalized.split('/').pop())
}

export function getDocContentByPath(path: string): string | null {
  return resolveDocEntry(path)?.content ?? null
}
