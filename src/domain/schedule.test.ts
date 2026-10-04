import { describe, expect, test } from 'vitest'
import type { Attraction, Catalog, CatalogItem, Restaurant, Show } from './catalog'
import { sampleCatalog } from '../test/sampleCatalog'
import { scheduleDay, type ScheduledSlot } from './schedule'
import { formatClock } from './time'
import type { Day } from './trip'
import { PARK_CHANGE_MIN, distanceMetres, walkMinutes } from './walking'
import { attractionWait } from './waits'

const ENTRANCE = { lat: 48.87, lng: 2.78 }
/** A point `metres` north of the entrance. */
const north = (metres: number) => ({ lat: ENTRANCE.lat + metres / 111_195, lng: ENTRANCE.lng })
const src = [{ label: 'test' }]

function attraction(id: string, fields: Partial<Attraction>): Attraction {
  return {
    id: `dlp.${id}`, type: 'attraction', name: id, parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
    ratingReason: 'x', sources: src, review: 'draft', durationMin: 5, minHeightCm: null, heightSource: 'draft', thrill: 1, scare: 0,
    fixedWaitMin: 0, location: ENTRANCE, ...fields,
  }
}
function restaurant(id: string, fields: Partial<Restaurant>): Restaurant {
  return {
    id: `dlp.${id}`, type: 'restaurant', name: id, parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
    ratingReason: 'x', sources: src, review: 'draft', service: 'table', location: ENTRANCE, ...fields,
  }
}
function show(id: string, fields: Partial<Show>): Show {
  return {
    id: `dlp.${id}`, type: 'show', name: id, parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
    ratingReason: 'x', sources: src, review: 'draft', durationMin: 30, times: ['13:30', '17:30'], arriveEarlyMin: 20,
    location: north(170), ...fields,
  }
}

function catalogWith(items: CatalogItem[]): Catalog {
  const base = structuredClone(sampleCatalog)
  base.parks[0]!.entrance = ENTRANCE
  return { ...base, items: [...base.items, ...items] }
}

function day(start: string, end: string, itemIds: (string | [string, string])[], date = '2026-08-12'): Day {
  return {
    id: 'd1', date, start, end,
    items: itemIds.map((x, i) => (typeof x === 'string' ? { key: `k${i}`, itemId: x } : { key: `k${i}`, itemId: x[0], showTime: x[1] })),
  }
}

const scheduled = (s: ReturnType<typeof scheduleDay>) => s.slots.filter((x): x is ScheduledSlot => x.kind === 'scheduled')

describe('day schedule (day-schedule spec)', () => {
  test('first item: walk from the entrance, then wait, then ride', () => {
    expect(walkMinutes(ENTRANCE, north(120))).toBe(4)
    const c = catalogWith([attraction('ride', { location: north(120), fixedWaitMin: 15, durationMin: 4 })])
    const [slot] = scheduled(scheduleDay(day('09:30', '18:00', ['dlp.ride']), c))
    expect(formatClock(slot!.arrive)).toBe('09:34')
    expect(formatClock(slot!.start)).toBe('09:49')
    expect(formatClock(slot!.end)).toBe('09:53')
    expect(slot!.walk).toBe(4)
    expect(slot!.wait).toBe(15)
  })

  test('moving a ride to the morning recalculates its wait for the earlier arrival', () => {
    const c = catalogWith([restaurant('long-lunch', { mealMin: 210 })])
    const late = scheduled(scheduleDay(day('09:30', '22:00', ['dlp.long-lunch', 'dlp.big-thunder-mountain']), c))[1]!
    const early = scheduled(scheduleDay(day('09:30', '22:00', ['dlp.big-thunder-mountain', 'dlp.long-lunch']), c))[0]!
    expect(early.arrive).toBeLessThan(late.arrive)
    expect(early.wait).toBeLessThan(late.wait)
  })

  test('free time before a show when arriving early', () => {
    // previous item ends 16:50, 5-minute walk, parade 17:30 needs arrival 20 min early
    const c = catalogWith([attraction('filler', { durationMin: 49 }), show('parade-test', {})])
    expect(walkMinutes(ENTRANCE, north(170))).toBe(5)
    const [filler, parade] = scheduled(scheduleDay(day('16:00', '22:00', ['dlp.filler', ['dlp.parade-test', '17:30']]), c))
    expect(formatClock(filler!.end)).toBe('16:50')
    expect(parade!.freeBefore).toBe(15)
    expect(parade!.lateBy).toBe(0)
    expect(formatClock(parade!.start)).toBe('17:30')
    expect(formatClock(parade!.end)).toBe('18:00')
  })

  test('late for a show: flagged and later items start from the show end', () => {
    const c = catalogWith([attraction('filler', { durationMin: 74 }), show('parade-test', {}), attraction('after', { location: north(170) })])
    const s = scheduleDay(day('16:00', '22:00', ['dlp.filler', ['dlp.parade-test', '17:30'], 'dlp.after']), c)
    const [, parade, after] = scheduled(s)
    expect(formatClock(parade!.arrive)).toBe('17:20')
    expect(parade!.lateBy).toBe(10)
    expect(parade!.freeBefore).toBe(0)
    expect(formatClock(after!.arrive)).toBe('18:01') // show ends 18:00, 1-minute walk on the spot
  })

  test('table-service meal takes its wait plus meal duration', () => {
    const c = catalogWith([attraction('filler', { durationMin: 179 }), restaurant('lunch', { mealMin: 75 })])
    const [, lunch] = scheduled(scheduleDay(day('09:30', '22:00', ['dlp.filler', 'dlp.lunch']), c))
    expect(formatClock(lunch!.arrive)).toBe('12:31')
    expect(lunch!.wait).toBe(15) // table service, lunch peak
    expect(lunch!.end - lunch!.arrive).toBe(15 + 75)
  })

  describe('meal times (optimize-day-route: Meals in the timeline)', () => {
    // A filler ride at the entrance (1-minute walk), then lunch 170 m north (5-minute walk).
    const c = catalogWith([attraction('filler', {}), restaurant('lunch', { location: north(170), mealMin: 75 }), attraction('after', { location: north(170) })])
    const mealDay = (fillerMin: number, mealTime?: string): [Catalog, Day] => {
      const cat = structuredClone(c)
      ;(cat.items.find((i) => i.id === 'dlp.filler') as Attraction).durationMin = fillerMin
      return [cat, { id: 'd1', date: '2026-08-12', start: '10:00', end: '22:00', items: [{ key: 'a', itemId: 'dlp.filler' }, { key: 'b', itemId: 'dlp.lunch', ...(mealTime ? { mealTime } : {}) }, { key: 'c', itemId: 'dlp.after' }] }]
    }

    test('early for lunch: free time until 30 minutes before the meal time, and the wait starts then', () => {
      const [cat, d] = mealDay(59, '12:00') // filler ends 11:00
      const [filler, lunch] = scheduled(scheduleDay(d, cat))
      expect(formatClock(filler!.end)).toBe('11:00')
      expect(formatClock(lunch!.arrive)).toBe('11:05')
      expect(lunch!.freeBefore).toBe(25)
      expect(lunch!.lateBy).toBe(0)
      expect(formatClock(lunch!.start - lunch!.wait)).toBe('11:30')
      expect(lunch!.wait).toBe(5) // table service, before the lunch peak
      expect(lunch!.end - lunch!.start).toBe(75)
    })

    test('late for lunch: flagged, and the next items start from the meal end', () => {
      const [cat, d] = mealDay(159, '12:00') // filler ends 12:40, lunch reached 12:45
      const [, lunch, after] = scheduled(scheduleDay(d, cat))
      expect(formatClock(lunch!.arrive)).toBe('12:45')
      expect(lunch!.lateBy).toBe(15)
      expect(lunch!.freeBefore).toBe(0)
      expect(lunch!.wait).toBe(15) // lunch peak
      expect(after!.arrive).toBe(lunch!.end + 1)
    })

    test('within the window: neither free time nor late', () => {
      const [cat, d] = mealDay(109, '12:00') // reached 11:55
      const [, lunch] = scheduled(scheduleDay(d, cat))
      expect([lunch!.freeBefore, lunch!.lateBy]).toEqual([0, 0])
    })

    test('a restaurant without a meal time starts as soon as the user arrives and is never late', () => {
      for (const fillerMin of [59, 159]) {
        const [cat, d] = mealDay(fillerMin)
        const [, lunch] = scheduled(scheduleDay(d, cat))
        expect(lunch!.freeBefore).toBe(0)
        expect(lunch!.lateBy).toBe(0)
        expect(lunch!.start).toBe(lunch!.arrive + lunch!.wait)
      }
    })

    test('changing a meal time from 12:00 to 13:00 turns the start into free time', () => {
      const [cat, noon] = mealDay(109, '12:00') // filler ends 11:50, lunch reached 11:55
      const [, at12] = scheduled(scheduleDay(noon, cat))
      expect(at12!.freeBefore).toBe(0)
      const [, at13] = scheduled(scheduleDay({ ...noon, items: noon.items.map((e) => (e.key === 'b' ? { ...e, mealTime: '13:00' } : e)) }, cat))
      expect(at13!.freeBefore).toBe(35)
      expect(formatClock(at13!.start - at13!.wait)).toBe('12:30')
    })

    test('the breakdown still adds up with meal windows', () => {
      for (const [fillerMin, mealTime] of [[59, '12:00'], [159, '12:00'], [104, '13:00']] as const) {
        const [cat, d] = mealDay(fillerMin, mealTime)
        const s = scheduleDay(d, cat)
        const b = s.breakdown
        expect(b.queueing + b.attractions + b.meals + b.shows + b.walking + b.free).toBe(s.end - s.windowStart)
        expect(b.meals).toBe(75)
      }
    })
  })

  test('fits: last item ends 17:20 in a window ending 18:00', () => {
    const c = catalogWith([attraction('filler', { durationMin: 59 })])
    const s = scheduleDay(day('16:20', '18:00', ['dlp.filler']), c)
    expect(formatClock(s.end)).toBe('17:20')
    expect(s.fits).toBe(true)
    expect(s.spare).toBe(40)
  })

  test('over: ends 18:25, every item ending after 18:00 is marked', () => {
    const c = catalogWith([attraction('a', { durationMin: 49 }), attraction('b', { durationMin: 50 }), attraction('c', { durationMin: 23 })])
    const s = scheduleDay(day('16:20', '18:00', ['dlp.a', 'dlp.b', 'dlp.c']), c)
    expect(formatClock(s.end)).toBe('18:25')
    expect(s.fits).toBe(false)
    expect(s.over).toBe(25)
    expect(scheduled(s).map((x) => x.afterWindow)).toEqual([false, true, true])
  })

  test('breakdown adds up to the timeline length', () => {
    const c = catalogWith([show('parade-test', {}), restaurant('lunch', {})])
    const s = scheduleDay(
      day('09:30', '23:00', ['dlp.big-thunder-mountain', 'dlp.lunch', 'dlp.peter-pans-flight', ['dlp.parade-test', '17:30'], 'dlp.phantom-manor']),
      c,
    )
    const b = s.breakdown
    expect(b.queueing + b.attractions + b.meals + b.shows + b.walking + b.free).toBe(s.end - s.windowStart)
    expect(b.meals).toBe(75)
    expect(b.shows).toBeGreaterThanOrEqual(30)
  })

  test('unsuitable items stay in the timeline with their reason', () => {
    const s = scheduleDay(day('09:30', '18:00', ['dlp.star-wars-hyperspace-mountain']), sampleCatalog, { heightCm: 110 })
    const [slot] = scheduled(s)
    expect(slot!.unsuitable).toBe('Needs 120 cm')
    expect(slot!.end).toBeGreaterThan(slot!.start)
  })

  test('items missing from the catalog are skipped', () => {
    const s = scheduleDay(day('09:30', '18:00', ['dlp.retired-ride', 'dlp.peter-pans-flight']), sampleCatalog)
    expect(s.slots[0]).toEqual({ kind: 'missing', entry: { key: 'k0', itemId: 'dlp.retired-ride' } })
    const [pan] = scheduled(s)
    expect(pan!.walk).toBe(walkMinutes(sampleCatalog.parks[0]!.entrance, pan!.item.location!))
  })

  test('an empty day fits with the whole window spare', () => {
    const s = scheduleDay(day('10:00', '18:00', []), sampleCatalog)
    expect(s.fits).toBe(true)
    expect(s.spare).toBe(480)
  })

  test('a day whose first item is in the second park starts at that park entrance', () => {
    const s = scheduleDay(day('09:30', '18:00', ['daw.avengers-flight-force']), sampleCatalog)
    const [slot] = scheduled(s)
    expect(slot!.walk).toBe(walkMinutes(sampleCatalog.parks[1]!.entrance, slot!.item.location!))
    expect(slot!.parkChange).toBe(false)
    expect(s.parks).toEqual(['daw'])
  })

  test('switching parks routes via both entrances, adds the park-change time and is labelled', () => {
    const s = scheduleDay(day('09:30', '18:00', ['dlp.big-thunder-mountain', 'daw.avengers-flight-force', 'daw.avengers-flight-force']), sampleCatalog)
    const [thunder, flight, again] = scheduled(s)
    const [dlp, daw] = sampleCatalog.parks
    const metres = distanceMetres(thunder!.item.location!, dlp!.entrance) + distanceMetres(dlp!.entrance, daw!.entrance) + distanceMetres(daw!.entrance, flight!.item.location!)
    expect(flight!.walk).toBe(Math.ceil((metres * 1.35) / 65) + 1 + PARK_CHANGE_MIN)
    expect([thunder!.parkChange, flight!.parkChange, again!.parkChange]).toEqual([false, true, false])
    expect(s.parks).toEqual(['dlp', 'daw'])
  })

  test("each item's wait uses its own park's crowd level for the month", () => {
    const c = structuredClone(sampleCatalog)
    c.parks[0]!.monthFactors[7] = 1.4 // busy August at Disneyland Park
    c.parks[1]!.monthFactors[7] = 0.6 // quiet August at Disney Adventure World
    const [dlpPark, dawPark] = c.parks
    const s = scheduleDay(day('09:30', '20:00', ['dlp.big-thunder-mountain', 'daw.avengers-flight-force']), c)
    const [thunder, flight] = scheduled(s)
    expect(thunder!.wait).toBe(attractionWait(thunder!.item as never, dlpPark!, 8, thunder!.arrive).minutes)
    expect(flight!.wait).toBe(attractionWait(flight!.item as never, dawPark!, 8, flight!.arrive).minutes)
    expect(flight!.wait).not.toBe(attractionWait(flight!.item as never, dlpPark!, 8, flight!.arrive).minutes)
  })
})
