import { useMemo } from 'react'
import { scheduleDay } from '../domain/schedule'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { selectedDay, selectedTrip } from '../state/store'
import { CreateTripForm } from '../components/CreateTripForm'
import { DaySettings } from '../components/DaySettings'
import { DayTimeline } from '../components/DayTimeline'
import { Breakdown, FitBar } from '../components/FitSummary'
import { TripBar } from '../components/TripBar'

const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default function PlanScreen() {
  const catalog = useCatalog()
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  const profile = usePlanner((s) => s.profile)
  const selectDay = usePlanner((s) => s.selectDay)
  const schedule = useMemo(() => (day ? scheduleDay(day, catalog, profile) : null), [day, catalog, profile])

  if (!trip || !day || !schedule) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-xl font-semibold text-slate-900">Plan</h2>
        <p className="mb-4 text-sm text-slate-600">Create a trip to start planning your days at Disneyland Park and Disney Adventure World.</p>
        <CreateTripForm />
      </section>
    )
  }

  return (
    <section aria-label="Plan" className="flex min-w-0 flex-col gap-3 pb-20 lg:pb-0">
      <h2 className="sr-only">Plan</h2>
      <TripBar />
      <div role="tablist" aria-label="Days" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === day.id}
            onClick={() => selectDay(d.id)}
            className={`min-h-11 shrink-0 rounded-lg border px-3 text-left text-sm ${d.id === day.id ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-800'}`}
          >
            <span className="font-semibold">Day {i + 1}</span> · {dayLabel(d.date)} · {d.parkId === 'dlp' ? 'DLP' : 'DAW'}
          </button>
        ))}
      </div>
      <DaySettings day={day} />
      <DayTimeline day={day} schedule={schedule} />
      <Breakdown schedule={schedule} />
      <FitBar schedule={schedule} />
    </section>
  )
}
