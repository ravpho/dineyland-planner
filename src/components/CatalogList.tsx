import { useDraggable } from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import type { CatalogItem, Restaurant, Show } from '../domain/catalog'
import type { PlannedMark } from '../domain/stops'
import { filterCatalog, type ListedItem, type SortOrder } from '../domain/filters'
import { MONTH_NAMES, useIsWide, usePlannedMarks, usePlanningMonth } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { mapPark, type CatalogView } from '../state/store'
import { useAddToDay } from '../app/useAddToDay'
import { FilterPanel } from './FilterPanel'
import { FilterIcon, GripIcon, PlusIcon } from './icons'
import { ItemDetail } from './ItemDetail'
import { ParkMap } from './ParkMap'
import { itemFacts, TYPE_LABELS } from './labels'
import { MealTimePicker } from './MealTimePicker'
import { PlannedLabel } from './PlannedLabel'
import { ShowTimePicker } from './ShowTimePicker'
import { Badge, IconButton, inputClass, Stars } from './ui'

export const CATALOG_DRAG_PREFIX = 'catalog:'

function RowBody({ listed, month, place, mark, dayNumber, onOpen }: { listed: ListedItem; month: number; place: string; mark?: PlannedMark; dayNumber: number; onOpen: () => void }) {
  const { item, unsuitable, waitRange } = listed
  return (
    <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 py-2 text-left">
      <span className={`block font-medium ${unsuitable ? 'text-slate-500' : 'text-slate-900'}`}>{item.name}</span>
      <span className="block text-xs text-slate-500" data-testid="row-place">
        {place}
      </span>
      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <Badge>{TYPE_LABELS[item.type]}</Badge>
        <Stars rating={item.rating} />
        {itemFacts(item).map((f) => (
          <span key={f}>{f}</span>
        ))}
        {waitRange && (
          <span className="text-slate-800" title={`Typical wait in ${MONTH_NAMES[month - 1]}`}>
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
    </button>
  )
}

function DragHandle({ item }: { item: CatalogItem }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `${CATALOG_DRAG_PREFIX}${item.id}`, data: { item } })
  return (
    <span ref={setNodeRef} {...attributes} {...listeners} aria-label={`Drag ${item.name} into the day`} className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400" data-testid="catalog-drag-handle">
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
  const addToDay = useAddToDay()
  const { marks, dayNumber } = usePlannedMarks()
  const [open, setOpen] = useState<CatalogItem | null>(null)
  const [picking, setPicking] = useState<Show | null>(null)
  const [pickingMeal, setPickingMeal] = useState<Restaurant | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const view = usePlanner((s) => s.catalogView)
  const setView = usePlanner((s) => s.setCatalogView)
  const shownPark = usePlanner((s) => mapPark(s, catalog))

  // The map shows one park at a time with the same filters (design Decision 6).
  const listFilters = useMemo(() => (view === 'map' ? { ...filters, parkId: shownPark } : filters), [view, filters, shownPark])
  const listed = useMemo(() => filterCatalog(catalog, listFilters, profile, month), [catalog, listFilters, profile, month])
  const places = useMemo(
    () => new Map(catalog.parks.flatMap((p) => p.areas.map((a) => [`${p.id}/${a.id}`, `${p.name} · ${a.name}`] as const))),
    [catalog],
  )
  const parkName = listFilters.parkId === 'all' ? undefined : catalog.parks.find((p) => p.id === listFilters.parkId)?.name
  const activeFilters =
    (filters.parkId === 'all' ? 0 : 1) + filters.areaIds.length + filters.types.length + (filters.hideUnsuitable ? 1 : 0) + (profile ? 1 : 0)

  const add = (item: CatalogItem) => {
    if (item.type === 'show') setPicking(item)
    else if (item.type === 'restaurant') setPickingMeal(item)
    else addToDay(item)
  }

  return (
    <section aria-label="Catalog" className="flex min-w-0 flex-col">
      <div className="sticky top-0 z-10 flex gap-2 bg-slate-50 pb-2 pt-1">
        <input
          type="search"
          aria-label="Search by name"
          placeholder="Search attractions, restaurants, shows"
          className={`${inputClass} min-w-0 flex-1`}
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
        >
          <FilterIcon /> Filters{activeFilters > 0 && <span className="rounded-full bg-indigo-700 px-1.5 text-xs text-white">{activeFilters}</span>}
        </button>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <div role="group" aria-label="Catalog view" className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white">
          {(['list', 'map'] as CatalogView[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-11 min-w-14 px-3 text-sm font-medium ${view === v ? 'bg-indigo-700 text-white' : 'text-slate-700'}`}
            >
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
        <p className="min-w-0 flex-1 text-sm text-slate-600" aria-live="polite" data-testid="match-count">
          {listed.length} {listed.length === 1 ? 'item' : 'items'}
          {parkName ? ` in ${parkName}` : ''}
        </p>
        {view === 'list' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <span className="hidden sm:inline">Sort</span>
            <select aria-label="Sort by" className={`${inputClass} text-sm`} value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value as SortOrder })}>
              <option value="name">Name</option>
              <option value="rating">Rating</option>
              <option value="wait">Busiest wait</option>
              <option value="duration">Duration</option>
            </select>
          </label>
        )}
      </div>
      {view === 'map' ? (
        <ParkMap listed={listed} onAdd={add} onOpen={setOpen} />
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {listed.map((l) => {
            const mark = marks.get(l.item.id)
            // A planned row is tinted with an emerald accent, which wins over the unsuitable grey (design Decision 2).
            const planned = mark?.stops.length ? 'selected' : mark?.otherDays.length ? 'other' : undefined
            return (
              <li
                key={l.item.id}
                data-testid="catalog-row"
                data-unsuitable={l.unsuitable ? 'true' : undefined}
                data-planned={planned}
                className={`flex items-center gap-1 px-2 ${planned === 'selected' ? 'bg-emerald-50 shadow-[inset_4px_0_0_var(--color-emerald-600)]' : l.unsuitable ? 'bg-slate-50' : ''}`}
              >
                {wide && <DragHandle item={l.item} />}
                <RowBody listed={l} month={month} place={places.get(`${l.item.parkId}/${l.item.areaId}`) ?? ''} mark={mark} dayNumber={dayNumber} onOpen={() => setOpen(l.item)} />
                <IconButton label={`Add ${l.item.name} to day${planned === 'selected' ? ' again' : ''}`} onClick={() => add(l.item)} className="text-indigo-700">
                  <PlusIcon />
                </IconButton>
              </li>
            )
          })}
          {listed.length === 0 && <li className="p-4 text-sm text-slate-600">Nothing matches these filters.</li>}
        </ul>
      )}
      {open && (
        <ItemDetail
          item={open}
          onClose={() => setOpen(null)}
          onAdd={() => {
            const item = open
            setOpen(null)
            add(item)
          }}
        />
      )}
      {picking && (
        <ShowTimePicker
          show={picking}
          onClose={() => setPicking(null)}
          onPick={(time) => {
            addToDay(picking, { showTime: time })
            setPicking(null)
          }}
        />
      )}
      {pickingMeal && (
        <MealTimePicker
          restaurant={pickingMeal}
          onClose={() => setPickingMeal(null)}
          onPick={(time) => {
            addToDay(pickingMeal, time ? { mealTime: time } : {})
            setPickingMeal(null)
          }}
        />
      )}
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
    </section>
  )
}
