import { SERVICE_LABELS, scareLabel, thrillLabel, type CatalogItem, type ItemType } from '../domain/catalog'

export const TYPE_LABELS: Record<ItemType, string> = { attraction: 'Attraction', restaurant: 'Restaurant', show: 'Show' }

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
