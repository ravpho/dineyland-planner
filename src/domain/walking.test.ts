import { describe, expect, test } from 'vitest'
import { sampleCatalog } from '../test/sampleCatalog'
import { areaCentres, distanceMetres, locate, walkMinutes } from './walking'

const item = (id: string) => sampleCatalog.items.find((i) => i.id === id)!

describe('walking time', () => {
  test('neighbouring items are a shorter walk than opposite sides of the park', () => {
    const thunder = item('dlp.big-thunder-mountain').location!
    const phantom = item('dlp.phantom-manor').location!
    const hyperspace = item('dlp.star-wars-hyperspace-mountain').location!
    expect(walkMinutes(thunder, phantom)).toBeLessThan(walkMinutes(thunder, hyperspace))
  })

  test('same place still costs the overhead minute', () => {
    const p = { lat: 48.87, lng: 2.78 }
    expect(walkMinutes(p, p)).toBe(1)
  })

  test('distance is roughly right (about 111 m per 0.001 degree of latitude)', () => {
    expect(distanceMetres({ lat: 48.87, lng: 2.78 }, { lat: 48.871, lng: 2.78 })).toBeCloseTo(111, 0)
  })

  test('an item without coordinates uses its area centre', () => {
    const labyrinth = item('dlp.alices-curious-labyrinth') // fantasyland, no location in the sample
    const centre = areaCentres(sampleCatalog).get('dlp/fantasyland')!
    expect(labyrinth.location).toBeUndefined()
    expect(locate(labyrinth, sampleCatalog)).toEqual(centre)
    expect(centre).toEqual(item('dlp.peter-pans-flight').location) // the only located fantasyland item
  })

  test('falls back to the park entrance when the area has no located items', () => {
    const parade = item('dlp.parade') // main-street: only Walt's has a location
    expect(locate(parade, sampleCatalog)).toEqual(item('dlp.walts').location)
    const lonely = { ...parade, areaId: 'nowhere' }
    expect(locate(lonely, sampleCatalog)).toEqual(sampleCatalog.parks[0]!.entrance)
  })
})
