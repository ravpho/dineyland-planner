import { useId, useMemo, useState } from 'react'
import type { ParkId } from '../domain/catalog'
import { parkOrder, switchParks } from '../domain/parkOrder'
import type { Day } from '../domain/trip'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { useToast } from './Toast'
import { Button, Sheet } from './ui'

/**
 * The order in which the day's attractions visit the parks, with "Switch order" when each park's
 * attractions are together (trip-itinerary spec, plan-ui-improvements design Decision 11).
 */
export function ParkOrder({ day }: { day: Day }) {
  const catalog = useCatalog()
  const switchParkOrder = usePlanner((s) => s.switchParkOrder)
  const undoRouteChange = usePlanner((s) => s.undoRouteChange)
  const toast = useToast()
  const hintId = useId()
  const [confirming, setConfirming] = useState(false)
  const order = useMemo(() => parkOrder(day, catalog), [day, catalog])
  const preview = useMemo(() => switchParks(day, catalog), [day, catalog])
  if (order.length < 2) return null

  const parkName = (id: ParkId) => catalog.parks.find((p) => p.id === id)!.name
  const removed = (preview?.removed ?? []).map((e) => {
    const item = catalog.items.find((i) => i.id === e.itemId)!
    const time = item.type === 'show' ? (e.showTime ?? item.times[0]) : e.mealTime
    return { key: e.key, text: time ? `${item.name} (${time})` : item.name }
  })

  const switchOrder = () => {
    setConfirming(false)
    const result = switchParkOrder(day.id)
    if (result.changed) toast(`${parkName(result.firstPark)} first${result.removed ? ` · ${result.removed} removed` : ''}`, { label: 'Undo', run: undoRouteChange })
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1" data-testid="park-order">
      <p className="min-w-0">
        Park order: <strong data-testid="park-order-text">{order.map(parkName).join(' → ')}</strong>
      </p>
      <Button
        onClick={() => (removed.length ? setConfirming(true) : switchOrder())}
        disabled={!preview}
        aria-describedby={preview ? undefined : hintId}
        className="ml-auto disabled:cursor-not-allowed disabled:opacity-50"
      >
        Switch order
      </Button>
      {!preview && (
        <p id={hintId} className="w-full text-xs text-indigo-800" data-testid="park-order-hint">
          Group by area first so each park&apos;s attractions are together, then you can switch the order.
        </p>
      )}
      {confirming && preview && (
        <Sheet title={`Start in ${parkName(preview.firstPark)}?`} onClose={() => setConfirming(false)}>
          <p className="text-sm text-slate-700">Meals and shows are removed when you switch the park order:</p>
          <ul className="my-3 list-disc pl-5 text-sm text-slate-900" data-testid="switch-removed">
            {removed.map((r) => (
              <li key={r.key}>{r.text}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="danger" onClick={switchOrder}>
              Switch and remove {removed.length}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
