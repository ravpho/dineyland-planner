import type { Catalog, CatalogItem, Coordinates, ParkId } from './catalog'
import type { DaySchedule, ScheduledSlot } from './schedule'
import type { Minutes } from './time'
import { areaCentres, entranceOf, locate, walkBetween, walkMinutes, type ParkPoint, type Walk } from './walking'

/** Metres per degree of latitude (mean Earth radius, as in `distanceMetres`). */
export const METRES_PER_DEGREE = (2 * Math.PI * 6_371_000) / 360
/** Space around the outermost items, so zones and labels fit (design Decision 2). */
export const MAP_MARGIN_M = 60

/** A position on the map in metres from the park's centre; x points east, y points south (SVG). */
export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface ParkProjection {
  parkId: ParkId
  origin: Coordinates
  project: (c: Coordinates) => Point
  /** Every item and the entrance, plus the margin. */
  bounds: Bounds
}

/** Local equirectangular projection around the park's centre (design Decision 1). */
export function projectionAround(origin: Coordinates): (c: Coordinates) => Point {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180)
  return (c) => ({
    x: (c.lng - origin.lng) * cosLat * METRES_PER_DEGREE,
    y: -(c.lat - origin.lat) * METRES_PER_DEGREE,
  })
}

/** The positions an item list is drawn at; items without coordinates use their area centre, as in the timeline. */
export function parkPositions(catalog: Catalog, parkId: ParkId, centres = areaCentres(catalog)): Map<string, Coordinates> {
  return new Map(catalog.items.filter((i) => i.parkId === parkId).map((i) => [i.id, locate(i, catalog, centres)]))
}

export function parkProjection(catalog: Catalog, parkId: ParkId, centres = areaCentres(catalog)): ParkProjection {
  const coords = [...parkPositions(catalog, parkId, centres).values(), entranceOf(catalog, parkId)]
  const lats = coords.map((c) => c.lat)
  const lngs = coords.map((c) => c.lng)
  const origin = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 }
  const project = projectionAround(origin)
  const points = coords.map(project)
  const bounds = {
    minX: Math.min(...points.map((p) => p.x)) - MAP_MARGIN_M,
    minY: Math.min(...points.map((p) => p.y)) - MAP_MARGIN_M,
    maxX: Math.max(...points.map((p) => p.x)) + MAP_MARGIN_M,
    maxY: Math.max(...points.map((p) => p.y)) + MAP_MARGIN_M,
  }
  return { parkId, origin, project, bounds }
}

export const inBounds = (p: Point, b: Bounds) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY

// ---------------------------------------------------------------------------------------------
// Area zones (design Decision 2)

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

/** Convex hull (monotone chain). One or two distinct points come back as they are. */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...new Map(points.map((p) => [`${p.x},${p.y}`, p])).values()].sort((a, b) => a.x - b.x || a.y - b.y)
  if (sorted.length <= 2) return sorted
  const half = (pts: Point[]) => {
    const out: Point[] = []
    for (const p of pts) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  const hull = [...half(sorted), ...half([...sorted].reverse())]
  // All points on one line: keep the two ends, drawn as a capsule.
  return hull.length >= 3 ? hull : [sorted[0]!, sorted[sorted.length - 1]!]
}

const fmt = (n: number) => String(Math.round(n * 10) / 10)

/**
 * SVG path of a zone. Drawn with a wide stroke and round joins and caps, it pads the hull; a single
 * point becomes a dot and two points a capsule.
 */
export function zonePath(hull: Point[]): string {
  if (hull.length === 0) return ''
  const [first, ...rest] = hull
  const start = `M${fmt(first!.x)} ${fmt(first!.y)}`
  if (rest.length === 0) return `${start}L${fmt(first!.x)} ${fmt(first!.y)}`
  return `${start}${rest.map((p) => `L${fmt(p.x)} ${fmt(p.y)}`).join('')}${hull.length > 2 ? 'Z' : ''}`
}

export interface AreaZone {
  areaId: string
  name: string
  hull: Point[]
  /** Label position: the area centre the walking times use. */
  centre: Point
}

/** One zone per area of the park that has at least one item. */
export function areaZones(catalog: Catalog, projection: ParkProjection, centres = areaCentres(catalog)): AreaZone[] {
  const park = catalog.parks.find((p) => p.id === projection.parkId)!
  const positions = parkPositions(catalog, park.id, centres)
  const zones: AreaZone[] = []
  for (const area of park.areas) {
    const points = catalog.items.filter((i) => i.parkId === park.id && i.areaId === area.id).map((i) => projection.project(positions.get(i.id)!))
    const centre = centres.get(`${park.id}/${area.id}`)
    if (points.length === 0 || !centre) continue
    zones.push({ areaId: area.id, name: area.name, hull: convexHull(points), centre: projection.project(centre) })
  }
  return zones
}

// ---------------------------------------------------------------------------------------------
// Label placement (design Decision 3)

export interface LabelCandidate {
  id: string
  /** Screen-space box in pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Higher wins a collision (the item's rating). */
  priority: number
  /** Always shown, e.g. the selected item. */
  always?: boolean
}

const overlaps = (a: LabelCandidate, b: LabelCandidate) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** Greedy placement: forced labels first, then by priority; a label that overlaps a placed one is hidden. */
export function placeLabels(candidates: LabelCandidate[]): Set<string> {
  const order = [...candidates].sort((a, b) => Number(b.always ?? false) - Number(a.always ?? false) || b.priority - a.priority || a.id.localeCompare(b.id))
  const placed: LabelCandidate[] = []
  for (const c of order) {
    if (c.always || !placed.some((p) => overlaps(p, c))) placed.push(c)
  }
  return new Set(placed.map((c) => c.id))
}

/** Rough width of a label in pixels, without measuring text. */
export const labelWidth = (text: string, fontPx: number) => Math.ceil(text.length * fontPx * 0.56)

// ---------------------------------------------------------------------------------------------
// Pan and zoom (design Decision 1)

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

export interface MapView {
  zoom: number
  /** Centre of the view in map metres. */
  centre: Point
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

export function boundsCentre(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
}

/** The part of the park in view; at zoom 1 it is the whole park, and the view never leaves the park. */
export function viewBoxOf(view: MapView, b: Bounds): ViewBox {
  const width = (b.maxX - b.minX) / view.zoom
  const height = (b.maxY - b.minY) / view.zoom
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  const cx = clamp(view.centre.x, b.minX + width / 2, b.maxX - width / 2)
  const cy = clamp(view.centre.y, b.minY + height / 2, b.maxY - height / 2)
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

/** Zoom by `factor`, keeping the map point `anchor` (default: the view centre) where it is on screen. */
export function zoomView(view: MapView, factor: number, b: Bounds, anchor?: Point): MapView {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor))
  const box = viewBoxOf(view, b)
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  if (!anchor) return { zoom, centre }
  const ratio = view.zoom / zoom
  return { zoom, centre: { x: anchor.x + (centre.x - anchor.x) * ratio, y: anchor.y + (centre.y - anchor.y) * ratio } }
}

/** Move the view by a distance in map metres, staying inside the park. */
export function panView(view: MapView, dx: number, dy: number, b: Bounds): MapView {
  const box = viewBoxOf(view, b)
  const moved = viewBoxOf({ zoom: view.zoom, centre: { x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy } }, b)
  return { zoom: view.zoom, centre: { x: moved.x + moved.width / 2, y: moved.y + moved.height / 2 } }
}

// ---------------------------------------------------------------------------------------------
// Walking times on the map (design Decision 4)

const scheduledSlots = (schedule: DaySchedule) => schedule.slots.filter((s): s is ScheduledSlot => s.kind === 'scheduled')

/** Where the selected day's last scheduled item is; undefined for a day without items. */
export function lastStop(schedule: DaySchedule | undefined, catalog: Catalog, centres = areaCentres(catalog)): (ParkPoint & { item: CatalogItem }) | undefined {
  const last = schedule ? scheduledSlots(schedule).at(-1) : undefined
  return last && { parkId: last.item.parkId, location: locate(last.item, catalog, centres), item: last.item }
}

/** The walk the timeline would show if `item` were added after the day's last stop. */
export function walkFromLastStop(schedule: DaySchedule | undefined, item: CatalogItem, catalog: Catalog, centres = areaCentres(catalog)): Walk | undefined {
  const from = lastStop(schedule, catalog, centres)
  return from && walkBetween(from, { parkId: item.parkId, location: locate(item, catalog, centres) }, catalog)
}

export interface AreaWalk {
  areaId: string
  name: string
  minutes: Minutes
}

/** Minutes from the item to the centre of each area of its park. */
export function walksToAreas(item: CatalogItem, catalog: Catalog, centres = areaCentres(catalog)): AreaWalk[] {
  const park = catalog.parks.find((p) => p.id === item.parkId)!
  const from = locate(item, catalog, centres)
  return park.areas.flatMap((area) => {
    const centre = centres.get(`${park.id}/${area.id}`)
    return centre ? [{ areaId: area.id, name: area.name, minutes: walkMinutes(from, centre) }] : []
  })
}

export interface AreaWalkTable {
  areas: { id: string; name: string }[]
  /** minutes[i][j] between areas i and j; null on the diagonal. */
  minutes: (Minutes | null)[][]
}

/** Walking minutes between the centres of every pair of areas in the park. */
export function areaWalkTable(catalog: Catalog, parkId: ParkId, centres = areaCentres(catalog)): AreaWalkTable {
  const park = catalog.parks.find((p) => p.id === parkId)!
  const areas = park.areas.filter((a) => centres.has(`${parkId}/${a.id}`))
  const at = (id: string) => centres.get(`${parkId}/${id}`)!
  return {
    areas: areas.map(({ id, name }) => ({ id, name })),
    minutes: areas.map((a, i) => areas.map((b, j) => (i === j ? null : walkMinutes(at(a.id), at(b.id))))),
  }
}

// ---------------------------------------------------------------------------------------------
// The day's route (design Decision 5)

export interface RouteStop {
  itemId: string
  /** Positions in the whole day; an item planned twice carries two numbers. */
  numbers: number[]
  point: Point
}

export interface RouteSegment {
  from: Point
  to: Point
  /** A walk that leaves or enters the park through the entrance. */
  dashed: boolean
}

export interface RouteMarker {
  point: Point
  label: string
}

export interface MapRoute {
  stops: RouteStop[]
  segments: RouteSegment[]
  markers: RouteMarker[]
}

/** The selected day's stops in the shown park, numbered across the whole day. */
export function buildRoute(schedule: DaySchedule | undefined, catalog: Catalog, projection: ParkProjection, centres = areaCentres(catalog)): MapRoute {
  const route: MapRoute = { stops: [], segments: [], markers: [] }
  if (!schedule) return route
  const parkId = projection.parkId
  const parkName = (id: ParkId) => catalog.parks.find((p) => p.id === id)!.name
  const entrance = projection.project(entranceOf(catalog, parkId))
  const pointOf = (item: CatalogItem) => projection.project(locate(item, catalog, centres))
  const addMarker = (label: string) => {
    if (!route.markers.some((m) => m.label === label)) route.markers.push({ point: entrance, label })
  }

  let prev: CatalogItem | undefined
  scheduledSlots(schedule).forEach(({ item }, index) => {
    if (item.parkId === parkId) {
      const stop = route.stops.find((s) => s.itemId === item.id)
      if (stop) stop.numbers.push(index + 1)
      else route.stops.push({ itemId: item.id, numbers: [index + 1], point: pointOf(item) })
    }
    if (prev) {
      const fromHere = prev.parkId === parkId
      const toHere = item.parkId === parkId
      if (fromHere && toHere) route.segments.push({ from: pointOf(prev), to: pointOf(item), dashed: false })
      else if (fromHere) {
        route.segments.push({ from: pointOf(prev), to: entrance, dashed: true })
        addMarker(`to ${parkName(item.parkId)}`)
      } else if (toHere) {
        route.segments.push({ from: entrance, to: pointOf(item), dashed: true })
        addMarker(`from ${parkName(prev.parkId)}`)
      }
    }
    prev = item
  })
  return route
}
