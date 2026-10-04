import type { Catalog, CatalogItem, Coordinates, ParkId } from './catalog'
import type { Minutes } from './time'

/** Paths are not straight lines (design Decision 5). */
export const PATH_FACTOR = 1.35
/** Family walking pace in metres per minute. */
export const WALK_METRES_PER_MIN = 65
/** Getting in and out of a queue or building. */
export const WALK_OVERHEAD_MIN = 1

const EARTH_RADIUS_M = 6_371_000
const rad = (deg: number) => (deg * Math.PI) / 180

export function distanceMetres(a: Coordinates, b: Coordinates): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function walkMinutes(a: Coordinates, b: Coordinates): Minutes {
  return Math.ceil((distanceMetres(a, b) * PATH_FACTOR) / WALK_METRES_PER_MIN) + WALK_OVERHEAD_MIN
}

/** Centre of each area, from the items in it that have coordinates. Key: `${parkId}/${areaId}`. */
export function areaCentres(catalog: Catalog): Map<string, Coordinates> {
  const sums = new Map<string, { lat: number; lng: number; n: number }>()
  for (const item of catalog.items) {
    if (!item.location) continue
    const key = `${item.parkId}/${item.areaId}`
    const s = sums.get(key) ?? { lat: 0, lng: 0, n: 0 }
    s.lat += item.location.lat
    s.lng += item.location.lng
    s.n++
    sums.set(key, s)
  }
  return new Map([...sums].map(([key, s]) => [key, { lat: s.lat / s.n, lng: s.lng / s.n }]))
}

/** Where an item is: its own coordinates, else its area centre, else the park entrance. */
export function locate(item: CatalogItem, catalog: Catalog, centres = areaCentres(catalog)): Coordinates {
  return item.location ?? centres.get(`${item.parkId}/${item.areaId}`) ?? entranceOf(catalog, item.parkId)
}

export function entranceOf(catalog: Catalog, parkId: ParkId): Coordinates {
  const park = catalog.parks.find((p) => p.id === parkId)
  if (!park) throw new Error(`Unknown park ${parkId}`)
  return park.entrance
}
