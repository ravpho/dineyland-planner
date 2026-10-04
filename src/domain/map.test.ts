import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { sampleCatalog } from '../test/sampleCatalog'
import { PARK_IDS, parseCatalog, type Catalog } from './catalog'
import {
  MAX_ZOOM,
  areaWalkTable,
  areaZones,
  buildRoute,
  convexHull,
  inBounds,
  panView,
  parkProjection,
  placeLabels,
  projectionAround,
  viewBoxOf,
  walkFromLastStop,
  walksToAreas,
  zonePath,
  zoomView,
  type LabelCandidate,
} from './map'
import { scheduleDay, type ScheduledSlot } from './schedule'
import type { Day } from './trip'
import { distanceMetres, entranceOf } from './walking'

const real: Catalog = parseCatalog(catalogJson)
const item = (c: Catalog, id: string) => c.items.find((i) => i.id === id)!

function day(itemIds: string[]): Day {
  return { id: 'd1', date: '2026-08-12', start: '09:30', end: '22:00', items: itemIds.map((itemId, i) => ({ key: `k${i}`, itemId })) }
}

/** The walk the timeline shows for `itemId` once it is appended to the day. */
function appendedWalk(c: Catalog, itemIds: string[], itemId: string) {
  const slots = scheduleDay(day([...itemIds, itemId]), c).slots.filter((s): s is ScheduledSlot => s.kind === 'scheduled')
  const last = slots.at(-1)!
  return { minutes: last.walk, parkChange: last.parkChange }
}

describe('projection (Decision 1)', () => {
  const origin = { lat: 48.87, lng: 2.78 }
  const project = projectionAround(origin)

  test('0.001° of latitude is about 111 m, and north is up', () => {
    const p = project({ lat: 48.871, lng: 2.78 })
    expect(p.x).toBeCloseTo(0, 6)
    expect(p.y).toBeCloseTo(-111.2, 1)
  })

  test('x distances are scaled by cos(latitude)', () => {
    const p = project({ lat: 48.87, lng: 2.781 })
    expect(p.x).toBeCloseTo(111.195 * Math.cos((48.87 * Math.PI) / 180), 1)
    expect(p.y).toBeCloseTo(0, 6)
  })

  test('map distances match the walking distance within a park', () => {
    const a = item(real, 'dlp.big-thunder-mountain').location!
    const b = item(real, 'dlp.star-wars-hyperspace-mountain').location!
    const { project } = parkProjection(real, 'dlp')
    const pa = project(a)
    const pb = project(b)
    expect(Math.hypot(pa.x - pb.x, pa.y - pb.y)).toBeCloseTo(distanceMetres(a, b), -1)
  })

  test.each(PARK_IDS)('the %s entrance and every item fall inside the bounds', (parkId) => {
    const projection = parkProjection(real, parkId)
    expect(inBounds(projection.project(entranceOf(real, parkId)), projection.bounds)).toBe(true)
    for (const i of real.items.filter((x) => x.parkId === parkId && x.location)) {
      expect(inBounds(projection.project(i.location!), projection.bounds)).toBe(true)
    }
  })
})

describe('area zones (Decision 2)', () => {
  test('hull of a square with an inner point is the four corners', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    const hull = convexHull([...square, { x: 5, y: 4 }])
    expect(hull).toHaveLength(4)
    expect(hull).toEqual(expect.arrayContaining(square))
    expect(zonePath(hull)).toMatch(/^M.*Z$/)
  })

  test('one point is a dot and two points a capsule', () => {
    const one = convexHull([{ x: 3, y: 4 }, { x: 3, y: 4 }])
    expect(one).toEqual([{ x: 3, y: 4 }])
    expect(zonePath(one)).toBe('M3 4L3 4')
    const two = convexHull([{ x: 0, y: 0 }, { x: 8, y: 6 }])
    expect(two).toHaveLength(2)
    expect(zonePath(two)).toBe('M0 0L8 6')
  })

  test('points on one line keep the two ends', () => {
    expect(convexHull([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 10 }])).toEqual([{ x: 0, y: 0 }, { x: 10, y: 10 }])
  })

  test.each(PARK_IDS)('the %s map has a zone for each of its five areas', (parkId) => {
    const zones = areaZones(real, parkProjection(real, parkId))
    expect(zones.map((z) => z.areaId)).toEqual(real.parks.find((p) => p.id === parkId)!.areas.map((a) => a.id))
  })
})

describe('label placement (Decision 3)', () => {
  const label = (id: string, x: number, priority: number, always = false): LabelCandidate => ({ id, x, y: 0, width: 50, height: 12, priority, always })

  test('of two overlapping labels the higher-rated one is kept', () => {
    expect(placeLabels([label('ok', 0, 3), label('best', 20, 5)])).toEqual(new Set(['best']))
  })

  test('labels that do not overlap are all shown', () => {
    expect(placeLabels([label('a', 0, 3), label('b', 60, 3)])).toEqual(new Set(['a', 'b']))
  })

  test('the selected item always keeps its label', () => {
    expect(placeLabels([label('best', 0, 5), label('selected', 20, 1, true)])).toEqual(new Set(['selected']))
  })
})

describe('pan and zoom', () => {
  const bounds = { minX: -300, minY: -300, maxX: 300, maxY: 300 }

  test('zoom 1 shows the whole park; zoom 2 shows half the width', () => {
    expect(viewBoxOf({ zoom: 1, centre: { x: 0, y: 0 } }, bounds)).toEqual({ x: -300, y: -300, width: 600, height: 600 })
    const zoomed = zoomView({ zoom: 1, centre: { x: 0, y: 0 } }, 2, bounds)
    expect(viewBoxOf(zoomed, bounds)).toEqual({ x: -150, y: -150, width: 300, height: 300 })
  })

  test('zoom stays between 1× and 4× and the view never leaves the park', () => {
    expect(zoomView({ zoom: 3, centre: { x: 0, y: 0 } }, 2, bounds).zoom).toBe(MAX_ZOOM)
    expect(zoomView({ zoom: 1, centre: { x: 0, y: 0 } }, 0.5, bounds).zoom).toBe(1)
    const panned = panView({ zoom: 2, centre: { x: 0, y: 0 } }, 1000, -1000, bounds)
    expect(viewBoxOf(panned, bounds)).toEqual({ x: 0, y: -300, width: 300, height: 300 })
  })

  test('zooming around a point keeps that point in place on screen', () => {
    const anchor = { x: 100, y: 50 }
    const before = viewBoxOf({ zoom: 1, centre: { x: 0, y: 0 } }, bounds)
    const after = viewBoxOf(zoomView({ zoom: 1, centre: { x: 0, y: 0 } }, 2, bounds, anchor), bounds)
    expect((anchor.x - after.x) / after.width).toBeCloseTo((anchor.x - before.x) / before.width, 6)
    expect((anchor.y - after.y) / after.height).toBeCloseTo((anchor.y - before.y) / before.height, 6)
  })
})

describe('walking times on the map (Decision 4)', () => {
  test('walk from the last stop equals the timeline after appending (same park)', () => {
    const schedule = scheduleDay(day(['dlp.big-thunder-mountain']), sampleCatalog)
    expect(walkFromLastStop(schedule, item(sampleCatalog, 'dlp.phantom-manor'), sampleCatalog)).toEqual(
      appendedWalk(sampleCatalog, ['dlp.big-thunder-mountain'], 'dlp.phantom-manor'),
    )
  })

  test('walk from the last stop equals the timeline after appending (other park)', () => {
    const ids = ['dlp.big-thunder-mountain', 'daw.avengers-flight-force']
    const walk = walkFromLastStop(scheduleDay(day(ids), sampleCatalog), item(sampleCatalog, 'dlp.phantom-manor'), sampleCatalog)
    expect(walk).toEqual(appendedWalk(sampleCatalog, ids, 'dlp.phantom-manor'))
    expect(walk!.parkChange).toBe(true)
  })

  test('with real data, an item without coordinates matches too', () => {
    const ids = ['daw.frozen-ever-after']
    expect(walkFromLastStop(scheduleDay(day(ids), real), item(real, 'dlp.meet-mickey-mouse'), real)).toEqual(appendedWalk(real, ids, 'dlp.meet-mickey-mouse'))
  })

  test('no day or an empty day has no last stop', () => {
    const phantom = item(sampleCatalog, 'dlp.phantom-manor')
    expect(walkFromLastStop(undefined, phantom, sampleCatalog)).toBeUndefined()
    expect(walkFromLastStop(scheduleDay(day([]), sampleCatalog), phantom, sampleCatalog)).toBeUndefined()
  })

  test('walks to each area of the item’s park', () => {
    const walks = walksToAreas(item(real, 'dlp.big-thunder-mountain'), real)
    expect(walks.map((w) => w.name)).toEqual(['Main Street, U.S.A.', 'Frontierland', 'Adventureland', 'Fantasyland', 'Discoveryland'])
    const frontier = walks.find((w) => w.areaId === 'frontierland')!.minutes
    expect(Math.min(...walks.map((w) => w.minutes))).toBe(frontier)
  })

  test('the area table is symmetric with a dash on the diagonal', () => {
    const table = areaWalkTable(real, 'dlp')
    expect(table.areas).toHaveLength(5)
    table.minutes.forEach((row, i) =>
      row.forEach((m, j) => {
        if (i === j) expect(m).toBeNull()
        else {
          expect(m).toBeGreaterThan(1)
          expect(m).toBe(table.minutes[j]![i])
        }
      }),
    )
  })
})

describe('route (Decision 5)', () => {
  const dlp = parkProjection(real, 'dlp')
  const daw = parkProjection(real, 'daw')

  test('three Disneyland Park stops are numbered 1, 2, 3 and joined in order', () => {
    const ids = ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight']
    const route = buildRoute(scheduleDay(day(ids), real), real, dlp)
    expect(route.stops.map((s) => [s.itemId, s.numbers])).toEqual(ids.map((id, i) => [id, [i + 1]]))
    expect(route.segments).toEqual([
      { from: route.stops[0]!.point, to: route.stops[1]!.point, dashed: false },
      { from: route.stops[1]!.point, to: route.stops[2]!.point, dashed: false },
    ])
    expect(route.markers).toEqual([])
  })

  test('Big Thunder Mountain → Frozen Ever After leaves Disneyland Park by a dashed line to the entrance', () => {
    const schedule = scheduleDay(day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor']), real)
    const route = buildRoute(schedule, real, dlp)
    const entrance = dlp.project(entranceOf(real, 'dlp'))
    expect(route.stops.map((s) => s.numbers)).toEqual([[1], [3]])
    expect(route.segments).toEqual([
      { from: route.stops[0]!.point, to: entrance, dashed: true },
      { from: entrance, to: route.stops[1]!.point, dashed: true },
    ])
    expect(route.markers.map((m) => m.label)).toEqual(['to Disney Adventure World', 'from Disney Adventure World'])
    expect(route.markers[0]!.point).toEqual(entrance)

    const other = buildRoute(schedule, real, daw)
    expect(other.stops.map((s) => [s.itemId, s.numbers])).toEqual([['daw.frozen-ever-after', [2]]])
    expect(other.markers.map((m) => m.label)).toEqual(['from Disneyland Park', 'to Disneyland Park'])
  })

  test('an item planned twice carries both numbers; no day draws nothing', () => {
    const ids = ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.big-thunder-mountain']
    expect(buildRoute(scheduleDay(day(ids), real), real, dlp).stops.map((s) => s.numbers)).toEqual([[1, 3], [2]])
    expect(buildRoute(undefined, real, dlp)).toEqual({ stops: [], segments: [], markers: [] })
  })

  test('items missing from the catalog are skipped', () => {
    const route = buildRoute(scheduleDay(day(['dlp.gone', 'dlp.big-thunder-mountain']), real), real, dlp)
    expect(route.stops.map((s) => s.numbers)).toEqual([[1]])
  })
})
