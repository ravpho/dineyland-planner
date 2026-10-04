# Catalog data

The app's catalog (`src/data/catalog.json`) is generated from two kinds of input:

| Folder | What | Edited by |
|---|---|---|
| `data/raw/` | Snapshots fetched from ThemeParks.wiki and Queue-Times, and the official Disneyland Park guide as text | `npm run data:collect` only |
| `data/curated/` | Hand-reviewed facts: descriptions, ratings, heights, thrill, scariness, show durations, opening hours | People |

`npm run data` merges them, validates the result and writes:

- `src/data/catalog.json` – what the app ships (committed).
- `data/build-report.md` – unmatched source items, attractions without statistics, differences from the official guide, and items without an official page link.
- `data/REVIEW.md` – checklist of every attraction's height, height check level, thrill, scariness and sources.

The build never writes to `data/curated/`.

## Commands

```bash
npm run data:collect   # fetch fresh snapshots into data/raw/ (needs network)
npm run data           # rebuild catalog.json, build-report.md and REVIEW.md (offline)
npm test               # includes parser tests against the committed snapshots
```

`data:collect` needs network access to `api.themeparks.wiki`, `queue-times.com` and `brochure.disneylandparis.com`, and the `pdftotext` command (package `poppler-utils`). It fetches about 14 files and waits a second between Queue-Times requests. The official guide PDF is converted to `data/raw/official-guide-dlp.txt`; the PDF itself is not kept. Commit the new snapshots together with the rebuilt catalog.

## Sources

| Source | Used for |
|---|---|
| ThemeParks.wiki entity list | Ids, names and map coordinates of attractions, restaurants and shows |
| ThemeParks.wiki live data (`themeparks-live.json`) | Show start times on the collection day, used as typical times |
| ThemeParks.wiki schedules | Opening hours for the next month; other months are estimates in the curated files |
| Queue-Times park statistics | Each ride's average and average-maximum queue time and crowd level by month for 2023–2025 (`STATS_YEARS` in `scripts/data/sources.ts`). Rides that only appear in 2026 (`FALLBACK_YEARS`) use 2026 ride averages. |
| Official Disneyland Park accessibility guide ([PDF](https://brochure.disneylandparis.com/HCP/EN/adlp/common/data/catalogue.pdf), saved as text) | Durations ("about N minutes"), rides that may frighten younger guests, which rides have physical restrictions, Autopia's height rule, play-area ages. `npm run data` reports any curated duration that differs from it. No Disney Adventure World edition was found. |
| Official Disneyland Paris website | Each item's "Official page" link (`officialUrl`). Addresses were found by web search and are recorded only when a result on `www.disneylandparis.com` showed them; they are never guessed. |
| Wikipedia | Ride durations, some heights, descriptions |
| Independent guides (dlptips.com, The Better Vacation and others, cited per item) | Cross-checking minimum heights |

Queue-Times asks to be credited: the app's about page shows "Powered by Queue-Times.com".

## Curated file format

One file per park. Matching between sources uses the ids recorded here, never fuzzy names.

```yaml
park:
  id: dlp                      # dlp | daw
  name: Disneyland Park
  themeparksId: <uuid>         # ThemeParks.wiki park id
  entrance: { lat: 48.87, lng: 2.78 }
  areas: [{ id: frontierland, name: Frontierland }]
  hours: [{ open: '09:30', close: '22:00' }, ...]   # 12 entries, January..December
  hoursSources: [{ label: ..., url: ... }]
  officialMapUrl: https://...  # official park map or park page, linked from the map
  officialMapLabel: ...
items:
  - id: dlp.big-thunder-mountain   # <park>.<slug>, stable: saved trips refer to it
    type: attraction               # attraction | restaurant | show
    name: Big Thunder Mountain
    areaId: frontierland
    themeparksId: <uuid>           # location comes from ThemeParks.wiki unless `location` is set
    officialUrl: https://www.disneylandparis.com/...  # optional; only search-confirmed addresses
    queueTimesId: 25               # attractions: Queue-Times ride id, from the stats page links
    officialGuideNumber: 9         # optional; entry number in the official guide (curated only)
    location: { lat: 48.87, lng: 2.78 }  # optional; overrides ThemeParks.wiki
    locationApproximate: true      # optional; position placed by hand, shown as approximate
    description: ...               # at most 300 characters
    rating: 5                      # 1-5 "worth it"
    ratingReason: ...
    durationMin: 4
    minHeightCm: 102               # or null
    heightSource: corroborated     # official | corroborated | draft (see below), shown in the app
    ageRule: ...                   # optional
    thrill: 4                      # 1 Gentle, 2 Mild, 3 Moderate, 4 Thrilling, 5 Intense
    scare: 1                       # 0 None, 1 Mild, 2 Spooky, 3 Scary
    fixedWaitMin: 0                # attractions without Queue-Times statistics
    sources: [{ label: ..., url: ... }]
    review: draft                  # draft | reviewed
  # restaurants: service (counter | table | snack), optional mealMin
  # shows: durationMin, times ['HH:MM', ...], arriveEarlyMin
excluded:                      # source items deliberately left out, each with a reason
  themeparks: [{ id: <uuid>, name: ..., reason: ... }]
  queueTimes: [{ id: 2714, name: ..., reason: ... }]
```

## Height check levels

Each attraction's `heightSource` says how its height rule was checked. The app shows it next to the height, always with the advice to follow the signs at the attraction.

| Level | Meaning |
|---|---|
| `official` | Stated in an official Disneyland Paris document (for example Autopia's 1.32 m / 81 cm rule in the guide). |
| `corroborated` | Wikipedia or one guide agrees with at least one other independent source, including "no minimum height". For Disneyland Park, the official guide marks exactly the rides with a minimum height as "subject to physical restrictions", which counts as one source. |
| `draft` | Not verified yet, or the sources disagree. These are listed in `data/REVIEW.md` for review. |

Record every source used for a height check in the item's `sources`.

## Adding or fixing an entry

1. Edit the curated YAML. For a new ride, copy its ThemeParks.wiki id from `data/raw/themeparks-children.json` and its Queue-Times id from the ride link in `data/raw/queue-times/<park>-<year>.html`.
2. Run `npm run data` and check `data/build-report.md` shows nothing unexpected.
3. When you have checked an attraction's facts, set `review: reviewed`.
