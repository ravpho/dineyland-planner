import { useEffect, useState } from 'react'
import { selectedDay } from '../state/store'
import { monthOf } from '../domain/time'
import { usePlanner } from './PlannerContext'

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

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
