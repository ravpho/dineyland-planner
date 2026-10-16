import { useIsWide, useSelectedSchedule } from '../app/hooks'
import { usePlanner } from '../app/PlannerContext'
import { selectedDay, selectedTrip } from '../state/store'
import { CreateTripForm } from '../components/CreateTripForm'
import { DateChips, DayCard } from '../components/DayHeader'
import { DayTimeline } from '../components/DayTimeline'
import { Breakdown, FitBar } from '../components/FitSummary'
import { NightSky } from '../components/NightSky'
import { RouteActions } from '../components/RouteActions'

export default function PlanScreen() {
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  const wide = useIsWide()
  const schedule = useSelectedSchedule()

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
      {/* The day's map is in the Map tab (refresh-plan-layout design Decision 8). */}
      <DayTimeline day={day} schedule={schedule} />
      {/* One main action under the day (refresh-plan-layout design Decision 8). */}
      {day.items.length > 0 && <RouteActions day={day} />}
      <Breakdown schedule={schedule} />
      {/* On phones the fit status sits in the dock (refresh-plan-layout design Decision 2). */}
      {wide && <FitBar schedule={schedule} />}
    </section>
  )
}
