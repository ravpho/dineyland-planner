import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { CSS } from '@dnd-kit/utilities'
import type { Show } from '../domain/catalog'
import { restaurantSuggestions, type RestaurantSuggestion } from '../domain/restaurants'
import type { DaySchedule, Slot } from '../domain/schedule'
import { stopNumbers } from '../domain/stops'
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

/** Centre of a stop's node, from the top of its card row: level with the reorder handle. */
const NODE_CENTRE_PX = 26
/** Centre of the small markers on the park-change and free-time rows. */
const MARKER_CENTRE_PX = 12

/**
 * The constellation rail's line in one row (midnight-theme design Decision 5). It starts at the marker on
 * the day's first row and ends at the node on its last; elsewhere it runs the full row, so the rows join
 * into one line down the day.
 */
function RailLine({ dashed = false, startAt, endAt }: { dashed?: boolean; startAt?: number; endAt?: number }) {
  return (
    <span
      aria-hidden
      className={`absolute left-1/2 -translate-x-1/2 ${dashed ? 'w-0 border-l-[1.5px] border-dashed border-line-strong' : 'w-[1.5px] bg-line-strong'}`}
      style={{ top: startAt ?? 0, ...(endAt === undefined ? { bottom: 0 } : { height: endAt - (startAt ?? 0) }) }}
    />
  )
}

/** A row of the timeline: the rail's 2 rem column, then the content. The rail spans the content's padding. */
function RailRow({ rail, children, padded = false }: { rail: ReactNode; children: ReactNode; padded?: boolean }) {
  return (
    <div className="flex">
      <div className="relative w-8 shrink-0">{rail}</div>
      <div className={`min-w-0 flex-1 ${padded ? 'pb-2' : ''}`}>{children}</div>
    </div>
  )
}

function SlotCard({
  day,
  slot,
  index,
  count,
  stop,
  focused = false,
  windowEnd,
  suggestions = [],
}: {
  day: Day
  slot: Slot
  index: number
  count: number
  /** The same number the map's route and the catalog's planned label use; none for a missing entry. */
  stop?: number
  /** "Show in timeline" asked for this item: bring it into view, focus it and highlight it briefly. */
  focused?: boolean
  windowEnd: string
  suggestions?: RestaurantSuggestion[]
}) {
  const { moveItem, removeItem, undoRemove, setShowTime, setMealTime, setShowLock, swapRestaurant, undoRouteChange, clearPlanFocus } = usePlanner((s) => s)
  const catalog = useCatalog()
  const toast = useToast()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slot.entry.key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const itemRef = useRef<HTMLLIElement | null>(null)
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Stable, so dnd-kit's nodes aren't detached and re-attached on every render during a drag.
  const setItemNode = useCallback(
    (el: HTMLLIElement | null) => {
      setNodeRef(el)
      itemRef.current = el
    },
    [setNodeRef],
  )
  const setHandleNode = useCallback(
    (el: HTMLButtonElement | null) => {
      setActivatorNodeRef(el)
      handleRef.current = el
    },
    [setActivatorNodeRef],
  )
  useEffect(() => () => clearTimeout(highlightTimer.current), [])

  // plan-ui-improvements design Decision 7. The highlight is a DOM attribute React doesn't manage, so
  // it outlives clearing the focus key. jsdom has no scrollIntoView, hence the optional call.
  useEffect(() => {
    if (!focused) return
    itemRef.current?.scrollIntoView?.({ block: 'center' })
    handleRef.current?.focus({ preventScroll: true })
    const card = cardRef.current
    if (card) {
      card.dataset.highlight = 'true'
      clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => delete card.dataset.highlight, 2000)
    }
    clearPlanFocus()
  }, [focused, clearPlanFocus])
  const name = slot.kind === 'scheduled' ? slot.item.name : 'No longer available'
  const first = index === 0
  const last = index === count - 1
  /** The rows above the card, in order: they decide where the day's line starts. */
  const preRows = slot.kind === 'scheduled' ? [...(slot.parkChange ? ['park'] : []), ...(slot.freeBefore > 0 ? ['free'] : [])] : []

  const remove = () => {
    removeItem(day.id, slot.entry.key)
    toast(`Removed ${name}`, { label: 'Undo', run: undoRemove })
  }
  const swap = (s: RestaurantSuggestion) => {
    if (swapRestaurant(day.id, slot.entry.key, s.restaurant.id)) toast(`Swapped to ${s.restaurant.name}`, { label: 'Undo', run: undoRouteChange })
  }

  return (
    <li
      ref={setItemNode}
      style={style}
      className={`list-none ${isDragging ? 'relative z-20 opacity-80' : ''}`}
      data-testid="timeline-slot"
      data-item-id={slot.entry.itemId}
    >
      {slot.kind === 'scheduled' && slot.parkChange && (
        <RailRow
          rail={
            <>
              <RailLine dashed startAt={first && preRows[0] === 'park' ? MARKER_CENTRE_PX : undefined} />
              <span aria-hidden className="absolute left-1/2 top-[8px] h-2 w-2 -translate-x-1/2 rotate-45 bg-accent" />
            </>
          }
        >
          <p className="py-1 text-xs font-medium text-accent" data-testid="park-change">
            Walk to {catalog.parks.find((p) => p.id === slot.item.parkId)?.name} · park change · {slot.walk} min
          </p>
        </RailRow>
      )}
      {slot.kind === 'scheduled' && slot.freeBefore > 0 && (
        <RailRow
          rail={
            <>
              <RailLine startAt={first && preRows[0] === 'free' ? MARKER_CENTRE_PX : undefined} />
              <span aria-hidden className="absolute left-1/2 top-[8px] h-2 w-2 -translate-x-1/2 rounded-full border-[1.5px] border-fits bg-page" />
            </>
          }
        >
          <p className="py-1 text-xs text-fits" data-testid="free-time">
            Free time {formatDuration(slot.freeBefore)}
          </p>
        </RailRow>
      )}
      <RailRow
        padded
        rail={
          <>
            {!(first && last && preRows.length === 0) && (
              <RailLine startAt={first && preRows.length === 0 ? NODE_CENTRE_PX : undefined} endAt={last ? NODE_CENTRE_PX : undefined} />
            )}
            {stop !== undefined ? (
              // The same number the maps' route and the catalog's planned label use (plan-ui-improvements design Decision 3).
              <span
                className="absolute left-1/2 top-[13px] flex h-[26px] min-w-[26px] -translate-x-1/2 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent tabular-nums ring-[1.5px] ring-star"
                data-testid="slot-stop"
              >
                <span className="sr-only">Stop </span>
                {stop}
              </span>
            ) : (
              <span
                aria-hidden
                className="absolute left-1/2 top-[17px] h-[18px] w-[18px] -translate-x-1/2 rounded-full border-[1.5px] border-dashed border-ink-faint bg-page"
                data-testid="slot-node-missing"
              />
            )}
          </>
        }
      >
        <div
          ref={cardRef}
          // A grid keeps the source order (handle, time, name, details, controls) while phones show the controls on the
          // time's row and the name below it, which keeps cards short (app-shell spec: Day first on the Plan).
          className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-1 rounded-xl border bg-surface p-1 shadow-card transition-shadow data-[highlight=true]:ring-2 data-[highlight=true]:ring-star-ink ${slot.kind === 'scheduled' && slot.afterWindow ? 'border-over/50' : 'border-line'}`}
        >
          <button
            type="button"
            ref={setHandleNode}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${name}`}
            className="col-start-1 row-span-3 row-start-1 flex h-11 w-11 cursor-grab touch-none items-center justify-center rounded-lg text-ink-faint hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
            data-testid="slot-handle"
          >
            <GripIcon />
          </button>
          {slot.kind === 'missing' ? (
            <>
              <p className="col-start-2 row-start-1 self-center font-medium text-ink-muted">No longer available</p>
              <p className="col-span-2 col-start-2 row-start-2 pb-1 text-xs text-ink-muted sm:col-span-1">
                This item is not in the current catalog and is left out of the schedule.
              </p>
            </>
          ) : (
            <>
              {/* Phones: the time sits beside the controls and the name gets its own line. Wider: one line. */}
              <p className="contents sm:col-start-2 sm:row-start-1 sm:flex sm:min-h-11 sm:flex-wrap sm:items-center sm:gap-x-2">
                <span className="col-start-2 row-start-1 self-center text-sm font-semibold text-ink tabular-nums" data-testid="slot-time">
                  {formatClock(slot.start)}–{formatClock(slot.end)}
                </span>
                <span className="col-span-2 col-start-2 row-start-2 font-medium text-ink" data-testid="slot-name">
                  {slot.item.name}
                </span>
              </p>
              <div className="col-span-2 col-start-2 row-start-3 min-w-0 pb-1 sm:col-span-1 sm:row-start-2">
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                  <span className="font-medium text-ink-soft" data-testid="slot-area">
                    {areaName(slot.item, catalog)}
                  </span>
                  <span className="inline-flex items-center gap-1" data-testid="slot-walk">
                    <WalkIcon width={14} height={14} /> {slot.walk} min
                  </span>
                  <span>arrive {formatClock(slot.arrive)}</span>
                  {slot.item.type !== 'show' && (
                    <span>
                      wait {slot.wait} min <span>({slot.waitIsEstimate ? 'estimate' : 'typical'})</span>
                    </span>
                  )}
                  {slot.item.type === 'show' && <span>{TYPE_LABELS.show}</span>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {slot.unsuitable && <Badge tone="warn">{slot.unsuitable}</Badge>}
                  {slot.lateBy > 0 && <Badge tone="over">{slot.lateBy} min late</Badge>}
                  {slot.afterWindow && <Badge tone="over">Ends after {windowEnd}</Badge>}
                </div>
                {slot.item.type === 'show' && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
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
                      className={slot.entry.timeLocked ? 'text-accent' : 'text-ink-faint'}
                    >
                      {slot.entry.timeLocked ? <LockIcon /> : <UnlockIcon />}
                    </IconButton>
                    {slot.entry.timeLocked && <span>Time kept when optimizing</span>}
                  </div>
                )}
                {slot.item.type === 'restaurant' && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
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
                    <p className="text-xs font-medium text-ink-soft">Fits better:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {suggestions.map((s) => (
                        <button
                          key={s.restaurant.id}
                          type="button"
                          onClick={() => swap(s)}
                          className="min-h-11 rounded-lg border border-fits/30 bg-fits-soft px-2 text-left text-xs text-fits hover:border-fits focus-visible:outline-2 focus-visible:outline-focus"
                        >
                          <span className="font-medium">{s.restaurant.name}</span> · {s.onTime ? 'on time' : `saves ${s.saves} min`}
                          {s.restaurant.service === 'table' && <span> · booking usually needed</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <div className="col-start-3 row-start-1 flex sm:row-span-2">
            <IconButton label={`Move ${name} up`} disabled={index === 0} onClick={() => moveItem(day.id, index, index - 1)}>
              <UpIcon />
            </IconButton>
            <IconButton label={`Move ${name} down`} disabled={index === count - 1} onClick={() => moveItem(day.id, index, index + 1)}>
              <DownIcon />
            </IconButton>
            <IconButton label={`Remove ${name}`} onClick={remove} className="text-over">
              <TrashIcon />
            </IconButton>
          </div>
        </div>
      </RailRow>
    </li>
  )
}

export function DayTimeline({ day, schedule }: { day: Day; schedule: DaySchedule }) {
  const { setNodeRef, isOver } = useDroppable({ id: DAY_DROP_ID })
  const catalog = useCatalog()
  const stops = useMemo(() => stopNumbers(day, catalog), [day, catalog])
  const focusKey = usePlanner((s) => s.planFocusKey)
  // Restaurants that fit the day better (route-optimization spec, design Decision 5).
  const suggestions = useMemo(
    () => new Map(schedule.slots.flatMap((s) => (s.kind === 'scheduled' && s.item.type === 'restaurant' ? [[s.entry.key, restaurantSuggestions(day, catalog, s.entry.key)] as const] : []))),
    [day, catalog, schedule],
  )
  return (
    <SortableContext items={day.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} aria-label="Day plan" className={`flex min-h-24 flex-col rounded-xl p-1 ${isOver ? 'bg-accent-soft ring-2 ring-accent/30' : ''}`}>
        {schedule.slots.map((slot, i) => (
          <SlotCard
            key={slot.entry.key}
            day={day}
            slot={slot}
            index={i}
            count={schedule.slots.length}
            stop={stops.get(slot.entry.key)}
            focused={slot.entry.key === focusKey}
            windowEnd={day.end}
            suggestions={suggestions.get(slot.entry.key)}
          />
        ))}
        {schedule.slots.length === 0 && (
          <li className="list-none rounded-xl border border-dashed border-line-strong bg-surface/60 p-6 text-center text-sm text-ink-muted">
            Nothing planned yet. Add attractions, meals and shows from the catalog.
          </li>
        )}
      </ol>
    </SortableContext>
  )
}
