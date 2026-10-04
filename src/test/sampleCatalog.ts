import type { Catalog } from '../domain/catalog'

const src = [{ label: 'Test fixture' }]
const hours = (close: string) => ({ open: '09:30', close })
const yearHours = () => ['20:00', '20:00', '21:00', '21:00', '22:00', '23:00', '23:00', '23:00', '22:00', '21:00', '20:00', '21:00'].map(hours)

/** Small hand-made catalog for unit tests. Numbers are illustrative, not real data. */
export const sampleCatalog: Catalog = {
  version: 1,
  collectedAt: '2026-10-04',
  statsYears: [2023, 2024, 2025],
  parks: [
    {
      id: 'dlp',
      name: 'Disneyland Park',
      entrance: { lat: 48.8703, lng: 2.7797 },
      areas: [
        { id: 'main-street', name: 'Main Street, U.S.A.' },
        { id: 'frontierland', name: 'Frontierland' },
        { id: 'fantasyland', name: 'Fantasyland' },
        { id: 'discoveryland', name: 'Discoveryland' },
      ],
      hours: yearHours(),
      monthFactors: [0.8, 0.95, 0.9, 1.1, 1.0, 0.95, 1.15, 1.3, 0.9, 1.1, 0.85, 1.0],
      hoursSources: src,
    },
    {
      id: 'daw',
      name: 'Disney Adventure World',
      entrance: { lat: 48.8682, lng: 2.7805 },
      areas: [{ id: 'avengers-campus', name: 'Avengers Campus' }],
      hours: yearHours(),
      monthFactors: [0.8, 0.95, 0.9, 1.1, 1.0, 0.95, 1.15, 1.3, 0.9, 1.1, 0.85, 1.0],
      hoursSources: src,
    },
  ],
  items: [
    {
      id: 'dlp.big-thunder-mountain', type: 'attraction', name: 'Big Thunder Mountain', parkId: 'dlp', areaId: 'frontierland',
      description: 'Runaway mine train around an island in the Rivers of the Far West.', rating: 5, ratingReason: 'Park classic.',
      location: { lat: 48.8722, lng: 2.7712 }, sources: src, review: 'draft',
      durationMin: 4, minHeightCm: 102, thrill: 4, scare: 1, waitStats: { avgMin: 44, avgMaxMin: 90, years: [2023, 2024, 2025] },
    },
    {
      id: 'dlp.phantom-manor', type: 'attraction', name: 'Phantom Manor', parkId: 'dlp', areaId: 'frontierland',
      description: 'Slow dark ride through a haunted mansion.', rating: 5, ratingReason: 'Atmospheric.',
      location: { lat: 48.8716, lng: 2.7718 }, sources: src, review: 'draft',
      durationMin: 7, minHeightCm: null, thrill: 2, scare: 3, waitStats: { avgMin: 20, avgMaxMin: 45, years: [2023, 2024, 2025] },
    },
    {
      id: 'dlp.peter-pans-flight', type: 'attraction', name: "Peter Pan's Flight", parkId: 'dlp', areaId: 'fantasyland',
      description: 'Fly over London to Neverland in a pirate galleon.', rating: 4, ratingReason: 'Charming but long queues.',
      location: { lat: 48.8738, lng: 2.7757 }, sources: src, review: 'draft',
      durationMin: 3, minHeightCm: null, thrill: 1, scare: 1, waitStats: { avgMin: 43, avgMaxMin: 85, years: [2023, 2024, 2025] },
    },
    {
      id: 'dlp.alices-curious-labyrinth', type: 'attraction', name: "Alice's Curious Labyrinth", parkId: 'dlp', areaId: 'fantasyland',
      description: 'Walk-through hedge maze.', rating: 3, ratingReason: 'Fun for small children.',
      sources: src, review: 'draft',
      durationMin: 15, minHeightCm: null, ageRule: 'Children under 7 must be accompanied by an adult.', thrill: 1, scare: 0, fixedWaitMin: 5,
    },
    {
      id: 'dlp.star-wars-hyperspace-mountain', type: 'attraction', name: 'Star Wars Hyperspace Mountain', parkId: 'dlp', areaId: 'discoveryland',
      description: 'Indoor launched roller coaster in the dark.', rating: 4, ratingReason: 'Intense and short.',
      location: { lat: 48.8759, lng: 2.7795 }, sources: src, review: 'draft',
      durationMin: 3, minHeightCm: 120, thrill: 5, scare: 2, waitStats: { avgMin: 28, avgMaxMin: 60, years: [2023, 2024, 2025] },
    },
    {
      id: 'dlp.cafe-hyperion', type: 'restaurant', name: 'Café Hyperion', parkId: 'dlp', areaId: 'discoveryland',
      description: 'Large burger counter under an airship.', rating: 3, ratingReason: 'Quick and roomy.',
      location: { lat: 48.8752, lng: 2.7782 }, sources: src, review: 'draft', service: 'counter',
    },
    {
      id: 'dlp.walts', type: 'restaurant', name: "Walt's – An American Restaurant", parkId: 'dlp', areaId: 'main-street',
      description: 'Table-service restaurant on Main Street.', rating: 4, ratingReason: 'Calm sit-down meal.',
      location: { lat: 48.8712, lng: 2.7790 }, sources: src, review: 'draft', service: 'table', mealMin: 75,
    },
    {
      id: 'dlp.parade', type: 'show', name: 'Disney Stars on Parade', parkId: 'dlp', areaId: 'main-street',
      description: 'Daily parade from Fantasyland to Town Square.', rating: 4, ratingReason: 'Big floats.',
      sources: src, review: 'draft', durationMin: 30, times: ['13:30', '17:30'], arriveEarlyMin: 20,
    },
    {
      id: 'daw.avengers-flight-force', type: 'attraction', name: 'Avengers Assemble: Flight Force', parkId: 'daw', areaId: 'avengers-campus',
      description: 'Launched indoor coaster with inversions.', rating: 4, ratingReason: 'Strong thrills.',
      location: { lat: 48.8654, lng: 2.7794 }, sources: src, review: 'draft',
      durationMin: 2, minHeightCm: 120, thrill: 5, scare: 1, waitStats: { avgMin: 30, avgMaxMin: 60, years: [2023, 2024, 2025] },
    },
  ],
}
