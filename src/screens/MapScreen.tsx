import { useMemo, useState } from 'react'
import { filterCatalog } from '../domain/filters'
import { useIsWide, usePlanningMonth, useSelectedSchedule } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { mapPark, selectedDay, selectedTrip, type MapMode } from '../state/store'
import { useAddFlow } from '../components/AddFlow'
import { DateChips } from '../components/DayHeader'
import { FilterPanel, FiltersButton, useClearableFilters } from '../components/FilterPanel'
import { ParkMap } from '../components/ParkMap'
import { PlanMap } from '../components/PlanMap'
import { Button } from '../components/ui'

const MODES: { mode: MapMode; label: string }[] = [
  { mode: 'day', label: 'My day' },
  { mode: 'all', label: 'All places' },
]

/** Every place that passes Explore's filters, one park at a time (park-map spec: Map view of the catalog). */
function AllPlaces() {
  const catalog = useCatalog()
  const filters = usePlanner((s) => s.filters)
  const profile = usePlanner((s) => s.profile)
  const month = usePlanningMonth()
  const shownPark = usePlanner((s) => mapPark(s, catalog))
  const clearFilters = usePlanner((s) => s.clearFilters)
  const clearable = useClearableFilters()
  const [showFilters, setShowFilters] = useState(false)
  const { add, openDetails, sheets } = useAddFlow()
  const listed = useMemo(() => filterCatalog(catalog, { ...filters, parkId: shownPark }, profile, month), [catalog, filters, shownPark, profile, month])
  const parkName = catalog.parks.find((p) => p.id === shownPark)?.name
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-ink-muted" aria-live="polite" data-testid="match-count">
          {listed.length} {listed.length === 1 ? 'place' : 'places'} in {parkName}
          {filters.query && ` matching “${filters.query}”`}
        </p>
        {clearable && (
          <Button variant="ghost" className="px-3" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
        <FiltersButton onClick={() => setShowFilters(true)} />
      </div>
      <ParkMap listed={listed} onAdd={add} onOpen={openDetails} />
      {sheets}
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
    </>
  )
}

/** The Map tab: the selected day's route, or all places (refresh-plan-layout design Decision 8). */
export default function MapScreen() {
  const mode = usePlanner((s) => s.mapMode)
  const setMode = usePlanner((s) => s.setMapMode)
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  const schedule = useSelectedSchedule()
  const wide = useIsWide()

  return (
    <section aria-label="Map" className="flex min-w-0 flex-col gap-2">
      <h2 className="sr-only">Map</h2>
      <div role="group" aria-label="Map view" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            aria-pressed={mode === m.mode}
            onClick={() => setMode(m.mode)}
            className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${mode === m.mode ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {/* Phones pick the day here too; wide screens have the chips in the My day column. */}
      {mode === 'day' && !wide && trip && day && <DateChips trip={trip} day={day} />}
      {/* Keyed by mode, so switching fades the new map in (midnight-theme design Decision 6). */}
      <div key={mode} className="view-enter">
        {mode === 'all' ? (
          <AllPlaces />
        ) : day && schedule ? (
          // Remounts per day so the map opens on the park of that day's first item (plan-ui-improvements design Decision 5).
          <PlanMap key={day.id} day={day} schedule={schedule} />
        ) : (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-muted">Create a trip in My day to see its route here.</p>
        )}
      </div>
    </section>
  )
}
