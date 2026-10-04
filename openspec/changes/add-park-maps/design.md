# Design

## Context

See proposal.md (Why) and the delta specs (`park-map`, `park-catalog`). Facts that shape the approach:

- **Map scale:** each park spans about 580 × 580 m (Disneyland Park) and 530 × 480 m (Adventure World). On a 360 px phone that is about 0.6 px per metre. Attractions are a median 35 m apart in Disneyland Park (closest pair 15 m); Fantasyland has 12 attractions and 7 restaurants. Labels collide at full-park zoom, so zoom and label culling are needed.
- **Coordinates:** 107 of 110 items have coordinates from ThemeParks.wiki. Meet Mickey Mouse, Princess Pavilion and Welcome to Starport do not; today they fall back to their area centre.
- **Walking estimates:** `src/domain/walking.ts` already has `walkBetween` (park changes routed through both entrances), `walkMinutes`, `areaCentres` and `locate`. `scheduleDay` returns the slots of the selected day.
- **Official guide:** `brochure.disneylandparis.com/HCP/EN/adlp/common/data/catalogue.pdf` is reachable (a one-page poster dated 31 Aug 2026). `pdftotext` is installed. The guide contains the park map, about 20 "Duration: About N minutes" values, "may frighten younger guests" flags, play-area age and maximum-height notes, and Autopia's 1.32 m / 81 cm rule. It does not contain the other minimum heights. No Adventure World edition was found at the obvious addresses.
- **Official pages:** they follow `https://www.disneylandparis.com/en-int/attractions/disneyland-park/<slug>` (seen in search results). The site itself can't be fetched from the build environment because it sends requests to a virtual queue, so each address must come from a search result.
- **Catalog state:** filters live in the Zustand store (`filters`, session only). The catalog list is `src/components/CatalogList.tsx`.

## Goals / Non-Goals

**Goals:**
- A map drawn entirely from bundled data, offline, with no map library or map tiles.
- One source of walking minutes for the timeline, the map card, the area table and the route.
- Curated data stays the single source of truth; official sources feed it through a reported comparison, never an automatic overwrite.

**Non-Goals:**
- Background map imagery, live positions or turn-by-turn directions ("Open in Maps" hands that to the device).
- Dragging items from the map into the plan. The card's Add button covers it.
- An official Adventure World guide (none found). Its durations stay as they are.

## Decisions

### 1. Own SVG map in metres
Each park is projected locally (equirectangular around the park's centre, with x scaled by cos(latitude)) into metres. It's drawn as one `<svg>` whose `viewBox` is in metres. Zoom (1×–4×) and pan just change the `viewBox`.
- **Input:** buttons; pinch via two active pointers (ratio of their distance); drag via one pointer; wheel on desktop.
- The map box has a fixed height (about 60 % of the screen on phones) and `touch-action: none`, so gestures don't scroll the page.

*Alternatives:*
- Leaflet or MapLibre with tiles: rejected because they need the network, a new dependency and tile usage terms.
- `d3-zoom`: rejected because it's a dependency for about 80 lines of pointer handling.

### 2. Area zones by thick rounded strokes
Each area is drawn as the convex hull of its items' positions, rendered as a path with a wide stroke (about 50 m) using round joins and caps, filled in the area colour at low opacity. This one technique pads the hull and also handles areas with only one or two points (a dot or a capsule), such as World of Frozen. Area labels sit at the area centre from `areaCentres`.

*Alternatives:* computed polygon offsets or Voronoi cells. Both need more geometry and look worse for sparse areas.

### 3. Markers and label culling
- Attractions are circles; restaurants small squares; shows small diamonds. Unsuitable items are greyed out; search matches are emphasised.
- Labels go to the right of attraction markers. After every zoom or pan they're placed greedily in screen space, best-rated first, and a label that would overlap one already placed is hidden.
- Restaurant and show labels appear only from 2.5× zoom. The selected item's label always shows.
- Approximate items get a dashed outline.

### 4. Walking times reuse the planner
- **Card, "from your last stop":** `walkBetween(lastStop, item, catalog)`, where `lastStop` is the last scheduled slot of `scheduleDay(selectedDay)`. That is the same walk the timeline would compute if the item were appended. A unit test checks this against `scheduleDay` with the item actually appended.
- **Card, "to each area":** `walkMinutes(itemLocation, areaCentre)` within the item's park.
- **Area table:** `walkMinutes(centreA, centreB)` for each pair of areas in the park.

### 5. Route from the schedule
The route is built from `scheduleDay` slots (missing items skipped). Stop numbers are each scheduled item's position in the whole day, so a Disneyland Park map can show 1, 2, 5 when stops 3 and 4 are in the other park. Consecutive stops in the shown park are joined with a solid line. A park change draws a dashed line from the stop to the entrance with a "to Disney Adventure World" marker, and the incoming side draws one from the entrance to the stop.

### 6. Catalog integration
- The store's session state gains `catalogView: 'list' | 'map'` and `mapParkId`.
- The map shows `filters.parkId` when a single park is selected. With "All parks" it shows `mapParkId`, which defaults to the park of the selected day's last item, else Disneyland Park.
- Switching parks on the map updates `mapParkId` and, if a single-park filter is active, that filter too.
- The map uses `filterCatalog` for its items, so filters, search and profile behave identically in both views.
- The card's Add uses `useAddToDay`; Details opens the existing `ItemDetail`.

### 7. Data model additions
| Where | Field | Rules |
|---|---|---|
| Item | `officialUrl?` | Must be `https://www.disneylandparis.com/...`; checked by the schema |
| Item | `locationApproximate?: boolean` | |
| Attraction | `heightSource: 'official' \| 'corroborated' \| 'draft'` | Now shipped to the app, not curated-only. Existing `wikipedia` values are reassessed, not renamed blindly |
| Park | `officialMapUrl`, `officialMapLabel` | |

**Height levels:**
- `official`: stated in an official Disneyland Paris document (the guide, e.g. Autopia).
- `corroborated`: Wikipedia or one guide agrees with at least one other independent source, including "no minimum height".
- `draft`: everything else.

`ItemDetail` shows the level next to the height, together with the existing "follow posted signs" advice.

*Added during implementation:* the official guide labels exactly the rides that have a minimum height as "Attraction subject to physical restrictions": Big Thunder Mountain, Star Tours, Hyperspace Mountain, Autopia and Indiana Jones. For Disneyland Park, a ride without that label in the guide, plus an independent source saying "no minimum height", therefore counts as `corroborated`. Where sources disagree (Spider-Man W.E.B. Adventure: "any height" vs "1.02 m recommended"), the height stays `draft`.

### 8. Official sources feed curated data through the build report
- `collect.ts` also saves the guide's text (`pdftotext -raw`) as `data/raw/official-guide-dlp.txt`. The 1.5 MB PDF itself is not committed.
- A parser (`scripts/data/officialGuide.ts`) extracts duration and "may frighten younger guests" per numbered entry.
- `npm run data` adds a report section listing curated durations that differ from the guide, frightening rides with scariness None, and items without `officialUrl`.
- Curated YAML is then updated by hand and stays the truth, as in the existing pipeline.
- Official page addresses are researched with web search during implementation. Only addresses that appear in results on `www.disneylandparis.com` are recorded, each with a source entry.

### 9. "Open in Maps"
It links to `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>` (Google's documented, keyless Maps URLs format, which opens the app on Android and iOS when installed, otherwise the web). It's labelled "Open in Maps (approximate)" for approximate items. It opens in a new tab like other external links.

## Risks / Trade-offs

- **[Label clutter in Fantasyland]** → Greedy culling, best-rated first, plus zoom; the full list is always one switch away.
- **[Gestures fight page scrolling]** → The map box has a fixed height and `touch-action: none`; the page still scrolls outside it.
- **[Approximate positions mislead]** → Dashed markers and an "approximate" note on the card and in "Open in Maps".
- **[Guide durations include boarding and are rounded]** → They suit planning better than raw ride time. They're cited as "about N minutes" from the guide.
- **[Official addresses change]** → The build report lists items without links; a dead link only affects that item's button.
- **[Search results mislead about facts]** → Search is used only to find addresses, never for heights. Heights rely on the guide or on agreeing sources, and stay draft otherwise.

## Migration Plan

No saved-data changes: the new session state isn't persisted and trips are unchanged, so no storage migration. Deployment is as before: merge to `main` deploys to GitHub Pages. Rollback is reverting the merge.

## Open Questions

- The exact positions of Meet Mickey Mouse, Princess Pavilion and Welcome to Starport. They're placed approximately from neighbouring rides and the official map; any later correction is a data edit only.
