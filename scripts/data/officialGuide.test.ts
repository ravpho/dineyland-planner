import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { findGuideEntry, parseOfficialGuide } from './officialGuide'
import { OFFICIAL_GUIDE_DLP_TEXT_FILE } from './sources'

const entries = parseOfficialGuide(readFileSync(OFFICIAL_GUIDE_DLP_TEXT_FILE, 'utf8'))

describe('official Disneyland Park guide parser (committed text)', () => {
  test('Big Thunder Mountain: about 5 minutes, may frighten younger guests', () => {
    expect(findGuideEntry(entries, 'Big Thunder Mountain')).toMatchObject({ number: 9, durationMin: 5, frightening: true })
  })

  test('Pirates of the Caribbean: about 10 minutes', () => {
    expect(findGuideEntry(entries, 'Pirates of the Caribbean')?.durationMin).toBe(10)
  })

  test('names split over two lines are joined, marks removed', () => {
    expect(findGuideEntry(entries, 'Star Wars Hyperspace Mountain')).toMatchObject({ number: 43, durationMin: 5 })
    expect(findGuideEntry(entries, 'Indiana Jones and the Temple of Peril')?.durationMin).toBe(5)
    expect(findGuideEntry(entries, 'Autopia')?.durationMin).toBe(7)
  })

  test('height notes are kept as printed', () => {
    expect(findGuideEntry(entries, 'Autopia')?.heightNotes.join(' ')).toMatch(/1m32.*81 ?cm/s)
  })

  test('parses a plausible number of entries, each with a name', () => {
    expect(entries.length).toBeGreaterThan(30)
    expect(entries.every((e) => e.name.length > 2)).toBe(true)
    expect(entries.filter((e) => e.durationMin !== undefined).length).toBeGreaterThanOrEqual(25)
  })
})
