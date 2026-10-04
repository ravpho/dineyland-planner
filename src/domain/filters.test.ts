import { describe, expect, test } from 'vitest'
import type { Catalog } from './catalog'
import { sampleCatalog } from '../test/sampleCatalog'
import { DEFAULT_FILTERS, filterCatalog, normalizeText, type CatalogFilters } from './filters'
import { unsuitableReason } from './suitability'

const f = (overrides: Partial<CatalogFilters>): CatalogFilters => ({ ...DEFAULT_FILTERS, ...overrides })
const names = (list: ReturnType<typeof filterCatalog>) => list.map((l) => l.item.name)
const item = (id: string) => sampleCatalog.items.find((i) => i.id === id)!

describe('catalog filtering (catalog-filtering spec)', () => {
  test('park, area and type filters', () => {
    const list = filterCatalog(sampleCatalog, f({ parkId: 'dlp', areaIds: ['frontierland'], types: ['attraction'] }), undefined, 8)
    expect(names(list).sort()).toEqual(['Big Thunder Mountain', 'Phantom Manor'])
    expect(names(filterCatalog(sampleCatalog, f({ parkId: 'daw' }), undefined, 8))).toEqual(['Avengers Assemble: Flight Force'])
  })

  test('height: 120 cm ride unsuitable at 110 cm, 102 cm ride is not', () => {
    expect(unsuitableReason(item('dlp.star-wars-hyperspace-mountain'), { heightCm: 110 })).toBe('Needs 120 cm')
    expect(unsuitableReason(item('dlp.big-thunder-mountain'), { heightCm: 110 })).toBeUndefined()
  })

  test('no height requirement is never unsuitable because of height', () => {
    expect(unsuitableReason(item('dlp.peter-pans-flight'), { heightCm: 80 })).toBeUndefined()
  })

  test('maximum thrill Moderate rules out Thrilling and Intense', () => {
    expect(unsuitableReason(item('dlp.big-thunder-mountain'), { maxThrill: 3 })).toMatch(/Too intense \(Thrilling\)/)
    expect(unsuitableReason(item('dlp.star-wars-hyperspace-mountain'), { maxThrill: 3 })).toMatch(/Too intense \(Intense\)/)
    expect(unsuitableReason(item('dlp.phantom-manor'), { maxThrill: 3 })).toBeUndefined()
  })

  test('maximum scariness Mild rules out Spooky and Scary whatever the thrill level', () => {
    expect(unsuitableReason(item('dlp.phantom-manor'), { maxScare: 1 })).toBe('Too scary (Scary)')
    expect(unsuitableReason(item('dlp.star-wars-hyperspace-mountain'), { maxScare: 1 })).toBe('Too scary (Spooky)')
    expect(unsuitableReason(item('dlp.peter-pans-flight'), { maxScare: 1 })).toBeUndefined()
  })

  test('unsuitable rows are kept with a reason by default and dropped when hidden', () => {
    const profile = { heightCm: 110 }
    const shown = filterCatalog(sampleCatalog, f({}), profile, 8)
    expect(shown.find((l) => l.item.id === 'dlp.star-wars-hyperspace-mountain')?.unsuitable).toBe('Needs 120 cm')
    const hidden = filterCatalog(sampleCatalog, f({ hideUnsuitable: true }), profile, 8)
    expect(hidden.some((l) => l.item.id === 'dlp.star-wars-hyperspace-mountain')).toBe(false)
    expect(hidden.length).toBe(shown.length - 1)
  })

  test('filters combine: an item must pass every one', () => {
    const list = filterCatalog(sampleCatalog, f({ types: ['attraction'], query: 'mountain' }), { heightCm: 110 }, 8)
    expect(names(list).sort()).toEqual(['Big Thunder Mountain', 'Star Wars Hyperspace Mountain'])
    const strict = filterCatalog(sampleCatalog, f({ types: ['attraction'], query: 'mountain', hideUnsuitable: true }), { heightCm: 110 }, 8)
    expect(names(strict)).toEqual(['Big Thunder Mountain'])
  })

  test('search ignores case and accents', () => {
    expect(names(filterCatalog(sampleCatalog, f({ query: 'thunder' }), undefined, 8))).toEqual(['Big Thunder Mountain'])
    expect(names(filterCatalog(sampleCatalog, f({ query: 'cafe' }), undefined, 8))).toEqual(['Café Hyperion'])
    expect(normalizeText('Les Mystères')).toBe('les mysteres')
  })

  test('sort by rating puts 5 first; by wait puts shortest first and non-attractions last', () => {
    const byRating = filterCatalog(sampleCatalog, f({ sort: 'rating' }), undefined, 8)
    expect(byRating[0]!.item.rating).toBe(5)
    expect(byRating.map((l) => l.item.rating)).toEqual([...byRating.map((l) => l.item.rating)].sort((a, b) => b - a))
    const byWait = filterCatalog(sampleCatalog, f({ sort: 'wait' }), undefined, 8)
    expect(byWait[0]!.item.name).toBe("Alice's Curious Labyrinth")
    expect(byWait.at(-1)!.item.type).not.toBe('attraction')
  })

  test('attraction rows carry the month wait range', () => {
    const [row] = filterCatalog(sampleCatalog, f({ query: 'thunder' }), undefined, 8)
    expect(row!.waitRange![0]).toBeLessThan(row!.waitRange![1])
  })

  test('works on the real generated catalog', async () => {
    const real = (await import('../data/catalog.json')).default as unknown as Catalog
    const list = filterCatalog(real, f({ query: 'thunder' }), undefined, 8)
    expect(names(list)).toContain('Big Thunder Mountain')
  })
})
