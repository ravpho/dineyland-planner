import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Show } from '../domain/catalog'
import { restaurantSuggestions, type RestaurantSuggestion } from '../domain/restaurants'
import type { DaySchedule, ScheduledSlot, Slot } from '../domain/schedule'
import { stopNumbers } from '../domain/stops'
import { formatClock, formatDuration, parseClock } from '../domain/time'
import type { Day } from '../domain/trip'
import { useMediaQuery } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useMoveStop } from '../app/useMoveStop'
import { useOrderUndo } from '../app/useOrderUndo'
import { useAddFlow } from './AddFlow'
import { useToast } from './Toast'
import { DownIcon, GripIcon, LockIcon, TrashIcon, UnlockIcon, UpIcon, WalkIcon } from './icons'
import { areaName } from './labels'
import { Badge, Button, IconButton, inputClass, Sheet } from './ui'

export const DAY_DROP_ID = 'day-drop'

/** What the lifted card shows while a stop is dragged. */
export interface DraggedStop {
  name: string
  stop?: number
  time?: string
}

/**
 * The lifted card that follows the finger or mouse while a stop is dragged; the row itself stays behind at 30%
 * opacity and the others move apart around it (refresh-plan-layout design Decision 7). The overlay is as tall as
 * the whole list item, so the card sits at its bottom, where the row is.
 */
export function StopOverlay({ stop }: { stop: DraggedStop }) {
  return (
    <div className="flex h-full flex-col justify-end pb-1">
      <div className="flex min-h-14 scale-[1.02] items-center gap-3 rounded-2xl border border-accent/30 bg-surface py-2 pl-3 pr-1 shadow-lg" data-testid="drag-overlay">
        {stop.stop !== undefined && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent tabular-nums ring-[1.5px] ring-star">{stop.stop}</span>
        )}
        {stop.time && <span className="w-[3.25rem] shrink-0 text-[0.95rem] font-semibold text-ink tabular-nums">{stop.time}</span>}
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{stop.name}</span>
        <span className="flex h-12 w-11 cursor-grabbing items-center justify-center text-ink-soft">
          <GripIcon />
        </span>
      </div>
    </div>
  )
}

/** Half-hour steps across the day's window, plus a current value outside those steps. */
function mealTimeOptions(day: Day, current?: string): string[] {
  const steps: string[] = []
  for (let t = Math.ceil(parseClock(day.start) / 30) * 30; t <= parseClock(day.end); t += 30) steps.push(formatClock(t))
  return [...new Set([...steps, ...(current ? [current] : [])])].sort()
}

const showTimeOf = (slot: ScheduledSlot) => slot.entry.showTime ?? (slot.item as Show).times[0]!
const parkNameOf = (slot: ScheduledSlot, catalog: ReturnType<typeof useCatalog>) => catalog.parks.find((p) => p.id === slot.item.parkId)?.name

/** "arrives 14:12 · be there by 13:45" under a late show or meal (day-schedule spec: Late flags say why). */
const lateNote = (slot: ScheduledSlot) => (slot.dueBy === undefined ? '' : `arrives ${formatClock(slot.arrive)} · be there by ${formatClock(slot.dueBy)}`)

/** Height of the walk line above a row, and the stop node's centre within the row: where the day's line meets each node. */
const WALK_LINE_PX = 22
const NODE_CENTRE_PX = 22

/**
 * One stop of the day (refresh-plan-layout design Decision 5): the stop number, start and end, the name, area
 * and wait, short tags, and the grip. Tapping it opens its sheet. Rows of the same park are drawn as one card,
 * joined by a line through their numbers; a park change starts a new card under a "Walk to …" note.
 */
function StopRow({
  slot,
  index,
  count,
  stop,
  sectionStart,
  sectionEnd,
  focused = false,
  windowEnd,
  suggestions = 0,
  reducedMotion,
  onOpen,
  onRemoveMissing,
}: {
  slot: Slot
  index: number
  count: number
  /** The same number the map's route and the catalog's planned label use; none for a missing entry. */
  stop?: number
  sectionStart: boolean
  sectionEnd: boolean
  /** "Show in timeline" asked for this item: bring it into view, focus it and highlight it briefly. */
  focused?: boolean
  windowEnd: string
  suggestions?: number
  /** Rows jump to their places instead of sliding. */
  reducedMotion: boolean
  onOpen: () => void
  onRemoveMissing: () => void
}) {
  const catalog = useCatalog()
  const clearPlanFocus = usePlanner((s) => s.clearPlanFocus)
  const name = slot.kind === 'scheduled' ? slot.item.name : 'No longer available'
  const scheduled = slot.kind === 'scheduled' ? slot : undefined
  const dragged: DraggedStop = { name, stop, time: scheduled && formatClock(scheduled.start) }
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.entry.key,
    data: { stop: dragged },
    transition: reducedMotion ? null : undefined,
  })
  const style = { transform: CSS.Transform.toString(transform), transition: transition ?? undefined }
  const itemRef = useRef<HTMLLIElement | null>(null)
  const handleRef = useRef<HTMLButtonElement | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const nodeRef = useRef<HTMLSpanElement>(null)
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
    // The stop node gets it too, so its ring pulses once (midnight-theme design Decision 6).
    const marked = [rowRef.current, nodeRef.current].filter((el) => el !== null)
    if (marked.length) {
      for (const el of marked) el.dataset.highlight = 'true'
      clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => marked.forEach((el) => delete el.dataset.highlight), 2000)
    }
    clearPlanFocus()
  }, [focused, clearPlanFocus])

  // A park change carries its walk in the "Walk to …" note; the walk line then only shows free time.
  const walkLine = scheduled && (!scheduled.parkChange || scheduled.freeBefore > 0)
  const nodeY = (walkLine ? WALK_LINE_PX : 0) + NODE_CENTRE_PX
  // Rows of one card overlap by a pixel, so no hairline of the page shows between them at fractional heights.
  const card = `relative border-x border-line bg-surface ${sectionStart ? 'rounded-t-2xl border-t pt-1' : '-mt-px'} ${sectionEnd ? 'mb-1 rounded-b-2xl border-b pb-1 shadow-card' : ''}`

  return (
    <li
      ref={setItemNode}
      style={style}
      className={`list-none ${isDragging ? 'relative z-20 opacity-30' : ''}`}
      data-testid="timeline-slot"
      data-item-id={slot.entry.itemId}
    >
      {index === 0 && scheduled && (
        <p className="mb-2 px-1 text-xs font-bold uppercase tracking-widest text-ink-muted" data-testid="first-park">
          {parkNameOf(scheduled, catalog)}
        </p>
      )}
      {scheduled?.parkChange && (
        <p className="my-2 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink-soft" data-testid="park-change">
          <WalkIcon width={16} height={16} className="shrink-0 text-accent" />
          <span>
            Walk to <strong className="font-semibold text-ink">{parkNameOf(scheduled, catalog)}</strong> · park change · {scheduled.walk} min
          </span>
        </p>
      )}
      <div className={card} style={{ '--node-y': `${nodeY}px` } as CSSProperties}>
        {/* The day's line through the stop numbers, from the previous stop of this park to the next. */}
        {!sectionStart && <span aria-hidden className="absolute left-[23px] top-0 h-(--node-y) w-[1.5px] bg-line-strong" />}
        {!sectionEnd && <span aria-hidden className="absolute bottom-0 left-[23px] top-(--node-y) w-[1.5px] bg-line-strong" />}
        {walkLine && (
          <p className="flex h-[22px] items-center gap-1.5 pl-[5.25rem] pr-3 text-xs text-ink-muted">
            {!scheduled.parkChange && (
              <>
                <WalkIcon width={13} height={13} className="shrink-0" />
                <span>
                  <span data-testid="slot-walk">{scheduled.walk} min</span> walk{index === 0 ? ' from the entrance' : ''}
                </span>
              </>
            )}
            {scheduled.freeBefore > 0 && (
              <>
                {!scheduled.parkChange && <span aria-hidden>·</span>}
                <span className="font-semibold text-fits" data-testid="free-time">
                  Free time {formatDuration(scheduled.freeBefore)}
                </span>
              </>
            )}
          </p>
        )}
        <div
          ref={rowRef}
          className={`grid grid-cols-[minmax(0,1fr)_2.75rem] items-center rounded-xl pr-1 data-[highlight=true]:ring-2 data-[highlight=true]:ring-star-ink ${scheduled?.afterWindow ? 'bg-over-soft/60' : ''}`}
        >
          {scheduled ? (
            <button
              type="button"
              aria-label={`Open stop ${stop}, ${name}`}
              aria-haspopup="dialog"
              onClick={onOpen}
              className="grid min-h-14 grid-cols-[1.5rem_3.25rem_minmax(0,1fr)] items-start gap-x-3 rounded-xl py-2.5 pl-3 text-left hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
            >
              {/* The same number the maps' route and the catalog's planned label use (plan-ui-improvements design Decision 3). */}
              <span
                ref={nodeRef}
                className="stop-node relative z-[1] mt-px flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent tabular-nums ring-[1.5px] ring-star"
                data-testid="slot-stop"
              >
                <span className="sr-only">Stop </span>
                {stop}
              </span>
              <span className="flex flex-col leading-tight tabular-nums" data-testid="slot-time">
                <span className="text-[0.95rem] font-semibold text-ink">{formatClock(scheduled.start)}</span>
                <span className="text-xs text-ink-muted">
                  <span className="sr-only">–</span>
                  {formatClock(scheduled.end)}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-snug text-ink" data-testid="slot-name">
                  {scheduled.item.name}
                </span>
                <span className="mt-0.5 block text-[0.8rem] text-ink-muted">
                  <span className="font-medium text-ink-soft" data-testid="slot-area">
                    {areaName(scheduled.item, catalog)}
                  </span>
                  {scheduled.item.type !== 'show' && (
                    <>
                      {' · '}wait {scheduled.wait} min{scheduled.waitIsEstimate && ' (estimate)'}
                    </>
                  )}
                </span>
                <StopTags slot={scheduled} windowEnd={windowEnd} suggestions={suggestions} />
              </span>
            </button>
          ) : (
            <div className="grid min-h-14 grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 py-2 pl-3">
              <span aria-hidden className="h-[18px] w-[18px] justify-self-center rounded-full border-[1.5px] border-dashed border-ink-faint bg-surface" data-testid="slot-node-missing" />
              <span className="min-w-0">
                <span className="block font-medium text-ink-muted">No longer available</span>
                <span className="block text-xs text-ink-muted">Not in the current catalog, so it is left out of the schedule.</span>
              </span>
              <IconButton label={`Remove ${name}`} onClick={onRemoveMissing} className="text-over">
                <TrashIcon />
              </IconButton>
            </div>
          )}
          <button
            type="button"
            ref={setHandleNode}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${name}`}
            className="flex h-12 w-11 cursor-grab touch-none items-center justify-center rounded-lg text-ink-faint hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
            data-testid="slot-handle"
            data-count={count}
          >
            <GripIcon />
          </button>
        </div>
      </div>
    </li>
  )
}

/** Meal or show time (with its lock), late with the reason, unsuitable, "Ends after" and quicker restaurants. */
function StopTags({ slot, windowEnd, suggestions }: { slot: ScheduledSlot; windowEnd: string; suggestions: number }) {
  const note = slot.lateBy > 0 ? lateNote(slot) : ''
  const tags = [
    slot.item.type === 'restaurant' && slot.entry.mealTime && (
      <Badge key="meal">{`${parseClock(slot.entry.mealTime) < 15 * 60 ? 'Lunch' : 'Dinner'} ${slot.entry.mealTime}`}</Badge>
    ),
    slot.item.type === 'show' && (
      <Badge key="show">
        Show {showTimeOf(slot)}
        {slot.entry.timeLocked && (
          <>
            <LockIcon width={12} height={12} className="ml-1" />
            <span className="sr-only"> (time kept when optimizing)</span>
          </>
        )}
      </Badge>
    ),
    slot.lateBy > 0 && (
      <Badge key="late" tone="over">
        {slot.lateBy} min late
      </Badge>
    ),
    slot.unsuitable && (
      <Badge key="unsuitable" tone="warn">
        {slot.unsuitable}
      </Badge>
    ),
    slot.afterWindow && (
      <Badge key="after" tone="over">
        Ends after {windowEnd}
      </Badge>
    ),
    suggestions > 0 && (
      <Badge key="quicker" tone="fits">
        {suggestions} quicker {suggestions === 1 ? 'option' : 'options'}
      </Badge>
    ),
  ].filter(Boolean)
  if (!tags.length) return null
  return (
    <>
      <span className="mt-1.5 flex flex-wrap gap-1">{tags}</span>
      {note && (
        <span className="mt-1 block text-xs text-over" data-testid="late-note">
          {note}
        </span>
      )}
    </>
  )
}

/** The figures in a stop's sheet: arrive, wait (or the time to be there, for a show), start and end. */
function TimeTiles({ slot }: { slot: ScheduledSlot }) {
  const tiles: [string, string][] = [
    ['Arrive', formatClock(slot.arrive)],
    slot.item.type === 'show' ? ['Be there', formatClock(slot.dueBy ?? slot.start)] : ['Wait', `${slot.wait} min`],
    ['Starts', formatClock(slot.start)],
    ['Ends', formatClock(slot.end)],
  ]
  return (
    <dl className="grid grid-cols-4 gap-2" data-testid="stop-times">
      {tiles.map(([label, value]) => (
        <div key={label} className="flex flex-col-reverse items-center gap-0.5 rounded-xl bg-surface-muted px-1 py-2 text-center">
          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-ink-muted">{label}</dt>
          <dd className="text-base font-semibold text-ink tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A stop's sheet (day-schedule spec: Sheet for each timeline item; refresh-plan-layout design Decision 6). It
 * follows the stop by its key, so moving it keeps the sheet on the same item.
 */
function StopSheet({ day, schedule, entryKey, onClose }: { day: Day; schedule: DaySchedule; entryKey: string; onClose: () => void }) {
  const catalog = useCatalog()
  const { removeItem, undoRemove, setShowTime, setMealTime, setShowLock, swapRestaurant } = usePlanner((s) => s)
  const toast = useToast()
  const undoFor = useOrderUndo()
  const move = useMoveStop()
  const { openDetails, sheets } = useAddFlow()
  const upRef = useRef<HTMLButtonElement>(null)
  const downRef = useRef<HTMLButtonElement>(null)
  const [stepped, setStepped] = useState<'up' | 'down' | null>(null)
  const index = day.items.findIndex((e) => e.key === entryKey)
  const slot = schedule.slots[index]
  const stops = useMemo(() => stopNumbers(day, catalog), [day, catalog])
  const suggestions = useMemo(() => (slot?.kind === 'scheduled' && slot.item.type === 'restaurant' ? restaurantSuggestions(day, catalog, entryKey) : []), [slot, day, catalog, entryKey])
  // The stepper keeps focus on the button just used, even as the stop moves.
  useEffect(() => {
    if (stepped) (stepped === 'up' ? upRef : downRef).current?.focus()
  }, [stepped, index])
  if (!slot || slot.kind !== 'scheduled') return null

  const name = slot.item.name
  const count = day.items.length
  const step = (to: number, which: 'up' | 'down') => {
    if (move(index, to)) setStepped(which)
  }
  const moveTo = (to: number) => {
    onClose()
    move(index, to)
  }
  const remove = () => {
    onClose()
    removeItem(day.id, entryKey)
    toast(`Removed ${name}`, { label: 'Undo', run: undoRemove })
  }
  const swap = (s: RestaurantSuggestion) => {
    if (swapRestaurant(day.id, entryKey, s.restaurant.id)) toast(`Swapped to ${s.restaurant.name}`, { label: 'Undo', run: undoFor() })
  }

  return (
    <Sheet title={name} onClose={onClose}>
      <p className="-mt-2 mb-3 text-sm text-ink-muted" data-testid="stop-sheet-place">
        Stop {stops.get(entryKey)} · {areaName(slot.item, catalog)} · {parkNameOf(slot, catalog)}
      </p>
      <div className="flex flex-col gap-3">
        <TimeTiles slot={slot} />
        {slot.lateBy > 0 && (
          <p role="note" className="rounded-xl bg-over-soft px-3 py-2 text-sm text-over" data-testid="late-explanation">
            {slot.item.type === 'show'
              ? `You’d arrive at ${formatClock(slot.arrive)}, ${slot.lateBy} min after the recommended ${formatClock(slot.dueBy!)}. Pick a later show, or let Optimize route fix it.`
              : `You’d arrive at ${formatClock(slot.arrive)}, ${slot.lateBy} min after the latest arrival for this meal, ${formatClock(slot.dueBy!)}. Pick a later meal time.`}
          </p>
        )}
        {slot.unsuitable && (
          <p role="note" className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            Not suitable for your group: {slot.unsuitable}
          </p>
        )}
        {slot.item.type === 'restaurant' && (
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
            Meal time
            <select aria-label={`Meal time for ${name}`} className={inputClass} value={slot.entry.mealTime ?? ''} onChange={(e) => setMealTime(day.id, entryKey, e.target.value || undefined)}>
              <option value="">Any time</option>
              {mealTimeOptions(day, slot.entry.mealTime).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        )}
        {slot.item.type === 'show' && (
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-ink-soft">
              Show time
              <select aria-label={`Start time for ${name}`} className={inputClass} value={showTimeOf(slot)} onChange={(e) => setShowTime(day.id, entryKey, e.target.value)}>
                {[...new Set([...(slot.item as Show).times, slot.entry.showTime].filter(Boolean))].sort().map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <IconButton
              label={`Keep ${name} at ${showTimeOf(slot)} when optimizing`}
              aria-pressed={slot.entry.timeLocked === true}
              onClick={() => setShowLock(day.id, entryKey, !slot.entry.timeLocked)}
              className={`border border-line-strong ${slot.entry.timeLocked ? 'bg-accent text-on-accent hover:bg-accent-hover' : 'text-ink-soft'}`}
            >
              {slot.entry.timeLocked ? <LockIcon /> : <UnlockIcon />}
            </IconButton>
          </div>
        )}
        {slot.item.type === 'show' && slot.entry.timeLocked && <p className="-mt-2 text-xs text-ink-muted">Time kept when optimizing.</p>}
        {suggestions.length > 0 && (
          <div data-testid="restaurant-suggestions">
            <p className="text-sm font-semibold text-ink-soft">Quicker restaurants of the same kind</p>
            <div className="mt-1 flex flex-col gap-1">
              {suggestions.map((s) => (
                <button
                  key={s.restaurant.id}
                  type="button"
                  onClick={() => swap(s)}
                  className="min-h-11 rounded-xl border border-fits/30 bg-fits-soft px-3 py-2 text-left text-sm text-fits hover:border-fits focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="font-semibold">{s.restaurant.name}</span> · {s.onTime ? 'on time' : `saves ${s.saves} min`}
                  {s.restaurant.service === 'table' && <span> · booking usually needed</span>}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => moveTo(0)} disabled={index === 0} className="disabled:opacity-40">
            <UpIcon width={18} height={18} /> Move to top
          </Button>
          <Button onClick={() => moveTo(count - 1)} disabled={index === count - 1} className="disabled:opacity-40">
            <DownIcon width={18} height={18} /> Move to bottom
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface-muted py-1 pl-3 pr-1" data-testid="stop-stepper">
          <p className="flex-1 text-sm text-ink-soft">
            Stop <strong className="text-ink tabular-nums">{stops.get(entryKey)}</strong> of {stops.size}
          </p>
          <IconButton ref={upRef} label={`Move ${name} up`} disabled={index === 0} onClick={() => step(index - 1, 'up')} className="border border-line-strong bg-surface">
            <UpIcon />
          </IconButton>
          <IconButton ref={downRef} label={`Move ${name} down`} disabled={index === count - 1} onClick={() => step(index + 1, 'down')} className="border border-line-strong bg-surface">
            <DownIcon />
          </IconButton>
        </div>
        <p className="-mt-1 text-xs text-ink-muted">Or drag the handle in the day to put it anywhere.</p>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-line pt-3">
          <Button className="px-5" onClick={() => openDetails(slot.item)}>
            Details
          </Button>
          <Button variant="danger" onClick={remove}>
            <TrashIcon width={18} height={18} /> Remove from day
          </Button>
        </div>
      </div>
      {/* The details open above this sheet, and adding from them uses the same flow as Explore. */}
      {sheets}
    </Sheet>
  )
}

export function DayTimeline({ day, schedule }: { day: Day; schedule: DaySchedule }) {
  const { setNodeRef, isOver } = useDroppable({ id: DAY_DROP_ID })
  const catalog = useCatalog()
  const { removeItem, undoRemove } = usePlanner((s) => s)
  const toast = useToast()
  const stops = useMemo(() => stopNumbers(day, catalog), [day, catalog])
  const focusKey = usePlanner((s) => s.planFocusKey)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const closeSheet = useCallback(() => setOpenKey(null), [])
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  // Restaurants that fit the day better (route-optimization spec, design Decision 5).
  const suggestions = useMemo(
    () => new Map(schedule.slots.flatMap((s) => (s.kind === 'scheduled' && s.item.type === 'restaurant' ? [[s.entry.key, restaurantSuggestions(day, catalog, s.entry.key).length] as const] : []))),
    [day, catalog, schedule],
  )
  const slots = schedule.slots
  // A park change starts a new card; a missing entry stays in the card it sits in.
  const startsSection = (i: number) => i === 0 || (slots[i]!.kind === 'scheduled' && (slots[i] as ScheduledSlot).parkChange)

  return (
    <SortableContext items={day.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} aria-label="Day plan" className={`flex min-h-24 flex-col rounded-2xl ${isOver ? 'bg-accent-soft ring-2 ring-accent/30' : ''}`}>
        {slots.map((slot, i) => (
          <StopRow
            key={slot.entry.key}
            slot={slot}
            index={i}
            count={slots.length}
            stop={stops.get(slot.entry.key)}
            sectionStart={startsSection(i)}
            sectionEnd={i === slots.length - 1 || startsSection(i + 1)}
            focused={slot.entry.key === focusKey}
            windowEnd={day.end}
            suggestions={suggestions.get(slot.entry.key)}
            reducedMotion={reducedMotion}
            onOpen={() => setOpenKey(slot.entry.key)}
            onRemoveMissing={() => {
              removeItem(day.id, slot.entry.key)
              toast('Removed No longer available', { label: 'Undo', run: undoRemove })
            }}
          />
        ))}
        {slots.length === 0 && (
          <li className="list-none rounded-2xl border border-dashed border-line-strong bg-surface/60 p-6 text-center text-sm text-ink-muted">
            Nothing planned yet. Add attractions, meals and shows from Explore.
          </li>
        )}
      </ol>
      {openKey && <StopSheet day={day} schedule={schedule} entryKey={openKey} onClose={closeSheet} />}
    </SortableContext>
  )
}
