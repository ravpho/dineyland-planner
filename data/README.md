# Catalog data

The app's catalog (`src/data/catalog.json`) is generated from two kinds of input:

| Folder | What | Edited by |
|---|---|---|
| `data/raw/` | Snapshots fetched from ThemeParks.wiki and Queue-Times | `npm run data:collect` only |
| `data/curated/` | Hand-reviewed facts: descriptions, ratings, heights, thrill, scariness, show durations, opening hours | People |

`npm run data` merges them, validates the result and writes:

- `src/data/catalog.json` – what the app ships (committed).
- `data/build-report.md` – unmatched source items and attractions without statistics.
- `data/REVIEW.md` – checklist of every attraction's height, thrill, scariness and sources.

The build never writes to `data/curated/`.

## Commands

```bash
npm run data:collect   # fetch fresh snapshots into data/raw/ (needs network)
npm run data           # rebuild catalog.json, build-report.md and REVIEW.md (offline)
npm test               # includes parser tests against the committed snapshots
```

`data:collect` needs network access to `api.themeparks.wiki` and `queue-times.com`. It fetches about 13 pages and waits a second between Queue-Times requests. Commit the new snapshots together with the rebuilt catalog.

## Sources

| Source | Used for |
|---|---|
| ThemeParks.wiki entity list | Ids, names and map coordinates of attractions, restaurants and shows |
| ThemeParks.wiki live data (`themeparks-live.json`) | Show start times on the collection day, used as typical times |
| ThemeParks.wiki schedules | Opening hours for the next month; other months are estimates in the curated files |
| Queue-Times park statistics | Each ride's average and average-maximum queue time and crowd level by month for 2023–2025 (`STATS_YEARS` in `scripts/data/sources.ts`). Rides that only appear in 2026 (`FALLBACK_YEARS`) use 2026 ride averages. |
| Wikipedia | Ride durations, some heights, descriptions |

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
items:
  - id: dlp.big-thunder-mountain   # <park>.<slug>, stable: saved trips refer to it
    type: attraction               # attraction | restaurant | show
    name: Big Thunder Mountain
    areaId: frontierland
    themeparksId: <uuid>           # location comes from ThemeParks.wiki unless `location` is set
    queueTimesId: 25               # attractions: Queue-Times ride id, from the stats page links
    description: ...               # at most 300 characters
    rating: 5                      # 1-5 "worth it"
    ratingReason: ...
    durationMin: 4
    minHeightCm: 102               # or null
    heightSource: wikipedia        # wikipedia | draft (curated only, shown in REVIEW.md)
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

## Adding or fixing an entry

1. Edit the curated YAML. For a new ride, copy its ThemeParks.wiki id from `data/raw/themeparks-children.json` and its Queue-Times id from the ride link in `data/raw/queue-times/<park>-<year>.html`.
2. Run `npm run data` and check `data/build-report.md` shows nothing unexpected.
3. When you have checked an attraction's facts, set `review: reviewed`.
