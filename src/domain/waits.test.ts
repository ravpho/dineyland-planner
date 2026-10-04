import { describe, expect, test } from 'vitest'
import type { Attraction, Restaurant, Show } from './catalog'
import { sampleCatalog } from '../test/sampleCatalog'
import { HOUR_CURVE, attractionWait, hourFactor, itemWait, mealMinutes, restaurantWait, waitRange } from './waits'

const dlp = sampleCatalog.parks[0]!
const byId = <T,>(id: string) => sampleCatalog.items.find((i) => i.id === id) as T
const thunder = byId<Attraction>('dlp.big-thunder-mountain')
const labyrinth = byId<Attraction>('dlp.alices-curious-labyrinth')
const hyperion = byId<Restaurant>('dlp.cafe-hyperion')
const walts = byId<Restaurant>('dlp.walts')
const parade = byId<Show>('dlp.parade')
const t = (h: number, m = 0) => h * 60 + m

describe('wait estimates (wait-estimates spec)', () => {
  test('busier month gives an equal or longer wait at the same time', () => {
    // sample: August factor 1.3 > January factor 0.8
    for (const time of [t(9, 30), t(12), t(14), t(18)]) {
      expect(attractionWait(thunder, dlp, 8, time).minutes).toBeGreaterThanOrEqual(attractionWait(thunder, dlp, 1, time).minutes)
    }
    expect(attractionWait(thunder, dlp, 8, t(14)).minutes).toBeGreaterThan(attractionWait(thunder, dlp, 1, t(14)).minutes)
  })

  test('midday is equal to or busier than opening', () => {
    for (let month = 1; month <= 12; month++) {
      expect(attractionWait(thunder, dlp, month, t(14)).minutes).toBeGreaterThanOrEqual(attractionWait(thunder, dlp, month, t(9, 30)).minutes)
    }
  })

  test('values are multiples of 5 and never negative', () => {
    for (let time = t(8); time <= t(23); time += 7) {
      const w = attractionWait(thunder, dlp, 6, time).minutes
      expect(w % 5).toBe(0)
      expect(w).toBeGreaterThanOrEqual(0)
    }
  })

  test('never exceeds the average maximum scaled by the month', () => {
    const extreme = { ...thunder, waitStats: { avgMin: 80, avgMaxMin: 60, years: [2025] } }
    expect(attractionWait(extreme, dlp, 8, t(13)).minutes).toBeLessThanOrEqual(roundUp(60 * 1.3))
  })

  test('walk-through without statistics uses its fixed wait, marked as an estimate', () => {
    expect(attractionWait(labyrinth, dlp, 8, t(14))).toEqual({ minutes: 5, estimate: true })
    expect(attractionWait(thunder, dlp, 8, t(14)).estimate).toBe(false)
  })

  test('counter service at lunch peak waits longer than mid-afternoon', () => {
    expect(restaurantWait(hyperion, t(12, 30)).minutes).toBeGreaterThan(restaurantWait(hyperion, t(15, 30)).minutes)
    expect(restaurantWait(hyperion, t(19)).minutes).toBe(20)
    expect(restaurantWait(hyperion, t(12, 30)).estimate).toBe(true)
  })

  test('shows have no queue wait', () => {
    expect(itemWait(parade, dlp, 8, t(17)).minutes).toBe(0)
  })

  test('meal duration uses the override, else the service default', () => {
    expect(mealMinutes(walts)).toBe(75)
    expect(mealMinutes(hyperion)).toBe(30)
  })

  test('hour curve averages about 1 over 09:30-21:00', () => {
    let sum = 0
    let n = 0
    for (let time = t(9, 30); time <= t(21); time += 1) {
      sum += hourFactor(time)
      n++
    }
    expect(sum / n).toBeGreaterThan(0.95)
    expect(sum / n).toBeLessThan(1.05)
    expect(hourFactor(t(8))).toBe(HOUR_CURVE[0]![1])
  })

  test('wait range spans opening to closing', () => {
    const [lo, hi] = waitRange(thunder, dlp, 8)
    expect(lo).toBeLessThan(hi)
    expect(lo).toBe(attractionWait(thunder, dlp, 8, t(9, 30)).minutes)
  })
})

function roundUp(n: number) {
  return Math.ceil(n / 5) * 5
}
