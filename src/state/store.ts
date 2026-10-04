import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Catalog, ParkId } from '../domain/catalog'
import { DEFAULT_FILTERS, type CatalogFilters } from '../domain/filters'
import { groupByArea } from '../domain/grouping'
import { searchRoute } from '../domain/optimize'
import { scheduleDay } from '../domain/schedule'
import type { GroupProfile } from '../domain/suitability'
import { monthOf } from '../domain/time'
import { MAX_TRIP_DAYS, addDays, newId, type Day, type PlanItem, type Trip } from '../domain/trip'
import { loadState, saveState, type KeyValueStorage, type LoadResult, type SavedState } from './persistence'

export type CatalogView = 'list' | 'map'

export type AddResult = { ok: true; key: string } | { ok: false; reason: 'unknown-item' | 'no-day' }

/** Walking minutes are the day's timeline totals before and after grouping. */
export type GroupResult = { changed: false } | { changed: true; walkBefore: number; walkAfter: number }

/** A show whose start time optimizing changed. */
export interface ShowTimeChange {
  name: string
  before: string
  after: string
}

/** The day's end and its queueing plus walking minutes, from the timeline, before and after optimizing. */
export type OptimizeResult =
  | { changed: false }
  | { changed: true; endBefore: number; endAfter: number; queueWalkBefore: number; queueWalkAfter: number; showTimes: ShowTimeChange[] }

export interface PlannerState extends SavedState {
  filters: CatalogFilters
  lastRemoved?: { tripId: string; dayId: string; entry: PlanItem; index: number }
  /**
   * Session only (optimize-day-route design Decision 7). Written by grouping, optimizing and swapping a
   * restaurant; `changed` is the day's items array right after the change.
   */
  lastRouteChange?: { dayId: string; previous: PlanItem[]; changed: PlanItem[] }
  storage: LoadResult['status'] | 'ok'
  /** Session only, not saved (design Decision 6). */
  catalogView: CatalogView
  /** The park chosen on the map while the filter lists both parks. */
  mapParkId?: ParkId

  /** `dayCount` defaults to 1. */
  createTrip(name: string, startDate: string, dayCount?: number): string
  renameTrip(tripId: string, name: string): void
  deleteTrip(tripId: string): void
  selectTrip(tripId: string): void
  selectDay(dayId: string): void
  setTripLength(tripId: string, dayCount: number): void
  setDayWindow(dayId: string, start: string, end: string): void
  addItem(dayId: string, itemId: string, options?: { index?: number; showTime?: string; mealTime?: string }): AddResult
  removeItem(dayId: string, key: string): void
  undoRemove(): void
  moveItem(dayId: string, from: number, to: number): void
  setShowTime(dayId: string, key: string, time: string): void
  /** Sets or clears (undefined) a restaurant's meal time. */
  setMealTime(dayId: string, key: string, time: string | undefined): void
  /** Locks a show's time so optimizing keeps it. */
  setShowLock(dayId: string, key: string, locked: boolean): void
  /** Reorders the day by park and area, keeping meals and shows at their time. */
  groupDayByArea(dayId: string): GroupResult
  /** Reorders the day, and picks unlocked show times, so it ends as early as the search can find. */
  optimizeDayRoute(dayId: string): OptimizeResult
  /** Replaces a restaurant in place, keeping its key and meal time. Returns false when nothing changed. */
  swapRestaurant(dayId: string, key: string, itemId: string): boolean
  /** Undoes the last grouping, optimizing or restaurant swap, unless the day's items changed since. */
  undoRouteChange(): void
  importTrip(trip: Trip): void
  setProfile(profile: GroupProfile | undefined): void
  setFilters(filters: Partial<CatalogFilters>): void
  /** Resets park (back to both parks), area, type and search. Keeps the profile, sort and hide setting. */
  clearFilters(): void
  setCatalogView(view: CatalogView): void
  /** Shows `parkId` on the map; a single-park filter follows it. */
  setMapPark(parkId: ParkId): void
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
      catalogView: 'list',
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
        if (item.type === 'restaurant' && options.mealTime) entry.mealTime = options.mealTime
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
      setMealTime(dayId, key, time) {
        updateDay(dayId, (d) => ({
          ...d,
          items: d.items.map((e) => {
            if (e.key !== key) return e
            const { mealTime: _old, ...rest } = e
            return time ? { ...rest, mealTime: time } : rest
          }),
        }))
      },
      setShowLock(dayId, key, locked) {
        updateDay(dayId, (d) => ({
          ...d,
          items: d.items.map((e) => {
            if (e.key !== key) return e
            const { timeLocked: _old, ...rest } = e
            return locked ? { ...rest, timeLocked: true } : rest
          }),
        }))
      },
      groupDayByArea(dayId) {
        const day = findDay(dayId)?.day
        if (!day) return { changed: false }
        const grouped = groupByArea(day, catalog)
        if (grouped.every((e, i) => e === day.items[i])) return { changed: false }
        updateDay(dayId, (d) => ({ ...d, items: grouped }))
        set({ lastRouteChange: { dayId, previous: day.items, changed: grouped } })
        const walking = (items: PlanItem[]) => scheduleDay({ ...day, items }, catalog).breakdown.walking
        return { changed: true, walkBefore: walking(day.items), walkAfter: walking(grouped) }
      },
      optimizeDayRoute(dayId) {
        const day = findDay(dayId)?.day
        if (!day) return { changed: false }
        const optimized = searchRoute(day, catalog).items
        if (optimized.length === day.items.length && optimized.every((e, i) => e === day.items[i])) return { changed: false }
        updateDay(dayId, (d) => ({ ...d, items: optimized }))
        set({ lastRouteChange: { dayId, previous: day.items, changed: optimized } })
        const before = scheduleDay(day, catalog)
        const after = scheduleDay({ ...day, items: optimized }, catalog)
        const previous = new Map(day.items.map((e) => [e.key, e]))
        const showTimes = optimized.flatMap((e) => {
          const item = items.get(e.itemId)
          const old = previous.get(e.key)
          if (item?.type !== 'show' || !old) return []
          const [was, now] = [old.showTime ?? item.times[0]!, e.showTime ?? item.times[0]!]
          return was === now ? [] : [{ name: item.name, before: was, after: now }]
        })
        return {
          changed: true,
          endBefore: before.end,
          endAfter: after.end,
          queueWalkBefore: before.breakdown.queueing + before.breakdown.walking,
          queueWalkAfter: after.breakdown.queueing + after.breakdown.walking,
          showTimes,
        }
      },
      swapRestaurant(dayId, key, itemId) {
        const day = findDay(dayId)?.day
        const entry = day?.items.find((e) => e.key === key)
        if (!day || !entry || entry.itemId === itemId || items.get(itemId)?.type !== 'restaurant' || items.get(entry.itemId)?.type !== 'restaurant') return false
        const swapped = day.items.map((e) => (e === entry ? { ...e, itemId } : e))
        updateDay(dayId, (d) => ({ ...d, items: swapped }))
        set({ lastRouteChange: { dayId, previous: day.items, changed: swapped } })
        return true
      },
      undoRouteChange() {
        const last = get().lastRouteChange
        if (!last) return
        // Any edit to the day's items replaces its array, so this only undoes an untouched change.
        if (findDay(last.dayId)?.day.items === last.changed) updateDay(last.dayId, (d) => ({ ...d, items: last.previous }))
        set({ lastRouteChange: undefined })
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
      setCatalogView(view) {
        set({ catalogView: view })
      },
      setMapPark(parkId) {
        set((s) => {
          if (s.filters.parkId === 'all') return { mapParkId: parkId }
          // Area filters belong to one park, so they go with the old park.
          return { mapParkId: parkId, filters: { ...s.filters, parkId, areaIds: [] } }
        })
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

/**
 * The park the map shows: the single-park filter, else the park chosen on the map, else the park of
 * the selected day's last item, else Disneyland Park.
 */
export function mapPark(s: PlannerState, catalog: Catalog): ParkId {
  if (s.filters.parkId !== 'all') return s.filters.parkId
  if (s.mapParkId) return s.mapParkId
  const parks = new Map(catalog.items.map((i) => [i.id, i.parkId]))
  const last = [...(selectedDay(s)?.items ?? [])].reverse().find((e) => parks.has(e.itemId))
  return (last && parks.get(last.itemId)) ?? 'dlp'
}
