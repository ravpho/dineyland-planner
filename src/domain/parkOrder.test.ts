import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { parseCatalog, type Catalog } from './catalog'
import { parkOrder, switchParks } from './parkOrder'
import type { Day, PlanItem } from './trip'

const real: Catalog = parseCatalog(catalogJson)

function day(items: (string | PlanItem)[]): Day {
  return {
    id: 'd1',
    date: '2026-08-12',
    start: '09:30',
    end: '22:00',
    items: items.map((x, i) => (typeof x === 'string' ? { key: `k${i}`, itemId: x } : x)),
  }
}

const THUNDER = 'dlp.big-thunder-mountain'
const MANOR = 'dlp.phantom-manor'
const CRUSH = 'daw.crushs-coaster'
const FROZEN = 'daw.frozen-ever-after'
const CHALET = 'dlp.au-chalet-de-la-marionnette'
const PARADE = 'dlp.disney-stars-on-parade'
const REGAL = 'daw.regal-view-restaurant'

describe('park order of a day (trip-itinerary spec)', () => {
  test('one visit to each park', () => {
    expect(parkOrder(day([THUNDER, MANOR, CRUSH, FROZEN]), real)).toEqual(['dlp', 'daw'])
  })

  test('back and forth', () => {
    expect(parkOrder(day([THUNDER, CRUSH, MANOR]), real)).toEqual(['dlp', 'daw', 'dlp'])
  })

  test('lunch in the other park does not count', () => {
    expect(parkOrder(day([THUNDER, REGAL, MANOR]), real)).toEqual(['dlp'])
  })
})

describe('switch the park order (trip-itinerary spec)', () => {
  test('a grouped day swaps its two blocks and keeps the order inside each park', () => {
    const d = day([THUNDER, MANOR, CRUSH, FROZEN])
    const result = switchParks(d, real)!
    expect(result.items.map((e) => e.itemId)).toEqual([CRUSH, FROZEN, THUNDER, MANOR])
    // The day's own entries, not copies.
    expect(result.items.every((e) => d.items.includes(e))).toBe(true)
    expect(result.removed).toEqual([])
    expect(result.firstPark).toBe('daw')
  })

  test('lunch between the other park’s attractions does not block the switch, and is removed', () => {
    const result = switchParks(day([THUNDER, CRUSH, { key: 'lunch', itemId: CHALET, mealTime: '12:00' }, FROZEN]), real)!
    expect(result.items.map((e) => e.itemId)).toEqual([CRUSH, FROZEN, THUNDER])
    expect(result.removed.map((e) => e.key)).toEqual(['lunch'])
  })

  test('every restaurant and show is removed, with or without a time, in day order', () => {
    const d = day([THUNDER, { key: 'show', itemId: PARADE, showTime: '17:30' }, MANOR, { key: 'snack', itemId: REGAL }, CRUSH, { key: 'lunch', itemId: CHALET, mealTime: '12:00' }])
    expect(switchParks(d, real)!.removed.map((e) => e.key)).toEqual(['show', 'snack', 'lunch'])
  })

  test('an entry no longer available goes to the end', () => {
    expect(switchParks(day([THUNDER, 'dlp.retired-ride', CRUSH]), real)!.items.map((e) => e.itemId)).toEqual([CRUSH, THUNDER, 'dlp.retired-ride'])
  })

  test('a day that is not grouped, a single-park day and an empty day cannot switch', () => {
    expect(switchParks(day([THUNDER, CRUSH, MANOR]), real)).toBeUndefined()
    expect(switchParks(day([THUNDER, MANOR, REGAL]), real)).toBeUndefined()
    expect(switchParks(day([]), real)).toBeUndefined()
  })
})
