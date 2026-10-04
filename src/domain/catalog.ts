import { z } from 'zod'

export const PARK_IDS = ['dlp', 'daw'] as const
export type ParkId = (typeof PARK_IDS)[number]

export const THRILL_LEVELS = ['Gentle', 'Mild', 'Moderate', 'Thrilling', 'Intense'] as const
export const SCARE_LEVELS = ['None', 'Mild', 'Spooky', 'Scary'] as const
/** 1 = Gentle ... 5 = Intense */
export type ThrillLevel = 1 | 2 | 3 | 4 | 5
/** 0 = None ... 3 = Scary */
export type ScareLevel = 0 | 1 | 2 | 3

export const SERVICE_TYPES = ['counter', 'table', 'snack'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]
export const SERVICE_LABELS: Record<ServiceType, string> = {
  counter: 'Counter service',
  table: 'Table service',
  snack: 'Snack',
}

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM')
const coordinates = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
const source = z.object({ label: z.string().min(1), url: z.url().optional() })
/** Only pages on the official Disneyland Paris website. */
const officialUrl = z.url().refine((u) => u.startsWith('https://www.disneylandparis.com/'), {
  message: 'official links must be on https://www.disneylandparis.com/',
})

export const HEIGHT_SOURCES = ['official', 'corroborated', 'draft'] as const
export type HeightSource = (typeof HEIGHT_SOURCES)[number]

const baseItem = z.object({
  id: z.string().regex(/^(dlp|daw)\.[a-z0-9-]+$/, 'expected <park>.<slug>'),
  name: z.string().min(1),
  parkId: z.enum(PARK_IDS),
  areaId: z.string().min(1),
  description: z.string().min(1).max(300),
  rating: z.number().int().min(1).max(5),
  ratingReason: z.string().min(1),
  location: coordinates.optional(),
  /** The position was placed by hand and is not exact. */
  locationApproximate: z.boolean().optional(),
  officialUrl: officialUrl.optional(),
  sources: z.array(source).min(1),
  review: z.enum(['draft', 'reviewed']),
  themeparksId: z.string().optional(),
})

export const waitStatsSchema = z.object({
  avgMin: z.number().min(0),
  avgMaxMin: z.number().min(0),
  years: z.array(z.number().int()).min(1),
})

export const attractionSchema = baseItem
  .extend({
    type: z.literal('attraction'),
    durationMin: z.number().positive(),
    minHeightCm: z.number().int().positive().nullable(),
    /** How the height rule was checked (design Decision 7). */
    heightSource: z.enum(HEIGHT_SOURCES).default('draft'),
    ageRule: z.string().optional(),
    thrill: z.number().int().min(1).max(5),
    scare: z.number().int().min(0).max(3),
    waitStats: waitStatsSchema.optional(),
    fixedWaitMin: z.number().min(0).optional(),
  })
  .refine((a) => a.waitStats !== undefined || a.fixedWaitMin !== undefined, {
    message: 'attraction needs waitStats or fixedWaitMin',
  })

export const restaurantSchema = baseItem.extend({
  type: z.literal('restaurant'),
  service: z.enum(SERVICE_TYPES),
  mealMin: z.number().positive().optional(),
})

export const showSchema = baseItem.extend({
  type: z.literal('show'),
  durationMin: z.number().positive(),
  times: z.array(clockTime).min(1),
  arriveEarlyMin: z.number().int().min(0),
})

export const itemSchema = z.discriminatedUnion('type', [attractionSchema, restaurantSchema, showSchema])

const monthHours = z.object({ open: clockTime, close: clockTime })

export const parkSchema = z.object({
  id: z.enum(PARK_IDS),
  name: z.string().min(1),
  entrance: coordinates,
  areas: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
  /** Typical opening hours, January..December. Estimates. */
  hours: z.array(monthHours).length(12),
  /** Relative crowd level per month (mean 1.0), January..December. */
  monthFactors: z.array(z.number().positive()).length(12),
  hoursSources: z.array(source).min(1),
  /** Official park map or park page. */
  officialMapUrl: z.url(),
  officialMapLabel: z.string().min(1),
})

export const catalogSchema = z
  .object({
    version: z.literal(1),
    collectedAt: z.iso.date(),
    statsYears: z.array(z.number().int()).min(1),
    parks: z.array(parkSchema).length(PARK_IDS.length),
    items: z.array(itemSchema),
  })
  .superRefine((catalog, ctx) => {
    // Area ids are unique across parks, so filters can use plain area ids.
    const areaIds = catalog.parks.flatMap((p) => p.areas.map((a) => a.id))
    for (const id of new Set(areaIds.filter((a, i) => areaIds.indexOf(a) !== i))) {
      ctx.addIssue({ code: 'custom', path: ['parks'], message: `area id ${id} is used in more than one park` })
    }
    const seen = new Set<string>()
    for (const [i, item] of catalog.items.entries()) {
      if (seen.has(item.id)) ctx.addIssue({ code: 'custom', path: ['items', i, 'id'], message: `duplicate id ${item.id}` })
      seen.add(item.id)
      const park = catalog.parks.find((p) => p.id === item.parkId)
      if (!park?.areas.some((a) => a.id === item.areaId)) {
        ctx.addIssue({ code: 'custom', path: ['items', i, 'areaId'], message: `unknown area ${item.areaId} in ${item.parkId}` })
      }
      if (!item.id.startsWith(`${item.parkId}.`)) {
        ctx.addIssue({ code: 'custom', path: ['items', i, 'id'], message: `id ${item.id} does not match park ${item.parkId}` })
      }
    }
  })

export type Coordinates = z.infer<typeof coordinates>
export type Source = z.infer<typeof source>
export type WaitStats = z.infer<typeof waitStatsSchema>
export type Attraction = Omit<z.infer<typeof attractionSchema>, 'thrill' | 'scare'> & {
  thrill: ThrillLevel
  scare: ScareLevel
}
export type Restaurant = z.infer<typeof restaurantSchema>
export type Show = z.infer<typeof showSchema>
export type CatalogItem = Attraction | Restaurant | Show
export type ItemType = CatalogItem['type']
export type Park = z.infer<typeof parkSchema>
export type Catalog = Omit<z.infer<typeof catalogSchema>, 'items'> & { items: CatalogItem[] }

export function parseCatalog(input: unknown): Catalog {
  return catalogSchema.parse(input) as Catalog
}

export function thrillLabel(level: ThrillLevel): string {
  return THRILL_LEVELS[level - 1]!
}

export function scareLabel(level: ScareLevel): string {
  return SCARE_LEVELS[level]!
}
