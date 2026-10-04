import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Catalog } from '../domain/catalog'
import { DEFAULT_FILTERS, type CatalogFilters } from '../domain/filters'
import type { GroupProfile } from '../domain/suitability'
import { monthOf } from '../domain/time'
import { MAX_TRIP_DAYS, addDays, newId, type Day, type PlanItem, type Trip } from '../domain/trip'
import { loadState, saveState, type KeyValueStorage, type LoadResult, type SavedState } from './persistence'

export type AddResult = { ok: true; key: string } | { ok: false; reason: 'unknown-item' | 'no-day' }

export interface PlannerState extends SavedState {
  filters: CatalogFilters
  lastRemoved?: { tripId: string; dayId: string; entry: PlanItem; index: number }
  storage: LoadResult['status'] | 'ok'

  /** `dayCount` defaults to 1. */
  createTrip(name: string, startDate: string, dayCount?: number): string
  renameTrip(tripId: string, name: string): void
  deleteTrip(tripId: string): void
  selectTrip(tripId: string): void
  selectDay(dayId: string): void
  setTripLength(tripId: string, dayCount: number): void
  setDayWindow(dayId: string, start: string, end: string): void
  addItem(dayId: string, itemId: string, options?: { index?: number; showTime?: string }): AddResult
  removeItem(dayId: string, key: string): void
  undoRemove(): void
  moveItem(dayId: string, from: number, to: number): void
  setShowTime(dayId: string, key: string, time: string): void
  importTrip(trip: Trip): void
  setProfile(profile: GroupProfile | undefined): void
  setFilters(filters: Partial<CatalogFilters>): void
  /** Resets park (back to both parks), area, type and search. Keeps the profile, sort and hide setting. */
  clearFilters(): void
}

export type PlannerStore = StoreApi<PlannerState>

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

export function createPlannerStore(catalog: Catalog, storage?: KeyValueStorage): PlannerStore {
  const items = new Map(catalog.items.map((i) => [i.id, i]))
  const loaded = loadState(storage)
  const saved: SavedState = loaded.status === 'loaded' ? loaded.state : { trips: [] }

  /** A new day's window spans both parks: earliest opening to latest closing that month. */
  function newDay(date: string): Day {
    const hours = catalog.parks.map((p) => p.hours[monthOf(date) - 1]!)
    const start = hours.map((h) => h.open).sort()[0]!
    const end = hours.map((h) => h.close).sort().at(-1)!
    return { id: newId(), date, start, end, items: [] }
  }

  const store = createStore<PlannerState>()((set, get) => {
    /** Applies `fn` to the trip that holds `dayId`. */
    const updateDay = (dayId: string, fn: (day: Day) => Day) =>
      set((s) => ({ trips: s.trips.map((t) => ({ ...t, days: t.days.map((d) => (d.id === dayId ? fn(d) : d)) })) }))
    const findDay = (dayId: string) => {
      for (const trip of get().trips) {
        const day = trip.days.find((d) => d.id === dayId)
        if (day) return { trip, day }
      }
      return undefined
    }

    return {
      ...saved,
      filters: DEFAULT_FILTERS,
      storage: loaded.status === 'loaded' || loaded.status === 'empty' ? 'ok' : loaded.status,

      createTrip(name, startDate, dayCount = 1) {
        const count = clamp(Math.round(dayCount), 1, MAX_TRIP_DAYS)
        const trip: Trip = { id: newId(), name: name.trim() || 'My trip', days: Array.from({ length: count }, (_, i) => newDay(addDays(startDate, i))) }
        set((s) => ({ trips: [...s.trips, trip], selectedTripId: trip.id, selectedDayId: trip.days[0]!.id }))
        return trip.id
      },
      renameTrip(tripId, name) {
        set((s) => ({ trips: s.trips.map((t) => (t.id === tripId ? { ...t, name: name.trim() || t.name } : t)) }))
      },
      deleteTrip(tripId) {
        set((s) => {
          const trips = s.trips.filter((t) => t.id !== tripId)
          const selected = s.selectedTripId === tripId ? trips[0] : s.trips.find((t) => t.id === s.selectedTripId)
          return { trips, selectedTripId: selected?.id, selectedDayId: selected?.days.some((d) => d.id === s.selectedDayId) ? s.selectedDayId : selected?.days[0]?.id }
        })
      },
      selectTrip(tripId) {
        const trip = get().trips.find((t) => t.id === tripId)
        if (trip) set({ selectedTripId: trip.id, selectedDayId: trip.days[0]?.id })
      },
      selectDay(dayId) {
        const found = findDay(dayId)
        if (found) set({ selectedTripId: found.trip.id, selectedDayId: dayId })
      },
      setTripLength(tripId, dayCount) {
        const count = clamp(Math.round(dayCount), 1, MAX_TRIP_DAYS)
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t
            if (count <= t.days.length) return { ...t, days: t.days.slice(0, count) }
            const last = t.days[t.days.length - 1]!
            const extra = Array.from({ length: count - t.days.length }, (_, i) => newDay(addDays(last.date, i + 1)))
            return { ...t, days: [...t.days, ...extra] }
          }),
        }))
        const s = get()
        const trip = s.trips.find((t) => t.id === tripId)
        if (trip && s.selectedTripId === tripId && !trip.days.some((d) => d.id === s.selectedDayId)) set({ selectedDayId: trip.days.at(-1)!.id })
      },
      setDayWindow(dayId, start, end) {
        updateDay(dayId, (d) => ({ ...d, start, end }))
      },
      addItem(dayId, itemId, options = {}) {
        const found = findDay(dayId)
        if (!found) return { ok: false, reason: 'no-day' }
        const item = items.get(itemId)
        if (!item) return { ok: false, reason: 'unknown-item' }
        const entry: PlanItem = { key: newId(), itemId }
        if (item.type === 'show') entry.showTime = options.showTime ?? item.times[0]
        updateDay(dayId, (d) => {
          const list = [...d.items]
          list.splice(clamp(options.index ?? list.length, 0, list.length), 0, entry)
          return { ...d, items: list }
        })
        return { ok: true, key: entry.key }
      },
      removeItem(dayId, key) {
        const found = findDay(dayId)
        const index = found?.day.items.findIndex((e) => e.key === key) ?? -1
        if (!found || index < 0) return
        set({ lastRemoved: { tripId: found.trip.id, dayId, entry: found.day.items[index]!, index } })
        updateDay(dayId, (d) => ({ ...d, items: d.items.filter((e) => e.key !== key) }))
      },
      undoRemove() {
        const removed = get().lastRemoved
        if (!removed || !findDay(removed.dayId)) return
        updateDay(removed.dayId, (d) => {
          const list = [...d.items]
          list.splice(clamp(removed.index, 0, list.length), 0, removed.entry)
          return { ...d, items: list }
        })
        set({ lastRemoved: undefined })
      },
      moveItem(dayId, from, to) {
        updateDay(dayId, (d) => {
          if (from < 0 || from >= d.items.length) return d
          const list = [...d.items]
          const [moved] = list.splice(from, 1)
          list.splice(clamp(to, 0, list.length), 0, moved!)
          return { ...d, items: list }
        })
      },
      setShowTime(dayId, key, time) {
        updateDay(dayId, (d) => ({ ...d, items: d.items.map((e) => (e.key === key ? { ...e, showTime: time } : e)) }))
      },
      importTrip(trip) {
        set((s) => ({ trips: [...s.trips, trip], selectedTripId: trip.id, selectedDayId: trip.days[0]?.id }))
      },
      setProfile(profile) {
        const empty = !profile || (profile.heightCm === undefined && profile.maxThrill === undefined && profile.maxScare === undefined)
        set({ profile: empty ? undefined : profile })
      },
      setFilters(filters) {
        set((s) => ({ filters: { ...s.filters, ...filters } }))
      },
      clearFilters() {
        set((s) => ({ filters: { ...DEFAULT_FILTERS, sort: s.filters.sort, hideUnsuitable: s.filters.hideUnsuitable } }))
      },
    }
  })

  // Save after every change, unless storage is unusable or holds data from a newer version.
  if (storage && store.getState().storage === 'ok') {
    let previous: SavedState | undefined
    store.subscribe((s) => {
      const next: SavedState = { trips: s.trips, selectedTripId: s.selectedTripId, selectedDayId: s.selectedDayId, profile: s.profile }
      if (previous && next.trips === previous.trips && next.selectedTripId === previous.selectedTripId && next.selectedDayId === previous.selectedDayId && next.profile === previous.profile) return
      previous = next
      saveState(storage, next)
    })
  }
  return store
}

export function selectedTrip(s: PlannerState): Trip | undefined {
  return s.trips.find((t) => t.id === s.selectedTripId) ?? s.trips[0]
}

export function selectedDay(s: PlannerState): Day | undefined {
  const trip = selectedTrip(s)
  return trip?.days.find((d) => d.id === s.selectedDayId) ?? trip?.days[0]
}
