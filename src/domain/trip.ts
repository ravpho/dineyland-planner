import type { ParkId } from './catalog'

/** One entry in a day. `key` is unique per entry, so the same attraction can appear twice. */
export interface PlanItem {
  key: string
  itemId: string
  /** Planned start time for shows, HH:MM. */
  showTime?: string
}

export interface Day {
  id: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  parkId: ParkId
  /** Available window, HH:MM. */
  start: string
  end: string
  items: PlanItem[]
}

export interface Trip {
  id: string
  name: string
  days: Day[]
}

export const MAX_TRIP_DAYS = 7

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
