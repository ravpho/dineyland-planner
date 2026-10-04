import type { Catalog, CatalogItem, ParkId } from './catalog'
import { scheduleDay, type DaySchedule } from './schedule'
import type { Day, PlanItem } from './trip'
import { areaCentres, entranceOf, locate, walkBetween, type ParkPoint } from './walking'

/**
 * Reorders a day so each park's attractions are together and, inside a park, each area's attractions
 * are together (design Decisions 1-3). Returns the day's own entries in the new order.
 */
export function groupByArea(day: Day, catalog: Catalog): PlanItem[] {
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const attractions: PlanItem[] = []
  const anchors: PlanItem[] = []
  const missing: PlanItem[] = []
  for (const entry of day.items) {
    const item = items.get(entry.itemId)
    if (!item) missing.push(entry)
    else if (item.type === 'attraction') attractions.push(entry)
    else anchors.push(entry)
  }

  const before = scheduleDay(day, catalog)
  const centres = areaCentres(catalog)
  const grouped = before.parks.flatMap((parkId, i) => {
    const inPark = attractions.filter((e) => items.get(e.itemId)!.parkId === parkId)
    // A park the day later leaves is exited through its entrance (design Decision 2).
    const leaves = i < before.parks.length - 1
    return orderAreas(inPark, parkId, leaves, (e) => items.get(e.itemId)!, catalog, centres)
  })
  return [...placeAnchors(grouped, anchors, day, before, catalog), ...missing]
}

/** Every order of `blocks`, starting with the given order. */
function permutations<T>(blocks: T[]): T[][] {
  if (blocks.length <= 1) return [blocks]
  return blocks.flatMap((first, i) => permutations([...blocks.slice(0, i), ...blocks.slice(i + 1)]).map((rest) => [first, ...rest]))
}

/** The park's attractions with areas in the order that walks least; user order inside each area. */
function orderAreas(
  entries: PlanItem[],
  parkId: ParkId,
  leaves: boolean,
  itemOf: (e: PlanItem) => CatalogItem,
  catalog: Catalog,
  centres: ReturnType<typeof areaCentres>,
): PlanItem[] {
  const areas = new Map<string, PlanItem[]>()
  for (const e of entries) {
    const areaId = itemOf(e).areaId
    areas.set(areaId, [...(areas.get(areaId) ?? []), e])
  }
  const entrance: ParkPoint = { parkId, location: entranceOf(catalog, parkId) }
  const points = new Map(entries.map((e) => [e, { parkId, location: locate(itemOf(e), catalog, centres) }]))

  let best = entries
  let bestCost = Infinity
  // Orders start from the order of first appearance, and only a strictly shorter walk replaces it.
  for (const order of permutations([...areas.values()])) {
    const sequence = order.flat()
    let cost = 0
    let at = entrance
    for (const e of sequence) {
      const here = points.get(e)!
      cost += walkBetween(at, here, catalog).minutes
      at = here
    }
    if (leaves) cost += walkBetween(at, entrance, catalog).minutes
    if (cost < bestCost) {
      best = sequence
      bestCost = cost
    }
  }
  return best
}

/**
 * Restaurants and shows go back into the grouped order by time, in their own order (design Decision 3).
 * A restaurant goes where its arrival is closest to its arrival before grouping; a show goes before the
 * first attraction that would make the user late for it.
 */
function placeAnchors(grouped: PlanItem[], anchors: PlanItem[], day: Day, before: DaySchedule, catalog: Catalog): PlanItem[] {
  if (anchors.length === 0) return grouped
  const slots = new Map(before.slots.flatMap((s) => (s.kind === 'scheduled' ? [[s.entry.key, s] as const] : [])))
  /** Arrival at the last entry of `list` when the day is `list`. */
  const arrival = (list: PlanItem[]) => {
    const last = scheduleDay({ ...day, items: list }, catalog).slots.at(-1)!
    return last.kind === 'scheduled' ? last.arrive : 0
  }
  const goesBefore = (anchor: PlanItem, next: PlanItem, out: PlanItem[]) => {
    const slot = slots.get(anchor.key)!
    if (slot.item.type === 'show') return arrival([...out, next, anchor]) > slot.start - slot.item.arriveEarlyMin
    return Math.abs(arrival([...out, anchor]) - slot.arrive) <= Math.abs(arrival([...out, next, anchor]) - slot.arrive)
  }

  const out: PlanItem[] = []
  let pending = 0
  for (const next of grouped) {
    while (pending < anchors.length && goesBefore(anchors[pending]!, next, out)) out.push(anchors[pending++]!)
    out.push(next)
  }
  return [...out, ...anchors.slice(pending)]
}
