import type { PlannedMark } from '../domain/stops'
import { CheckIcon } from './icons'
import { plannedLabel } from './labels'
import { Badge } from './ui'

/** "In Day 1 · stop 4" for the selected day, and a muted "Also in Day 3" or "In Day 3" for other days. */
export function PlannedLabel({ mark, dayNumber }: { mark: PlannedMark | undefined; dayNumber: number }) {
  if (!mark) return null
  const { strong, muted } = plannedLabel(mark, dayNumber)
  return (
    <>
      {strong && (
        <Badge tone="planned">
          <span className="inline-flex items-center gap-1" data-testid="planned-label">
            <CheckIcon width={12} height={12} strokeWidth={3} /> {strong}
          </span>
        </Badge>
      )}
      {muted && (
        <Badge>
          <span data-testid="planned-other-days">{muted}</span>
        </Badge>
      )}
    </>
  )
}
