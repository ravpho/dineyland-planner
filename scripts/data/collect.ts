/**
 * Fetches source snapshots into data/raw/. Needs network access to
 * api.themeparks.wiki and queue-times.com. Run with `npm run data:collect`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  COLLECTED_AT_FILE,
  FALLBACK_YEARS,
  QUEUE_TIMES_PARKS,
  STATS_YEARS,
  THEMEPARKS_CHILDREN_FILE,
  THEMEPARKS_CHILDREN_URL,
  THEMEPARKS_LIVE_FILE,
  THEMEPARKS_LIVE_URL,
  THEMEPARKS_PARK_IDS,
  queueTimesFile,
  queueTimesStatsUrl,
  themeparksScheduleFile,
  themeparksScheduleUrl,
} from './sources'

const USER_AGENT = 'dineyland-planner data collection (https://github.com/ravpho/dineyland-planner)'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url} answered ${res.status}`)
  return res.text()
}

async function save(path: string, body: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, body)
  console.log(`saved ${path} (${body.length} bytes)`)
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const saveJson = async (url: string, path: string) => save(path, JSON.stringify(JSON.parse(await fetchText(url)), null, 2) + '\n')

await saveJson(THEMEPARKS_CHILDREN_URL, THEMEPARKS_CHILDREN_FILE)
// Today's show times and the next month of opening hours: the basis for typical show times and hours.
await saveJson(THEMEPARKS_LIVE_URL, THEMEPARKS_LIVE_FILE)
for (const park of Object.keys(THEMEPARKS_PARK_IDS) as (keyof typeof THEMEPARKS_PARK_IDS)[]) {
  await saveJson(themeparksScheduleUrl(park), themeparksScheduleFile(park))
}

for (const [park, parkId] of Object.entries(QUEUE_TIMES_PARKS) as [keyof typeof QUEUE_TIMES_PARKS, number][]) {
  for (const year of [...STATS_YEARS, ...FALLBACK_YEARS]) {
    await pause(1000) // be gentle with a free community service
    await save(queueTimesFile(park, year), await fetchText(queueTimesStatsUrl(parkId, year)))
  }
}

await save(COLLECTED_AT_FILE, new Date().toISOString().slice(0, 10) + '\n')
