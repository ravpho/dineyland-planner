import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { CatalogItem, ParkId } from '../domain/catalog'
import type { ListedItem } from '../domain/filters'
import {
  areaWalkTable,
  areaZones,
  bestLabelSpot,
  boundsCentre,
  buildRoute,
  labelWidth,
  panView,
  parkProjection,
  placeLabels,
  viewBoxOf,
  walkFromLastStop,
  walksToAreas,
  zonePath,
  zoomView,
  type LabelCandidate,
  type MapView,
  type Point,
} from '../domain/map'
import { scheduleDay, type DaySchedule } from '../domain/schedule'
import { areaCentres, entranceOf, locate } from '../domain/walking'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { mapPark, selectedDay } from '../state/store'
import { CloseIcon, ExternalIcon, MinusIcon, PlusIcon } from './icons'
import { areaName, itemFacts, TYPE_LABELS } from './labels'
import { Badge, Button, IconButton, Sheet, Stars } from './ui'

/** Zone colours by area order: Main Street / Plaza, then the themed lands. */
const AREA_COLOURS = ['#e11d48', '#d97706', '#059669', '#7c3aed', '#0284c7']
const TYPE_COLOURS: Record<CatalogItem['type'], string> = { attraction: '#1e293b', restaurant: '#b45309', show: '#be185d' }
const UNSUITABLE_COLOUR = '#cbd5e1'
const ROUTE_COLOUR = '#4f46e5'
/** Zone padding, in metres (design Decision 2). */
const ZONE_STROKE_M = 50
/** Restaurant and show labels appear from this zoom (design Decision 3). */
const SMALL_LABEL_ZOOM = 2.5
const LABEL_PX = 11
/** How far from a marker a tap still selects it. */
const TAP_REACH_PX = 22
/** Used until the map has been measured (and in tests, where nothing is laid out). */
const FALLBACK_SIZE = { width: 360, height: 360 }

function useElementSize(ref: React.RefObject<Element | null>) {
  const [size, setSize] = useState(FALLBACK_SIZE)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

interface CanvasProps {
  parkId: ParkId
  listed: ListedItem[]
  schedule: DaySchedule | undefined
  selectedId: string | undefined
  emphasise: boolean
  onSelect: (item: CatalogItem | undefined) => void
}

function MapCanvas({ parkId, listed, schedule, selectedId, emphasise, onSelect }: CanvasProps) {
  const catalog = useCatalog()
  const park = catalog.parks.find((p) => p.id === parkId)!
  const centres = useMemo(() => areaCentres(catalog), [catalog])
  const projection = useMemo(() => parkProjection(catalog, parkId, centres), [catalog, parkId, centres])
  const zones = useMemo(() => areaZones(catalog, projection, centres), [catalog, projection, centres])
  const route = useMemo(() => buildRoute(schedule, catalog, projection, centres), [schedule, catalog, projection, centres])
  const { bounds } = projection
  const [view, setView] = useState<MapView>(() => ({ zoom: 1, centre: boundsCentre(bounds) }))
  const svgRef = useRef<SVGSVGElement>(null)
  const size = useElementSize(svgRef)
  const box = viewBoxOf(view, bounds)
  /** Screen pixels per map metre ("meet" scaling). */
  const scale = Math.min(size.width / box.width, size.height / box.height)
  const px = (n: number) => n / scale

  const markers = useMemo(
    () => listed.map((l) => ({ ...l, point: projection.project(locate(l.item, catalog, centres)) })),
    [listed, projection, catalog, centres],
  )
  const entrance = projection.project(entranceOf(catalog, parkId))

  // Labels are placed in screen space after every zoom or pan (design Decision 3). Area names go
  // where they cover the fewest markers and are placed first, so item labels never cover them. An
  // item label goes right of its marker, or left when that keeps it clear of the edge and the zoom
  // buttons.
  const labels = useMemo(() => {
    const screen = { width: box.width * scale, height: box.height * scale }
    const toScreen = (p: Point) => ({ x: (p.x - box.x) * scale, y: (p.y - box.y) * scale })
    const obstacles = markers.map((m) => toScreen(m.point))
    const controls: LabelCandidate = { id: 'controls', x: screen.width - 60, y: 0, width: 60, height: 112, priority: 0, always: true }
    const areas = new Map(
      zones.map((z) => [z.areaId, bestLabelSpot(toScreen(z.centre), labelWidth(z.name, 10) * 1.25, 13, obstacles, screen)]),
    )
    const candidates: LabelCandidate[] = [controls, ...[...areas].map(([id, b]) => ({ id: `area:${id}`, ...b, priority: 0, always: true }))]
    const left = new Set<string>()
    const clear = (b: { x: number; y: number; width: number; height: number }) =>
      b.x >= 0 && b.x + b.width <= screen.width - 2 && !(b.x + b.width > controls.x && b.y < controls.height)
    for (const m of markers) {
      const selected = m.item.id === selectedId
      if (!selected && !emphasise && m.item.type !== 'attraction' && view.zoom < SMALL_LABEL_ZOOM) continue
      const p = toScreen(m.point)
      if (!selected && (p.x < -20 || p.y < -20 || p.x > screen.width + 20 || p.y > screen.height + 20)) continue
      const width = labelWidth(m.item.name, LABEL_PX)
      const right = { x: p.x + 9, y: p.y - 8, width, height: 15 }
      const onLeft = !clear(right) && clear({ ...right, x: p.x - 9 - width })
      if (onLeft) left.add(m.item.id)
      candidates.push({ id: m.item.id, ...right, x: onLeft ? p.x - 9 - width : right.x, priority: m.item.rating, always: selected })
    }
    return { shown: placeLabels(candidates), left, areas }
  }, [zones, markers, selectedId, emphasise, view.zoom, box.x, box.y, box.width, box.height, scale])

  // --- gestures (design Decision 1) -------------------------------------------------------
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef({ start: { x: 0, y: 0 }, moved: false })

  const toMap = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return boundsCentre({ minX: box.x, minY: box.y, maxX: box.x + box.width, maxY: box.y + box.height })
    const s = Math.min(rect.width / box.width, rect.height / box.height)
    const offX = (rect.width - box.width * s) / 2
    const offY = (rect.height - box.height * s) / 2
    return { x: box.x + (clientX - rect.left - offX) / s, y: box.y + (clientY - rect.top - offY) / s }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) gesture.current = { start: { x: e.clientX, y: e.clientY }, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    if (pointers.current.size === 1) {
      if (!gesture.current.moved && Math.hypot(next.x - gesture.current.start.x, next.y - gesture.current.start.y) > 6) gesture.current.moved = true
      if (gesture.current.moved) setView((v) => panView(v, -(next.x - prev.x) / scale, -(next.y - prev.y) / scale, bounds))
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)![1]
      const before = Math.hypot(prev.x - other.x, prev.y - other.y)
      const after = Math.hypot(next.x - other.x, next.y - other.y)
      if (before > 0) {
        gesture.current.moved = true
        const anchor = toMap((next.x + other.x) / 2, (next.y + other.y) / 2)
        setView((v) => zoomView(v, after / before, bounds, anchor))
      }
    }
    pointers.current.set(e.pointerId, next)
  }
  const onPointerEnd = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId)
  }

  // Wheel zoom needs a non-passive listener to keep the page from scrolling; it is re-attached on
  // every render so it sees the current view.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setView((v) => zoomView(v, e.deltaY < 0 ? 1.25 : 0.8, bounds, toMap(e.clientX, e.clientY)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (step) {
      e.preventDefault()
      setView((v) => panView(v, step[0]! * box.width * 0.2, step[1]! * box.height * 0.2, bounds))
    } else if (e.key === '+' || e.key === '=') setView((v) => zoomView(v, 1.5, bounds))
    else if (e.key === '-') setView((v) => zoomView(v, 1 / 1.5, bounds))
  }

  const tap = (item: CatalogItem | undefined) => {
    if (gesture.current.moved) return
    onSelect(item)
  }
  /** A tap beside the markers selects the nearest one within reach of a finger, else clears the selection. */
  const tapBackground = (clientX: number, clientY: number) => {
    const at = toMap(clientX, clientY)
    let nearest: { item: CatalogItem; d: number } | undefined
    for (const m of markers) {
      const d = Math.hypot(m.point.x - at.x, m.point.y - at.y)
      if (d <= px(TAP_REACH_PX) && (!nearest || d < nearest.d)) nearest = { item: m.item, d }
    }
    tap(nearest?.item)
  }

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#eef3ea]">
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block max-h-[62dvh] w-full cursor-grab touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        style={{ aspectRatio: `${width} / ${height}` }}
        role="group"
        aria-label={`Map of ${park.name}. Drag to move, pinch or use the buttons to zoom.`}
        tabIndex={0}
        data-testid="park-map"
        data-zoom={view.zoom}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      >
        <rect x={bounds.minX} y={bounds.minY} width={width} height={height} fill="#eef3ea" onClick={(e) => tapBackground(e.clientX, e.clientY)} data-testid="map-background" />
        {zones.map((z, i) => (
          <g key={z.areaId} opacity={0.2} data-testid="map-zone" data-area={z.areaId} pointerEvents="none">
            <path d={zonePath(z.hull)} fill={AREA_COLOURS[i % AREA_COLOURS.length]} stroke={AREA_COLOURS[i % AREA_COLOURS.length]} strokeWidth={ZONE_STROKE_M} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {zones.map((z, i) => (
          <text
            key={z.areaId}
            x={box.x + px(labels.areas.get(z.areaId)!.x + labels.areas.get(z.areaId)!.width / 2)}
            y={box.y + px(labels.areas.get(z.areaId)!.y + 10)}
            fontSize={px(10)}
            paintOrder="stroke"
            stroke="#ffffff"
            strokeWidth={px(2.5)}
            strokeOpacity={0.7}
            fontWeight={700}
            letterSpacing={px(0.6)}
            textAnchor="middle"
            fill={AREA_COLOURS[i % AREA_COLOURS.length]}
            opacity={0.85}
            pointerEvents="none"
            data-testid="map-zone-label"
          >
            {z.name.toUpperCase()}
          </text>
        ))}

        {route.segments.map((s, i) => (
          <line
            key={i}
            x1={s.from.x}
            y1={s.from.y}
            x2={s.to.x}
            y2={s.to.y}
            stroke={ROUTE_COLOUR}
            strokeWidth={px(3)}
            strokeLinecap="round"
            strokeDasharray={s.dashed ? `${px(7)} ${px(5)}` : undefined}
            pointerEvents="none"
            data-testid="route-segment"
            data-dashed={s.dashed ? 'true' : undefined}
          />
        ))}

        <g transform={`translate(${entrance.x} ${entrance.y})`} pointerEvents="none">
          <rect x={-px(5)} y={-px(5)} width={px(10)} height={px(10)} fill="#475569" rx={px(2)} />
          <text x={px(8)} y={px(4)} fontSize={px(10)} fill="#475569" paintOrder="stroke" stroke="#eef3ea" strokeWidth={px(3)}>
            Entrance
          </text>
        </g>

        {markers.map(({ item, point, unsuitable }) => {
          const selected = item.id === selectedId
          const colour = unsuitable ? UNSUITABLE_COLOUR : TYPE_COLOURS[item.type]
          // Approximate positions are hollow with a dashed outline.
          const fill = item.locationApproximate ? '#ffffff' : colour
          const stroke = item.locationApproximate ? colour : '#ffffff'
          const dash = item.locationApproximate ? `${px(2.5)} ${px(1.5)}` : undefined
          const r = item.type === 'attraction' ? px(6.5) : px(4.5)
          return (
            <g
              key={item.id}
              transform={`translate(${point.x} ${point.y})`}
              role="button"
              tabIndex={0}
              aria-label={item.name}
              aria-pressed={selected}
              className="cursor-pointer focus:outline-none"
              data-testid="map-marker"
              data-type={item.type}
              data-unsuitable={unsuitable ? 'true' : undefined}
              data-approximate={item.locationApproximate ? 'true' : undefined}
              onClick={() => tap(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelect(item)
                }
              }}
            >
              {(selected || emphasise) && <circle r={px(selected ? 11 : 9.5)} fill="none" stroke={selected ? ROUTE_COLOUR : '#f59e0b'} strokeWidth={px(2.5)} />}
              {item.type === 'attraction' && <circle r={r} fill={fill} stroke={stroke} strokeWidth={px(item.locationApproximate ? 2 : 1.5)} strokeDasharray={dash} />}
              {item.type === 'restaurant' && <rect x={-r} y={-r} width={2 * r} height={2 * r} fill={fill} stroke={stroke} strokeWidth={px(1.5)} strokeDasharray={dash} />}
              {item.type === 'show' && <rect x={-r} y={-r} width={2 * r} height={2 * r} transform="rotate(45)" fill={fill} stroke={stroke} strokeWidth={px(1.5)} strokeDasharray={dash} />}
            </g>
          )
        })}

        {markers
          .filter((m) => labels.shown.has(m.item.id))
          .map(({ item, point, unsuitable }) => (
            <text
              key={item.id}
              x={labels.left.has(item.id) ? point.x - px(9) : point.x + px(9)}
              y={point.y + px(4)}
              textAnchor={labels.left.has(item.id) ? 'end' : 'start'}
              fontSize={px(LABEL_PX)}
              fontWeight={item.id === selectedId ? 700 : 500}
              fill={unsuitable ? '#64748b' : '#0f172a'}
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={px(3)}
              strokeLinejoin="round"
              pointerEvents="none"
              data-testid="map-label"
            >
              {item.name}
            </text>
          ))}

        {route.stops.map((s) => {
          const text = s.numbers.join(',')
          const w = Math.max(px(18), px(labelWidth(text, 10) + 8))
          return (
            <g key={s.itemId} transform={`translate(${s.point.x - px(10)} ${s.point.y - px(12)})`} pointerEvents="none" data-testid="route-stop" data-item={s.itemId}>
              <rect x={-w / 2} y={-px(9)} width={w} height={px(18)} rx={px(9)} fill={ROUTE_COLOUR} stroke="#ffffff" strokeWidth={px(1.5)} />
              <text textAnchor="middle" y={px(3.5)} fontSize={px(10)} fontWeight={700} fill="#ffffff">
                {text}
              </text>
            </g>
          )
        })}
        {route.markers.map((m, i) => (
          <g key={m.label} transform={`translate(${m.point.x} ${m.point.y + px(16 + i * 20)})`} pointerEvents="none" data-testid="route-marker">
            <rect x={-px(labelWidth(m.label, 10) / 2 + 6)} y={-px(9)} width={px(labelWidth(m.label, 10) + 12)} height={px(18)} rx={px(9)} fill="#ffffff" stroke={ROUTE_COLOUR} strokeWidth={px(1.5)} strokeDasharray={`${px(4)} ${px(3)}`} />
            <text textAnchor="middle" y={px(3.5)} fontSize={px(10)} fontWeight={600} fill={ROUTE_COLOUR}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <IconButton label="Zoom in" onClick={() => setView((v) => zoomView(v, 1.5, bounds))} disabled={view.zoom >= 4} className="border border-slate-300 bg-white shadow-sm">
          <PlusIcon />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => setView((v) => zoomView(v, 1 / 1.5, bounds))} disabled={view.zoom <= 1} className="border border-slate-300 bg-white shadow-sm">
          <MinusIcon />
        </IconButton>
      </div>
    </div>
  )
}

function MapItemCard({
  listed,
  schedule,
  onClose,
  onAdd,
  onOpen,
}: {
  listed: ListedItem
  schedule: DaySchedule | undefined
  onClose: () => void
  onAdd: () => void
  onOpen: () => void
}) {
  const catalog = useCatalog()
  const { item, unsuitable } = listed
  const park = catalog.parks.find((p) => p.id === item.parkId)!
  const area = areaName(item, catalog)
  const centres = useMemo(() => areaCentres(catalog), [catalog])
  const walk = walkFromLastStop(schedule, item, catalog, centres)
  const last = schedule?.slots.filter((s) => s.kind === 'scheduled').at(-1)?.item
  const areaWalks = walksToAreas(item, catalog, centres)

  return (
    <section aria-label={`${item.name} on the map`} data-testid="map-card" className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          <p className="text-xs text-slate-500">
            {park.name} · {area}
          </p>
        </div>
        <IconButton label="Close card" onClick={onClose} className="-mr-2 -mt-2">
          <CloseIcon />
        </IconButton>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <Badge>{TYPE_LABELS[item.type]}</Badge>
        <Stars rating={item.rating} />
        {itemFacts(item).map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>
      {unsuitable && (
        <p className="mt-1">
          <Badge tone="amber">{unsuitable}</Badge>
        </p>
      )}
      {item.locationApproximate && (
        <p className="mt-2 text-xs text-slate-600" role="note">
          The position on the map is approximate.
        </p>
      )}
      <div className="mt-2 text-sm text-slate-800">
        {last?.id === item.id ? (
          <p data-testid="is-last-stop">This is your last planned stop.</p>
        ) : walk && last ? (
          <p data-testid="walk-from-last">
            <strong>{walk.minutes} min</strong> walk from {last.name}, your last stop
            {walk.parkChange && ' (includes changing park)'}
          </p>
        ) : (
          <p className="text-slate-600" data-testid="no-last-stop">
            Plan a day to see the walk from your last stop.
          </p>
        )}
      </div>
      <div className="mt-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Walk to each area</h4>
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm" data-testid="area-walks">
          {areaWalks.map((w) => (
            <li key={w.areaId} className="flex justify-between gap-2">
              <span className="text-slate-700">{w.name}</span>
              <span className="shrink-0 font-medium text-slate-900">{w.minutes} min</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" className="flex-1" onClick={onAdd}>
          Add to day
        </Button>
        <Button className="flex-1" onClick={onOpen}>
          Details
        </Button>
      </div>
    </section>
  )
}

function AreaWalkTimes({ parkId, onClose }: { parkId: ParkId; onClose: () => void }) {
  const catalog = useCatalog()
  const park = catalog.parks.find((p) => p.id === parkId)!
  const table = useMemo(() => areaWalkTable(catalog, parkId), [catalog, parkId])
  return (
    <Sheet title={`Walking times in ${park.name}`} onClose={onClose}>
      <p className="mb-2 text-sm text-slate-600">Minutes on foot between the centres of the areas, with the same estimate as the day plan.</p>
      <table className="w-full text-sm" data-testid="area-table">
        <thead>
          <tr>
            <th scope="col" className="py-1 text-left font-medium text-slate-500">
              Area
            </th>
            {table.areas.map((a, j) => (
              <th key={a.id} scope="col" title={a.name} className="w-9 py-1 text-center font-medium text-slate-500">
                <abbr title={a.name} className="no-underline">
                  {j + 1}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.areas.map((a, i) => (
            <tr key={a.id} className="border-t border-slate-100">
              <th scope="row" className="py-1.5 pr-2 text-left font-medium text-slate-800">
                <span className="mr-1 text-slate-400">{i + 1}</span>
                {a.name}
              </th>
              {table.minutes[i]!.map((m, j) => (
                <td key={table.areas[j]!.id} className="text-center tabular-nums text-slate-900">
                  {m === null ? '–' : m}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  )
}

/** The catalog's map view (park-map spec). */
export function ParkMap({ listed, onAdd, onOpen }: { listed: ListedItem[]; onAdd: (item: CatalogItem) => void; onOpen: (item: CatalogItem) => void }) {
  const catalog = useCatalog()
  const parkId = usePlanner((s) => mapPark(s, catalog))
  const setMapPark = usePlanner((s) => s.setMapPark)
  const query = usePlanner((s) => s.filters.query)
  const profile = usePlanner((s) => s.profile)
  const day = usePlanner(selectedDay)
  const schedule = useMemo(() => (day ? scheduleDay(day, catalog, profile) : undefined), [day, catalog, profile])
  const [selectedId, setSelectedId] = useState<string>()
  const [showTable, setShowTable] = useState(false)
  const park = catalog.parks.find((p) => p.id === parkId)!
  const selected = listed.find((l) => l.item.id === selectedId)

  return (
    <div data-testid="map-view">
      <div role="group" aria-label="Park on the map" className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-200 p-1">
        {catalog.parks.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === parkId}
            onClick={() => {
              setSelectedId(undefined)
              setMapPark(p.id)
            }}
            className={`min-h-11 rounded-md px-2 text-sm font-medium ${p.id === parkId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700'}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      <MapCanvas
        key={parkId}
        parkId={parkId}
        listed={listed}
        schedule={schedule}
        selectedId={selected?.item.id}
        emphasise={query.trim() !== ''}
        onSelect={(item) => setSelectedId(item?.id)}
      />
      {listed.length === 0 && <p className="mt-2 text-sm text-slate-600">Nothing in {park.name} matches these filters.</p>}
      {selected && (
        <MapItemCard listed={selected} schedule={schedule} onClose={() => setSelectedId(undefined)} onAdd={() => onAdd(selected.item)} onOpen={() => onOpen(selected.item)} />
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Legend">
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="4.5" fill={TYPE_COLOURS.attraction} />
            </svg>
            Attraction
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden="true">
              <rect x="1" y="1" width="8" height="8" fill={TYPE_COLOURS.restaurant} />
            </svg>
            Restaurant
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" transform="rotate(45 5 5)" fill={TYPE_COLOURS.show} />
            </svg>
            Show
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#ffffff" stroke={TYPE_COLOURS.attraction} strokeWidth="1.5" strokeDasharray="2 1.5" />
            </svg>
            Approximate
          </span>
        </span>
        <Button className="px-3 text-xs" onClick={() => setShowTable(true)}>
          Area walking times
        </Button>
      </div>
      <p className="mt-1 text-xs">
        <a href={park.officialMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-indigo-700 underline">
          {park.officialMapLabel} <ExternalIcon />
        </a>
      </p>
      {showTable && <AreaWalkTimes parkId={parkId} onClose={() => setShowTable(false)} />}
    </div>
  )
}
