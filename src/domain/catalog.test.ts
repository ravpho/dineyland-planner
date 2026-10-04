import { describe, expect, test } from 'vitest'
import { catalogSchema } from './catalog'
import { sampleCatalog } from '../test/sampleCatalog'

const clone = () => structuredClone(sampleCatalog)

describe('catalog schema', () => {
  test('accepts a valid sample', () => {
    expect(catalogSchema.safeParse(clone()).success).toBe(true)
  })

  test('rejects an item without a park', () => {
    const c = clone() as unknown as { items: Record<string, unknown>[] }
    delete c.items[0]!.parkId
    expect(catalogSchema.safeParse(c).success).toBe(false)
  })

  test('rejects a thrill level outside 1-5', () => {
    const c = clone()
    const a = c.items.find((i) => i.type === 'attraction')!
    ;(a as { thrill: number }).thrill = 6
    expect(catalogSchema.safeParse(c).success).toBe(false)
  })

  test('rejects a description over 300 characters', () => {
    const c = clone()
    c.items[0]!.description = 'x'.repeat(301)
    expect(catalogSchema.safeParse(c).success).toBe(false)
  })

  test('rejects an official link outside www.disneylandparis.com', () => {
    const c = clone()
    c.items[0]!.officialUrl = 'https://example.com/big-thunder'
    const result = catalogSchema.safeParse(c)
    expect(result.success).toBe(false)
    expect(result.error!.issues.map((i) => i.message).join()).toMatch(/www\.disneylandparis\.com/)
  })

  test('rejects an unknown height level, and defaults a missing one to draft', () => {
    const c = clone()
    const a = c.items.find((i) => i.type === 'attraction') as { heightSource?: string }
    a.heightSource = 'guess'
    expect(catalogSchema.safeParse(c).success).toBe(false)
    delete a.heightSource
    const parsed = catalogSchema.parse(c)
    expect((parsed.items[0] as { heightSource: string }).heightSource).toBe('draft')
  })

  test('requires an official map link per park', () => {
    const c = clone() as unknown as { parks: Record<string, unknown>[] }
    delete c.parks[0]!.officialMapUrl
    expect(catalogSchema.safeParse(c).success).toBe(false)
  })

  test('rejects an attraction with neither statistics nor a fixed wait', () => {
    const c = clone()
    const a = c.items.find((i) => i.type === 'attraction')!
    delete (a as { waitStats?: unknown }).waitStats
    delete (a as { fixedWaitMin?: unknown }).fixedWaitMin
    expect(catalogSchema.safeParse(c).success).toBe(false)
  })

  test('rejects an area id used in both parks', () => {
    const c = clone()
    c.parks[1]!.areas.push({ id: 'frontierland', name: 'Copy' })
    const result = catalogSchema.safeParse(c)
    expect(result.success).toBe(false)
    expect(result.error!.issues.map((i) => i.message).join()).toMatch(/area id frontierland is used in more than one park/)
  })

  test('rejects an unknown area and duplicate ids', () => {
    const c = clone()
    c.items[0]!.areaId = 'nowhere'
    c.items[1]!.id = c.items[2]!.id
    const result = catalogSchema.safeParse(c)
    expect(result.success).toBe(false)
    const messages = result.error!.issues.map((i) => i.message).join('\n')
    expect(messages).toMatch(/unknown area nowhere/)
    expect(messages).toMatch(/duplicate id/)
  })
})
