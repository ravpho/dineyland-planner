import { useEffect, useMemo, useState } from 'react'
import { selectedDay, selectedTrip } from '../state/store'
import { plannedMarks, type PlannedMark } from '../domain/stops'
import { monthOf } from '../domain/time'
import { useCatalog, usePlanner } from './PlannerContext'

export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export const WIDE_QUERY = '(min-width: 1024px)'

export function useIsWide(): boolean {
  return useMediaQuery(WIDE_QUERY)
}

/** Month used for typical waits: the selected day's month, else the current month. */
export function usePlanningMonth(): number {
  const day = usePlanner(selectedDay)
  return day ? monthOf(day.date) : new Date().getMonth() + 1
}

/** Where each item is planned in the selected trip, and the selected day's number (plan-ui-improvements Decision 2). */
export function usePlannedMarks(): { marks: Map<string, PlannedMark>; dayNumber: number } {
  const catalog = useCatalog()
  const trip = usePlanner(selectedTrip)
  const day = usePlanner(selectedDay)
  return useMemo(() => ({ marks: plannedMarks(trip, day?.id, catalog), dayNumber: trip && day ? trip.days.indexOf(day) + 1 : 0 }), [trip, day, catalog])
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
