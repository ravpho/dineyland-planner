import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { Field, inputClass } from './ui'

/** A day's available time window. Days are not tied to a park: items from both parks can be planned. */
export function DaySettings({ day }: { day: Day }) {
  const setDayWindow = usePlanner((s) => s.setDayWindow)
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Start">
        <input className={inputClass} type="time" required value={day.start} onChange={(e) => e.target.value && setDayWindow(day.id, e.target.value, day.end)} />
      </Field>
      <Field label="End">
        <input className={inputClass} type="time" required value={day.end} onChange={(e) => e.target.value && setDayWindow(day.id, day.start, e.target.value)} />
      </Field>
    </div>
  )
}
