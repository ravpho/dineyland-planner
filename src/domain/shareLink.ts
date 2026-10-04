import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { z } from 'zod'
import { PARK_IDS } from './catalog'
import { MAX_TRIP_DAYS, newId, type Trip } from './trip'

/**
 * Compact share format (design Decision 9). Each item id is replaced by a 5-character code
 * (a hash of the id), which the receiving app maps back using its catalog. Codes it does not
 * know become "missing:<code>" entries that the plan shows as "No longer available".
 */
const sharedTripSchema = z.object({
  v: z.literal(1),
  n: z.string().max(200),
  d: z
    .array(
      z.object({
        t: z.iso.date(),
        p: z.enum(PARK_IDS),
        s: z.string().regex(/^\d{2}:\d{2}$/),
        e: z.string().regex(/^\d{2}:\d{2}$/),
        i: z.array(z.union([z.tuple([z.string().min(1)]), z.tuple([z.string().min(1), z.string().regex(/^\d{2}:\d{2}$/)])])),
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
    v: 1,
    n: trip.name,
    d: trip.days.map((day) => ({
      t: day.date,
      p: day.parkId,
      s: day.start,
      e: day.end,
      i: day.items.map((entry) => {
        const code = entry.itemId.startsWith(MISSING_PREFIX) ? entry.itemId.slice(MISSING_PREFIX.length) : itemCode(entry.itemId)
        return entry.showTime ? [code, entry.showTime] : [code]
      }),
    })),
  }
  return compressToEncodedURIComponent(JSON.stringify(shared))
}

/** Returns a new trip with fresh ids, or null when the data cannot be read. */
export function decodeTrip(data: string, catalogIds: readonly string[]): Trip | null {
  const byCode = new Map(catalogIds.map((id) => [itemCode(id), id]))
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
        parkId: day.p,
        start: day.s,
        end: day.e,
        items: day.i.map(([code, showTime]) => ({
          key: newId(),
          itemId: byCode.get(code) ?? `${MISSING_PREFIX}${code}`,
          ...(showTime ? { showTime } : {}),
        })),
      })),
    }
  } catch {
    return null
  }
}

export function shareUrl(trip: Trip, baseUrl: string): string {
  return `${baseUrl.split('#')[0]}#/import/${encodeTrip(trip)}`
}
