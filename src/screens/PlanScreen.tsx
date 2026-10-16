import { useState } from 'react'
import { useIsWide, useSelectedSchedule } from '../app/hooks'
import { usePlanner } from '../app/PlannerContext'
import { selectedDay, selectedTrip } from '../state/store'
import { CreateTripForm } from '../components/CreateTripForm'
import { DateChips, DayCard } from '../components/DayHeader'
import { DayTimeline } from '../components/DayTimeline'
import { Breakdown, FitBar } from '../components/FitSummary'
import { NightSky } from '../components/NightSky'
import { PlanMap } from '../components/PlanMap'
import { RouteActions } from '../components/RouteActions'

export default function PlanScreen() {
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  const wide = useIsWide()
  const schedule = useSelectedSchedule()
  // Interim until the Map tab takes over the day's map (refresh-plan-layout task 6.1).
  const [view, setView] = useState<'timeline' | 'map'>('timeline')
  const focusKey = usePlanner((s) => s.planFocusKey)
  // "Show in timeline" switches back to the timeline when it sets a new focus.
  const [seenFocus, setSeenFocus] = useState(focusKey)
  if (focusKey !== seenFocus) {
    setSeenFocus(focusKey)
    if (focusKey) setView('timeline')
  }

  if (!trip || !day || !schedule) {
    return (
      <section className="mx-auto max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <h2 className="sr-only">My day</h2>
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
    <section aria-label="My day" className="flex min-w-0 flex-col gap-2">
      <h2 className="sr-only">My day</h2>
      <DateChips trip={trip} day={day} />
      <DayCard day={day} number={trip.days.indexOf(day) + 1} schedule={schedule} />
      {/* Interim until the Map tab takes over the day's map (refresh-plan-layout task 6.1). */}
      <div role="group" aria-label="Plan view" className="flex self-start overflow-hidden rounded-lg border border-line-strong bg-surface">
        {(['timeline', 'map'] as const).map((v) => (
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
      {/* Keyed by view, so switching Timeline and Map fades the new view in (midnight-theme design Decision 6). */}
      <div key={view} className="view-enter">
        {view === 'map' ? (
          // Remounts per day so the map opens on the park of that day's first item (plan-ui-improvements design Decision 5).
          <PlanMap key={day.id} day={day} schedule={schedule} />
        ) : (
          <DayTimeline day={day} schedule={schedule} />
        )}
      </div>
      {/* One main action under the day (refresh-plan-layout design Decision 8). */}
      {view === 'timeline' && day.items.length > 0 && <RouteActions day={day} />}
      <Breakdown schedule={schedule} />
      {/* On phones the fit status sits in the dock (refresh-plan-layout design Decision 2). */}
      {wide && <FitBar schedule={schedule} />}
    </section>
  )
}
