import { describe, expect, test } from 'vitest'
import type { Catalog } from './catalog'
import catalogJson from '../data/catalog.json'
import { decodeTrip, encodeTrip, itemCode, shareUrl } from './shareLink'
import { addDays, type Trip } from './trip'

const catalog = catalogJson as unknown as Catalog
const ids = catalog.items.map((i) => i.id)
const strip = (trip: Trip) => ({
  name: trip.name,
  days: trip.days.map(({ date, parkId, start, end, items }) => ({ date, parkId, start, end, items: items.map(({ itemId, showTime }) => ({ itemId, showTime })) })),
})

const trip: Trip = {
  id: 't1',
  name: 'Summer trip',
  days: [
    {
      id: 'd1', date: '2026-08-12', parkId: 'dlp', start: '09:30', end: '23:00',
      items: [
        { key: 'a', itemId: 'dlp.big-thunder-mountain' },
        { key: 'b', itemId: 'dlp.disney-stars-on-parade', showTime: '11:30' },
        { key: 'c', itemId: 'dlp.big-thunder-mountain' },
      ],
    },
    { id: 'd2', date: '2026-08-13', parkId: 'daw', start: '09:30', end: '22:00', items: [{ key: 'd', itemId: 'daw.frozen-ever-after' }] },
  ],
}

describe('share links', () => {
  test('round trip keeps days, items, repeats and show times', () => {
    const decoded = decodeTrip(encodeTrip(trip), ids)!
    expect(strip(decoded)).toEqual(strip(trip))
    expect(decoded.id).not.toBe(trip.id)
    expect(new Set(decoded.days[0]!.items.map((i) => i.key)).size).toBe(3)
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
    const park = (d: number) => (d < 4 ? 'dlp' : 'daw') as 'dlp' | 'daw'
    const pool = (p: string) => catalog.items.filter((i) => i.parkId === p).map((i) => i.id)
    const big: Trip = {
      id: 'big',
      name: 'A long family holiday name for testing',
      days: Array.from({ length: 7 }, (_, d) => ({
        id: `d${d}`, date: addDays('2026-08-10', d), parkId: park(d), start: '09:30', end: '23:00',
        items: Array.from({ length: 15 }, (_, i) => {
          const p = pool(park(d))
          return { key: `${d}-${i}`, itemId: p[((d % 4) * 15 + i) % p.length]! }
        }),
      })),
    }
    const encoded = encodeTrip(big)
    expect(encoded.length).toBeLessThan(2000)
    expect(strip(decodeTrip(encoded, ids)!)).toEqual(strip(big))
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
