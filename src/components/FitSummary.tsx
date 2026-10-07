import type { DaySchedule } from '../domain/schedule'
import { formatClock, formatDuration } from '../domain/time'
import type { Day } from '../domain/trip'
import { SparkleIcon, TicketIcon } from './icons'
import { ParkOrder } from './ParkOrder'

export function fitText(schedule: DaySchedule): string {
  return schedule.fits ? `Fits · ${formatDuration(schedule.spare)} spare` : `Over by ${schedule.over} min`
}

/**
 * Pinned navy bar with the fit status. Fixed to the bottom on phones, inline on wide screens. The status
 * keeps its words, so it never relies on color alone (app-shell spec: Readable colors).
 */
export function FitBar({ schedule }: { schedule: DaySchedule }) {
  return (
    <div
      data-testid="fit-summary"
      data-fits={schedule.fits}
      role="status"
      className="fixed inset-x-0 bottom-0 z-30 bg-sky px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-on-sky shadow-[0_-4px_16px_rgb(6_11_31/0.25)] lg:sticky lg:bottom-0 lg:rounded-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <strong className={`flex items-center gap-2 whitespace-nowrap text-base ${schedule.fits ? 'text-fits-on-sky' : 'text-over-on-sky'}`}>
          {schedule.fits && <SparkleIcon width={14} height={14} className="shrink-0 text-star" />}
          {fitText(schedule)}
        </strong>
        <span className="text-right text-xs text-on-sky-muted tabular-nums sm:text-sm">
          {formatClock(schedule.windowStart)}–{formatClock(schedule.windowEnd)} · ends {formatClock(schedule.end)}
        </span>
      </div>
    </div>
  )
}

export function Breakdown({ schedule }: { schedule: DaySchedule }) {
  const b = schedule.breakdown
  const rows: [string, number][] = [
    ['Queueing', b.queueing],
    ['Attractions', b.attractions],
    ['Meals', b.meals],
    ['Shows', b.shows],
    ['Walking', b.walking],
    ['Free time', b.free],
  ]
  return (
    <details className="rounded-xl border border-line bg-surface p-3 shadow-card" data-testid="breakdown">
      <summary className="min-h-11 cursor-pointer content-center font-medium text-ink">Where the day goes</summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([label, minutes]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium text-ink tabular-nums">{formatDuration(minutes)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/**
 * Compact note shown when a day's items span both parks, with the attractions' park order and "Switch order"
 * (midnight-theme design Decision 7).
 */
export function TicketReminder({ schedule, day }: { schedule: DaySchedule; day: Day }) {
  if (schedule.parks.length < 2) return null
  return (
    <div role="note" data-testid="ticket-reminder" className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink">
      <p className="flex gap-2">
        <TicketIcon width={18} height={18} className="mt-px shrink-0 text-accent" />
        <span>You need a ticket valid for Disneyland Park and Disney Adventure World on the same day.</span>
      </p>
      <ParkOrder day={day} />
    </div>
  )
}
