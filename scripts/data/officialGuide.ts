/**
 * Parses the text of the official Disneyland Park accessibility guide
 * (`pdftotext -raw` of the one-page poster). Each entry starts with its map number and name.
 */

export interface GuideEntry {
  /** Number on the official map. */
  number: number
  /** Name as printed, with ®/TM marks removed and spaces normalised. */
  name: string
  /** "Duration: About N minutes". */
  durationMin?: number
  /** "Attraction may frighten younger guests." */
  frightening: boolean
  /** Lines mentioning a minimum or maximum height, as printed. */
  heightNotes: string[]
}

const ENTRY_START = /^(\d{1,2}) ([A-Za-zÀ-ÿ"“'].*)$/

export function cleanGuideName(name: string): string {
  return name
    .replace(/®|TM|™/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseOfficialGuide(text: string): GuideEntry[] {
  const lines = text.split('\n').map((l) => l.trim())
  const starts = lines.flatMap((line, i) => (ENTRY_START.test(line) ? [i] : []))
  return starts.map((start, k) => {
    const body = lines.slice(start, starts[k + 1] ?? lines.length)
    const joined = body.join('\n')
    const [, num] = ENTRY_START.exec(body[0]!)!
    // The name runs from the start line up to the "|" that precedes the duration (or the line end).
    const head = body.slice(0, 3).join(' ').replace(/^\d{1,2} /, '')
    const name = cleanGuideName(head.includes('|') ? head.slice(0, head.indexOf('|')) : body[0]!.replace(/^\d{1,2} /, ''))
    const duration = /Duration: About (\d+) minutes?/.exec(joined)
    return {
      number: Number(num),
      name,
      durationMin: duration ? Number(duration[1]) : undefined,
      frightening: /may frighten younger guests/i.test(joined),
      heightNotes: body.filter((l) => /(minimum|maximum) height/i.test(l)),
    }
  })
}

/** Finds the entry whose name matches, ignoring case, accents, marks and punctuation. */
export function findGuideEntry(entries: GuideEntry[], name: string): GuideEntry | undefined {
  const key = (s: string) =>
    cleanGuideName(s)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const wanted = key(name)
  return entries.find((e) => key(e.name) === wanted)
}
