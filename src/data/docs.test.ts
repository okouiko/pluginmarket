import { describe, expect, it } from 'vitest'
import { DOC_CATALOG, docsTree, getDocContentByPath, resolveDocEntry } from './docs'
import type { DocItem } from './docs'

function countContentNodes(tree: DocItem[]): number {
  return tree.reduce((total, item) => total + (item.content ? 1 : 0) + (item.children ? countContentNodes(item.children) : 0), 0)
}

describe('document catalog', () => {
  it('indexes every markdown document', () => {
    expect(DOC_CATALOG).toHaveLength(72)
    expect(countContentNodes(docsTree)).toBe(72)
  })

  it('resolves paths with or without directory prefixes', () => {
    expect(resolveDocEntry('core/paper.md')?.title).toBeTruthy()
    expect(resolveDocEntry('/core/paper.md')?.title).toBeTruthy()
    expect(resolveDocEntry('paper.md')?.path).toBe('core/paper.md')
    expect(resolveDocEntry('missing.md')).toBeUndefined()
  })

  it('returns document content by path', () => {
    const content = getDocContentByPath('core/config/server-properties/概述.md')
    expect(content).toBeTruthy()
    expect(getDocContentByPath('not-exist.md')).toBeNull()
  })
})
