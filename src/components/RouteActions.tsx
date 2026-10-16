import { useCallback, useState } from 'react'
import { formatClock } from '../domain/time'
import type { Day } from '../domain/trip'
import { usePlanner } from '../app/PlannerContext'
import type { OptimizeResult } from '../state/store'
import { useMediaQuery } from '../app/hooks'
import { SparkleIcon } from './icons'
import { Sparkle } from './Sparkle'
import { useToast } from './Toast'
import { Button } from './ui'
import { useOrderUndo } from '../app/useOrderUndo'

/** "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min", then each changed show time. */
export function optimizeMessage(result: Extract<OptimizeResult, { changed: true }>): string {
  const shows = result.showTimes.map((s) => ` · ${s.name} ${s.before} → ${s.after}`).join('')
  return `Route optimized · ends ${formatClock(result.endBefore)} → ${formatClock(result.endAfter)} · queues and walking ${result.queueWalkBefore} → ${result.queueWalkAfter} min${shows}`
}

/**
 * Actions that reorder the day to cut walking and queueing, under the day: Optimize route as its main action,
 * with Group by area below it (route-optimization spec; refresh-plan-layout design Decision 8).
 */
export function RouteActions({ day }: { day: Day }) {
  const groupDayByArea = usePlanner((s) => s.groupDayByArea)
  const optimizeDayRoute = usePlanner((s) => s.optimizeDayRoute)
  const undoFor = useOrderUndo()
  const toast = useToast()
  const [optimizing, setOptimizing] = useState(false)
  // A new key for each sparkle, so a second optimize plays it again; 0 when none is showing.
  const [sparkle, setSparkle] = useState(0)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const sparkleDone = useCallback(() => setSparkle(0), [])
  const tooFew = day.items.length < 2

  const group = () => {
    const result = groupDayByArea(day.id)
    if (result.changed) toast(`Grouped by area · walking ${result.walkBefore} → ${result.walkAfter} min`, { label: 'Undo', run: undoFor() })
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
        toast(optimizeMessage(result), { label: 'Undo', run: undoFor() })
        if (!reducedMotion) setSparkle((n) => n + 1)
      } else toast('No quicker order found')
    }, 0)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="relative flex">
        <Button variant="primary" onClick={optimize} disabled={tooFew || optimizing} className="min-h-12 w-full rounded-xl text-base disabled:cursor-not-allowed">
          <SparkleIcon width={14} height={14} className="text-star" />
          {optimizing ? 'Optimizing…' : 'Optimize route'}
        </Button>
        {sparkle > 0 && <Sparkle key={sparkle} onDone={sparkleDone} />}
      </span>
      <Button variant="ghost" onClick={group} disabled={tooFew || optimizing} className="text-accent underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
        Group by area
      </Button>
    </div>
  )
}
