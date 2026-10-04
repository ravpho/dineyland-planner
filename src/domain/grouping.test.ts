import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { sampleCatalog } from '../test/sampleCatalog'
import { parseCatalog, type Attraction, type Catalog, type CatalogItem } from './catalog'
import { groupByArea } from './grouping'
import { scheduleDay, type ScheduledSlot } from './schedule'
import type { Day } from './trip'

const real: Catalog = parseCatalog(catalogJson)

function day(itemIds: (string | [string, string])[], start = '09:30', end = '21:00'): Day {
  return {
    id: 'd1', date: '2026-08-12', start, end,
    items: itemIds.map((x, i) => (typeof x === 'string' ? { key: `k${i}`, itemId: x } : { key: `k${i}`, itemId: x[0], showTime: x[1] })),
  }
}
const grouped = (d: Day, catalog: Catalog) => groupByArea(d, catalog).map((e) => e.itemId)
const walking = (d: Day, catalog: Catalog) => scheduleDay(d, catalog).breakdown.walking

const ENTRANCE = { lat: 48.87, lng: 2.78 }
const north = (metres: number) => ({ lat: ENTRANCE.lat + metres / 111_195, lng: ENTRANCE.lng })
const east = (metres: number) => ({ lat: ENTRANCE.lat, lng: ENTRANCE.lng + metres / (111_195 * Math.cos((ENTRANCE.lat * Math.PI) / 180)) })

function attraction(id: string, fields: Partial<Attraction>): Attraction {
  return {
    id: `dlp.${id}`, type: 'attraction', name: id, parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
    ratingReason: 'x', sources: [{ label: 'test' }], review: 'draft', durationMin: 5, minHeightCm: null, heightSource: 'draft', thrill: 1, scare: 0,
    fixedWaitMin: 0, location: ENTRANCE, ...fields,
  }
}
function catalogWith(items: CatalogItem[]): Catalog {
  const base = structuredClone(sampleCatalog)
  base.parks[0]!.entrance = ENTRANCE
  return { ...base, items: [...base.items, ...items] }
}

describe('group a day by area (route-optimization spec)', () => {
  test('a day that switches parks gets one park change, areas in walking order', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    const order = grouped(d, real)
    expect(order).toEqual(['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'daw.crushs-coaster', 'daw.frozen-ever-after'])
    expect(walking(d, real)).toBe(95)
    expect(walking({ ...d, items: groupByArea(d, real) }, real)).toBe(48)
  })

  test('items in the same area keep the user order', () => {
    const d = day(['dlp.phantom-manor', 'daw.frozen-ever-after', 'dlp.big-thunder-mountain'])
    expect(grouped(d, real)).toEqual(['dlp.phantom-manor', 'dlp.big-thunder-mountain', 'daw.frozen-ever-after'])
  })

  test('a day that starts in the second park keeps that park first', () => {
    const d = day(['daw.frozen-ever-after', 'dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.peter-pans-flight'])
    expect(grouped(d, real).map((id) => id.slice(0, 3))).toEqual(['daw', 'daw', 'dlp', 'dlp'])
  })

  test('entries no longer in the catalog move to the end', () => {
    const d = day(['dlp.gone', 'dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor'])
    expect(grouped(d, real)).toEqual(['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'daw.frozen-ever-after', 'dlp.gone'])
  })

  test('the nearer area comes first', () => {
    expect(grouped(day(['daw.frozen-ever-after', 'daw.crushs-coaster']), real)).toEqual(['daw.crushs-coaster', 'daw.frozen-ever-after'])
  })

  test('in a park the day leaves, the walk back to the entrance counts', () => {
    // Near the entrance to the east and north, and far to the north. Walking on from the near items
    // to the far one is shortest, but a day that comes back to the entrance does the far one in the middle.
    const catalog = catalogWith([
      attraction('east', { areaId: 'frontierland', location: east(300) }),
      attraction('near-north', { areaId: 'fantasyland', location: north(300) }),
      attraction('far-north', { areaId: 'discoveryland', location: north(1500) }),
    ])
    const dlpOnly = day(['dlp.east', 'dlp.near-north', 'dlp.far-north'])
    expect(grouped(dlpOnly, catalog)).toEqual(['dlp.east', 'dlp.near-north', 'dlp.far-north'])
    const thenOtherPark = day(['dlp.east', 'dlp.near-north', 'dlp.far-north', 'daw.avengers-flight-force'])
    expect(grouped(thenOtherPark, catalog)).toEqual(['dlp.east', 'dlp.far-north', 'dlp.near-north', 'daw.avengers-flight-force'])
  })

  test('a tie keeps the order of first appearance, and the result is repeatable', () => {
    const catalog = catalogWith([
      attraction('here-1', { areaId: 'frontierland', location: north(200) }),
      attraction('here-2', { areaId: 'fantasyland', location: north(200) }),
    ])
    expect(grouped(day(['dlp.here-1', 'dlp.here-2']), catalog)).toEqual(['dlp.here-1', 'dlp.here-2'])
    expect(grouped(day(['dlp.here-2', 'dlp.here-1']), catalog)).toEqual(['dlp.here-2', 'dlp.here-1'])
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.peter-pans-flight', 'daw.crushs-coaster', 'dlp.pirates-of-the-caribbean'])
    expect(groupByArea(d, real)).toEqual(groupByArea(d, real))
  })

  test('firstPark starts the grouped order in the other park', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    const order = grouped({ ...d, items: groupByArea(d, real, { firstPark: 'daw' }) }, real)
    expect(groupByArea(d, real, { firstPark: 'daw' }).map((e) => e.itemId.slice(0, 3))).toEqual(['daw', 'daw', 'dlp', 'dlp'])
    expect(order.slice(0, 2).sort()).toEqual(['daw.crushs-coaster', 'daw.frozen-ever-after'])
    // A park the day does not use, or no option, keeps the park of the first item first.
    expect(groupByArea(d, real, { firstPark: 'dlp' })).toEqual(groupByArea(d, real))
    const dawOnly = day(['daw.frozen-ever-after', 'daw.crushs-coaster'])
    expect(groupByArea(dawOnly, real, { firstPark: 'dlp' })).toEqual(groupByArea(dawOnly, real))
  })

  test('entries keep their keys and show times', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor'])
    expect([...groupByArea(d, real)].sort((a, b) => a.key.localeCompare(b.key))).toEqual(d.items)
  })
})

describe('meals and shows keep their time (route-optimization spec)', () => {
  const arrivalAt = (d: Day, catalog: Catalog, key: string) =>
    scheduleDay(d, catalog).slots.find((s): s is ScheduledSlot => s.kind === 'scheduled' && s.entry.key === key)!

  test('lunch goes where it is reached closest to its old arrival', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'dlp.captain-jacks', 'daw.crushs-coaster', 'dlp.pirates-of-the-caribbean', 'dlp.peter-pans-flight'])
    const target = arrivalAt(d, real, 'k3').arrive
    const order = groupByArea(d, real)
    const chosen = Math.abs(arrivalAt({ ...d, items: order }, real, 'k3').arrive - target)
    const others = order.filter((e) => e.key !== 'k3')
    for (let i = 0; i <= others.length; i++) {
      const alternative = [...others.slice(0, i), d.items[3]!, ...others.slice(i)]
      expect(Math.abs(arrivalAt({ ...d, items: alternative }, real, 'k3').arrive - target)).toBeGreaterThanOrEqual(chosen)
    }
    // The rides are still grouped: Captain Jack's does not pull Pirates out of its area group.
    expect(others.map((e) => e.itemId)).toEqual(groupByArea({ ...d, items: d.items.filter((e) => e.key !== 'k3') }, real).map((e) => e.itemId))
  })

  test('an afternoon parade comes before the first ride that would make the user late', () => {
    const rides = ['dlp.big-thunder-mountain', 'dlp.peter-pans-flight', 'dlp.star-wars-hyperspace-mountain', 'dlp.phantom-manor']
    const d = day([rides[0]!, ['dlp.parade', '17:30'], ...rides.slice(1), ...rides, ...rides], '09:30', '23:00')
    const order = groupByArea(d, sampleCatalog)
    const at = order.findIndex((e) => e.itemId === 'dlp.parade')
    expect(at).toBeGreaterThan(1)
    expect(at).toBeLessThan(order.length - 1)
    expect(arrivalAt({ ...d, items: order }, sampleCatalog, 'k1').lateBy).toBe(0)
    // One ride later and the user would arrive after 17:10.
    const later = [...order.slice(0, at), order[at + 1]!, order[at]!, ...order.slice(at + 2)]
    expect(arrivalAt({ ...d, items: later }, sampleCatalog, 'k1').arrive).toBeGreaterThan(17 * 60 + 10)
  })

  test('a meal planned before a show stays before it', () => {
    const d = day(['dlp.big-thunder-mountain', 'dlp.star-wars-hyperspace-mountain', 'dlp.walts', 'dlp.peter-pans-flight', ['dlp.parade', '13:30'], 'dlp.phantom-manor'])
    const order = groupByArea(d, sampleCatalog).map((e) => e.itemId)
    expect(order.indexOf('dlp.walts')).toBeLessThan(order.indexOf('dlp.parade'))
  })

  test('a lunch with a meal time goes where it is reached closest to that time', () => {
    const rides = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster', 'dlp.pirates-of-the-caribbean', 'dlp.peter-pans-flight'])
    const d: Day = { ...rides, items: [{ key: 'lunch', itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' }, ...rides.items] }
    const order = groupByArea(d, real)
    const chosen = Math.abs(arrivalAt({ ...d, items: order }, real, 'lunch').arrive - 12 * 60)
    const others = order.filter((e) => e.key !== 'lunch')
    for (let i = 0; i <= others.length; i++) {
      const alternative = [...others.slice(0, i), d.items[0]!, ...others.slice(i)]
      expect(Math.abs(arrivalAt({ ...d, items: alternative }, real, 'lunch').arrive - 12 * 60)).toBeGreaterThanOrEqual(chosen)
    }
    expect(order.findIndex((e) => e.key === 'lunch')).toBeGreaterThan(0) // not left first, where it was listed
    expect(arrivalAt({ ...d, items: order }, real, 'lunch').lateBy).toBe(0)
  })

  test('a show that cannot be reached in time is placed right away', () => {
    const d = day(['dlp.big-thunder-mountain', 'dlp.phantom-manor', ['dlp.parade', '09:40']])
    expect(grouped(d, sampleCatalog)[0]).toBe('dlp.parade')
  })
})
