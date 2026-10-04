import { describe, expect, test } from 'vitest'
import type { Catalog } from './catalog'
import catalogJson from '../data/catalog.json'
import { decodeTrip, encodeTrip, itemCode, shareUrl } from './shareLink'
import { addDays, type Trip } from './trip'

const catalog = catalogJson as unknown as Catalog
const ids = catalog.items.map((i) => i.id)
const strip = (trip: Trip) => ({
  name: trip.name,
  days: trip.days.map(({ date, start, end, items }) => ({ date, start, end, items: items.map(({ itemId, showTime }) => ({ itemId, showTime })) })),
})

/** Made by the v1 encoder (one park per day, field `p`), before days could combine parks. */
const V1_LINK =
  'N4IgbiBcCMA0IDsogPIBsAmACAzgCwEMAnAU2wBciBLABxHgygG1RzkAmABnYDYBaTgA4+0dvRB1IIDGjrwcyTgE5IAZk7iSHVZE4b4VZkxBUA9jx6mQAXVjGqRAOwBjAF7jo0NRuvWAvrCsHNz8QiKq4pLSBADu4gpSyrr6IFpS7OzJ4oaQTMY80ACOAEYQvn7+QA'

const trip: Trip = {
  id: 't1',
  name: 'Summer trip',
  days: [
    {
      id: 'd1', date: '2026-08-12', start: '09:30', end: '23:00',
      items: [
        { key: 'a', itemId: 'dlp.big-thunder-mountain' },
        { key: 'b', itemId: 'dlp.disney-stars-on-parade', showTime: '11:30' },
        { key: 'e', itemId: 'daw.frozen-ever-after' },
        { key: 'c', itemId: 'dlp.big-thunder-mountain' },
      ],
    },
    { id: 'd2', date: '2026-08-13', start: '09:30', end: '22:00', items: [{ key: 'd', itemId: 'daw.frozen-ever-after' }] },
  ],
}

describe('share links', () => {
  test('round trip keeps days, items, repeats and show times', () => {
    const decoded = decodeTrip(encodeTrip(trip), ids)!
    expect(strip(decoded)).toEqual(strip(trip))
    expect(decoded.id).not.toBe(trip.id)
    expect(new Set(decoded.days[0]!.items.map((i) => i.key)).size).toBe(4)
  })

  test('damaged or incomplete links fail cleanly', () => {
    const data = encodeTrip(trip)
    expect(decodeTrip(data.slice(0, data.length / 2), ids)).toBeNull()
    expect(decodeTrip('not-a-trip', ids)).toBeNull()
    expect(decodeTrip('', ids)).toBeNull()
  })

  test('a valid encoding with the wrong shape is rejected', async () => {
    const { compressToEncodedURIComponent } = await import('lz-string')
    expect(decodeTrip(compressToEncodedURIComponent(JSON.stringify({ v: 1, n: 'x', d: [] })), ids)).toBeNull()
    expect(decodeTrip(compressToEncodedURIComponent(JSON.stringify({ v: 2, n: 'x', d: [{}] })), ids)).toBeNull()
  })

  test('a 7-day trip with 15 different items per day stays under 2,000 characters', () => {
    const big: Trip = {
      id: 'big',
      name: 'A long family holiday name for testing',
      days: Array.from({ length: 7 }, (_, d) => ({
        id: `d${d}`, date: addDays('2026-08-10', d), start: '09:30', end: '23:00',
        items: Array.from({ length: 15 }, (_, i) => ({ key: `${d}-${i}`, itemId: ids[(d * 15 + i) % ids.length]! })),
      })),
    }
    const encoded = encodeTrip(big)
    expect(encoded.length).toBeLessThan(2000)
    expect(strip(decodeTrip(encoded, ids)!)).toEqual(strip(big))
  })

  test('a v1 link (one park per day) still imports with the same days, windows and items', () => {
    const decoded = decodeTrip(V1_LINK, ids)!
    expect(strip(decoded)).toEqual({
      name: 'Old shared trip',
      days: [
        {
          date: '2026-08-12', start: '09:30', end: '23:00',
          items: [{ itemId: 'dlp.big-thunder-mountain', showTime: undefined }, { itemId: 'dlp.disney-stars-on-parade', showTime: '11:30' }],
        },
        { date: '2026-08-13', start: '09:00', end: '22:00', items: [{ itemId: 'daw.frozen-ever-after', showTime: undefined }] },
      ],
    })
    expect('parkId' in decoded.days[0]!).toBe(false)
  })

  test('new links use format version 2 without a per-day park', async () => {
    const { decompressFromEncodedURIComponent } = await import('lz-string')
    const shared = JSON.parse(decompressFromEncodedURIComponent(encodeTrip(trip)))
    expect(shared.v).toBe(2)
    expect(shared.d[0]).not.toHaveProperty('p')
  })

  test('item codes are unique across the catalog', () => {
    expect(new Set(ids.map(itemCode)).size).toBe(ids.length)
  })

  test('items the receiving catalog does not know become missing entries', () => {
    const decoded = decodeTrip(encodeTrip(trip), ids.filter((id) => id !== 'daw.frozen-ever-after'))!
    expect(decoded.days[1]!.items[0]!.itemId).toBe(`missing:${itemCode('daw.frozen-ever-after')}`)
    // and survive another round trip unchanged
    expect(decodeTrip(encodeTrip(decoded), ids)!.days[1]!.items[0]!.itemId).toBe('daw.frozen-ever-after')
  })

  test('share URL replaces any existing hash', () => {
    expect(shareUrl(trip, 'https://example.org/app/#/plan')).toMatch(/^https:\/\/example\.org\/app\/#\/import\/.+/)
  })
})
