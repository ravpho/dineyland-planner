import type { Catalog, CatalogItem, Park, ParkId } from './catalog'
import { unsuitableReason, type GroupProfile } from './suitability'
import { monthOf, parseClock, type Minutes } from './time'
import type { Day, PlanItem } from './trip'
import { areaCentres, entranceOf, locate, walkBetween, type ParkPoint } from './walking'
import { itemWait, mealMinutes } from './waits'

export interface ScheduledSlot {
  kind: 'scheduled'
  entry: PlanItem
  item: CatalogItem
  walk: Minutes
  /** The walk to this item leaves one park and enters the other. */
  parkChange: boolean
  arrive: Minutes
  /** Queue wait (attractions, restaurants). 0 for shows. */
  wait: Minutes
  waitIsEstimate: boolean
  start: Minutes
  end: Minutes
  /** Shows: free time before the early-arrival period. Meals with a time: free time before the window opens. */
  freeBefore: Minutes
  /** Shows: minutes after the time the user needed to be there. Meals with a time: minutes after the window closes. */
  lateBy: Minutes
  /** Ends after the day's window. */
  afterWindow: boolean
  unsuitable?: string
}

export interface MissingSlot {
  kind: 'missing'
  entry: PlanItem
}

export type Slot = ScheduledSlot | MissingSlot

export interface DayBreakdown {
  queueing: Minutes
  attractions: Minutes
  meals: Minutes
  shows: Minutes
  walking: Minutes
  free: Minutes
}

export interface DaySchedule {
  slots: Slot[]
  /** When the last item ends (the day start when empty). */
  end: Minutes
  windowStart: Minutes
  windowEnd: Minutes
  fits: boolean
  /** Minutes left before the window end (fits) or past it (over). */
  spare: Minutes
  over: Minutes
  breakdown: DayBreakdown
  /** Parks used by the day's scheduled items, in order of first appearance. */
  parks: ParkId[]
}

/** A meal with a time is reached within this many minutes of it (optimize-day-route design Decision 2). */
export const MEAL_WINDOW_MIN = 30

/** How one item fills the timeline once the user arrives there. */
export interface ItemTiming {
  wait: Minutes
  waitIsEstimate: boolean
  start: Minutes
  end: Minutes
  freeBefore: Minutes
  lateBy: Minutes
}

/**
 * Timing of one item when the user arrives at `arrive`. Shared by the timeline and the route search,
 * so they never disagree (optimize-day-route design Decision 3).
 */
export function timeItem(item: CatalogItem, entry: PlanItem, arrive: Minutes, park: Park, month: number): ItemTiming {
  if (item.type === 'show') {
    const showStart = parseClock(entry.showTime ?? item.times[0]!)
    const needBy = showStart - item.arriveEarlyMin
    return {
      wait: 0,
      waitIsEstimate: false,
      start: showStart,
      end: Math.max(showStart + item.durationMin, arrive),
      freeBefore: Math.max(0, needBy - arrive),
      lateBy: Math.max(0, arrive - needBy),
    }
  }
  let freeBefore = 0
  let lateBy = 0
  if (item.type === 'restaurant' && entry.mealTime) {
    const mealTime = parseClock(entry.mealTime)
    freeBefore = Math.max(0, mealTime - MEAL_WINDOW_MIN - arrive)
    lateBy = Math.max(0, arrive - (mealTime + MEAL_WINDOW_MIN))
  }
  const begin = arrive + freeBefore
  const estimate = itemWait(item, park, month, begin)
  const start = begin + estimate.minutes
  const duration = item.type === 'restaurant' ? mealMinutes(item) : item.durationMin
  return { wait: estimate.minutes, waitIsEstimate: estimate.estimate, start, end: start + duration, freeBefore, lateBy }
}

/** Turns a day's ordered items into a timeline (design Decision 6). */
export function scheduleDay(day: Day, catalog: Catalog, profile?: GroupProfile): DaySchedule {
  const parks = new Map(catalog.parks.map((p) => [p.id, p as Park]))
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const centres = areaCentres(catalog)
  const month = monthOf(day.date)
  const windowStart = parseClock(day.start)
  const windowEnd = parseClock(day.end)
  const breakdown: DayBreakdown = { queueing: 0, attractions: 0, meals: 0, shows: 0, walking: 0, free: 0 }
  const slots: Slot[] = []

  const parksUsed: ParkId[] = []
  let t = windowStart
  /** Where the user is; the day starts at the entrance of the first item's park. */
  let at: ParkPoint | undefined
  for (const entry of day.items) {
    const item = items.get(entry.itemId)
    if (!item) {
      slots.push({ kind: 'missing', entry })
      continue
    }
    const park = parks.get(item.parkId)!
    if (!parksUsed.includes(item.parkId)) parksUsed.push(item.parkId)
    const here: ParkPoint = { parkId: item.parkId, location: locate(item, catalog, centres) }
    const { minutes: walk, parkChange } = walkBetween(at ?? { parkId: item.parkId, location: entranceOf(catalog, item.parkId) }, here, catalog)
    const arrive = t + walk
    breakdown.walking += walk

    const { wait, waitIsEstimate, start, end, freeBefore, lateBy } = timeItem(item, entry, arrive, park, month)
    breakdown.free += freeBefore
    breakdown.queueing += wait
    if (item.type === 'show') breakdown.shows += end - arrive - freeBefore
    else if (item.type === 'restaurant') breakdown.meals += end - start
    else breakdown.attractions += end - start

    slots.push({
      kind: 'scheduled',
      entry,
      item,
      walk,
      parkChange,
      arrive,
      wait,
      waitIsEstimate,
      start,
      end,
      freeBefore,
      lateBy,
      afterWindow: end > windowEnd,
      unsuitable: unsuitableReason(item, profile),
    })
    t = end
    at = here
  }

  return {
    slots,
    end: t,
    windowStart,
    windowEnd,
    fits: t <= windowEnd,
    spare: Math.max(0, windowEnd - t),
    over: Math.max(0, t - windowEnd),
    breakdown,
    parks: parksUsed,
  }
}
