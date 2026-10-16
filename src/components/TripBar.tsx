import { useState } from 'react'
import { flushSync } from 'react-dom'
import { MAX_TRIP_DAYS } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { navigate } from '../routing'
import { selectedTrip } from '../state/store'
import { CreateTripForm } from './CreateTripForm'
import { DayIcon, DownIcon, InfoIcon, MoreIcon, PencilIcon, PlusIcon, ShareIcon, TrashIcon } from './icons'
import { ShareSheet } from './ShareSheet'
import { Button, IconButton, inputClass, Sheet } from './ui'

const ON_SKY_BUTTON = 'text-on-sky hover:bg-on-sky/10 focus-visible:outline-focus-on-sky'

/**
 * The header's trip controls: the trip as a title (and the way to switch trips), Share, and the "More" menu
 * (app-shell spec: Trip actions in the More menu; refresh-plan-layout design Decision 3). Without a trip, the
 * menu still offers About and data sources.
 */
export function TripHeader() {
  const trips = usePlanner((s) => s.trips)
  const trip = usePlanner(selectedTrip)
  const selectTrip = usePlanner((s) => s.selectTrip)
  const [sharing, setSharing] = useState(false)

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
      {trip && (
        <>
          <div className="relative mr-auto min-w-0 lg:mr-0 lg:max-w-sm">
            <select
              aria-label="Trip"
              className="min-h-11 max-w-full min-w-0 cursor-pointer appearance-none truncate field-sizing-content rounded-lg bg-transparent py-1 pl-1 pr-8 font-display text-xl font-semibold text-on-sky hover:bg-on-sky/10 focus-visible:outline-2 focus-visible:outline-focus-on-sky"
              value={trip.id}
              onChange={(e) => selectTrip(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id} className="text-ink">
                  {t.name}
                </option>
              ))}
            </select>
            <DownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-on-sky-muted" />
          </div>
          <IconButton label="Share" className={ON_SKY_BUTTON} onClick={() => setSharing(true)}>
            <ShareIcon />
          </IconButton>
        </>
      )}
      <MoreMenu />
      {sharing && trip && <ShareSheet trip={trip} onClose={() => setSharing(false)} />}
    </div>
  )
}

/** The "More" sheet: New trip, Rename, Number of days and Delete trip, then About and data sources. */
function MoreMenu() {
  const trip = usePlanner(selectedTrip)
  const { renameTrip, deleteTrip } = usePlanner((s) => s)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [length, setLength] = useState(false)

  /** Closes the menu before the action, so a browser prompt never opens over it (midnight-theme design Decision 7). */
  const choose = (action: () => void) => () => {
    flushSync(() => setOpen(false))
    action()
  }

  return (
    <>
      <IconButton label="More" aria-haspopup="dialog" className={ON_SKY_BUTTON} onClick={() => setOpen(true)}>
        <MoreIcon />
      </IconButton>
      {open && (
        <Sheet title="More" onClose={() => setOpen(false)}>
          {trip && <p className="-mt-2 mb-3 truncate text-sm text-ink-muted">{trip.name}</p>}
          <div className="flex flex-col gap-2">
            {trip && (
              <>
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
                <Button className="justify-start" onClick={choose(() => setLength(true))}>
                  <DayIcon /> Number of days
                </Button>
                <Button variant="danger" className="justify-start" onClick={choose(() => window.confirm(`Delete "${trip.name}"? This cannot be undone.`) && deleteTrip(trip.id))}>
                  <TrashIcon /> Delete trip
                </Button>
                <hr className="my-1 border-line" />
              </>
            )}
            <Button variant="ghost" className="justify-start" onClick={choose(() => navigate({ name: 'about' }))}>
              <InfoIcon /> About and data sources
            </Button>
          </div>
        </Sheet>
      )}
      {creating && (
        <Sheet title="New trip" onClose={() => setCreating(false)}>
          <CreateTripForm onDone={() => setCreating(false)} />
        </Sheet>
      )}
      {length && trip && <TripLengthSheet onClose={() => setLength(false)} />}
    </>
  )
}

/** Number of days, with a confirmation before days and their items are removed (trip-itinerary spec: Create a trip). */
function TripLengthSheet({ onClose }: { onClose: () => void }) {
  const trip = usePlanner(selectedTrip)
  const setTripLength = usePlanner((s) => s.setTripLength)
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
    <Sheet title="Number of days" onClose={onClose}>
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
        Number of days
        <select className={inputClass} value={trip.days.length} onChange={(e) => changeLength(Number(e.target.value))}>
          {Array.from({ length: MAX_TRIP_DAYS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'day' : 'days'}
            </option>
          ))}
        </select>
      </label>
      <Button variant="primary" className="mt-4 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  )
}
