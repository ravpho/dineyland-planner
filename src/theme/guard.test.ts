import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * Components use the theme's roles (bg-surface, text-ink-muted...), never Tailwind's default palette
 * or hex colors (midnight-theme design Decisions 1 and 11). Tailwind's palette is switched off, so a
 * leftover class would silently lose its color; this test names it instead.
 */
const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PREFIXES = 'bg|text|border(?:-[trblxy])?|ring(?:-offset)?|fill|stroke|outline|from|to|via|divide|shadow|decoration|placeholder|accent|caret'
const FORBIDDEN = [
  new RegExp(`(?<![\\w-])(?:${PREFIXES})-(?:${PALETTE})-\\d{2,3}\\b`, 'g'),
  new RegExp(`--color-(?:${PALETTE})-\\d{2,3}\\b`, 'g'),
  /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
]

/** Files not yet moved to the theme. Each task group of midnight-theme removes its own; the list ends empty. */
const NOT_YET_MIGRATED = new Set([
  'src/components/DayTimeline.tsx',
  'src/components/ParkMap.tsx',
  'src/components/ParkOrder.tsx',
  'src/components/PlanMap.tsx',
  'src/components/TripBar.tsx',
  'src/screens/PlanScreen.tsx',
])

const root = process.cwd()
const sources = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' })
  .map((f) => relative(root, join(root, 'src', f)).split('\\').join('/'))
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.includes('/__tests__/') && !f.startsWith('src/test/'))
  .sort()

/** "line: offending text" for each raw color in a file. */
function rawColors(file: string): string[] {
  return readFileSync(join(root, file), 'utf8')
    .split('\n')
    .flatMap((line, i) => FORBIDDEN.flatMap((re) => [...line.matchAll(re)].map((m) => `${i + 1}: ${m[0]}`)))
}

describe('theme guard', () => {
  test('finds the component sources', () => {
    expect(sources).toContain('src/App.tsx')
    expect(sources).toContain('src/components/ui.tsx')
  })

  test.each(sources.filter((f) => !NOT_YET_MIGRATED.has(f)))('%s uses only theme colors', (file) => {
    expect(rawColors(file), `${file} uses raw Tailwind palette classes or hex colors`).toEqual([])
  })

  test.each([...NOT_YET_MIGRATED])('%s is still listed only while it has raw colors', (file) => {
    expect(rawColors(file).length, `${file} has no raw colors left: remove it from NOT_YET_MIGRATED`).toBeGreaterThan(0)
  })
})
