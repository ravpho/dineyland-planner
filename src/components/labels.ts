import { SERVICE_LABELS, scareLabel, thrillLabel, type Catalog, type CatalogItem, type Coordinates, type HeightSource, type ItemType } from '../domain/catalog'
import type { PlannedMark } from '../domain/stops'

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

/** "stop 4" or "stops 4, 9". */
const stopList = (stops: number[]) => (stops.length === 1 ? `stop ${stops[0]}` : `stops ${stops.join(', ')}`)
/** "Day 3" or "Days 2, 3". */
const dayList = (days: number[]) => (days.length === 1 ? `Day ${days[0]}` : `Days ${days.join(', ')}`)

/**
 * The planned label of a catalog item (plan-ui-improvements design Decision 2): `strong` for the
 * selected day, such as "In Day 1 · stops 4, 9", and `muted` for other days, such as "Also in Day 3".
 */
export function plannedLabel(mark: PlannedMark, selectedDayNumber: number): { strong?: string; muted?: string } {
  if (mark.stops.length === 0) return mark.otherDays.length ? { muted: `In ${dayList(mark.otherDays)}` } : {}
  return {
    strong: `In Day ${selectedDayNumber} · ${stopList(mark.stops)}`,
    ...(mark.otherDays.length ? { muted: `Also in ${dayList(mark.otherDays)}` } : {}),
  }
}

/** Stop numbers for the plan map's park switch: "stop 3", "stops 1, 2, 5", "stops 1–4" or "no stops". */
export function formatStops(numbers: number[]): string {
  if (numbers.length === 0) return 'no stops'
  if (numbers.length === 1) return `stop ${numbers[0]}`
  const sorted = [...numbers].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++
    // Runs of three or more become a range (design Decision 5).
    if (j - i >= 2) parts.push(`${sorted[i]}–${sorted[j]}`)
    else parts.push(...sorted.slice(i, j + 1).map(String))
    i = j + 1
  }
  return `stops ${parts.join(', ')}`
}
