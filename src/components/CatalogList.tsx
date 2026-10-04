import { useDraggable } from '@dnd-kit/core'
import { useEffect, useMemo, useState } from 'react'
import type { CatalogItem, Show } from '../domain/catalog'
import { filterCatalog, type ListedItem } from '../domain/filters'
import { MONTH_NAMES, useIsWide, usePlanningMonth } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useAddToDay } from '../app/useAddToDay'
import { selectedDay } from '../state/store'
import { FilterPanel } from './FilterPanel'
import { FilterIcon, GripIcon, PlusIcon } from './icons'
import { ItemDetail } from './ItemDetail'
import { itemFacts, TYPE_LABELS } from './labels'
import { ShowTimePicker } from './ShowTimePicker'
import { Badge, IconButton, inputClass, Stars } from './ui'

export const CATALOG_DRAG_PREFIX = 'catalog:'

function RowBody({ listed, month, onOpen }: { listed: ListedItem; month: number; onOpen: () => void }) {
  const { item, unsuitable, waitRange } = listed
  return (
    <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 py-2 text-left">
      <span className={`block font-medium ${unsuitable ? 'text-slate-500' : 'text-slate-900'}`}>{item.name}</span>
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
      {unsuitable && (
        <span className="mt-1 inline-block">
          <Badge tone="amber">{unsuitable}</Badge>
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
  const dayPark = usePlanner((s) => selectedDay(s)?.parkId)
  const month = usePlanningMonth()
  const wide = useIsWide()
  const addToDay = useAddToDay()
  const [open, setOpen] = useState<CatalogItem | null>(null)
  const [picking, setPicking] = useState<Show | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // The catalog follows the park of the selected day.
  useEffect(() => {
    if (dayPark) setFilters({ parkId: dayPark, areaIds: [] })
  }, [dayPark, setFilters])

  const listed = useMemo(() => filterCatalog(catalog, filters, profile, month), [catalog, filters, profile, month])
  const activeFilters = filters.areaIds.length + filters.types.length + (filters.hideUnsuitable ? 1 : 0) + (profile ? 1 : 0)

  const add = (item: CatalogItem) => {
    if (item.type === 'show') setPicking(item)
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
      <p className="mb-2 text-sm text-slate-600" aria-live="polite" data-testid="match-count">
        {listed.length} {listed.length === 1 ? 'item' : 'items'} in {catalog.parks.find((p) => p.id === filters.parkId)?.name}
      </p>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {listed.map((l) => (
          <li key={l.item.id} data-testid="catalog-row" data-unsuitable={l.unsuitable ? 'true' : undefined} className={`flex items-center gap-1 px-2 ${l.unsuitable ? 'bg-slate-50' : ''}`}>
            {wide && <DragHandle item={l.item} />}
            <RowBody listed={l} month={month} onOpen={() => setOpen(l.item)} />
            <IconButton label={`Add ${l.item.name} to day`} onClick={() => add(l.item)} className="text-indigo-700">
              <PlusIcon />
            </IconButton>
          </li>
        ))}
        {listed.length === 0 && <li className="p-4 text-sm text-slate-600">Nothing matches these filters.</li>}
      </ul>
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
      {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
    </section>
  )
}
