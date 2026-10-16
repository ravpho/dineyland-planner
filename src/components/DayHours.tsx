import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { ClockIcon } from './icons'
import { inputClass } from './ui'

/**
 * A day's hours, edited in the day sheet (app-shell spec: Day first in My day). Days are not tied to a park:
 * items from both parks can be planned.
 */
export function DayHours({ day }: { day: Day }) {
  const setDayWindow = usePlanner((s) => s.setDayWindow)
  const field = `${inputClass} w-full tabular-nums`
  return (
    <fieldset aria-label="Day hours" className="min-w-0">
      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <ClockIcon width={18} height={18} className="text-ink-muted" /> Hours in the parks
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Start
          <input className={field} type="time" required value={day.start} onChange={(e) => e.target.value && setDayWindow(day.id, e.target.value, day.end)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          End
          <input className={field} type="time" required value={day.end} onChange={(e) => e.target.value && setDayWindow(day.id, day.start, e.target.value)} />
        </label>
      </div>
    </fieldset>
  )
}
