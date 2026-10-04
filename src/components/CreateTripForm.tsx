import { useState } from 'react'
import { MAX_TRIP_DAYS, addDays } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { Button, Field, inputClass } from './ui'

const today = () => new Date().toISOString().slice(0, 10)

export function CreateTripForm({ onDone }: { onDone?: () => void }) {
  const createTrip = usePlanner((s) => s.createTrip)
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => addDays(today(), 30))
  const [days, setDays] = useState(2)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        createTrip(name || 'My trip', date, days)
        onDone?.()
      }}
    >
      <Field label="Trip name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="My trip" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First day">
          <input className={inputClass} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Number of days">
          <select className={inputClass} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {Array.from({ length: MAX_TRIP_DAYS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" variant="primary">
        Create trip
      </Button>
    </form>
  )
}
