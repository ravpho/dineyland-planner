/** Clock times are minutes after midnight in park local time. */
export type Minutes = number

export function parseClock(hhmm: string): Minutes {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) throw new Error(`Invalid time "${hhmm}"`)
  return Number(m[1]) * 60 + Number(m[2])
}

export function formatClock(minutes: Minutes): string {
  const total = Math.round(minutes)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDuration(minutes: Minutes): string {
  const total = Math.round(minutes)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Month (1-12) of an ISO date string such as 2026-08-12. */
export function monthOf(isoDate: string): number {
  return Number(isoDate.slice(5, 7))
}
