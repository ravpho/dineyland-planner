/** Where the data-collection scripts read from and write to. */
export const THEMEPARKS_DESTINATION_ID = 'e8d0207f-da8a-4048-bec8-117aa946b2c2'
export const THEMEPARKS_CHILDREN_URL = `https://api.themeparks.wiki/v1/entity/${THEMEPARKS_DESTINATION_ID}/children`

/** Queue-Times park ids. */
export const QUEUE_TIMES_PARKS = { dlp: 4, daw: 28 } as const
/** Recent full years, skipping the 2020-21 closures. Change here to move the window. */
export const STATS_YEARS = [2023, 2024, 2025] as const
/** Partial newer years, used only for ride averages of attractions missing from STATS_YEARS (e.g. opened 2026). */
export const FALLBACK_YEARS = [2026] as const

export const queueTimesStatsUrl = (parkId: number, year: number) => `https://queue-times.com/parks/${parkId}/stats/${year}`

export const THEMEPARKS_LIVE_URL = `https://api.themeparks.wiki/v1/entity/${THEMEPARKS_DESTINATION_ID}/live`
export const THEMEPARKS_PARK_IDS = {
  dlp: 'dae968d5-630d-4719-8b06-3d107e944401',
  daw: 'ca888437-ebb4-4d50-aed2-d227f7096968',
} as const
export const themeparksScheduleUrl = (park: keyof typeof THEMEPARKS_PARK_IDS) =>
  `https://api.themeparks.wiki/v1/entity/${THEMEPARKS_PARK_IDS[park]}/schedule`

export const RAW_DIR = 'data/raw'
export const THEMEPARKS_CHILDREN_FILE = `${RAW_DIR}/themeparks-children.json`
export const THEMEPARKS_LIVE_FILE = `${RAW_DIR}/themeparks-live.json`
export const themeparksScheduleFile = (park: keyof typeof THEMEPARKS_PARK_IDS) => `${RAW_DIR}/themeparks-schedule-${park}.json`
export const queueTimesFile = (park: keyof typeof QUEUE_TIMES_PARKS, year: number) => `${RAW_DIR}/queue-times/${park}-${year}.html`
export const COLLECTED_AT_FILE = `${RAW_DIR}/collected-at.txt`
export const CURATED_DIR = 'data/curated'
export const CATALOG_FILE = 'src/data/catalog.json'
export const REPORT_FILE = 'data/build-report.md'
export const REVIEW_FILE = 'data/REVIEW.md'

/** Official Disneyland Park accessibility guide (one-page poster with the park map). */
export const OFFICIAL_GUIDE_DLP_URL = 'https://brochure.disneylandparis.com/HCP/EN/adlp/common/data/catalogue.pdf'
export const OFFICIAL_GUIDE_DLP_TEXT_FILE = `${RAW_DIR}/official-guide-dlp.txt`
