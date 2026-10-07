import { useMemo } from 'react'
import { PARK_IDS, type Catalog } from '../domain/catalog'
import { scheduleDay } from '../domain/schedule'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { selectedDay, selectedTrip, type PlanView } from '../state/store'
import { CreateTripForm } from '../components/CreateTripForm'
import { DayHours } from '../components/DayHours'
import { DayTimeline } from '../components/DayTimeline'
import { Breakdown, FitBar, TicketReminder } from '../components/FitSummary'
import { SparkleIcon } from '../components/icons'
import { NightSky } from '../components/NightSky'
import { PlanMap } from '../components/PlanMap'
import { RouteActions } from '../components/RouteActions'
import { TripBar } from '../components/TripBar'

const PARK_SHORT = { dlp: 'DLP', daw: 'DAW' } as const

/** Parks a day uses, from its items: "DLP", "DAW", "DLP + DAW", or "" when empty. */
export function dayParksLabel(day: Day, catalog: Catalog): string {
  const used = new Set(day.items.map((e) => catalog.items.find((i) => i.id === e.itemId)?.parkId))
  return PARK_IDS.filter((id) => used.has(id))
    .map((id) => PARK_SHORT[id])
    .join(' + ')
}

const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function PlanScreen() {
  const catalog = useCatalog()
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  const profile = usePlanner((s) => s.profile)
  const selectDay = usePlanner((s) => s.selectDay)
  const view = usePlanner((s) => s.planView)
  const setView = usePlanner((s) => s.setPlanView)
  const schedule = useMemo(() => (day ? scheduleDay(day, catalog, profile) : null), [day, catalog, profile])

  if (!trip || !day || !schedule) {
    return (
      <section className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <h2 className="sr-only">Plan</h2>
        {/* A short band of night sky over the form (midnight-theme design Decision 10). */}
        <div className="relative px-4 pb-4 pt-6">
          <NightSky variant="band" />
          <p className="relative font-display text-2xl font-semibold text-on-sky">Plan your days</p>
          <p className="relative mt-1 text-sm text-on-sky-muted">Disneyland Park and Disney Adventure World</p>
        </div>
        <div className="p-4">
          <p className="mb-4 text-sm text-ink-muted">Create a trip to start planning your days at Disneyland Park and Disney Adventure World.</p>
          <CreateTripForm />
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Plan" className="flex min-w-0 flex-col gap-2 pb-20 lg:pb-0">
      <h2 className="sr-only">Plan</h2>
      <TripBar />
      <div role="tablist" aria-label="Days" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === day.id}
            onClick={() => selectDay(d.id)}
            className={`min-h-11 shrink-0 rounded-lg border px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${d.id === day.id ? 'border-accent bg-accent text-on-accent shadow-sm' : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'}`}
          >
            {d.id === day.id && <SparkleIcon width={10} height={10} className="mr-1.5 inline align-baseline text-star" />}
            <span className="font-semibold">Day {i + 1}</span> · {dayLabel(d.date)}
            {dayParksLabel(d, catalog) && <> · {dayParksLabel(d, catalog)}</>}
          </button>
        ))}
      </div>
      <DayHours day={day} />
      <TicketReminder schedule={schedule} day={day} />
      {/* One toolbar: the view switch, and the route actions with the timeline (midnight-theme design Decision 7). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Plan view" className="flex overflow-hidden rounded-lg border border-line-strong bg-surface">
          {(['timeline', 'map'] as PlanView[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-11 min-w-14 px-3 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${view === v ? 'bg-accent text-on-accent' : 'text-ink-soft hover:bg-surface-muted'}`}
            >
              {v === 'timeline' ? 'Timeline' : 'Map'}
            </button>
          ))}
        </div>
        {view === 'timeline' && <RouteActions day={day} />}
      </div>
      {/* Keyed by view, so switching Timeline and Map fades the new view in (midnight-theme design Decision 6). */}
      <div key={view} className="view-enter">
        {view === 'map' ? (
          // Remounts per day so the map opens on the park of that day's first item (plan-ui-improvements design Decision 5).
          <PlanMap key={day.id} day={day} schedule={schedule} />
        ) : (
          <DayTimeline day={day} schedule={schedule} />
        )}
      </div>
      <Breakdown schedule={schedule} />
      <FitBar schedule={schedule} />
    </section>
  )
}
