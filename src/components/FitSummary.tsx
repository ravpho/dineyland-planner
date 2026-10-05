import type { DaySchedule } from '../domain/schedule'
import { formatClock, formatDuration } from '../domain/time'
import type { Day } from '../domain/trip'
import { ParkOrder } from './ParkOrder'

export function fitText(schedule: DaySchedule): string {
  return schedule.fits ? `Fits · ${formatDuration(schedule.spare)} spare` : `Over by ${schedule.over} min`
}

/** Pinned bar with the fit status. Fixed to the bottom on phones, inline on wide screens. */
export function FitBar({ schedule }: { schedule: DaySchedule }) {
  return (
    <div
      data-testid="fit-summary"
      role="status"
      className={`fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:sticky lg:bottom-0 lg:rounded-xl lg:border ${schedule.fits ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <strong className="text-base">{fitText(schedule)}</strong>
        <span className="text-sm">
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
    <details className="rounded-xl border border-slate-200 bg-white p-3" data-testid="breakdown">
      <summary className="min-h-11 cursor-pointer content-center font-medium text-slate-900">Where the day goes</summary>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([label, minutes]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-medium text-slate-900">{formatDuration(minutes)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/** Shown when a day's items span both parks, with the attractions' park order and "Switch order". */
export function TicketReminder({ schedule, day }: { schedule: DaySchedule; day: Day }) {
  if (schedule.parks.length < 2) return null
  return (
    <div role="note" data-testid="ticket-reminder" className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
      <p>This day uses both parks: you need a ticket valid for Disneyland Park and Disney Adventure World on the same day.</p>
      <ParkOrder day={day} />
    </div>
  )
}
