import { SERVICE_LABELS, scareLabel, thrillLabel, type Catalog, type CatalogItem, type Coordinates, type HeightSource, type ItemType } from '../domain/catalog'

export const TYPE_LABELS: Record<ItemType, string> = { attraction: 'Attraction', restaurant: 'Restaurant', show: 'Show' }

/** How an attraction's height rule was checked (design Decision 7). */
export const HEIGHT_SOURCE_LABELS: Record<HeightSource, string> = {
  official: 'Confirmed by an official Disneyland Paris source',
  corroborated: 'Matches in independent sources',
  draft: 'Not yet verified',
}

/** Google Maps URL (documented, keyless format); opens the Maps app on phones that have it. */
export function mapsUrl({ lat, lng }: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** The name of the item's area, such as "Fantasyland". */
export function areaName(item: CatalogItem, catalog: Catalog): string | undefined {
  return catalog.parks.find((p) => p.id === item.parkId)?.areas.find((a) => a.id === item.areaId)?.name
}

export function heightLabel(minHeightCm: number | null): string {
  return minHeightCm === null ? 'No height requirement' : `Min. ${minHeightCm} cm`
}

/** Short one-line facts for a list row. */
export function itemFacts(item: CatalogItem): string[] {
  switch (item.type) {
    case 'attraction':
      return [`${item.durationMin} min`, item.minHeightCm === null ? 'Any height' : `${item.minHeightCm} cm`, thrillLabel(item.thrill), ...(item.scare >= 2 ? [scareLabel(item.scare)] : [])]
    case 'restaurant':
      return [SERVICE_LABELS[item.service]]
    case 'show':
      return [`${item.durationMin} min`, item.times.join(', ')]
  }
}
