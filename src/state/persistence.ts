import type { GroupProfile } from '../domain/suitability'
import type { Trip } from '../domain/trip'

export const STORAGE_KEY = 'dineyland-planner'
export const SCHEMA_VERSION = 2

/** What is saved on the device. Filters are session-only and not part of it. */
export interface SavedState {
  trips: Trip[]
  selectedTripId?: string
  selectedDayId?: string
  profile?: GroupProfile
}

interface Envelope {
  version: number
  state: unknown
}

/** Migrations from version N to N+1, keyed by N. Version 0 is the unversioned pre-release format. */
const MIGRATIONS: Record<number, (state: unknown) => unknown> = {
  0: (old) => {
    const o = (old ?? {}) as { trips?: Trip[]; profile?: GroupProfile }
    return { trips: Array.isArray(o.trips) ? o.trips : [], profile: o.profile }
  },
  // v2: days are no longer tied to one park.
  1: (old) => {
    const o = old as SavedState
    return {
      ...o,
      trips: (o.trips ?? []).map((trip) => ({
        ...trip,
        days: (trip.days ?? []).map((day) => {
          const { parkId: _dropped, ...rest } = day as typeof day & { parkId?: string }
          return rest
        }),
      })),
    }
  },
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; state: SavedState }
  /** Saved by a newer app version: left alone and never overwritten. */
  | { status: 'newer'; version: number }
  | { status: 'unavailable' }
  | { status: 'corrupt' }

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function storageWorks(storage: KeyValueStorage | undefined): storage is KeyValueStorage {
  if (!storage) return false
  try {
    storage.setItem(`${STORAGE_KEY}:probe`, '1')
    return storage.getItem(`${STORAGE_KEY}:probe`) === '1'
  } catch {
    return false
  }
}

export function loadState(storage: KeyValueStorage | undefined): LoadResult {
  if (!storageWorks(storage)) return { status: 'unavailable' }
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable' }
  }
  if (raw === null) return { status: 'empty' }
  try {
    const parsed = JSON.parse(raw) as Envelope | Record<string, unknown>
    let version = typeof parsed.version === 'number' ? parsed.version : 0
    let state: unknown = 'state' in parsed && typeof parsed.version === 'number' ? parsed.state : parsed
    if (version > SCHEMA_VERSION) return { status: 'newer', version }
    while (version < SCHEMA_VERSION) {
      const migrate = MIGRATIONS[version]
      if (!migrate) return { status: 'corrupt' }
      state = migrate(state)
      version++
    }
    const s = state as SavedState
    if (!Array.isArray(s?.trips)) return { status: 'corrupt' }
    return { status: 'loaded', state: s }
  } catch {
    return { status: 'corrupt' }
  }
}

export function saveState(storage: KeyValueStorage, state: SavedState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, state } satisfies Envelope))
    return true
  } catch {
    return false
  }
}
