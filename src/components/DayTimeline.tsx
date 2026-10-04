import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Show } from '../domain/catalog'
import type { DaySchedule, Slot } from '../domain/schedule'
import { formatClock, formatDuration } from '../domain/time'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useToast } from './Toast'
import { DownIcon, GripIcon, TrashIcon, UpIcon, WalkIcon } from './icons'
import { TYPE_LABELS, areaName } from './labels'
import { Badge, IconButton, inputClass } from './ui'

export const DAY_DROP_ID = 'day-drop'

function SlotCard({ day, slot, index, count, windowEnd }: { day: Day; slot: Slot; index: number; count: number; windowEnd: string }) {
  const { moveItem, removeItem, undoRemove, setShowTime } = usePlanner((s) => s)
  const catalog = useCatalog()
  const toast = useToast()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slot.entry.key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const name = slot.kind === 'scheduled' ? slot.item.name : 'No longer available'

  const remove = () => {
    removeItem(day.id, slot.entry.key)
    toast(`Removed ${name}`, { label: 'Undo', run: undoRemove })
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
                <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
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
  return (
    <SortableContext items={day.items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
      <ol ref={setNodeRef} aria-label="Day plan" className={`flex min-h-24 flex-col gap-2 rounded-xl p-1 ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-300' : ''}`}>
        {schedule.slots.map((slot, i) => (
          <SlotCard key={slot.entry.key} day={day} slot={slot} index={i} count={schedule.slots.length} windowEnd={day.end} />
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
