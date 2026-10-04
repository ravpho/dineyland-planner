/**
 * Merges hand-reviewed data (data/curated/*.yaml) with the raw source snapshots
 * (data/raw/) into src/data/catalog.json, and writes data/build-report.md.
 * Never writes to data/curated/. Run with `npm run data`.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { catalogSchema, type Catalog, type CatalogItem, type ParkId } from '../../src/domain/catalog'
import { parseParkYearStats, parseRideStats, type ParkYearStats } from './queueTimes'
import {
  CATALOG_FILE,
  COLLECTED_AT_FILE,
  CURATED_DIR,
  FALLBACK_YEARS,
  QUEUE_TIMES_PARKS,
  RAW_DIR,
  REPORT_FILE,
  REVIEW_FILE,
  STATS_YEARS,
} from './sources'

interface ThemeparksEntity {
  id: string
  name: string
  entityType: string
  parentId: string
  location?: { latitude: number | null; longitude: number | null }
}

type CuratedItem = Omit<CatalogItem, 'parkId' | 'waitStats'> & {
  queueTimesId?: number
  [key: string]: unknown
}

export interface CuratedPark {
  park: Omit<Catalog['parks'][number], 'monthFactors'> & { themeparksId: string }
  items: CuratedItem[]
  excluded?: {
    themeparks?: { id: string; name?: string; reason: string }[]
    queueTimes?: { id: number; name?: string; reason: string }[]
  }
}

export interface BuildInput {
  curated: CuratedPark[]
  themeparks: ThemeparksEntity[]
  /** stats[park][year] */
  stats: Record<ParkId, Record<number, ParkYearStats>>
  /** Ride statistics from partial newer years, used only for attractions missing from `stats`. */
  fallbackStats?: Record<ParkId, Record<number, Omit<ParkYearStats, 'crowdByMonth'>>>
  collectedAt: string
}

export interface BuildReport {
  unmatchedThemeparks: { park: ParkId; id: string; name: string; type: string }[]
  unmatchedQueueTimes: { park: ParkId; id: number; name: string }[]
  unknownThemeparksIds: { itemId: string; themeparksId: string }[]
  unknownQueueTimesIds: { itemId: string; queueTimesId: number }[]
  withoutStatistics: { itemId: string; name: string; hasFixedWait: boolean }[]
  reviewed: number
  draft: number
}

const round1 = (n: number) => Math.round(n * 10) / 10
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function buildCatalog(input: BuildInput): { catalog: unknown; report: BuildReport } {
  const report: BuildReport = {
    unmatchedThemeparks: [],
    unmatchedQueueTimes: [],
    unknownThemeparksIds: [],
    unknownQueueTimesIds: [],
    withoutStatistics: [],
    reviewed: 0,
    draft: 0,
  }
  const entities = new Map(input.themeparks.map((e) => [e.id, e]))
  const parks: Catalog['parks'] = []
  const items: unknown[] = []
  const years = [...STATS_YEARS].filter((y) => Object.values(input.stats).every((byYear) => byYear[y]))

  for (const { park, items: curatedItems, excluded } of input.curated) {
    const { themeparksId, ...parkFields } = park
    const parkStats = years.map((y) => input.stats[park.id][y]!)
    const crowd = Array.from({ length: 12 }, (_, m) => mean(parkStats.map((s) => s.crowdByMonth[m]!)))
    const crowdMean = mean(crowd)
    parks.push({ ...parkFields, monthFactors: crowd.map((c) => Math.round((c / crowdMean) * 1000) / 1000) })

    const fallback = Object.entries(input.fallbackStats?.[park.id] ?? {}).map(([y, st]) => ({ year: Number(y), ...st }))
    const knownQueueTimes = new Map<number, string>()
    for (const s of [...parkStats, ...fallback]) for (const r of s.averages) knownQueueTimes.set(r.rideId, r.name)

    const usedThemeparks = new Set(excluded?.themeparks?.map((e) => e.id))
    const usedQueueTimes = new Set(excluded?.queueTimes?.map((e) => e.id))

    for (const item of curatedItems) {
      const { queueTimesId, location, ...rest } = item
      const out: Record<string, unknown> = { ...rest, parkId: park.id }
      if (item.review === 'reviewed') report.reviewed++
      else report.draft++

      if (item.themeparksId) {
        usedThemeparks.add(item.themeparksId)
        const entity = entities.get(item.themeparksId)
        if (!entity) report.unknownThemeparksIds.push({ itemId: item.id, themeparksId: item.themeparksId })
        const lat = entity?.location?.latitude
        const lng = entity?.location?.longitude
        if (location) out.location = location
        else if (typeof lat === 'number' && typeof lng === 'number') out.location = { lat, lng }
      } else if (location) {
        out.location = location
      }

      if (item.type === 'attraction') {
        if (queueTimesId !== undefined) {
          usedQueueTimes.add(queueTimesId)
          if (!knownQueueTimes.has(queueTimesId)) report.unknownQueueTimesIds.push({ itemId: item.id, queueTimesId })
          const pick = (sources: { year: number; averages: { rideId: number; minutes: number }[]; averageMaximums: { rideId: number; minutes: number }[] }[]) => ({
            avg: sources.flatMap((s) => {
              const r = s.averages.find((x) => x.rideId === queueTimesId)
              return r ? [{ year: s.year, minutes: r.minutes }] : []
            }),
            max: sources.flatMap((s) => s.averageMaximums.find((x) => x.rideId === queueTimesId)?.minutes ?? []),
          })
          let { avg, max } = pick(parkStats.map((s, i) => ({ year: years[i]!, ...s })))
          if (avg.length === 0) ({ avg, max } = pick(fallback))
          if (avg.length > 0) {
            out.waitStats = {
              avgMin: round1(mean(avg.map((a) => a.minutes))),
              avgMaxMin: round1(max.length > 0 ? mean(max) : mean(avg.map((a) => a.minutes)) * 2),
              years: avg.map((a) => a.year),
            }
          }
        }
        if (!out.waitStats) {
          report.withoutStatistics.push({ itemId: item.id, name: item.name, hasFixedWait: item.fixedWaitMin !== undefined })
        }
      }
      items.push(out)
    }

    for (const e of input.themeparks) {
      if (e.parentId !== themeparksId || e.entityType === 'PARK' || usedThemeparks.has(e.id)) continue
      report.unmatchedThemeparks.push({ park: park.id, id: e.id, name: e.name, type: e.entityType.toLowerCase() })
    }
    for (const [id, name] of knownQueueTimes) {
      if (!usedQueueTimes.has(id)) report.unmatchedQueueTimes.push({ park: park.id, id, name })
    }
  }

  return {
    catalog: { version: 1, collectedAt: input.collectedAt, statsYears: years, parks, items },
    report,
  }
}

export function formatReport(report: BuildReport): string {
  const lines = ['# Data build report', '', `Entries reviewed: ${report.reviewed}, still draft: ${report.draft}`, '']
  const section = (title: string, rows: string[]) => {
    lines.push(`## ${title} (${rows.length})`, '')
    lines.push(...(rows.length ? rows.map((r) => `- ${r}`) : ['_None._']), '')
  }
  section('Unmatched ThemeParks.wiki entities', report.unmatchedThemeparks.map((e) => `${e.park} ${e.type}: ${e.name} (\`${e.id}\`)`))
  section('Unmatched Queue-Times rides', report.unmatchedQueueTimes.map((r) => `${r.park}: ${r.name} (id ${r.id})`))
  section('Attractions without statistics', report.withoutStatistics.map((a) => `${a.name} (${a.itemId})${a.hasFixedWait ? ' – uses fixedWaitMin' : ' – NEEDS fixedWaitMin'}`))
  section('Curated ThemeParks.wiki ids not found', report.unknownThemeparksIds.map((x) => `${x.itemId}: ${x.themeparksId}`))
  section('Curated Queue-Times ids not found', report.unknownQueueTimesIds.map((x) => `${x.itemId}: ${x.queueTimesId}`))
  return lines.join('\n')
}

const THRILL = ['Gentle', 'Mild', 'Moderate', 'Thrilling', 'Intense']
const SCARE = ['None', 'Mild', 'Spooky', 'Scary']

/** Checklist of the safety-relevant facts per attraction, for the owner to confirm. */
export function formatReview(curated: CuratedPark[]): string {
  const cell = (v: unknown) => String(v ?? '').replace(/\|/g, '\\|')
  const lines = [
    '# Attraction data review',
    '',
    'Generated by `npm run data` from `data/curated/`. Check each row, heights first, then edit the curated YAML',
    "and set the entry's `review: reviewed`. \"draft\" heights were not found in a cited source: confirm them on park signage",
    'or the official site.',
    '',
  ]
  for (const { park, items } of curated) {
    const areas = new Map(park.areas.map((a) => [a.id, a.name]))
    lines.push(`## ${park.name}`, '', '| ✓ | Attraction | Area | Min height | Height source | Age rule | Thrill | Scariness | Sources |', '|---|---|---|---|---|---|---|---|---|')
    for (const item of items) {
      if (item.type !== 'attraction') continue
      const a = item as CuratedItem & { minHeightCm: number | null; thrill: number; scare: number; ageRule?: string; heightSource?: string }
      const sources = a.sources.map((s) => (s.url ? `[${s.label}](${s.url})` : s.label)).join('<br>')
      lines.push(
        `| ${a.review === 'reviewed' ? '✓' : ' '} | ${cell(a.name)} | ${cell(areas.get(a.areaId))} | ${a.minHeightCm ? `${a.minHeightCm} cm` : 'none'} | ${cell(a.heightSource ?? 'draft')} | ${cell(a.ageRule ?? '')} | ${THRILL[a.thrill - 1]} | ${SCARE[a.scare]} | ${sources} |`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

export interface RunOptions {
  curatedDir?: string
  rawDir?: string
  catalogFile?: string
  reportFile?: string
  reviewFile?: string
}

export async function runBuild(options: RunOptions = {}) {
  const curatedDir = options.curatedDir ?? CURATED_DIR
  const rawDir = options.rawDir ?? RAW_DIR
  const files = (await readdir(curatedDir)).filter((f) => f.endsWith('.yaml')).sort()
  const curated = await Promise.all(files.map(async (f) => parseYaml(await readFile(join(curatedDir, f), 'utf8')) as CuratedPark))
  const themeparks = JSON.parse(await readFile(join(rawDir, 'themeparks-children.json'), 'utf8')).children as ThemeparksEntity[]
  const stats = {} as BuildInput['stats']
  const fallbackStats = {} as NonNullable<BuildInput['fallbackStats']>
  for (const park of Object.keys(QUEUE_TIMES_PARKS) as ParkId[]) {
    stats[park] = {}
    fallbackStats[park] = {}
    for (const year of STATS_YEARS) {
      const html = await readFile(join(rawDir, 'queue-times', `${park}-${year}.html`), 'utf8')
      stats[park][year] = parseParkYearStats(html)
    }
    for (const year of FALLBACK_YEARS) {
      const html = await readFile(join(rawDir, 'queue-times', `${park}-${year}.html`), 'utf8').catch(() => null)
      if (html) fallbackStats[park][year] = parseRideStats(html)
    }
  }
  const collectedAt = (await readFile(options.rawDir ? join(rawDir, 'collected-at.txt') : COLLECTED_AT_FILE, 'utf8')).trim()

  const { catalog, report } = buildCatalog({ curated, themeparks, stats, fallbackStats, collectedAt })
  await writeFile(options.reportFile ?? REPORT_FILE, formatReport(report))
  await writeFile(options.reviewFile ?? REVIEW_FILE, formatReview(curated))
  const result = catalogSchema.safeParse(catalog)
  if (!result.success) {
    const problems = result.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Catalog failed validation:\n${problems}`)
  }
  // Write the parsed result: the schema drops curated-only helper fields such as heightSource.
  await writeFile(options.catalogFile ?? CATALOG_FILE, JSON.stringify(result.data, null, 2) + '\n')
  return report
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runBuild()
    .then((report) => {
      console.log(`catalog written to ${CATALOG_FILE}, report in ${REPORT_FILE}`)
      console.log(`unmatched: ${report.unmatchedThemeparks.length} ThemeParks.wiki, ${report.unmatchedQueueTimes.length} Queue-Times; without statistics: ${report.withoutStatistics.length}`)
    })
    .catch((err: Error) => {
      console.error(err.message)
      process.exit(1)
    })
}
