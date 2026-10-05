import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { parseCatalog, type Catalog } from './catalog'
import { buildRoute, parkProjection } from './map'
import { scheduleDay } from './schedule'
import { plannedMarks, stopNumbers } from './stops'
import type { Day, Trip } from './trip'

const real: Catalog = parseCatalog(catalogJson)

function day(id: string, itemIds: string[]): Day {
  return { id, date: '2026-08-12', start: '09:30', end: '22:00', items: itemIds.map((itemId, i) => ({ key: `${id}-k${i}`, itemId })) }
}

const trip = (days: Day[]): Trip => ({ id: 't1', name: 'Summer', days })

describe('stop numbers (day-schedule spec)', () => {
  test('numbers in plan order', () => {
    const d = day('d1', ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight'])
    expect([...stopNumbers(d, real)]).toEqual([
      ['d1-k0', 1],
      ['d1-k1', 2],
      ['d1-k2', 3],
    ])
  })

  test('an entry no longer available has no number and is not counted', () => {
    const d = day('d1', ['dlp.big-thunder-mountain', 'dlp.retired-ride', 'dlp.phantom-manor'])
    const numbers = stopNumbers(d, real)
    expect(numbers.get('d1-k0')).toBe(1)
    expect(numbers.has('d1-k1')).toBe(false)
    expect(numbers.get('d1-k2')).toBe(2)
  })

  test('the map route numbers stops the same way', () => {
    const d = day('d1', ['dlp.big-thunder-mountain', 'dlp.retired-ride', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'dlp.big-thunder-mountain'])
    const numbers = stopNumbers(d, real)
    const byItem = new Map<string, number[]>()
    for (const e of d.items) if (numbers.has(e.key)) byItem.set(e.itemId, [...(byItem.get(e.itemId) ?? []), numbers.get(e.key)!])
    const schedule = scheduleDay(d, real)
    const fromRoute = (['dlp', 'daw'] as const).flatMap((p) => buildRoute(schedule, real, parkProjection(real, p)).stops.map((s) => [s.itemId, s.numbers] as const))
    expect(new Map(fromRoute)).toEqual(byItem)
  })
})

describe('planned marks (park-catalog spec)', () => {
  test('a repeated item in the selected day carries both stop numbers', () => {
    const d1 = day('d1', ['dlp.phantom-manor', 'dlp.big-thunder-mountain', 'dlp.peter-pans-flight', 'dlp.phantom-manor', 'dlp.big-thunder-mountain'])
    const marks = plannedMarks(trip([d1]), 'd1', real)
    expect(marks.get('dlp.big-thunder-mountain')).toEqual({ stops: [2, 5], otherDays: [] })
    expect(marks.get('dlp.peter-pans-flight')).toEqual({ stops: [3], otherDays: [] })
  })

  test('an item only on another day lists that day and no stops', () => {
    const t = trip([day('d1', ['dlp.big-thunder-mountain']), day('d2', []), day('d3', ['dlp.phantom-manor'])])
    expect(plannedMarks(t, 'd1', real).get('dlp.phantom-manor')).toEqual({ stops: [], otherDays: [3] })
  })

  test('an item in the selected day and another day has its stops and the other day', () => {
    const t = trip([day('d1', ['dlp.big-thunder-mountain', 'dlp.phantom-manor']), day('d2', []), day('d3', ['dlp.phantom-manor', 'dlp.phantom-manor'])])
    expect(plannedMarks(t, 'd1', real).get('dlp.phantom-manor')).toEqual({ stops: [2], otherDays: [3] })
    expect(plannedMarks(t, 'd3', real).get('dlp.phantom-manor')).toEqual({ stops: [1, 2], otherDays: [1] })
  })

  test('items in another trip are not marked, and no trip marks nothing', () => {
    const t = trip([day('d1', ['dlp.big-thunder-mountain'])])
    expect(plannedMarks(t, 'd1', real).has('dlp.phantom-manor')).toBe(false)
    expect(plannedMarks(undefined, undefined, real).size).toBe(0)
  })
})
