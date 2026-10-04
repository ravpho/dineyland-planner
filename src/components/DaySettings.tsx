import type { ParkId } from '../domain/catalog'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { Field, inputClass } from './ui'

export function DaySettings({ day }: { day: Day }) {
  const catalog = useCatalog()
  const setDayPark = usePlanner((s) => s.setDayPark)
  const setDayWindow = usePlanner((s) => s.setDayWindow)

  const changePark = (parkId: ParkId) => {
    if (parkId === day.parkId) return
    const leaving = day.items.length
    const name = catalog.parks.find((p) => p.id === parkId)?.name
    if (leaving > 0 && !window.confirm(`Switch this day to ${name}? The ${leaving} planned item${leaving === 1 ? '' : 's'} from the other park will be removed.`)) return
    setDayPark(day.id, parkId)
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="col-span-2">
        <Field label="Park">
          <select className={inputClass} value={day.parkId} onChange={(e) => changePark(e.target.value as ParkId)}>
            {catalog.parks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Start">
        <input className={inputClass} type="time" required value={day.start} onChange={(e) => e.target.value && setDayWindow(day.id, e.target.value, day.end)} />
      </Field>
      <Field label="End">
        <input className={inputClass} type="time" required value={day.end} onChange={(e) => e.target.value && setDayWindow(day.id, day.start, e.target.value)} />
      </Field>
    </div>
  )
}
