import { describe, expect, test } from 'vitest'
import { sampleCatalog } from '../test/sampleCatalog'
import { STORAGE_KEY, type KeyValueStorage } from './persistence'
import { createPlannerStore, selectedDay, selectedTrip } from './store'

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

const setup = (storage?: KeyValueStorage) => {
  const store = createPlannerStore(sampleCatalog, storage)
  const tripId = store.getState().createTrip('Summer trip', '2026-08-12', 3)
  const day = () => selectedDay(store.getState())!
  return { store, tripId, day, s: () => store.getState() }
}
const ids = (items: { itemId: string }[]) => items.map((i) => i.itemId)

describe('trips (trip-itinerary spec)', () => {
  test('a 3-day trip starting 12 August has days for 12, 13 and 14 August', () => {
    const { s } = setup()
    expect(selectedTrip(s())!.days.map((d) => d.date)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14'])
  })

  test('new days default to Disneyland Park and its typical hours for the month', () => {
    const { day } = setup()
    expect(day().parkId).toBe('dlp')
    expect(day().start).toBe(sampleCatalog.parks[0]!.hours[7]!.open)
    expect(day().end).toBe(sampleCatalog.parks[0]!.hours[7]!.close)
  })

  test('trip length is limited to 1-7 days, and shrinking drops the last days', () => {
    const { s, tripId } = setup()
    s().setTripLength(tripId, 2)
    expect(selectedTrip(s())!.days.map((d) => d.date)).toEqual(['2026-08-12', '2026-08-13'])
    s().setTripLength(tripId, 30)
    expect(selectedTrip(s())!.days).toHaveLength(7)
    expect(selectedTrip(s())!.days.at(-1)!.date).toBe('2026-08-18')
    const other = s().createTrip('x', '2026-01-01', 0)
    expect(s().trips.find((t) => t.id === other)!.days).toHaveLength(1)
  })

  test('switch, rename and delete trips', () => {
    const { s, tripId } = setup()
    const second = s().createTrip('Winter', '2026-12-20', 2)
    expect(selectedTrip(s())!.id).toBe(second)
    s().selectTrip(tripId)
    expect(selectedTrip(s())!.name).toBe('Summer trip')
    s().renameTrip(tripId, 'August')
    expect(selectedTrip(s())!.name).toBe('August')
    s().deleteTrip(tripId)
    expect(s().trips.map((t) => t.id)).toEqual([second])
    expect(selectedTrip(s())!.id).toBe(second)
  })

  test('set my own hours', () => {
    const { s, day } = setup()
    s().setDayWindow(day().id, '10:00', '18:00')
    expect([day().start, day().end]).toEqual(['10:00', '18:00'])
  })

  test('tap to add appends; drag adds at a position', () => {
    const { s, day } = setup()
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    s().addItem(day().id, 'dlp.phantom-manor')
    s().addItem(day().id, 'dlp.peter-pans-flight')
    s().addItem(day().id, 'dlp.star-wars-hyperspace-mountain', { index: 2 })
    expect(ids(day().items)).toEqual(['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.star-wars-hyperspace-mountain', 'dlp.peter-pans-flight'])
  })

  test('an item from the other park is not added', () => {
    const { s, day } = setup()
    expect(s().addItem(day().id, 'daw.avengers-flight-force')).toEqual({ ok: false, reason: 'other-park' })
    expect(day().items).toHaveLength(0)
  })

  test('the same attraction can be added twice', () => {
    const { s, day } = setup()
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    expect(ids(day().items)).toEqual(['dlp.big-thunder-mountain', 'dlp.big-thunder-mountain'])
    expect(day().items[0]!.key).not.toBe(day().items[1]!.key)
  })

  test('a show takes the chosen start time and can be changed later', () => {
    const { s, day } = setup()
    const added = s().addItem(day().id, 'dlp.parade', { showTime: '17:30' })
    expect(day().items[0]!.showTime).toBe('17:30')
    s().setShowTime(day().id, (added as { key: string }).key, '13:30')
    expect(day().items[0]!.showTime).toBe('13:30')
    s().addItem(day().id, 'dlp.parade')
    expect(day().items[1]!.showTime).toBe('13:30') // first typical time by default
  })

  test('changing the park removes items from the previous park', () => {
    const { s, day } = setup()
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    s().setDayPark(day().id, 'daw')
    expect(day().parkId).toBe('daw')
    expect(day().items).toHaveLength(0)
  })

  test('move up, move down and drag reorder', () => {
    const { s, day } = setup()
    for (const id of ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight']) s().addItem(day().id, id)
    s().moveItem(day().id, 2, 1)
    expect(ids(day().items)).toEqual(['dlp.big-thunder-mountain', 'dlp.peter-pans-flight', 'dlp.phantom-manor'])
    s().moveItem(day().id, 0, 2)
    expect(ids(day().items)).toEqual(['dlp.peter-pans-flight', 'dlp.phantom-manor', 'dlp.big-thunder-mountain'])
  })

  test('remove and undo restores the previous position', () => {
    const { s, day } = setup()
    for (const id of ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight']) s().addItem(day().id, id)
    s().removeItem(day().id, day().items[1]!.key)
    expect(ids(day().items)).toEqual(['dlp.big-thunder-mountain', 'dlp.peter-pans-flight'])
    s().undoRemove()
    expect(ids(day().items)).toEqual(['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight'])
    expect(s().lastRemoved).toBeUndefined()
  })

  test('importing adds a new trip and leaves existing trips unchanged', () => {
    const { s, tripId } = setup()
    const before = structuredClone(s().trips.find((t) => t.id === tripId))
    s().importTrip({ id: 'imported', name: 'Shared', days: [{ id: 'x', date: '2026-09-01', parkId: 'daw', start: '09:30', end: '20:00', items: [] }] })
    expect(s().trips).toHaveLength(2)
    expect(s().trips.find((t) => t.id === tripId)).toEqual(before)
    expect(selectedTrip(s())!.id).toBe('imported')
  })
})

describe('saving on the device', () => {
  test('a new store reads back exactly what was saved', () => {
    const storage = new MemoryStorage()
    const { s, day } = setup(storage)
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    s().setProfile({ heightCm: 110 })
    const reopened = createPlannerStore(sampleCatalog, storage).getState()
    expect(reopened.trips).toEqual(s().trips)
    expect(reopened.selectedDayId).toBe(s().selectedDayId)
    expect(reopened.profile).toEqual({ heightCm: 110 })
  })

  test('migrates the unversioned v0 format', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify({ trips: [{ id: 'old', name: 'Old trip', days: [] }], profile: { heightCm: 95 } }))
    const state = createPlannerStore(sampleCatalog, storage).getState()
    expect(state.trips.map((t) => t.name)).toEqual(['Old trip'])
    expect(state.profile).toEqual({ heightCm: 95 })
    expect(state.storage).toBe('ok')
  })

  test('unavailable storage is reported and the app still works in memory', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    const { s, day } = setup(broken)
    expect(s().storage).toBe('unavailable')
    s().addItem(day().id, 'dlp.big-thunder-mountain')
    expect(day().items).toHaveLength(1)
  })

  test('data saved by a newer version is left alone', () => {
    const storage = new MemoryStorage()
    const future = JSON.stringify({ version: 99, state: { trips: [], somethingNew: true } })
    storage.setItem(STORAGE_KEY, future)
    const { s } = setup(storage)
    expect(s().storage).toBe('newer')
    expect(storage.getItem(STORAGE_KEY)).toBe(future)
  })

  test('corrupt data is reported and not overwritten', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    const { s } = setup(storage)
    expect(s().storage).toBe('corrupt')
    expect(storage.getItem(STORAGE_KEY)).toBe('{not json')
  })
})

describe('group profile and filters', () => {
  test('the profile is saved; filters are session only', () => {
    const storage = new MemoryStorage()
    const { s } = setup(storage)
    s().setProfile({ heightCm: 110, maxThrill: 3, maxScare: 1 })
    s().setFilters({ query: 'thunder', types: ['attraction'] })
    const reopened = createPlannerStore(sampleCatalog, storage).getState()
    expect(reopened.profile).toEqual({ heightCm: 110, maxThrill: 3, maxScare: 1 })
    expect(reopened.filters.query).toBe('')
  })

  test('clear filters resets park, area, type and search and keeps the profile', () => {
    const { s } = setup()
    s().setProfile({ heightCm: 110 })
    s().setFilters({ parkId: 'daw', areaIds: ['avengers-campus'], types: ['attraction'], query: 'x', sort: 'rating' })
    s().clearFilters('dlp')
    expect(s().filters).toMatchObject({ parkId: 'dlp', areaIds: [], types: [], query: '', sort: 'rating' })
    expect(s().profile).toEqual({ heightCm: 110 })
  })

  test('clearing the profile removes all limits', () => {
    const { s } = setup()
    s().setProfile({ heightCm: 110 })
    s().setProfile(undefined)
    expect(s().profile).toBeUndefined()
    s().setProfile({})
    expect(s().profile).toBeUndefined()
  })
})
