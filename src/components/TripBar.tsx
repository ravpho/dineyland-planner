import { useState } from 'react'
import { MAX_TRIP_DAYS } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { selectedTrip } from '../state/store'
import { CreateTripForm } from './CreateTripForm'
import { ShareIcon } from './icons'
import { ShareSheet } from './ShareSheet'
import { Button, inputClass, Sheet } from './ui'

export function TripBar() {
  const trips = usePlanner((s) => s.trips)
  const trip = usePlanner(selectedTrip)
  const { selectTrip, renameTrip, deleteTrip, setTripLength } = usePlanner((s) => s)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  if (!trip) return null

  const changeLength = (count: number) => {
    if (count < trip.days.length) {
      const removed = trip.days.slice(count)
      const items = removed.reduce((n, d) => n + d.items.length, 0)
      const what = removed.length === 1 ? 'the last day' : `the last ${removed.length} days`
      if (!window.confirm(`Remove ${what}${items ? ` and ${items} planned item${items === 1 ? '' : 's'}` : ''}?`)) return
    }
    setTripLength(trip.id, count)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Trip" className={`${inputClass} min-w-0 flex-1 font-semibold`} value={trip.id} onChange={(e) => selectTrip(e.target.value)}>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select aria-label="Number of days" className={inputClass} value={trip.days.length} onChange={(e) => changeLength(Number(e.target.value))}>
          {Array.from({ length: MAX_TRIP_DAYS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'day' : 'days'}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setSharing(true)}>
          <ShareIcon /> Share
        </Button>
        <Button variant="ghost" onClick={() => setCreating(true)}>
          New trip
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const name = window.prompt('Trip name', trip.name)
            if (name) renameTrip(trip.id, name)
          }}
        >
          Rename
        </Button>
        <Button variant="ghost" className="text-red-700" onClick={() => window.confirm(`Delete "${trip.name}"? This cannot be undone.`) && deleteTrip(trip.id)}>
          Delete
        </Button>
      </div>
      {creating && (
        <Sheet title="New trip" onClose={() => setCreating(false)}>
          <CreateTripForm onDone={() => setCreating(false)} />
        </Sheet>
      )}
      {sharing && <ShareSheet trip={trip} onClose={() => setSharing(false)} />}
    </div>
  )
}
