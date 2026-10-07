import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

/** Every custom property in the theme file, by name, as written (`#0e1631` or `var(--night-ink)`). */
function themeProperties(): Map<string, string> {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
  return new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]))
}

const properties = themeProperties()

/** A role such as `ink-muted` resolved through its `var()` chain to a hex color. */
function roleHex(role: string): string {
  let value = properties.get(`--color-${role}`)
  for (let hops = 0; value?.startsWith('var(') && hops < 10; hops++) value = properties.get(value.slice(4, -1).trim())
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`--color-${role} does not resolve to a #rrggbb color (got ${value})`)
  return value.toLowerCase()
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/** WCAG 2.2 contrast ratio. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

const TEXT = 4.5
const GRAPHIC = 3

/** midnight-theme design Decision 2: [foreground role, background role, minimum ratio]. */
const PAIRS: [string, string, number][] = [
  ['ink', 'surface', TEXT],
  ['ink', 'page', TEXT],
  ['ink-soft', 'surface', TEXT],
  ['ink-muted', 'surface', TEXT],
  ['ink-muted', 'page', TEXT],
  ['ink-muted', 'surface-muted', TEXT],
  ['ink-muted', 'accent-soft', TEXT],
  ['ink-faint', 'surface', GRAPHIC],
  ['ink-faint', 'page', GRAPHIC],
  ['on-accent', 'accent', TEXT],
  ['on-sky', 'sky', TEXT],
  ['on-sky', 'sky-deep', TEXT],
  ['on-sky-muted', 'sky', TEXT],
  ['on-sky-muted', 'sky-deep', TEXT],
  ['star', 'sky', GRAPHIC],
  ['star', 'accent', GRAPHIC],
  ['star-ink', 'surface', GRAPHIC],
  ['star-ink', 'page', GRAPHIC],
  ['star-ink', 'accent-soft', GRAPHIC],
  ['fits', 'surface', TEXT],
  ['fits', 'fits-soft', TEXT],
  ['fits-on-sky', 'sky', TEXT],
  ['over', 'surface', TEXT],
  ['over', 'over-soft', TEXT],
  ['over-on-sky', 'sky', TEXT],
  ['warn', 'warn-soft', TEXT],
  ['focus', 'surface', GRAPHIC],
  ['focus', 'page', GRAPHIC],
  ['focus-on-sky', 'sky', GRAPHIC],
  ['field', 'surface', GRAPHIC],
  ['map-zone-1', 'map-ground', TEXT],
  ['map-zone-2', 'map-ground', TEXT],
  ['map-zone-3', 'map-ground', TEXT],
  ['map-zone-4', 'map-ground', TEXT],
  ['map-zone-5', 'map-ground', TEXT],
  ['map-attraction', 'map-ground', GRAPHIC],
  ['map-restaurant', 'map-ground', GRAPHIC],
  ['map-show', 'map-ground', GRAPHIC],
  ['accent', 'map-ground', GRAPHIC],
]

describe('theme contrast (app-shell spec: Readable colors)', () => {
  test('the WCAG formula matches known values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  test.each(PAIRS)('%s on %s is at least %d:1', (fg, bg, min) => {
    const ratio = contrast(roleHex(fg), roleHex(bg))
    expect(ratio, `${fg} (${roleHex(fg)}) on ${bg} (${roleHex(bg)}) is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min)
  })
})
