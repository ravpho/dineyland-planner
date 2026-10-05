import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useMemo } from 'react'
import { CSS } from '@dnd-kit/utilities'
import type { Show } from '../domain/catalog'
import { restaurantSuggestions, type RestaurantSuggestion } from '../domain/restaurants'
import type { DaySchedule, Slot } from '../domain/schedule'
import { formatClock, formatDuration, parseClock } from '../domain/time'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useToast } from './Toast'
import { DownIcon, GripIcon, LockIcon, TrashIcon, UnlockIcon, UpIcon, WalkIcon } from './icons'
import { TYPE_LABELS, areaName } from './labels'
import { Badge, IconButton, inputClass } from './ui'

export const DAY_DROP_ID = 'day-drop'

/** Half-hour steps across the day's window, plus a current value outside those steps. */
function mealTimeOptions(day: Day, current?: string): string[] {
  const steps: string[] = []
  for (let t = Math.ceil(parseClock(day.start) / 30) * 30; t <= parseClock(day.end); t += 30) steps.push(formatClock(t))
  return [...new Set([...steps, ...(current ? [current] : [])])].sort()
}

function SlotCard({ day, slot, index, count, windowEnd, suggestions = [] }: { day: Day; slot: Slot; index: number; count: number; windowEnd: string; suggestions?: RestaurantSuggestion[] }) {
  const { moveItem, removeItem, undoRemove, setShowTime, setMealTime, setShowLock, swapRestaurant, undoRouteChange } = usePlanner((s) => s)
  const catalog = useCatalog()
  const toast = useToast()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slot.entry.key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const name = slot.kind === 'scheduled' ? slot.item.name : 'No longer available'

  const remove = () => {
    removeItem(day.id, slot.entry.key)
    toast(`Removed ${name}`, { label: 'Undo', run: undoRemove })
  }
  const swap = (s: RestaurantSuggestion) => {
    if (swapRestaurant(day.id, slot.entry.key, s.restaurant.id)) toast(`Swapped to ${s.restaurant.name}`, { label: 'Undo', run: undoRouteChange })
  }

  return (
    <li ref={setNodeRef} style={style} className={`list-none ${isDragging ? 'relative z-20 opacity-80' : ''}`} data-testid="timeline-slot" data-item-id={slot.entry.itemId}>
      {slot.kind === 'scheduled' && slot.parkChange && (
        <p className="py-1 pl-14 text-xs font-medium text-indigo-800" data-testid="park-change">
          Walk to {catalog.parks.find((p) => p.id === slot.item.parkId)?.name} · park change · {slot.walk} min
        </p>
      )}
      {slot.kind === 'scheduled' && slot.freeBefore > 0 && (
        <p className="py-1 pl-14 text-xs text-emerald-700" data-testid="free-time">
          Free time {formatDuration(slot.freeBefore)}
        </p>
      )}
      <div className={`flex flex-wrap items-start gap-x-1 rounded-xl border bg-white p-1 shadow-sm sm:flex-nowrap ${slot.kind === 'scheduled' && slot.afterWindow ? 'border-red-300' : 'border-slate-200'}`}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${name}`}
          className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center text-slate-400"
          data-testid="slot-handle"
        >
          <GripIcon />
        </button>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] py-1 sm:basis-auto">
          {slot.kind === 'missing' ? (
            <>
              <p className="font-medium text-slate-500">No longer available</p>
              <p className="text-xs text-slate-500">This item is not in the current catalog and is left out of the schedule.</p>
            </>
          ) : (
            <>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-sm font-semibold text-slate-900" data-testid="slot-time">
                  {formatClock(slot.start)}–{formatClock(slot.end)}
                </span>
                <span className="font-medium text-slate-900" data-testid="slot-name">{slot.item.name}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700" data-testid="slot-area">
                  {areaName(slot.item, catalog)}
                </span>
                <span className="inline-flex items-center gap-1" data-testid="slot-walk">
                  <WalkIcon width={14} height={14} /> {slot.walk} min
                </span>
                <span>arrive {formatClock(slot.arrive)}</span>
                {slot.item.type !== 'show' && (
                  <span>
                    wait {slot.wait} min <span className="text-slate-400">({slot.waitIsEstimate ? 'estimate' : 'typical'})</span>
                  </span>
                )}
                {slot.item.type === 'show' && <span>{TYPE_LABELS.show}</span>}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {slot.unsuitable && <Badge tone="amber">{slot.unsuitable}</Badge>}
                {slot.lateBy > 0 && <Badge tone="red">{slot.lateBy} min late</Badge>}
                {slot.afterWindow && <Badge tone="red">Ends after {windowEnd}</Badge>}
              </div>
              {slot.item.type === 'show' && (
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                  <label className="flex items-center gap-2">
                    Start
                    <select
                      aria-label={`Start time for ${slot.item.name}`}
                      className={`${inputClass} text-sm`}
                      value={slot.entry.showTime ?? (slot.item as Show).times[0]}
                      onChange={(e) => setShowTime(day.id, slot.entry.key, e.target.value)}
                    >
                      {[...new Set([...(slot.item as Show).times, slot.entry.showTime].filter(Boolean))].sort().map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <IconButton
                    label={`Keep ${slot.item.name} at ${slot.entry.showTime ?? (slot.item as Show).times[0]} when optimizing`}
                    aria-pressed={slot.entry.timeLocked === true}
                    onClick={() => setShowLock(day.id, slot.entry.key, !slot.entry.timeLocked)}
                    className={slot.entry.timeLocked ? 'text-indigo-700' : 'text-slate-400'}
                  >
                    {slot.entry.timeLocked ? <LockIcon /> : <UnlockIcon />}
                  </IconButton>
                  {slot.entry.timeLocked && <span>Time kept when optimizing</span>}
                </div>
              )}
              {slot.item.type === 'restaurant' && (
                <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  Meal time
                  <select
                    aria-label={`Meal time for ${slot.item.name}`}
                    className={`${inputClass} text-sm`}
                    value={slot.entry.mealTime ?? ''}
                    onChange={(e) => setMealTime(day.id, slot.entry.key, e.target.value || undefined)}
                  >
                    <option value="">Any time</option>
                    {mealTimeOptions(day, slot.entry.mealTime).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {suggestions.length > 0 && (
                <div className="mt-1" data-testid="restaurant-suggestions">
                  <p className="text-xs font-medium text-slate-700">Fits better:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestions.map((s) => (
                      <button
                        key={s.restaurant.id}
                        type="button"
                        onClick={() => swap(s)}
                        className="min-h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-2 text-left text-xs text-emerald-900 hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
                      >
                        <span className="font-medium">{s.restaurant.name}</span> · {s.onTime ? 'on time' : `saves ${s.saves} min`}
                        {s.restaurant.service === 'table' && <span className="text-emerald-800"> · booking usually needed</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="ml-auto flex shrink-0 sm:ml-0">
          <IconButton label={`Move ${name} up`} disabled={index === 0} onClick={() => moveItem(day.id, index, index - 1)}>
            <UpIcon />
          </IconButton>
          <IconButton label={`Move ${name} down`} disabled={index === count - 1} onClick={() => moveItem(day.id, index, index + 1)}>
            <DownIcon />
          </IconButton>
          <IconButton label={`Remove ${name}`} onClick={remove} className="text-red-700">
            <TrashIcon />
          </IconButton>
        </div>
      </div>
    </li>
  )
}

export function DayTimeline({ day, schedule }: { day: Day; schedule: DaySchedule }) {
  const { setNodeRef, isOver } = useDroppable({ id: DAY_DROP_ID })
  const catalog = useCatalog()
  // Restaurants that fit the day better (route-optimization spec, design Decision 5).
  const suggestions = useMemo(
    () => new Map(schedule.slots.flatMap((s) => (s.kind === 'scheduled' && s.item.type === 'restaurant' ? [[s.entry.key, restaurantSuggestions(day, catalog, s.entry.key)] as const] : []))),
    [day, catalog, schedule],
  )
  return (
    <SortableContext items={day.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} aria-label="Day plan" className={`flex min-h-24 flex-col gap-2 rounded-xl p-1 ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-300' : ''}`}>
        {schedule.slots.map((slot, i) => (
          <SlotCard key={slot.entry.key} day={day} slot={slot} index={i} count={schedule.slots.length} windowEnd={day.end} suggestions={suggestions.get(slot.entry.key)} />
        ))}
        {schedule.slots.length === 0 && (
          <li className="list-none rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
            Nothing planned yet. Add attractions, meals and shows from the catalog.
          </li>
        )}
      </ol>
    </SortableContext>
  )
}
