import { cp, mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { catalogSchema, type Attraction, type Catalog } from '../../src/domain/catalog'
import { runBuild, type BuildReport } from './build'

const FIXTURE = 'scripts/data/fixtures/curated'

describe('data build with fixture curated files', () => {
  let dir: string
  let report: BuildReport
  let catalog: Catalog
  const before = new Map<string, Buffer>()

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'planner-build-'))
    await cp(FIXTURE, join(dir, 'curated'), { recursive: true })
    for (const f of await readdir(join(dir, 'curated'))) before.set(f, await readFile(join(dir, 'curated', f)))
    report = await runBuild({
      curatedDir: join(dir, 'curated'),
      rawDir: 'data/raw',
      catalogFile: join(dir, 'catalog.json'),
      reportFile: join(dir, 'report.md'),
      reviewFile: join(dir, 'REVIEW.md'),
    })
    catalog = JSON.parse(await readFile(join(dir, 'catalog.json'), 'utf8'))
  })

  test('produces a valid catalog with statistics from all years', () => {
    expect(catalogSchema.safeParse(catalog).success).toBe(true)
    const thunder = catalog.items.find((i) => i.id === 'dlp.big-thunder-mountain') as Attraction
    expect(thunder.waitStats?.years).toEqual([2023, 2024, 2025])
    expect(thunder.waitStats?.avgMin).toBeGreaterThan(20)
    expect(thunder.location).toEqual({ lat: 48.871528, lng: 2.774787 })
  })

  test('lists Disneyland Park first, whatever the file order', () => {
    expect(catalog.parks.map((p) => p.id)).toEqual(['dlp', 'daw'])
  })

  test('normalises monthly crowd factors to a mean of 1', () => {
    for (const park of catalog.parks) {
      const avg = park.monthFactors.reduce((a, b) => a + b, 0) / 12
      expect(avg).toBeCloseTo(1, 2)
    }
  })

  test('reports rides that no curated entry matches', async () => {
    expect(report.unmatchedQueueTimes.map((r) => r.name)).toContain("Peter Pan's Flight")
    expect(report.unmatchedThemeparks.length).toBeGreaterThan(0)
    expect(await readFile(join(dir, 'report.md'), 'utf8')).toMatch(/Peter Pan's Flight/)
  })

  test('reports differences from the official guide and items without an official link', async () => {
    expect(report.guideDifferences).toContainEqual({
      itemId: 'dlp.big-thunder-mountain', name: 'Big Thunder Mountain', field: 'duration', curated: '4 min', guide: 'about 5 min',
    })
    expect(report.withoutOfficialUrl.map((x) => x.itemId)).toContain('dlp.big-thunder-mountain')
    expect(report.guideEntriesUnlinked.map((e) => e.name)).toContain('Phantom Manor')
    const md = await readFile(join(dir, 'report.md'), 'utf8')
    expect(md).toMatch(/Official guide differences \(1\)/)
    expect(md).toMatch(/Big Thunder Mountain \(dlp\.big-thunder-mountain\) duration: curated 4 min, guide about 5 min/)
    expect(md).toMatch(/Items without an official page link/)
  })

  test('writes a review checklist row per attraction', async () => {
    const review = await readFile(join(dir, 'REVIEW.md'), 'utf8')
    expect(review).toMatch(/\| Big Thunder Mountain \| Frontierland \| 102 cm \| draft \|/)
  })

  test('leaves curated files byte-identical', async () => {
    for (const [f, bytes] of before) expect((await readFile(join(dir, 'curated', f))).equals(bytes)).toBe(true)
  })
})
