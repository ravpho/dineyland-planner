import { describe, expect, test } from 'vitest'
import catalogJson from '../data/catalog.json'
import { parseCatalog, type Attraction, type Catalog, type Restaurant } from './catalog'
import { restaurantSuggestions, SUGGEST_MIN_SAVING } from './restaurants'
import { sampleCatalog } from '../test/sampleCatalog'
import type { Day } from './trip'
import { walkMinutes } from './walking'

const real: Catalog = parseCatalog(catalogJson)

const ENTRANCE = { lat: 48.87, lng: 2.78 }
const north = (metres: number) => ({ lat: ENTRANCE.lat + metres / 111_195, lng: ENTRANCE.lng })
const src = [{ label: 'test' }]
const restaurant = (id: string, fields: Partial<Restaurant>): Restaurant => ({
  id: `dlp.${id}`, type: 'restaurant', name: id, parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
  ratingReason: 'x', sources: src, review: 'draft', service: 'counter', location: ENTRANCE, ...fields,
})
const filler: Attraction = {
  id: 'dlp.filler', type: 'attraction', name: 'filler', parkId: 'dlp', areaId: 'main-street', description: 'x', rating: 3,
  ratingReason: 'x', sources: src, review: 'draft', durationMin: 148, minHeightCm: null, heightSource: 'draft', thrill: 1, scare: 0,
  fixedWaitMin: 0, location: ENTRANCE,
}
/** The filler ride at the entrance ends 12:29; `near` is on the spot, `far` an 11-minute walk away. */
function fixture(): Catalog {
  const base = structuredClone(sampleCatalog)
  base.parks[0]!.entrance = ENTRANCE
  return {
    ...base,
    items: [filler, restaurant('near', {}), restaurant('far', { location: north(450) }), restaurant('table-near', { service: 'table' })],
  }
}
const lunchDay = (restaurantId: string): Day => ({
  id: 'd', date: '2026-08-12', start: '10:00', end: '22:00',
  items: [{ key: 'ride', itemId: 'dlp.filler' }, { key: 'lunch', itemId: restaurantId, mealTime: '12:00' }],
})

describe('restaurant suggestions (route-optimization spec)', () => {
  test('lunch in the other park suggests Disney Adventure World counter service, each saving more than 40 minutes', () => {
    const d: Day = {
      id: 'd', date: '2026-08-12', start: '09:30', end: '23:00',
      items: [
        { key: 'a', itemId: 'daw.crushs-coaster' }, { key: 'b', itemId: 'daw.frozen-ever-after' }, { key: 'c', itemId: 'daw.twilight-zone-tower-of-terror' },
        { key: 'lunch', itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' },
        { key: 'd', itemId: 'daw.spider-man-web-adventure' }, { key: 'e', itemId: 'daw.ratatouille-the-adventure' },
      ],
    }
    const suggestions = restaurantSuggestions(d, real, 'lunch')
    expect(suggestions).toHaveLength(3)
    expect(suggestions.map((s) => s.restaurant.name)).toContain('Stark Factory')
    for (const s of suggestions) {
      expect(s.restaurant.parkId).toBe('daw')
      expect(s.restaurant.service).toBe('counter')
      expect(s.saves).toBeGreaterThan(40)
      expect(s.onTime).toBe(false)
    }
    // Best first.
    expect(suggestions.map((s) => s.saves)).toEqual([...suggestions.map((s) => s.saves)].sort((a, b) => b - a))
  })

  test('a late lunch suggests a restaurant reached in time, even when it saves less than 15 minutes', () => {
    expect(walkMinutes(ENTRANCE, north(450))).toBe(11)
    const suggestions = restaurantSuggestions(lunchDay('dlp.far'), fixture(), 'lunch')
    expect(suggestions.map((s) => s.restaurant.id)).toEqual(['dlp.near'])
    expect(suggestions[0]!.onTime).toBe(true)
    expect(suggestions[0]!.saves).toBeLessThan(SUGGEST_MIN_SAVING)
    expect(suggestions[0]!.saves).toBeGreaterThan(0)
  })

  test('a restaurant that fits gets no suggestions', () => {
    expect(restaurantSuggestions(lunchDay('dlp.near'), fixture(), 'lunch')).toEqual([])
  })

  test('suggestions never include the current restaurant or another service type', () => {
    const suggestions = restaurantSuggestions(lunchDay('dlp.far'), fixture(), 'lunch')
    expect(suggestions.map((s) => s.restaurant.id)).not.toContain('dlp.far')
    expect(suggestions.map((s) => s.restaurant.id)).not.toContain('dlp.table-near')
    // Only restaurants get suggestions.
    expect(restaurantSuggestions(lunchDay('dlp.far'), fixture(), 'ride')).toEqual([])
    expect(restaurantSuggestions(lunchDay('dlp.far'), fixture(), 'nope')).toEqual([])
  })
})
