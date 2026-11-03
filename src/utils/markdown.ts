// Markdown 标题锚点工具：文档渲染、搜索与 AI 跳转共用同一套规则

/**
 * 去掉标题中的 Markdown 标记，只保留可见文本。
 */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .trim()
}

/**
 * 把标题文本转换为锚点 id。
 */
export function generateHeadingSlug(text: string): string {
  return stripMarkdownInline(text)
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/

/**
 * 按行号预生成标题 id，同名标题追加 -1、-2 后缀，保证 id 唯一且稳定。
 * 行号与 react-markdown 的 node.position.start.line 对应。
 */
export function buildHeadingIdMap(content: string): Map<number, string> {
  const ids = new Map<number, string>()
  const counts = new Map<string, number>()
  let inFence = false

  content.split('\n').forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      return
    }
    if (inFence) return

    const match = HEADING_PATTERN.exec(line)
    if (!match) return

    const base = generateHeadingSlug(match[2]) || 'section'
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    ids.set(index + 1, count === 0 ? base : `${base}-${count}`)
  })

  return ids
}
