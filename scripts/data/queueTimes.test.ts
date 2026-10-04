import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseParkYearStats } from './queueTimes'
import { STATS_YEARS, queueTimesFile } from './sources'

const load = (park: 'dlp' | 'daw', year: number) => parseParkYearStats(readFileSync(queueTimesFile(park, year), 'utf8'))

describe('Queue-Times stats parser (committed snapshots)', () => {
  test('reads 2025 Disneyland Park values for known rides', () => {
    const stats = load('dlp', 2025)
    const thunder = stats.averages.find((r) => r.rideId === 25)
    expect(thunder).toEqual({ rideId: 25, name: 'Big Thunder Mountain', minutes: 48 })
    expect(stats.averageMaximums.find((r) => r.rideId === 25)?.minutes).toBe(80)
    expect(stats.averages.find((r) => r.rideId === 22)?.name).toBe("Peter Pan's Flight")
  })

  test.each(STATS_YEARS.flatMap((year) => [['dlp', year] as const, ['daw', year] as const]))(
    '%s %i has 12 monthly crowd levels and ride rows',
    (park, year) => {
      const stats = load(park, year)
      expect(stats.crowdByMonth).toHaveLength(12)
      expect(stats.crowdByMonth.every((v) => v > 0 && v <= 100)).toBe(true)
      expect(stats.averages.length).toBeGreaterThan(5)
      expect(stats.averageMaximums.length).toBeGreaterThan(5)
    },
  )

  test('fails loudly on a page without the expected sections', () => {
    expect(() => parseParkYearStats('<html><body>Just a moment...</body></html>')).toThrow(/no "Average crowd level by month"/)
  })
})
