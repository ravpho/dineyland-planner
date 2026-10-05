import type { Catalog, CatalogItem, ParkId } from './catalog'
import { dayModel, simulate } from './route'
import { scheduleDay } from './schedule'
import type { Day, PlanItem } from './trip'
import { areaCentres, entranceOf, locate, walkBetween, type ParkPoint } from './walking'

export interface GroupOptions {
  /** Start in this park instead of the park of the day's first item (optimize-day-route Decision 4). */
  firstPark?: ParkId
}

/**
 * Reorders a day so each park's attractions are together and, inside a park, each area's attractions
 * are together (design Decisions 1-3). Returns the day's own entries in the new order. Meals and shows
 * are placed by time with the shared day model (optimize-day-route design Decision 3).
 */
export function groupByArea(day: Day, catalog: Catalog, options: GroupOptions = {}): PlanItem[] {
  const model = dayModel(day, catalog)
  return simulate(model, groupAttractions(day, catalog, model.attractions, options)).items
}

/** The day's attractions grouped by park, then area. */
export function groupAttractions(day: Day, catalog: Catalog, attractions: readonly PlanItem[], options: GroupOptions = {}): PlanItem[] {
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const used = scheduleDay(day, catalog).parks
  const parks = options.firstPark && used.includes(options.firstPark) ? [options.firstPark, ...used.filter((p) => p !== options.firstPark)] : used
  const centres = areaCentres(catalog)
  return parks.flatMap((parkId, i) => {
    const inPark = attractions.filter((e) => items.get(e.itemId)!.parkId === parkId)
    // A park the day later leaves is exited through its entrance (design Decision 2).
    const leaves = i < parks.length - 1
    return orderAreas(inPark, parkId, leaves, (e) => items.get(e.itemId)!, catalog, centres)
  })
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
