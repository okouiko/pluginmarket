import { describe, expect, it } from 'vitest'
import { formatDownloads, getPlatformPage } from './search'

describe('search pagination and formatting', () => {
  it('uses 1-based pages for Spigot and 0-based pages for Hangar/Modrinth', () => {
    expect(getPlatformPage('spigot', 1)).toBe(1)
    expect(getPlatformPage('spigot', 3)).toBe(3)
    expect(getPlatformPage('hangar', 1)).toBe(0)
    expect(getPlatformPage('hangar', 3)).toBe(2)
    expect(getPlatformPage('modrinth', 1)).toBe(0)
    expect(getPlatformPage('modrinth', 3)).toBe(2)
  })

  it('formats download counts', () => {
    expect(formatDownloads(999)).toBe('999')
    expect(formatDownloads(1500)).toBe('1.5K')
    expect(formatDownloads(2_500_000)).toBe('2.5M')
  })
})
