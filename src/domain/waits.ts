import type { Attraction, CatalogItem, Park, Restaurant, ServiceType } from './catalog'
import type { Minutes } from './time'

/**
 * Shared time-of-day curve (design Decision 4): factor by clock time, linear in between.
 * Mean is about 1.0 over 09:30-21:00 so the daily average matches the measured average.
 */
export const HOUR_CURVE: [Minutes, number][] = [
  [9 * 60 + 30, 0.45],
  [10 * 60 + 30, 0.8],
  [11 * 60 + 30, 1.05],
  [12 * 60, 1.25],
  [15 * 60, 1.25],
  [16 * 60, 1.15],
  [17 * 60, 1.05],
  [18 * 60, 0.95],
  [19 * 60, 0.85],
  [20 * 60, 0.65],
]

export function hourFactor(time: Minutes): number {
  const first = HOUR_CURVE[0]!
  const last = HOUR_CURVE[HOUR_CURVE.length - 1]!
  if (time <= first[0]) return first[1]
  if (time >= last[0]) return last[1]
  for (let i = 1; i < HOUR_CURVE.length; i++) {
    const [t1, f1] = HOUR_CURVE[i]!
    const [t0, f0] = HOUR_CURVE[i - 1]!
    if (time <= t1) return f0 + ((f1 - f0) * (time - t0)) / (t1 - t0)
  }
  return last[1]
}

export const roundTo5 = (minutes: number) => Math.max(0, Math.round(minutes / 5) * 5)

export interface WaitEstimate {
  minutes: Minutes
  /** True when the value is not derived from measured queue statistics. */
  estimate: boolean
}

export function attractionWait(attraction: Attraction, park: Park, month: number, time: Minutes): WaitEstimate {
  const stats = attraction.waitStats
  if (!stats) return { minutes: attraction.fixedWaitMin ?? 0, estimate: true }
  const monthFactor = park.monthFactors[month - 1] ?? 1
  const raw = stats.avgMin * monthFactor * hourFactor(time)
  const cap = stats.avgMaxMin * monthFactor
  return { minutes: roundTo5(Math.min(raw, cap)), estimate: false }
}

/** Typical restaurant waits in minutes: [peak, off-peak]. */
export const RESTAURANT_WAITS: Record<ServiceType, [peak: number, offPeak: number]> = {
  counter: [20, 5],
  table: [15, 5],
  snack: [10, 3],
}

/** Default meal durations in minutes, overridable per restaurant with `mealMin`. */
export const MEAL_MINUTES: Record<ServiceType, number> = { counter: 30, table: 75, snack: 10 }

export const LUNCH_PEAK: [Minutes, Minutes] = [12 * 60, 14 * 60]
export const DINNER_PEAK: [Minutes, Minutes] = [18 * 60 + 30, 20 * 60 + 30]

export function isMealPeak(time: Minutes): boolean {
  return (time >= LUNCH_PEAK[0] && time < LUNCH_PEAK[1]) || (time >= DINNER_PEAK[0] && time < DINNER_PEAK[1])
}

export function restaurantWait(restaurant: Restaurant, time: Minutes): WaitEstimate {
  const [peak, offPeak] = RESTAURANT_WAITS[restaurant.service]
  return { minutes: isMealPeak(time) ? peak : offPeak, estimate: true }
}

export function mealMinutes(restaurant: Restaurant): Minutes {
  return restaurant.mealMin ?? MEAL_MINUTES[restaurant.service]
}

/** Typical wait for any catalog item. Shows never have a queue wait (they use arriveEarlyMin). */
export function itemWait(item: CatalogItem, park: Park, month: number, time: Minutes): WaitEstimate {
  switch (item.type) {
    case 'attraction':
      return attractionWait(item, park, month, time)
    case 'restaurant':
      return restaurantWait(item, time)
    case 'show':
      return { minutes: 0, estimate: false }
  }
}

/** Lowest and highest typical attraction wait over the park's opening hours for a month. */
export function waitRange(attraction: Attraction, park: Park, month: number): [number, number] {
  const hours = park.hours[month - 1]
  const [open, close] = hours ? [toMin(hours.open), toMin(hours.close)] : [9 * 60 + 30, 21 * 60]
  let lo = Infinity
  let hi = 0
  for (let t = open; t <= close; t += 15) {
    const w = attractionWait(attraction, park, month, t).minutes
    lo = Math.min(lo, w)
    hi = Math.max(hi, w)
  }
  return [lo === Infinity ? 0 : lo, hi]
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
