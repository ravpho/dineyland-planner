import type { Catalog, ParkId } from './catalog'
import type { Day, PlanItem } from './trip'

/**
 * The parks the day's attractions visit, in order, with repeats in a row collapsed, such as
 * `['dlp', 'daw', 'dlp']` (plan-ui-improvements design Decision 9). Restaurants, shows and entries
 * the catalog no longer holds don't count.
 */
export function parkOrder(day: Day, catalog: Catalog): ParkId[] {
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const order: ParkId[] = []
  for (const e of day.items) {
    const item = items.get(e.itemId)
    if (item?.type === 'attraction' && order.at(-1) !== item.parkId) order.push(item.parkId)
  }
  return order
}

export interface ParkSwitch {
  /** The day's own entries in the new order: the other park's attractions, then the first park's, then missing entries. */
  items: PlanItem[]
  /** The restaurants and shows the switch removes, in day order. */
  removed: PlanItem[]
  /** The park that comes first after the switch. */
  firstPark: ParkId
}

/**
 * Swaps the two parks' blocks of attractions, keeping the order inside each park, and removes every
 * restaurant and show. Undefined unless the attractions visit each of the two parks once.
 */
export function switchParks(day: Day, catalog: Catalog): ParkSwitch | undefined {
  const order = parkOrder(day, catalog)
  if (order.length !== 2) return undefined
  const [first, second] = order as [ParkId, ParkId]
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const attractionsIn = (parkId: ParkId) =>
    day.items.filter((e) => {
      const item = items.get(e.itemId)
      return item?.type === 'attraction' && item.parkId === parkId
    })
  return {
    items: [...attractionsIn(second), ...attractionsIn(first), ...day.items.filter((e) => !items.has(e.itemId))],
    removed: day.items.filter((e) => items.has(e.itemId) && items.get(e.itemId)!.type !== 'attraction'),
    firstPark: second,
  }
}
