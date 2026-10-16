import { useDraggable } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import type { CatalogItem, ItemType } from '../domain/catalog'
import type { PlannedMark } from '../domain/stops'
import { filterCatalog, type ListedItem, type SortOrder } from '../domain/filters'
import { MONTH_NAMES, useIsWide, usePlannedMarks, usePlanningMonth } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useAddFlow } from './AddFlow'
import { FilterPanel, FiltersButton } from './FilterPanel'
import { GripIcon, PlusIcon } from './icons'
import { itemFacts } from './labels'
import { PlannedLabel } from './PlannedLabel'
import { TypeTile } from './TypeTile'
import { Badge, Chip, IconButton, inputClass, Stars } from './ui'

export const CATALOG_DRAG_PREFIX = 'catalog:'

/** A row: the type tile, name, park and area, then rating, facts and the month's wait (park-catalog spec: Catalog list summary). */
function RowBody({ listed, month, place, mark, dayNumber, onOpen }: { listed: ListedItem; month: number; place: string; mark?: PlannedMark; dayNumber: number; onOpen: () => void }) {
  const { item, unsuitable, waitRange } = listed
  return (
    <button type="button" onClick={onOpen} className="flex min-h-11 min-w-0 flex-1 items-start gap-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <TypeTile type={item.type} muted={Boolean(unsuitable)} />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold leading-snug ${unsuitable ? 'text-ink-muted' : 'text-ink'}`} data-testid="row-name">
          {item.name}
        </span>
        <span className="block text-[0.8rem] text-ink-soft" data-testid="row-place">
          {place}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
          <Stars rating={item.rating} />
          {itemFacts(item).map((f) => (
            <span key={f}>{f}</span>
          ))}
          {waitRange && (
            <span className="text-ink-soft" title={`Typical wait in ${MONTH_NAMES[month - 1]}`}>
              {waitRange[0] === waitRange[1] ? `~${waitRange[0]}` : `${waitRange[0]}–${waitRange[1]}`} min wait in {MONTH_NAMES[month - 1]!.slice(0, 3)}
            </span>
          )}
        </span>
        {(unsuitable || mark) && (
          <span className="mt-1 flex flex-wrap gap-1">
            {unsuitable && <Badge tone="warn">{unsuitable}</Badge>}
            <PlannedLabel mark={mark} dayNumber={dayNumber} />
          </span>
        )}
      </span>
    </button>
  )
}

/** Quick type filters (refresh-plan-layout design Decision 11). They set the filters' types to none or one. */
const TYPE_CHIPS: { label: string; type?: ItemType }[] = [
  { label: 'All' },
  { label: 'Attractions', type: 'attraction' },
  { label: 'Restaurants', type: 'restaurant' },
  { label: 'Shows', type: 'show' },
]

function DragHandle({ item }: { item: CatalogItem }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `${CATALOG_DRAG_PREFIX}${item.id}`, data: { item } })
  return (
    <span ref={setNodeRef} {...attributes} {...listeners} aria-label={`Drag ${item.name} into the day`} className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-ink-faint" data-testid="catalog-drag-handle">
      <GripIcon />
    </span>
  )
}

export function CatalogList() {
  const catalog = useCatalog()
  const filters = usePlanner((s) => s.filters)
  const setFilters = usePlanner((s) => s.setFilters)
  const profile = usePlanner((s) => s.profile)
  const month = usePlanningMonth()
  const wide = useIsWide()
  const { add, openDetails, sheets } = useAddFlow()
  const { marks, dayNumber } = usePlannedMarks()
  const [showFilters, setShowFilters] = useState(false)

  const listed = useMemo(() => filterCatalog(catalog, filters, profile, month), [catalog, filters, profile, month])
  // Each chip's count, with every other filter applied.
  const byType = useMemo(() => {
    const all = filterCatalog(catalog, { ...filters, types: [] }, profile, month)
    return new Map<ItemType | undefined, number>([[undefined, all.length], ...TYPE_CHIPS.filter((c) => c.type).map((c) => [c.type, all.filter((l) => l.item.type === c.type).length] as const)])
  }, [catalog, filters, profile, month])
  const places = useMemo(
    () => new Map(catalog.parks.flatMap((p) => p.areas.map((a) => [`${p.id}/${a.id}`, `${p.name} · ${a.name}`] as const))),
    [catalog],
  )
  const parkName = filters.parkId === 'all' ? undefined : catalog.parks.find((p) => p.id === filters.parkId)?.name

  return (
    <section aria-label="Explore" className="flex min-w-0 flex-col">
      <div className="sticky top-0 z-10 flex gap-2 bg-page pb-2 pt-1">
        <input
          type="search"
          aria-label="Search by name"
          placeholder="Search attractions, restaurants, shows"
          className={`${inputClass} min-w-0 flex-1`}
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
        />
        <FiltersButton onClick={() => setShowFilters(true)} />
      </div>
      <div role="group" aria-label="Type" className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] lg:mx-0 lg:px-0.5">
        {TYPE_CHIPS.map((c) => (
          <Chip
            key={c.label}
            selected={c.type ? filters.types.length === 1 && filters.types[0] === c.type : filters.types.length === 0}
            onClick={() => setFilters({ types: c.type ? [c.type] : [] })}
          >
            <span className="whitespace-nowrap font-semibold">
              {c.label}
              <span aria-hidden className="ml-1.5 font-normal opacity-70 tabular-nums">
                {byType.get(c.type)}
              </span>
            </span>
          </Chip>
        ))}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-ink-muted" aria-live="polite" data-testid="match-count">
          {listed.length} {listed.length === 1 ? 'item' : 'items'}
          {parkName ? ` in ${parkName}` : ''}
        </p>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <span className="hidden sm:inline">Sort</span>
          <select aria-label="Sort by" className={`${inputClass} text-sm`} value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortOrder })}>
            <option value="name">Name</option>
            <option value="rating">Rating</option>
            <option value="wait">Busiest wait</option>
            <option value="duration">Duration</option>
          </select>
        </label>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {listed.map((l) => {
          const mark = marks.get(l.item.id)
          // A planned row is tinted with the accent, which wins over the unsuitable grey (plan-ui-improvements design Decision 2).
          const planned = mark?.stops.length ? 'selected' : mark?.otherDays.length ? 'other' : undefined
          return (
            <li
              key={l.item.id}
              data-testid="catalog-row"
              data-unsuitable={l.unsuitable ? 'true' : undefined}
              data-planned={planned}
              className={`flex items-center gap-1 pl-3 pr-1 ${planned === 'selected' ? 'bg-accent-soft shadow-[inset_4px_0_0_var(--color-accent)]' : l.unsuitable ? 'bg-surface-muted' : ''}`}
            >
              {wide && <DragHandle item={l.item} />}
              <RowBody listed={l} month={month} place={places.get(`${l.item.parkId}/${l.item.areaId}`) ?? ''} mark={mark} dayNumber={dayNumber} onOpen={() => openDetails(l.item)} />
              <IconButton
                label={`Add ${l.item.name} to day${planned === 'selected' ? ' again' : ''}`}
                onClick={() => add(l.item)}
                className={`rounded-full! border ${planned === 'selected' ? 'border-accent bg-accent text-on-accent hover:bg-accent-hover' : 'border-line-strong bg-surface text-accent'}`}
              >
                <PlusIcon />
              </IconButton>
            </li>
          )
        })}
        {listed.length === 0 && <li className="p-4 text-sm text-ink-muted">Nothing matches these filters.</li>}
      </ul>
      {sheets}
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
    </section>
  )
}
