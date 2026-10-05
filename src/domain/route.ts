import type { Catalog, CatalogItem, Park } from './catalog'
import { scheduleDay, timeItem } from './schedule'
import { monthOf, parseClock, type Minutes } from './time'
import type { Day, PlanItem } from './trip'
import { areaCentres, entranceOf, locate, walkBetween, type ParkPoint } from './walking'

/**
 * What grouping, optimizing and restaurant suggestions share about one day (optimize-day-route design
 * Decision 3): its entries split by kind, a walking table between them, and each anchor's target time.
 */
export interface DayModel {
  day: Day
  month: number
  windowStart: Minutes
  /** In the day's order. */
  attractions: PlanItem[]
  /** Restaurants and shows, in the day's order. */
  anchors: PlanItem[]
  /** Entries no longer in the catalog. They always go last. */
  missing: PlanItem[]
  /** Table index of each scheduled entry, by key. */
  index: Map<string, number>
  items: CatalogItem[]
  parks: Park[]
  /** Walking minutes between table entries. */
  walk: Minutes[][]
  /** Walking minutes from each entry's own park entrance, for the day's first item. */
  fromEntrance: Minutes[]
  /** Restaurants: the meal time, else the arrival in the day as it is. */
  restaurantTarget: Map<string, Minutes>
}

export function dayModel(day: Day, catalog: Catalog): DayModel {
  const lookup = new Map(catalog.items.map((i) => [i.id, i]))
  const parkOf = new Map(catalog.parks.map((p) => [p.id, p as Park]))
  const centres = areaCentres(catalog)
  const before = scheduleDay(day, catalog)
  const arrivals = new Map(before.slots.flatMap((s) => (s.kind === 'scheduled' ? [[s.entry.key, s.arrive] as const] : [])))

  const attractions: PlanItem[] = []
  const anchors: PlanItem[] = []
  const missing: PlanItem[] = []
  const index = new Map<string, number>()
  const items: CatalogItem[] = []
  const points: ParkPoint[] = []
  for (const entry of day.items) {
    const item = lookup.get(entry.itemId)
    if (!item) {
      missing.push(entry)
      continue
    }
    if (item.type === 'attraction') attractions.push(entry)
    else anchors.push(entry)
    index.set(entry.key, items.length)
    items.push(item)
    points.push({ parkId: item.parkId, location: locate(item, catalog, centres) })
  }

  const restaurantTarget = new Map<string, Minutes>()
  for (const entry of anchors) {
    if (items[index.get(entry.key)!]!.type !== 'restaurant') continue
    restaurantTarget.set(entry.key, entry.mealTime ? parseClock(entry.mealTime) : arrivals.get(entry.key)!)
  }

  return {
    day,
    month: monthOf(day.date),
    windowStart: parseClock(day.start),
    attractions,
    anchors,
    missing,
    index,
    items,
    parks: items.map((i) => parkOf.get(i.parkId)!),
    walk: points.map((a) => points.map((b) => walkBetween(a, b, catalog).minutes)),
    fromEntrance: points.map((p) => walkBetween({ parkId: p.parkId, location: entranceOf(catalog, p.parkId) }, p, catalog).minutes),
    restaurantTarget,
  }
}

export interface Simulation {
  /** The whole day: attractions and anchors in the simulated order, then missing entries. */
  items: PlanItem[]
  /** Minutes late for shows and meals. */
  late: Minutes
  /** When the last item ends (the window start when empty). */
  end: Minutes
  queueing: Minutes
  walking: Minutes
}

interface State {
  t: Minutes
  /** Table index of where the user is, or -1 before the first item. */
  at: number
  late: Minutes
  queueing: Minutes
  walking: Minutes
}

/**
 * Times the day with the attractions in the given order and meals and shows placed by time
 * (route-optimization spec, "Meals and shows keep their time"). `showTimes` overrides show start
 * times by entry key. Gives the same times as `scheduleDay` on `items`, in one forward pass.
 */
export function simulate(model: DayModel, attractions: readonly PlanItem[], showTimes?: ReadonlyMap<string, string>): Simulation {
  const { index, items, parks, walk, fromEntrance, month } = model
  const walkTo = (s: State, i: number) => (s.at < 0 ? fromEntrance[i]! : walk[s.at]![i]!)
  const step = (s: State, entry: PlanItem): State => {
    const i = index.get(entry.key)!
    const w = walkTo(s, i)
    const timing = timeItem(items[i]!, entry, s.t + w, parks[i]!, month)
    return { t: timing.end, at: i, late: s.late + timing.lateBy, queueing: s.queueing + timing.wait, walking: s.walking + w }
  }
  const arrival = (s: State, entry: PlanItem) => s.t + walkTo(s, index.get(entry.key)!)

  const targets = new Map<PlanItem, Minutes>()
  const anchors = model.anchors.map((entry) => {
    const item = items[index.get(entry.key)!]!
    if (item.type !== 'show') {
      targets.set(entry, model.restaurantTarget.get(entry.key)!)
      return entry
    }
    const time = showTimes?.get(entry.key)
    const placed = time !== undefined && time !== entry.showTime ? { ...entry, showTime: time } : entry
    targets.set(placed, parseClock(placed.showTime ?? item.times[0]!) - item.arriveEarlyMin)
    return placed
  })
  // In order of their target times; Array.prototype.sort is stable, so ties keep the day's order.
  const pending = [...anchors].sort((a, b) => targets.get(a)! - targets.get(b)!)

  /** Whether `anchor` goes before attraction `next` (grouping design Decision 3). */
  const goesBefore = (s: State, anchor: PlanItem, next: PlanItem) => {
    const target = targets.get(anchor)!
    const afterNext = step(s, next)
    if (items[index.get(anchor.key)!]!.type === 'show') return arrival(afterNext, anchor) > target
    return Math.abs(arrival(s, anchor) - target) <= Math.abs(arrival(afterNext, anchor) - target)
  }

  let state: State = { t: model.windowStart, at: -1, late: 0, queueing: 0, walking: 0 }
  const out: PlanItem[] = []
  let p = 0
  for (const next of attractions) {
    while (p < pending.length && goesBefore(state, pending[p]!, next)) {
      state = step(state, pending[p]!)
      out.push(pending[p++]!)
    }
    state = step(state, next)
    out.push(next)
  }
  for (; p < pending.length; p++) {
    state = step(state, pending[p]!)
    out.push(pending[p]!)
  }
  return { items: [...out, ...model.missing], late: state.late, end: state.t, queueing: state.queueing, walking: state.walking }
}

/** How good a day is, compared left to right (optimize-day-route design Decision 1). */
export type Rank = readonly [late: Minutes, end: Minutes, queueWalk: Minutes]

export const rankOf = (r: Pick<Simulation, 'late' | 'end' | 'queueing' | 'walking'>): Rank => [r.late, r.end, r.queueing + r.walking]

/** `a` is strictly better than `b`. */
export function isBetter(a: Rank, b: Rank): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i]! !== b[i]!) return a[i]! < b[i]!
  }
  return false
}

/** The rank of a day exactly as it is, from the timeline. */
export function dayRank(day: Day, catalog: Catalog): Rank {
  const s = scheduleDay(day, catalog)
  const late = s.slots.reduce((sum, slot) => sum + (slot.kind === 'scheduled' ? slot.lateBy : 0), 0)
  return [late, s.end, s.breakdown.queueing + s.breakdown.walking]
}
