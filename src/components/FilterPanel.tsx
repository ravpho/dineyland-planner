import type { ItemType, ParkId } from '../domain/catalog'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { FilterIcon } from './icons'
import { ProfileEditor } from './ProfileEditor'
import { TYPE_LABELS } from './labels'
import { Button, Chip, Field, inputClass, Sheet } from './ui'

/** How many filters are on: park, each area and type, hiding unsuitable rides, and the group profile. */
export function useActiveFilterCount(): number {
  const filters = usePlanner((s) => s.filters)
  const profile = usePlanner((s) => s.profile)
  return (filters.parkId === 'all' ? 0 : 1) + filters.areaIds.length + filters.types.length + (filters.hideUnsuitable ? 1 : 0) + (profile ? 1 : 0)
}

/** Whether "Clear filters" would change anything: it resets the park, areas, types and search. */
export function useClearableFilters(): boolean {
  const filters = usePlanner((s) => s.filters)
  return filters.parkId !== 'all' || filters.areaIds.length > 0 || filters.types.length > 0 || filters.query !== ''
}

/** The Filters icon button, with a badge counting the filters that are on (refresh-plan-layout design Decision 11). */
export function FiltersButton({ onClick }: { onClick: () => void }) {
  const count = useActiveFilterCount()
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={count ? `Filters, ${count} on` : 'Filters'}
      title="Filters"
      onClick={onClick}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <FilterIcon />
      {count > 0 && (
        <span aria-hidden className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-on-accent" data-testid="filter-count">
          {count}
        </span>
      )}
    </button>
  )
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog()
  const filters = usePlanner((s) => s.filters)
  const setFilters = usePlanner((s) => s.setFilters)
  const clearFilters = usePlanner((s) => s.clearFilters)
  const parks = filters.parkId === 'all' ? catalog.parks : catalog.parks.filter((p) => p.id === filters.parkId)

  return (
    <Sheet title="Filters" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Park">
          <select className={inputClass} value={filters.parkId} onChange={(e) => setFilters({ parkId: e.target.value as ParkId | 'all', areaIds: [] })}>
            <option value="all">All parks</option>
            {catalog.parks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        {parks.map((park) => (
          <div key={park.id}>
            <p className="mb-1 text-sm font-medium text-ink-soft">Areas · {park.name}</p>
            <div className="flex flex-wrap gap-2">
              {park.areas.map((a) => (
                <Chip key={a.id} selected={filters.areaIds.includes(a.id)} onClick={() => setFilters({ areaIds: toggle(filters.areaIds, a.id) })}>
                  {a.name}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        <div>
          <p className="mb-1 text-sm font-medium text-ink-soft">Type</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as ItemType[]).map((t) => (
              <Chip key={t} selected={filters.types.includes(t)} onClick={() => setFilters({ types: toggle(filters.types, t) })}>
                {TYPE_LABELS[t]}
              </Chip>
            ))}
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" className="h-5 w-5 accent-accent" checked={filters.hideUnsuitable} onChange={(e) => setFilters({ hideUnsuitable: e.target.checked })} />
          Hide unsuitable
        </label>
        <ProfileEditor />
        <div className="flex gap-2">
          <Button onClick={() => clearFilters()}>Clear filters</Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Show results
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
