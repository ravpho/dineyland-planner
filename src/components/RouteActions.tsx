import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import { useToast } from './Toast'
import { Button } from './ui'

/** Actions that reorder the day to cut walking (route-optimization spec). */
export function RouteActions({ day }: { day: Day }) {
  const groupDayByArea = usePlanner((s) => s.groupDayByArea)
  const undoGroup = usePlanner((s) => s.undoGroup)
  const toast = useToast()

  const group = () => {
    const result = groupDayByArea(day.id)
    if (result.changed) toast(`Grouped by area · walking ${result.walkBefore} → ${result.walkAfter} min`, { label: 'Undo', run: undoGroup })
    else toast('Already grouped by area')
  }

  return (
    <div className="flex justify-end">
      <Button onClick={group} disabled={day.items.length < 2} className="disabled:cursor-not-allowed disabled:opacity-50">
        Group by area
      </Button>
    </div>
  )
}
