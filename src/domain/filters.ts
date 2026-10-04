import type { Catalog, CatalogItem, ItemType, Park, ParkId } from './catalog'
import { unsuitableReason, type GroupProfile } from './suitability'
import { waitRange } from './waits'

export type SortOrder = 'name' | 'rating' | 'wait'

export interface CatalogFilters {
  parkId: ParkId
  /** Empty = all areas. */
  areaIds: string[]
  /** Empty = all types. */
  types: ItemType[]
  query: string
  hideUnsuitable: boolean
  sort: SortOrder
}

export const DEFAULT_FILTERS: CatalogFilters = {
  parkId: 'dlp',
  areaIds: [],
  types: [],
  query: '',
  hideUnsuitable: false,
  sort: 'name',
}

export interface ListedItem {
  item: CatalogItem
  /** Set when the group profile rules the item out; the row is greyed out with this reason. */
  unsuitable?: string
  /** Attractions: lowest and highest typical wait in the planned month. */
  waitRange?: [number, number]
}

/** Lower-case and strip accents, so "Café" matches "cafe". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export function matchesQuery(item: CatalogItem, query: string): boolean {
  const q = normalizeText(query.trim())
  return q === '' || normalizeText(item.name).includes(q)
}

export function filterCatalog(catalog: Catalog, filters: CatalogFilters, profile: GroupProfile | undefined, month: number): ListedItem[] {
  const park = catalog.parks.find((p) => p.id === filters.parkId) as Park
  const listed: ListedItem[] = []
  for (const item of catalog.items) {
    if (item.parkId !== filters.parkId) continue
    if (filters.areaIds.length > 0 && !filters.areaIds.includes(item.areaId)) continue
    if (filters.types.length > 0 && !filters.types.includes(item.type)) continue
    if (!matchesQuery(item, filters.query)) continue
    const unsuitable = unsuitableReason(item, profile)
    if (unsuitable && filters.hideUnsuitable) continue
    listed.push({ item, unsuitable, waitRange: item.type === 'attraction' ? waitRange(item, park, month) : undefined })
  }
  return sortListed(listed, filters.sort)
}

const byName = (a: ListedItem, b: ListedItem) => a.item.name.localeCompare(b.item.name, 'en', { sensitivity: 'base' })

export function sortListed(listed: ListedItem[], sort: SortOrder): ListedItem[] {
  const copy = [...listed]
  if (sort === 'name') return copy.sort(byName)
  if (sort === 'rating') return copy.sort((a, b) => b.item.rating - a.item.rating || byName(a, b))
  // Shortest typical peak wait first; items without a queue estimate go last.
  return copy.sort((a, b) => (a.waitRange?.[1] ?? Infinity) - (b.waitRange?.[1] ?? Infinity) || byName(a, b))
}
