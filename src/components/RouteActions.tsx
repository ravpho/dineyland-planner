import { useCallback, useState } from 'react'
import { formatClock } from '../domain/time'
import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import type { OptimizeResult } from '../state/store'
import { useMediaQuery } from '../app/hooks'
import { Sparkle } from './Sparkle'
import { useToast } from './Toast'
import { Button } from './ui'

/** "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min", then each changed show time. */
export function optimizeMessage(result: Extract<OptimizeResult, { changed: true }>): string {
  const shows = result.showTimes.map((s) => ` · ${s.name} ${s.before} → ${s.after}`).join('')
  return `Route optimized · ends ${formatClock(result.endBefore)} → ${formatClock(result.endAfter)} · queues and walking ${result.queueWalkBefore} → ${result.queueWalkAfter} min${shows}`
}

/** Actions that reorder the day to cut walking and queueing (route-optimization spec). */
export function RouteActions({ day }: { day: Day }) {
  const groupDayByArea = usePlanner((s) => s.groupDayByArea)
  const optimizeDayRoute = usePlanner((s) => s.optimizeDayRoute)
  const undoRouteChange = usePlanner((s) => s.undoRouteChange)
  const toast = useToast()
  const [optimizing, setOptimizing] = useState(false)
  // A new key for each sparkle, so a second optimize plays it again; 0 when none is showing.
  const [sparkle, setSparkle] = useState(0)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const sparkleDone = useCallback(() => setSparkle(0), [])
  const tooFew = day.items.length < 2

  const group = () => {
    const result = groupDayByArea(day.id)
    if (result.changed) toast(`Grouped by area · walking ${result.walkBefore} → ${result.walkAfter} min`, { label: 'Undo', run: undoRouteChange })
    else toast('Already grouped by area')
  }

  const optimize = () => {
    setOptimizing(true)
    // Let the busy label paint before the search runs (optimize-day-route design Decision 8).
    setTimeout(() => {
      const result = optimizeDayRoute(day.id)
      setOptimizing(false)
      if (result.changed) {
        // The message and the sparkle come together: nothing waits for the animation (app-shell spec: Reduced motion).
        toast(optimizeMessage(result), { label: 'Undo', run: undoRouteChange })
        if (!reducedMotion) setSparkle((n) => n + 1)
      } else toast('No quicker order found')
    }, 0)
  }

  return (
    <div className="ml-auto flex justify-end gap-2">
      <Button onClick={group} disabled={tooFew || optimizing} className="disabled:cursor-not-allowed disabled:opacity-50">
        Group by area
      </Button>
      <span className="relative inline-flex">
        <Button onClick={optimize} disabled={tooFew || optimizing} className="disabled:cursor-not-allowed disabled:opacity-50">
          {optimizing ? 'Optimizing…' : 'Optimize route'}
        </Button>
        {sparkle > 0 && <Sparkle key={sparkle} onDone={sparkleDone} />}
      </span>
    </div>
  )
}
