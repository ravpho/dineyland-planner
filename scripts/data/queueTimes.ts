/** Parses Queue-Times park statistics pages (https://queue-times.com/parks/<id>/stats/<year>). */

export interface RideStat {
  rideId: number
  name: string
  minutes: number
}

export interface ParkYearStats {
  averages: RideStat[]
  averageMaximums: RideStat[]
  /** Crowd level in percent, January..December. */
  crowdByMonth: number[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function decode(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/** Returns the rows of the first table after the heading that starts with `heading`. */
function tableRows(html: string, heading: string): string[][] {
  const at = html.search(new RegExp(`<h2[^>]*>\\s*${heading}`))
  if (at < 0) throw new Error(`Queue-Times page has no "${heading}" section`)
  const tbody = html.slice(at).match(/<tbody>([\s\S]*?)<\/tbody>/)
  if (!tbody) throw new Error(`Queue-Times "${heading}" section has no table`)
  return [...tbody[1]!.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1]!.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]!),
  )
}

function rideRows(html: string, heading: string): RideStat[] {
  return tableRows(html, heading).map((cells) => {
    const link = cells[0]?.match(/href="\/parks\/\d+\/rides\/(\d+)"/)
    const minutes = Number(decode(cells[1] ?? ''))
    if (!link || !Number.isFinite(minutes)) throw new Error(`Unreadable row in "${heading}": ${cells.join(' | ')}`)
    return { rideId: Number(link[1]), name: decode(cells[0]!), minutes }
  })
}

/** Ride tables only; works for partial years whose crowd table does not cover all 12 months. */
export function parseRideStats(html: string): Omit<ParkYearStats, 'crowdByMonth'> {
  return {
    averages: rideRows(html, 'Average queue time by ride'),
    averageMaximums: rideRows(html, 'Average maximum queue time by ride'),
  }
}

export function parseParkYearStats(html: string): ParkYearStats {
  const crowdRows = tableRows(html, 'Average crowd level by month')
  const crowdByMonth = MONTHS.map((month) => {
    const row = crowdRows.find((cells) => decode(cells[0] ?? '') === month)
    const value = Number(decode(row?.[1] ?? ''))
    if (!row || !Number.isFinite(value)) throw new Error(`Missing crowd level for ${month}`)
    return value
  })
  return { ...parseRideStats(html), crowdByMonth }
}
