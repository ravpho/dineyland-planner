import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { ClockIcon } from './icons'
import { inputClass } from './ui'

/**
 * A day's hours, edited in place in one compact row (app-shell spec: Day first on the Plan). Days are not
 * tied to a park: items from both parks can be planned. The labels stay "Start" and "End" for assistive
 * technology; the row shows the word "Hours" when there is room.
 */
export function DayHours({ day }: { day: Day }) {
  const setDayWindow = usePlanner((s) => s.setDayWindow)
  const field = `${inputClass} w-auto px-2 tabular-nums`
  return (
    <div role="group" aria-label="Day hours" className="flex items-center gap-2">
      <ClockIcon className="shrink-0 text-ink-muted" />
      <span className="hidden text-sm font-medium text-ink-soft min-[400px]:inline">Hours</span>
      <label>
        <span className="sr-only">Start</span>
        <input className={field} type="time" required value={day.start} onChange={(e) => e.target.value && setDayWindow(day.id, e.target.value, day.end)} />
      </label>
      <span aria-hidden className="text-ink-muted">
        –
      </span>
      <label>
        <span className="sr-only">End</span>
        <input className={field} type="time" required value={day.end} onChange={(e) => e.target.value && setDayWindow(day.id, day.start, e.target.value)} />
      </label>
    </div>
  )
}
