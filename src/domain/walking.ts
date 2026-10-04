import type { Catalog, CatalogItem, Coordinates, ParkId } from './catalog'
import type { Minutes } from './time'

/** Paths are not straight lines (design Decision 5). */
export const PATH_FACTOR = 1.35
/** Family walking pace in metres per minute. */
export const WALK_METRES_PER_MIN = 65
/** Getting in and out of a queue or building. */
export const WALK_OVERHEAD_MIN = 1
/** Leaving one park and entering the other: exit and entry turnstiles (design Decision 2). */
export const PARK_CHANGE_MIN = 5

const EARTH_RADIUS_M = 6_371_000
const rad = (deg: number) => (deg * Math.PI) / 180

export function distanceMetres(a: Coordinates, b: Coordinates): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

const metresToMinutes = (metres: number): Minutes => Math.ceil((metres * PATH_FACTOR) / WALK_METRES_PER_MIN) + WALK_OVERHEAD_MIN

export function walkMinutes(a: Coordinates, b: Coordinates): Minutes {
  return metresToMinutes(distanceMetres(a, b))
}

export interface Walk {
  minutes: Minutes
  /** The walk leaves one park and enters the other. */
  parkChange: boolean
}

/** Where a walk starts or ends: a position inside a given park. */
export interface ParkPoint {
  parkId: ParkId
  location: Coordinates
}

/**
 * Walking time between two points. Within a park it is the straight-line estimate; between parks
 * the route goes out through the first park's entrance, across to the other entrance and in again,
 * plus the park-change time. The distances are summed first so the overhead counts once.
 */
export function walkBetween(from: ParkPoint, to: ParkPoint, catalog: Catalog): Walk {
  if (from.parkId === to.parkId) return { minutes: walkMinutes(from.location, to.location), parkChange: false }
  const exit = entranceOf(catalog, from.parkId)
  const entry = entranceOf(catalog, to.parkId)
  const metres = distanceMetres(from.location, exit) + distanceMetres(exit, entry) + distanceMetres(entry, to.location)
  return { minutes: metresToMinutes(metres) + PARK_CHANGE_MIN, parkChange: true }
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
