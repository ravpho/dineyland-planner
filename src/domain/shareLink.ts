import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { z } from 'zod'
import { PARK_IDS, type CatalogItem } from './catalog'
import { MAX_TRIP_DAYS, newId, type Trip } from './trip'

/**
 * Compact share format (design Decision 9). Each item id is replaced by a 5-character code
 * (a hash of the id), which the receiving app maps back using its catalog. Codes it does not
 * know become "missing:<code>" entries that the plan shows as "No longer available".
 *
 * v3 (optimize-day-route design Decision 6): an item is [code], [code, time] or [code, time, 1].
 * The time is a show's start or a restaurant's meal time, told apart by the item's type, and 1 marks
 * a locked show time.
 */
const clock = z.string().regex(/^\d{2}:\d{2}$/)

const sharedTripSchema = z.object({
  // v1 links (one park per day) carry `p`, which is ignored since days combine parks (v2).
  v: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  n: z.string().max(200),
  d: z
    .array(
      z.object({
        t: z.iso.date(),
        p: z.enum(PARK_IDS).optional(),
        s: clock,
        e: clock,
        i: z.array(z.union([z.tuple([z.string().min(1)]), z.tuple([z.string().min(1), clock]), z.tuple([z.string().min(1), clock, z.literal(1)])])),
      }),
    )
    .min(1)
    .max(MAX_TRIP_DAYS),
})

type SharedTrip = z.infer<typeof sharedTripSchema>

/** FNV-1a 32-bit hash of the id, as 5 base-36 characters. */
export function itemCode(itemId: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < itemId.length; i++) {
    hash ^= itemId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return (hash % 36 ** 5).toString(36).padStart(5, '0')
}

export const MISSING_PREFIX = 'missing:'

export function encodeTrip(trip: Trip): string {
  const shared: SharedTrip = {
    v: 3,
    n: trip.name,
    d: trip.days.map((day) => ({
      t: day.date,
      s: day.start,
      e: day.end,
      i: day.items.map((entry) => {
        const code = entry.itemId.startsWith(MISSING_PREFIX) ? entry.itemId.slice(MISSING_PREFIX.length) : itemCode(entry.itemId)
        const time = entry.showTime ?? entry.mealTime
        if (!time) return [code]
        return entry.timeLocked ? [code, time, 1] : [code, time]
      }),
    })),
  }
  return compressToEncodedURIComponent(JSON.stringify(shared))
}

/** Returns a new trip with fresh ids, or null when the data cannot be read. */
export function decodeTrip(data: string, catalogItems: readonly Pick<CatalogItem, 'id' | 'type'>[]): Trip | null {
  const byCode = new Map(catalogItems.map((i) => [itemCode(i.id), i.id]))
  const restaurants = new Set(catalogItems.filter((i) => i.type === 'restaurant').map((i) => i.id))
  try {
    const json = decompressFromEncodedURIComponent(data)
    if (!json) return null
    const parsed = sharedTripSchema.safeParse(JSON.parse(json))
    if (!parsed.success) return null
    return {
      id: newId(),
      name: parsed.data.n,
      days: parsed.data.d.map((day) => ({
        id: newId(),
        date: day.t,
        start: day.s,
        end: day.e,
        items: day.i.map(([code, time, locked]) => {
          const itemId = byCode.get(code) ?? `${MISSING_PREFIX}${code}`
          // A missing entry keeps its time as a show time, so it survives another round trip.
          if (restaurants.has(itemId)) return { key: newId(), itemId, ...(time ? { mealTime: time } : {}) }
          return { key: newId(), itemId, ...(time ? { showTime: time } : {}), ...(locked ? { timeLocked: true as const } : {}) }
        }),
      })),
    }
  } catch {
    return null
  }
}

export function shareUrl(trip: Trip, baseUrl: string): string {
  return `${baseUrl.split('#')[0]}#/import/${encodeTrip(trip)}`
}
