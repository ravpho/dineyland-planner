import { useState } from 'react'
import { flushSync } from 'react-dom'
import { MAX_TRIP_DAYS } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { selectedTrip } from '../state/store'
import { CreateTripForm } from './CreateTripForm'
import { DownIcon, MoreIcon, PencilIcon, PlusIcon, ShareIcon, TrashIcon } from './icons'
import { ShareSheet } from './ShareSheet'
import { Button, IconButton, inputClass, Sheet } from './ui'

/**
 * The trip row: the trip as a title (and the way to switch trips), its number of days, Share, and a
 * "Trip options" sheet with New trip, Rename and Delete (app-shell spec: Trip actions in a trip menu).
 */
export function TripBar() {
  const trips = usePlanner((s) => s.trips)
  const trip = usePlanner(selectedTrip)
  const { selectTrip, renameTrip, deleteTrip, setTripLength } = usePlanner((s) => s)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [options, setOptions] = useState(false)
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

  /** Closes the options sheet before the action, so a browser prompt never opens over it (midnight-theme design Decision 7). */
  const choose = (action: () => void) => () => {
    flushSync(() => setOptions(false))
    action()
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <select
          aria-label="Trip"
          className="min-h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-lg bg-transparent py-1 pl-1 pr-8 font-display text-xl font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
          value={trip.id}
          onChange={(e) => selectTrip(e.target.value)}
        >
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <DownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted" />
      </div>
      <select aria-label="Number of days" className={`${inputClass} shrink-0 px-2 text-sm`} value={trip.days.length} onChange={(e) => changeLength(Number(e.target.value))}>
        {Array.from({ length: MAX_TRIP_DAYS }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n} {n === 1 ? 'day' : 'days'}
          </option>
        ))}
      </select>
      <IconButton label="Share" onClick={() => setSharing(true)}>
        <ShareIcon />
      </IconButton>
      <IconButton label="Trip options" aria-haspopup="dialog" onClick={() => setOptions(true)}>
        <MoreIcon />
      </IconButton>
      {options && (
        <Sheet title="Trip options" onClose={() => setOptions(false)}>
          <p className="-mt-2 mb-3 truncate text-sm text-ink-muted">{trip.name}</p>
          <div className="flex flex-col gap-2">
            <Button className="justify-start" onClick={choose(() => setCreating(true))}>
              <PlusIcon /> New trip
            </Button>
            <Button
              className="justify-start"
              onClick={choose(() => {
                const name = window.prompt('Trip name', trip.name)
                if (name) renameTrip(trip.id, name)
              })}
            >
              <PencilIcon /> Rename
            </Button>
            <Button variant="danger" className="justify-start" onClick={choose(() => window.confirm(`Delete "${trip.name}"? This cannot be undone.`) && deleteTrip(trip.id))}>
              <TrashIcon /> Delete
            </Button>
          </div>
        </Sheet>
      )}
      {creating && (
        <Sheet title="New trip" onClose={() => setCreating(false)}>
          <CreateTripForm onDone={() => setCreating(false)} />
        </Sheet>
      )}
      {sharing && <ShareSheet trip={trip} onClose={() => setSharing(false)} />}
    </div>
  )
}
