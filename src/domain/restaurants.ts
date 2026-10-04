import type { Catalog, Restaurant } from './catalog'
import { isBetter, type Rank } from './route'
import { scheduleDay, type ScheduledSlot } from './schedule'
import type { Minutes } from './time'
import type { Day } from './trip'

/** A swap must end the day at least this much earlier, unless it removes lateness (design Decision 5). */
export const SUGGEST_MIN_SAVING = 15
export const MAX_SUGGESTIONS = 3

export interface RestaurantSuggestion {
  restaurant: Restaurant
  /** Minutes the day ends earlier with this restaurant. Can be negative when it only removes lateness. */
  saves: Minutes
  /** The meal is late now and would not be with this restaurant. */
  onTime: boolean
}

interface Timed {
  rank: Rank
  slot: ScheduledSlot
}

/** Times the day and returns its rank and the slot of the entry with `key`. */
function timeDay(day: Day, catalog: Catalog, key: string): Timed | undefined {
  const s = scheduleDay(day, catalog)
  let late = 0
  let slot: ScheduledSlot | undefined
  for (const x of s.slots) {
    if (x.kind !== 'scheduled') continue
    late += x.lateBy
    if (x.entry.key === key) slot = x
  }
  return slot && { rank: [late, s.end, s.breakdown.queueing + s.breakdown.walking], slot }
}

/**
 * Other restaurants of the same service type that fit the day better in the same position, keeping
 * the meal time (route-optimization spec, "Suggest a restaurant that fits the day"). Best first.
 */
export function restaurantSuggestions(day: Day, catalog: Catalog, key: string): RestaurantSuggestion[] {
  const entry = day.items.find((e) => e.key === key)
  const current = catalog.items.find((i) => i.id === entry?.itemId)
  if (!entry || current?.type !== 'restaurant') return []
  const base = timeDay(day, catalog, key)
  if (!base) return []

  const offers: (RestaurantSuggestion & { rank: Rank })[] = []
  for (const candidate of catalog.items) {
    if (candidate.type !== 'restaurant' || candidate.service !== current.service || candidate.id === current.id) continue
    const swapped = timeDay({ ...day, items: day.items.map((e) => (e === entry ? { ...e, itemId: candidate.id } : e)) }, catalog, key)
    if (!swapped || !isBetter(swapped.rank, base.rank)) continue
    const saves = base.rank[1] - swapped.rank[1]
    if (swapped.rank[0] >= base.rank[0] && saves < SUGGEST_MIN_SAVING) continue
    offers.push({ restaurant: candidate, saves, onTime: base.slot.lateBy > 0 && swapped.slot.lateBy === 0, rank: swapped.rank })
  }
  return offers
    .sort((a, b) => (isBetter(a.rank, b.rank) ? -1 : isBetter(b.rank, a.rank) ? 1 : 0))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ restaurant, saves, onTime }) => ({ restaurant, saves, onTime }))
}
