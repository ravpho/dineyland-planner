import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { parseCatalog, type Catalog, type Show } from './catalog'
import { groupByArea } from './grouping'
import { dayModel, dayRank, isBetter, rankOf, simulate } from './route'
import { scheduleDay } from './schedule'
import { parseClock } from './time'
import type { Day, PlanItem } from './trip'

const real: Catalog = parseCatalog(catalogJson)

/** Park-Miller generator, so every run builds the same days. */
function generator(seed: number) {
  let state = seed
  const next = () => (state = (state * 16807) % 2147483647) / 2147483647
  const pick = <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)]!
  const shuffle = <T,>(list: readonly T[]) => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j]!, out[i]!]
    }
    return out
  }
  return { next, pick, shuffle }
}

const attractionIds = real.items.filter((i) => i.type === 'attraction').map((i) => i.id)
const restaurantIds = real.items.filter((i) => i.type === 'restaurant').map((i) => i.id)
const shows = real.items.filter((i): i is Show => i.type === 'show')
const MEAL_TIMES = ['11:30', '12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00']

/** A day of 4-10 rides with a timed and an untimed restaurant and up to two shows, at random places. */
function randomDay(g: ReturnType<typeof generator>, n: number, withMealTimes: boolean): Day {
  const rides = g.shuffle(attractionIds).slice(0, 4 + Math.floor(g.next() * 7))
  const items: PlanItem[] = rides.map((itemId, i) => ({ key: `r${i}`, itemId }))
  const insert = (entry: PlanItem) => items.splice(Math.floor(g.next() * (items.length + 1)), 0, entry)
  insert({ key: 'm1', itemId: g.pick(restaurantIds), ...(withMealTimes ? { mealTime: g.pick(MEAL_TIMES) } : {}) })
  insert({ key: 'm2', itemId: g.pick(restaurantIds) })
  for (const [i, show] of g.shuffle(shows).slice(0, Math.floor(g.next() * 3)).entries()) insert({ key: `s${i}`, itemId: show.id, showTime: g.pick(show.times) })
  return { id: `d${n}`, date: g.pick(['2026-01-14', '2026-04-08', '2026-08-12', '2026-10-21']), start: '09:30', end: '23:00', items }
}

describe('shared day model (optimize-day-route design Decision 3)', () => {
  test('simulate gives the same times as the timeline, on 50 generated days', () => {
    const g = generator(20261004)
    for (let n = 0; n < 50; n++) {
      const day = randomDay(g, n, true)
      const model = dayModel(day, real)
      for (let k = 0; k < 4; k++) {
        const order = g.shuffle(model.attractions)
        // Half the runs also move each show to another of its typical times.
        const showTimes = new Map(
          k % 2 === 0
            ? []
            : model.anchors.flatMap((e) => {
                const show = shows.find((s) => s.id === e.itemId)
                return show ? [[e.key, g.pick(show.times)] as const] : []
              }),
        )
        const sim = simulate(model, order, showTimes)
        const timeline = scheduleDay({ ...day, items: sim.items }, real)
        const late = timeline.slots.reduce((sum, s) => sum + (s.kind === 'scheduled' ? s.lateBy : 0), 0)
        expect({ end: sim.end, late: sim.late, queueing: sim.queueing, walking: sim.walking }).toEqual({
          end: timeline.end,
          late,
          queueing: timeline.breakdown.queueing,
          walking: timeline.breakdown.walking,
        })
        expect(rankOf(sim)).toEqual(dayRank({ ...day, items: sim.items }, real))
        // Every entry is kept once, and attractions keep the given order.
        expect([...sim.items].map((e) => e.key).sort()).toEqual(day.items.map((e) => e.key).sort())
        expect(sim.items.filter((e) => e.key.startsWith('r'))).toEqual(order)
        for (const [key, time] of showTimes) expect(sim.items.find((e) => e.key === key)!.showTime).toBe(time)
      }
    }
  })

  test('on days without meal times and with meals and shows in time order, it places them as grouping does', () => {
    const g = generator(77)
    let compared = 0
    for (let n = 0; n < 200 && compared < 50; n++) {
      const day = randomDay(g, n, false)
      const model = dayModel(day, real)
      const before = scheduleDay(day, real)
      const targets = model.anchors.map((e) => {
        const slot = before.slots.find((s) => s.kind === 'scheduled' && s.entry.key === e.key)
        if (!slot || slot.kind !== 'scheduled') throw new Error('anchor not scheduled')
        return slot.item.type === 'show' ? slot.start - slot.item.arriveEarlyMin : slot.arrive
      })
      if (targets.some((t, i) => i > 0 && t < targets[i - 1]!)) continue
      compared++
      const grouped = groupByArea(day, real)
      const groupedAttractions = grouped.filter((e) => model.attractions.includes(e))
      expect(simulate(model, groupedAttractions).items).toEqual(grouped)
    }
    expect(compared).toBe(50)
  })

  test('a restaurant without a meal time targets its arrival before; one with a time targets that time', () => {
    const day: Day = {
      id: 'd', date: '2026-08-12', start: '09:30', end: '23:00',
      items: [
        { key: 'a', itemId: 'dlp.big-thunder-mountain' },
        { key: 'b', itemId: 'dlp.au-chalet-de-la-marionnette' },
        { key: 'c', itemId: 'daw.bistrot-chez-remy', mealTime: '18:00' },
      ],
    }
    const model = dayModel(day, real)
    const arrival = scheduleDay(day, real).slots.find((s) => s.kind === 'scheduled' && s.entry.key === 'b')
    expect(model.restaurantTarget.get('b')).toBe(arrival?.kind === 'scheduled' ? arrival.arrive : NaN)
    expect(model.restaurantTarget.get('c')).toBe(parseClock('18:00'))
  })

  test('entries no longer in the catalog go last, and an empty order starts at the window start', () => {
    const day: Day = { id: 'd', date: '2026-08-12', start: '09:30', end: '23:00', items: [{ key: 'x', itemId: 'dlp.gone' }, { key: 'a', itemId: 'dlp.phantom-manor' }] }
    const model = dayModel(day, real)
    expect(simulate(model, model.attractions).items.map((e) => e.key)).toEqual(['a', 'x'])
    const empty = dayModel({ ...day, items: [] }, real)
    expect(simulate(empty, []).end).toBe(parseClock('09:30'))
  })

  test('ranks compare lateness, then the end, then queueing and walking', () => {
    expect(isBetter([0, 900, 100], [5, 600, 50])).toBe(true)
    expect(isBetter([0, 600, 200], [0, 610, 50])).toBe(true)
    expect(isBetter([0, 600, 90], [0, 600, 100])).toBe(true)
    expect(isBetter([0, 600, 100], [0, 600, 100])).toBe(false)
  })
})
