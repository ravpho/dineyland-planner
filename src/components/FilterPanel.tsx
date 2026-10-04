import type { ItemType, ParkId } from '../domain/catalog'
import type { SortOrder } from '../domain/filters'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { selectedDay } from '../state/store'
import { ProfileEditor } from './ProfileEditor'
import { TYPE_LABELS } from './labels'
import { Button, Chip, Field, inputClass, Sheet } from './ui'

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

export function FilterPanel({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog()
  const filters = usePlanner((s) => s.filters)
  const setFilters = usePlanner((s) => s.setFilters)
  const clearFilters = usePlanner((s) => s.clearFilters)
  const dayPark = usePlanner((s) => selectedDay(s)?.parkId)
  const park = catalog.parks.find((p) => p.id === filters.parkId)!

  return (
    <Sheet title="Filters" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Park">
          <select className={inputClass} value={filters.parkId} onChange={(e) => setFilters({ parkId: e.target.value as ParkId, areaIds: [] })}>
            {catalog.parks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Areas</p>
          <div className="flex flex-wrap gap-2">
            {park.areas.map((a) => (
              <Chip key={a.id} selected={filters.areaIds.includes(a.id)} onClick={() => setFilters({ areaIds: toggle(filters.areaIds, a.id) })}>
                {a.name}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Type</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as ItemType[]).map((t) => (
              <Chip key={t} selected={filters.types.includes(t)} onClick={() => setFilters({ types: toggle(filters.types, t) })}>
                {TYPE_LABELS[t]}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Sort by">
          <select className={inputClass} value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortOrder })}>
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="wait">Typical wait (shortest first)</option>
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
          <input type="checkbox" className="h-5 w-5" checked={filters.hideUnsuitable} onChange={(e) => setFilters({ hideUnsuitable: e.target.checked })} />
          Hide unsuitable
        </label>
        <ProfileEditor />
        <div className="flex gap-2">
          <Button onClick={() => clearFilters(dayPark)}>Clear filters</Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Show results
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
