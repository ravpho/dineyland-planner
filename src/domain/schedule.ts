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
  /** Shows: free time before the early-arrival period. */
  freeBefore: Minutes
  /** Shows: minutes after the time the user needed to be there. */
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

    let wait = 0
    let waitIsEstimate = false
    let start: Minutes
    let end: Minutes
    let freeBefore = 0
    let lateBy = 0
    if (item.type === 'show') {
      const showStart = parseClock(entry.showTime ?? item.times[0]!)
      const needBy = showStart - item.arriveEarlyMin
      freeBefore = Math.max(0, needBy - arrive)
      lateBy = Math.max(0, arrive - needBy)
      start = showStart
      end = Math.max(showStart + item.durationMin, arrive)
      breakdown.free += freeBefore
      breakdown.shows += end - Math.max(arrive, needBy)
    } else {
      const estimate = itemWait(item, park, month, arrive)
      wait = estimate.minutes
      waitIsEstimate = estimate.estimate
      start = arrive + wait
      const duration = item.type === 'restaurant' ? mealMinutes(item) : item.durationMin
      end = start + duration
      breakdown.queueing += wait
      if (item.type === 'restaurant') breakdown.meals += duration
      else breakdown.attractions += duration
    }

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
