import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { parseCatalog, type Catalog } from './catalog'
import { groupByArea } from './grouping'
import { BUDGET_PER_SEED, optimizeRoute, searchRoute } from './optimize'
import { dayRank, isBetter, type Rank } from './route'
import { scheduleDay, type ScheduledSlot } from './schedule'
import { formatClock } from './time'
import type { Day, PlanItem } from './trip'

const real: Catalog = parseCatalog(catalogJson)

type Entry = string | [itemId: string, extra: Partial<PlanItem>]
/** An August day from 09:30 to 23:00, the default window for a new day that month. */
function day(entries: Entry[]): Day {
  return {
    id: 'd1', date: '2026-08-12', start: '09:30', end: '23:00',
    items: entries.map((x, i) => (typeof x === 'string' ? { key: `k${i}`, itemId: x } : { key: `k${i}`, itemId: x[0], ...x[1] })),
  }
}
const ids = (items: PlanItem[]) => items.map((e) => e.itemId)
const timeline = (d: Day, items = d.items) => scheduleDay({ ...d, items }, real)
const ends = (d: Day, items = d.items) => formatClock(timeline(d, items).end)
const queueWalk = (d: Day, items = d.items) => {
  const b = timeline(d, items).breakdown
  return b.queueing + b.walking
}
const slots = (d: Day, items = d.items) => timeline(d, items).slots.filter((s): s is ScheduledSlot => s.kind === 'scheduled')

function permutations<T>(list: T[]): T[][] {
  if (list.length <= 1) return [list]
  return list.flatMap((first, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map((rest) => [first, ...rest]))
}

describe('optimize the route (route-optimization spec)', () => {
  test('busiest ride at opening: Crush’s Coaster before Tower of Terror, ending at 10:37 instead of 10:42', () => {
    const d = day(['daw.twilight-zone-tower-of-terror', 'daw.crushs-coaster'])
    expect(ids(groupByArea(d, real))).toEqual(['daw.twilight-zone-tower-of-terror', 'daw.crushs-coaster'])
    const order = optimizeRoute(d, real)
    expect(ids(order)).toEqual(['daw.crushs-coaster', 'daw.twilight-zone-tower-of-terror'])
    expect([ends(d), ends(d, order)]).toEqual(['10:42', '10:37'])
  })

  test('other park first: one park change, ending at 13:19 instead of 14:29 (13:32 grouped)', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    const order = optimizeRoute(d, real)
    expect(ids(order)).toEqual(['daw.crushs-coaster', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'dlp.big-thunder-mountain'])
    expect(slots(d, order).filter((s) => s.parkChange)).toHaveLength(1)
    expect([ends(d), ends(d, groupByArea(d, real)), ends(d, order)]).toEqual(['14:29', '13:32', '13:19'])
    expect([queueWalk(d), queueWalk(d, order)]).toEqual([280, 210])
  })

  test('entries no longer in the catalog move to the end', () => {
    const d = day(['dlp.gone', 'dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    const order = optimizeRoute(d, real)
    expect(order.at(-1)!.itemId).toBe('dlp.gone')
    expect(order).toHaveLength(5)
  })

  test('a day that ends with the fireworks still ends with the show, with less queueing and walking', () => {
    const d = day(['dlp.big-thunder-mountain', 'dlp.peter-pans-flight', 'dlp.phantom-manor', 'dlp.star-wars-hyperspace-mountain', ['dlp.disney-tales-of-magic', { showTime: '22:00' }]])
    const order = optimizeRoute(d, real)
    expect([ends(d), ends(d, order)]).toEqual(['22:20', '22:20'])
    expect([queueWalk(d), queueWalk(d, order)]).toEqual([155, 147])
    expect(order.at(-1)!.itemId).toBe('dlp.disney-tales-of-magic')
  })

  test('already the quickest order: the same entries come back in the same order', () => {
    const d = day(['daw.crushs-coaster', 'daw.frozen-ever-after'])
    const result = searchRoute(d, real)
    expect(result.changed).toBe(false)
    expect(result.items).toBe(d.items)
  })

  test('the same day always gives the same result', () => {
    const d = day(['dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.peter-pans-flight', 'dlp.phantom-manor', 'daw.frozen-ever-after', 'dlp.star-wars-hyperspace-mountain', 'daw.ratatouille-the-adventure'])
    expect(optimizeRoute(d, real)).toEqual(optimizeRoute(structuredClone(d), real))
  })

  test('on small days, the result ranks as well as the best of every order', () => {
    const small = [
      ['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'],
      ['daw.twilight-zone-tower-of-terror', 'daw.crushs-coaster'],
      ['daw.spider-man-web-adventure', 'daw.crushs-coaster'],
      ['dlp.big-thunder-mountain', 'dlp.peter-pans-flight'],
      ['dlp.pirates-of-the-caribbean', 'dlp.peter-pans-flight'],
      ['dlp.phantom-manor', 'dlp.big-thunder-mountain', 'dlp.peter-pans-flight'],
      ['daw.frozen-ever-after', 'daw.crushs-coaster', 'daw.ratatouille-the-adventure', 'daw.twilight-zone-tower-of-terror'],
      ['dlp.big-thunder-mountain', 'dlp.peter-pans-flight', 'dlp.phantom-manor', 'dlp.star-wars-hyperspace-mountain', 'dlp.pirates-of-the-caribbean', 'dlp.its-a-small-world'],
    ]
    for (const rides of small) {
      const d = day(rides)
      let bestRank: Rank | undefined
      for (const items of permutations(d.items)) {
        const r = dayRank({ ...d, items }, real)
        if (!bestRank || isBetter(r, bestRank)) bestRank = r
      }
      expect(dayRank({ ...d, items: optimizeRoute(d, real) }, real)).toEqual(bestRank)
    }
  })

  describe('show times (Optimizing chooses show times)', () => {
    const LION_KING = 'dlp.the-lion-king-rhythms-of-the-pride-lands'
    const lionKingDay = (extra: Partial<PlanItem>) =>
      day([
        'daw.crushs-coaster', 'daw.frozen-ever-after', ['dlp.au-chalet-de-la-marionnette', { mealTime: '12:00' }], 'dlp.big-thunder-mountain',
        'dlp.phantom-manor', 'dlp.peter-pans-flight', [LION_KING, { showTime: '16:45', ...extra }], 'dlp.star-wars-hyperspace-mountain',
      ])

    test('an earlier performance fits better: the show moves from 16:45 to 13:10, after lunch', () => {
      const d = lionKingDay({})
      const order = optimizeRoute(d, real)
      const show = order.find((e) => e.itemId === LION_KING)!
      expect(show.showTime).toBe('13:10')
      expect(order.findIndex((e) => e.itemId === LION_KING)).toBeGreaterThan(order.findIndex((e) => e.itemId === 'dlp.au-chalet-de-la-marionnette'))
      const locked = optimizeRoute(lionKingDay({ timeLocked: true }), real)
      expect(timeline(d, order).end).toBeLessThan(timeline(d, locked).end)
      expect(slots(d, order).every((s) => s.lateBy === 0)).toBe(true)
    })

    test('a locked show keeps its time and only the order changes', () => {
      const d = lionKingDay({ timeLocked: true })
      const result = searchRoute(d, real)
      expect(result.changed).toBe(true)
      expect(result.items.find((e) => e.itemId === LION_KING)).toBe(d.items[6])
    })

    test('a show whose only typical time is its current one is left alone', () => {
      const d = day(['dlp.big-thunder-mountain', ['dlp.disney-stars-on-parade', { showTime: '11:30' }], 'dlp.peter-pans-flight', 'dlp.phantom-manor'])
      const parade = optimizeRoute(d, real).find((e) => e.itemId === 'dlp.disney-stars-on-parade')!
      expect(parade).toBe(d.items[1])
    })
  })

  describe('meals and shows (Optimizing never makes the day worse; Meals and shows keep their time)', () => {
    const LION_KING = 'dlp.the-lion-king-rhythms-of-the-pride-lands'
    const lateness = (d: Day, items: PlanItem[]) => slots(d, items).reduce((sum, s) => sum + s.lateBy, 0)
    const slotOf = (d: Day, items: PlanItem[], itemId: string) => slots(d, items).find((s) => s.item.id === itemId)!

    test('a parade reached on time stays on time', () => {
      const d = day(['dlp.big-thunder-mountain', ['dlp.disney-stars-on-parade', { showTime: '11:30' }], 'dlp.peter-pans-flight', 'dlp.phantom-manor', 'dlp.star-wars-hyperspace-mountain', 'dlp.pirates-of-the-caribbean'])
      expect(slotOf(d, d.items, 'dlp.disney-stars-on-parade').lateBy).toBe(0)
      const order = optimizeRoute(d, real)
      expect(order).not.toBe(d.items)
      expect(slotOf(d, order, 'dlp.disney-stars-on-parade').lateBy).toBe(0)
    })

    test('a late show is made reachable', () => {
      const tenItems = (extra: Partial<PlanItem>) =>
        day([
          'dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.peter-pans-flight', 'dlp.au-chalet-de-la-marionnette', 'dlp.phantom-manor',
          'daw.frozen-ever-after', [LION_KING, { showTime: '15:45', ...extra }], 'dlp.star-wars-hyperspace-mountain', 'daw.ratatouille-the-adventure', 'dlp.pirates-of-the-caribbean',
        ])
      for (const d of [tenItems({ timeLocked: true }), tenItems({})]) {
        expect(slotOf(d, d.items, LION_KING).lateBy).toBe(108)
        const order = optimizeRoute(d, real)
        expect(lateness(d, order)).toBe(0)
        expect(timeline(d, order).end).toBeLessThan(timeline(d).end)
      }
      const locked = tenItems({ timeLocked: true })
      expect(optimizeRoute(locked, real).find((e) => e.itemId === LION_KING)!.showTime).toBe('15:45')
    })

    test('being on time wins even when it ends the day later', () => {
      const d: Day = { ...day(['dlp.disneyland-railroad', ['dlp.disney-stars-on-parade', { showTime: '11:30' }]]), start: '10:20' }
      const before = dayRank(d, real)
      const order = optimizeRoute(d, real)
      const after = dayRank({ ...d, items: order }, real)
      expect(before[0]).toBeGreaterThan(0)
      expect(after[0]).toBe(0)
      expect(after[1]).toBeGreaterThan(before[1])
      expect(ids(order)).toEqual(['dlp.disney-stars-on-parade', 'dlp.disneyland-railroad'])
    })

    test('lunch at 12:00 and dinner at 18:00 are both reached within 30 minutes of their times', () => {
      const d = day([
        'dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.peter-pans-flight', ['dlp.au-chalet-de-la-marionnette', { mealTime: '12:00' }], 'dlp.phantom-manor',
        'daw.frozen-ever-after', 'dlp.star-wars-hyperspace-mountain', 'daw.ratatouille-the-adventure', 'dlp.pirates-of-the-caribbean', 'daw.spider-man-web-adventure',
        ['daw.bistrot-chez-remy', { mealTime: '18:00' }], 'dlp.its-a-small-world',
      ])
      expect(slotOf(d, d.items, 'dlp.au-chalet-de-la-marionnette').lateBy).toBeGreaterThan(0)
      expect(slotOf(d, d.items, 'daw.bistrot-chez-remy').lateBy).toBeGreaterThan(0)
      const order = optimizeRoute(d, real)
      const lunch = slotOf(d, order, 'dlp.au-chalet-de-la-marionnette')
      const dinner = slotOf(d, order, 'daw.bistrot-chez-remy')
      expect(lunch.arrive).toBeGreaterThanOrEqual(11 * 60 + 30)
      expect(lunch.arrive).toBeLessThanOrEqual(12 * 60 + 30)
      expect(dinner.arrive).toBeGreaterThanOrEqual(17 * 60 + 30)
      expect(dinner.arrive).toBeLessThanOrEqual(18 * 60 + 30)
      expect(lateness(d, order)).toBe(0)
    })

    test('a lunch without a meal time goes where the new order reaches it closest to its old arrival', () => {
      const d = day(['dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.peter-pans-flight', 'dlp.au-chalet-de-la-marionnette', 'dlp.phantom-manor', 'daw.frozen-ever-after', 'dlp.star-wars-hyperspace-mountain'])
      const target = slotOf(d, d.items, 'dlp.au-chalet-de-la-marionnette').arrive
      const order = optimizeRoute(d, real)
      expect(order).not.toBe(d.items)
      const chosen = Math.abs(slotOf(d, order, 'dlp.au-chalet-de-la-marionnette').arrive - target)
      const lunch = d.items[3]!
      const others = order.filter((e) => e !== lunch)
      for (let i = 0; i <= others.length; i++) {
        const alternative = [...others.slice(0, i), lunch, ...others.slice(i)]
        expect(Math.abs(slotOf(d, alternative, 'dlp.au-chalet-de-la-marionnette').arrive - target)).toBeGreaterThanOrEqual(chosen)
      }
    })

    test('lunch planned before a show is still before it', () => {
      const d = day(['dlp.big-thunder-mountain', 'daw.crushs-coaster', 'dlp.au-chalet-de-la-marionnette', 'dlp.peter-pans-flight', [LION_KING, { showTime: '15:45', timeLocked: true }], 'dlp.phantom-manor', 'daw.frozen-ever-after'])
      const order = ids(optimizeRoute(d, real))
      expect(order.indexOf('dlp.au-chalet-de-la-marionnette')).toBeLessThan(order.indexOf(LION_KING))
    })
  })

  test('a 30-ride day stays within the budget and never ranks worse than before', () => {
    const rides = real.items.filter((i) => i.type === 'attraction').slice(0, 30).map((i) => i.id)
    const d = day(rides)
    const result = searchRoute(d, real)
    expect(result.evaluations).toHaveLength(3)
    for (const n of result.evaluations) expect(n).toBeLessThanOrEqual(BUDGET_PER_SEED)
    expect(isBetter(dayRank(d, real), dayRank({ ...d, items: result.items }, real))).toBe(false)
    expect(result.changed).toBe(true)
  })
})
