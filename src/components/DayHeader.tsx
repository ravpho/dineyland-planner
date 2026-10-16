import { useEffect, useMemo, useRef, useState } from 'react'
import { PARK_IDS, type Catalog, type ParkId } from '../domain/catalog'
import { parkOrder } from '../domain/parkOrder'
import type { DaySchedule } from '../domain/schedule'
import type { Day, Trip } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { DayHours } from './DayHours'
import { TicketReminder } from './FitSummary'
import { ClockIcon, DownIcon, TicketIcon } from './icons'
import { NightSky } from './NightSky'
import { Button, Sheet } from './ui'

const PARK_SHORT = { dlp: 'DLP', daw: 'DAW' } as const

/** Parks a day uses, from its items: "DLP", "DAW", "DLP + DAW", or "" when empty. */
export function dayParksLabel(day: Day, catalog: Catalog): string {
  const used = new Set(day.items.map((e) => catalog.items.find((i) => i.id === e.itemId)?.parkId))
  return PARK_IDS.filter((id) => used.has(id))
    .map((id) => PARK_SHORT[id])
    .join(' + ')
}

const dateOf = (date: string) => new Date(`${date}T12:00:00Z`)
const format = (date: string, options: Intl.DateTimeFormatOptions) => dateOf(date).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' })
/** "Wed, 12 Aug", as the day was named before the refresh (tests and screen readers keep it). */
const dayLabel = (date: string) => format(date, { weekday: 'short', day: 'numeric', month: 'short' })

/**
 * One compact chip per day, such as "Wed / 12", with a dot when the day has items. The full name ("Day 1 ·
 * Wed, 12 Aug · DLP + DAW") is kept for assistive technology (refresh-plan-layout design Decision 4).
 */
export function DateChips({ trip, day }: { trip: Trip; day: Day }) {
  const catalog = useCatalog()
  const selectDay = usePlanner((s) => s.selectDay)
  const selected = useRef<HTMLButtonElement>(null)
  // Keep the selected chip in view when a trip has more days than fit (jsdom has no scrollIntoView).
  useEffect(() => selected.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }), [day.id])

  return (
    <div role="tablist" aria-label="Days" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0.5">
      {trip.days.map((d, i) => {
        const active = d.id === day.id
        const parks = dayParksLabel(d, catalog)
        return (
          <button
            key={d.id}
            ref={active ? selected : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => selectDay(d.id)}
            // Relative, so the screen-reader name stays inside the scrolling row instead of widening the page.
            className={`relative flex h-16 w-15 shrink-0 flex-col items-center justify-center rounded-2xl border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${active ? 'border-accent bg-accent text-on-accent shadow-card' : 'border-line bg-surface text-ink hover:bg-surface-muted'}`}
          >
            <span className="sr-only">
              Day {i + 1} · {dayLabel(d.date)}
              {parks && ` · ${parks}`}
            </span>
            <span aria-hidden className={`text-[0.7rem] font-semibold uppercase tracking-wider ${active ? 'text-on-accent/80' : 'text-ink-muted'}`}>
              {format(d.date, { weekday: 'short' })}
            </span>
            <span aria-hidden className="text-xl font-semibold leading-tight tabular-nums">
              {format(d.date, { day: 'numeric' })}
            </span>
            <span aria-hidden className={`mt-0.5 h-1.5 w-1.5 rounded-full bg-current ${d.items.length ? 'opacity-50' : 'opacity-0'}`} />
          </button>
        )
      })}
    </div>
  )
}

/**
 * The day card: date, hours, stops and, on a two-park day, the ticket reminder and park order. Tapping it
 * opens the day sheet (app-shell spec: Day first in My day; refresh-plan-layout design Decision 4).
 */
export function DayCard({ day, number, schedule }: { day: Day; number: number; schedule: DaySchedule }) {
  const catalog = useCatalog()
  const [editing, setEditing] = useState(false)
  const order = useMemo(() => parkOrder(day, catalog), [day, catalog])
  const parkName = (id: ParkId) => catalog.parks.find((p) => p.id === id)!.name
  const stops = schedule.slots.filter((s) => s.kind === 'scheduled').length
  const twoParks = schedule.parks.length >= 2

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sky text-on-sky shadow-card" data-testid="day-card">
      <NightSky variant="band" />
      <div className="relative flex flex-col gap-1.5 px-4 pb-3.5 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-sky-muted">
            Day {number} · {format(day.date, { weekday: 'long' })}
          </p>
          {/* The whole card opens the sheet: this button's hit area covers it. */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label="Edit hours and park order"
            onClick={() => setEditing(true)}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-on-sky-muted after:absolute after:inset-0 after:content-[''] hover:text-on-sky focus-visible:outline-2 focus-visible:outline-focus-on-sky"
          >
            Edit
            <DownIcon width={16} height={16} className="-rotate-90" />
          </button>
        </div>
        <p className="font-display text-3xl font-semibold leading-none">{format(day.date, { day: 'numeric', month: 'long' })}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <ClockIcon width={16} height={16} className="text-on-sky-muted" />
            {day.start}–{day.end}
          </span>
          <span data-testid="day-card-stops">{stops === 0 ? 'No stops yet' : `${stops} ${stops === 1 ? 'stop' : 'stops'}`}</span>
        </p>
        {twoParks && (
          <p role="note" data-testid="ticket-reminder" className="flex items-start gap-1.5 text-sm">
            <TicketIcon width={16} height={16} className="mt-0.5 shrink-0 text-star" />
            <span>
              Ticket valid for both parks
              {order.length >= 2 && (
                <>
                  {' · '}
                  <span data-testid="card-park-order">{order.map(parkName).join(' → ')}</span>
                </>
              )}
            </span>
          </p>
        )}
      </div>
      {editing && <DaySheet day={day} number={number} schedule={schedule} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** Hours, and on a two-park day the full ticket note with the park order and Switch order. */
function DaySheet({ day, number, schedule, onClose }: { day: Day; number: number; schedule: DaySchedule; onClose: () => void }) {
  return (
    <Sheet title={`Day ${number} · ${format(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DayHours day={day} />
        <TicketReminder schedule={schedule} day={day} />
        <Button variant="primary" className="w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Sheet>
  )
}
