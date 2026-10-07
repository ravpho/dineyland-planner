import { useMemo, useState } from 'react'
import type { ParkId } from '../domain/catalog'
import type { ListedItem } from '../domain/filters'
import type { DaySchedule, ScheduledSlot } from '../domain/schedule'
import { stopNumbers } from '../domain/stops'
import { formatClock } from '../domain/time'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { CloseIcon } from './icons'
import { areaName, formatStops } from './labels'
import { MapCanvas } from './ParkMap'
import { Badge, Button, IconButton } from './ui'

/** A planned item's times, once for each time it is in the day (park-map spec, design Decision 8). */
function StopCard({ day, slots, stops, onClose }: { day: Day; slots: ScheduledSlot[]; stops: Map<string, number>; onClose: () => void }) {
  const catalog = useCatalog()
  const showInTimeline = usePlanner((s) => s.showInTimeline)
  const { item } = slots[0]!
  const park = catalog.parks.find((p) => p.id === item.parkId)!
  return (
    <section aria-label={`${item.name} in your day`} data-testid="stop-card" className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          <p className="text-xs text-slate-500">
            {park.name} · {areaName(item, catalog)}
          </p>
        </div>
        <IconButton label="Close card" onClick={onClose} className="-mr-2 -mt-2">
          <CloseIcon />
        </IconButton>
      </div>
      <ul className="mt-1 divide-y divide-slate-100">
        {slots.map((s) => {
          const stop = stops.get(s.entry.key)
          return (
            <li key={s.entry.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-sm text-slate-700" data-testid="stop-times">
              <span className="font-semibold text-slate-900">Stop {stop}</span>
              <span>arrive {formatClock(s.arrive)}</span>
              {item.type !== 'show' && <span>wait {s.wait} min</span>}
              <span className="font-mono font-semibold text-slate-900">
                {formatClock(s.start)}–{formatClock(s.end)}
              </span>
              {s.lateBy > 0 && <Badge tone="over">{s.lateBy} min late</Badge>}
              {s.afterWindow && <Badge tone="over">Ends after {day.end}</Badge>}
              <Button
                className="ml-auto px-3"
                aria-label={slots.length > 1 ? `Show stop ${stop} in timeline` : undefined}
                onClick={() => showInTimeline(s.entry.key)}
              >
                Show in timeline
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The selected day's stops on a park map, in the Plan (park-map spec, design Decisions 4 and 5). */
export function PlanMap({ day, schedule }: { day: Day; schedule: DaySchedule }) {
  const catalog = useCatalog()
  const scheduled = useMemo(() => schedule.slots.filter((s): s is ScheduledSlot => s.kind === 'scheduled'), [schedule])
  const stops = useMemo(() => stopNumbers(day, catalog), [day, catalog])
  const [parkId, setParkId] = useState<ParkId>(() => scheduled[0]?.item.parkId ?? 'dlp')
  const [selectedId, setSelectedId] = useState<string>()
  // Only the day's own items are markers, once each, so the map shows nothing else from the catalog.
  const listed = useMemo(() => {
    const byItem = new Map<string, ListedItem>()
    for (const s of scheduled) if (s.item.parkId === parkId && !byItem.has(s.item.id)) byItem.set(s.item.id, { item: s.item, unsuitable: s.unsuitable })
    return [...byItem.values()]
  }, [scheduled, parkId])
  const selected = scheduled.filter((s) => s.item.id === selectedId)

  return (
    <div data-testid="plan-map">
      <div role="group" aria-label="Park on the map" className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-200 p-1">
        {catalog.parks.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === parkId}
            onClick={() => {
              setSelectedId(undefined)
              setParkId(p.id)
            }}
            className={`min-h-11 rounded-md px-2 py-1 text-sm font-medium ${p.id === parkId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-700'}`}
          >
            {p.name}
            <span className="block text-xs font-normal text-slate-600" data-testid="park-stops">
              {formatStops(scheduled.filter((s) => s.item.parkId === p.id).map((s) => stops.get(s.entry.key)!))}
            </span>
          </button>
        ))}
      </div>
      <MapCanvas key={parkId} parkId={parkId} listed={listed} schedule={schedule} selectedId={selectedId} emphasise={false} labelAll onSelect={(item) => setSelectedId(item?.id)} />
      {scheduled.length === 0 && <p className="mt-2 text-sm text-slate-600">Nothing planned yet</p>}
      {selected.length > 0 && <StopCard day={day} slots={selected} stops={stops} onClose={() => setSelectedId(undefined)} />}
    </div>
  )
}
