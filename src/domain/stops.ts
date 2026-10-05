import type { Catalog } from './catalog'
import type { Day, Trip } from './trip'

/** Where an item is planned in the selected trip (plan-ui-improvements design Decision 1). */
export interface PlannedMark {
  /** The item's stop numbers in the selected day; empty when it is planned only on other days. */
  stops: number[]
  /** The 1-based numbers of the other days that hold it. */
  otherDays: number[]
}

/**
 * Each entry's stop number: its position among the day's entries the catalog still holds, counting
 * from 1. Entries marked "No longer available" get none, as on the map's route.
 */
export function stopNumbers(day: Day, catalog: Catalog): Map<string, number> {
  const known = new Set(catalog.items.map((i) => i.id))
  const numbers = new Map<string, number>()
  for (const e of day.items) if (known.has(e.itemId)) numbers.set(e.key, numbers.size + 1)
  return numbers
}

/** Item id → where it is planned in `trip`: its stops in the selected day and the other days that hold it. */
export function plannedMarks(trip: Trip | undefined, selectedDayId: string | undefined, catalog: Catalog): Map<string, PlannedMark> {
  const marks = new Map<string, PlannedMark>()
  const markOf = (itemId: string) => {
    let mark = marks.get(itemId)
    if (!mark) marks.set(itemId, (mark = { stops: [], otherDays: [] }))
    return mark
  }
  trip?.days.forEach((day, i) => {
    if (day.id === selectedDayId) {
      const numbers = stopNumbers(day, catalog)
      for (const e of day.items) {
        const n = numbers.get(e.key)
        if (n) markOf(e.itemId).stops.push(n)
      }
    } else {
      for (const itemId of new Set(day.items.map((e) => e.itemId))) markOf(itemId).otherDays.push(i + 1)
    }
  })
  return marks
}
