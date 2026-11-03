import { describe, expect, it } from 'vitest'
import type { PluginBase } from '@/types'
import { applyPluginFilters, matchesCategory, matchesServerType, matchesVersion, sortPlugins } from './filters'

function plugin(overrides: Partial<PluginBase> = {}): PluginBase {
  return {
    id: 'test',
    platformId: 'test',
    platform: 'spigot',
    name: 'Test',
    tag: '',
    author: 'author',
    downloads: 0,
    categories: [],
    ...overrides,
  }
}

describe('plugin filters', () => {
  it('matches categories by name, tag and categories', () => {
    expect(matchesCategory(plugin({ name: 'EconomyPlus' }), 'economy')).toBe(true)
    expect(matchesCategory(plugin({ tag: '聊天社交插件' }), 'chat')).toBe(true)
    expect(matchesCategory(plugin({ categories: ['protection'] }), 'protection')).toBe(true)
    expect(matchesCategory(plugin({ name: 'Random' }), 'economy')).toBe(false)
    expect(matchesCategory(plugin(), 'all')).toBe(true)
  })

  it('matches server types and minecraft versions', () => {
    expect(matchesServerType(plugin({ categories: ['paper'] }), 'paper')).toBe(true)
    expect(matchesServerType(plugin({ name: 'Folia scheduler' }), 'folia')).toBe(true)
    expect(matchesServerType(plugin({ name: 'Unknown' }), 'velocity')).toBe(false)
    expect(matchesVersion(plugin({ version: '1.20.4' }), '1.20')).toBe(true)
    expect(matchesVersion(plugin({ version: '1.8' }), '1.21')).toBe(false)
  })

  it('sorts plugins by downloads, update time, rating and name', () => {
    const a = plugin({ id: 'a', name: 'Alpha', downloads: 100, lastUpdate: 10, rating: 4 })
    const b = plugin({ id: 'b', name: 'Beta', downloads: 300, lastUpdate: 20, rating: 3 })
    const c = plugin({ id: 'c', name: 'Gamma', downloads: 200, lastUpdate: 30, rating: 5 })

    expect(sortPlugins([a, b, c], 'popular').map(p => p.id)).toEqual(['b', 'c', 'a'])
    expect(sortPlugins([a, b, c], 'updated').map(p => p.id)).toEqual(['c', 'b', 'a'])
    expect(sortPlugins([a, b, c], 'rating').map(p => p.id)).toEqual(['c', 'a', 'b'])
    expect(sortPlugins([a, b, c], 'name').map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('applies combined filters and minimum downloads', () => {
    const plugins = [
      plugin({ id: 'economy', name: 'Economy', downloads: 1000, categories: ['economy'] }),
      plugin({ id: 'paper', name: 'Paper Tool', downloads: 50, categories: ['paper'] }),
      plugin({ id: 'economy-paper', name: 'Economy Paper', downloads: 300, categories: ['economy', 'paper'] }),
    ]

    expect(applyPluginFilters(plugins, { category: 'economy' }).map(p => p.id))
      .toEqual(['economy', 'economy-paper'])
    expect(applyPluginFilters(plugins, { serverType: 'paper', minDownloads: 100 }).map(p => p.id))
      .toEqual(['economy-paper'])
    expect(applyPluginFilters(plugins, { category: 'economy', sortBy: 'name' }).map(p => p.id))
      .toEqual(['economy', 'economy-paper'])
  })
})
