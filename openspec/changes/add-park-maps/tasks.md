# Tasks

## 1. Data model and official sources

- [x] 1.1 Extend the catalog schema (design Decision 7): `officialUrl` (only `https://www.disneylandparis.com/...`), `locationApproximate`, attraction `heightSource` (`official` | `corroborated` | `draft`), and park `officialMapUrl` / `officialMapLabel`. Verify with schema tests that accept a valid sample and reject an official link on another host and an unknown height level
- [x] 1.2 Save the official Disneyland Park guide as text in `data/raw/official-guide-dlp.txt` from `collect.ts` (`pdftotext -raw`), and write `scripts/data/officialGuide.ts` to extract each entry's duration and "may frighten younger guests" flag. Verify parser tests against the committed text: Big Thunder Mountain is 5 minutes and frightening, and Pirates of the Caribbean is 10 minutes
- [x] 1.3 Extend `npm run data`'s report with the official-guide differences (durations, frightening rides with scariness None) and the items without an official link; generate the new height column in `data/REVIEW.md`. Verify a fixture test where a mismatched duration and a missing link both appear in the report

## 2. Curated data

- [x] 2.1 Update Disneyland Park curated data from the guide: official durations, scariness at least Mild for every ride the guide says may frighten younger guests, Autopia's height as `official`, and the guide added to those items' sources. Verify `npm run data` reports no guide differences
- [x] 2.2 Reassess every attraction's height level: `corroborated` only where Wikipedia or one guide agrees with at least one other independent source (including "no minimum height"); otherwise `draft`. Record the sources used. Verify `data/REVIEW.md` lists each attraction with its level and the remaining drafts
- [x] 2.3 Add approximate positions (`locationApproximate: true`) for Meet Mickey Mouse, Princess Pavilion and Welcome to Starport, placed from neighbouring rides and the official map. Verify every catalog item now has a location
- [x] 2.4 Find official page addresses by web search for attractions, shows and restaurants of both parks, recording only addresses returned on `www.disneylandparis.com`, each with a source entry. Add park `officialMapUrl`: the guide PDF for Disneyland Park and a search-confirmed official page for Disney Adventure World. Verify the schema passes and the report's "no official link" list contains only items no search returned

## 3. Map logic (pure modules)

- [x] 3.1 Add the local metre projection and park bounds (Decision 1). Verify unit tests: the park entrance projects inside the bounds, 0.001° of latitude is about 111 m, and x distances are scaled by cos(latitude)
- [x] 3.2 Add area zone geometry (convex hull with fallbacks for one or two points, Decision 2) and greedy label placement (Decision 3). Verify unit tests for a hull of a square plus an inner point, the one- and two-point cases, and that overlapping labels keep the higher-rated one
- [x] 3.3 Add map walking helpers: walk from the selected day's last stop, walk to each area, and the area-to-area table (Decision 4). Verify that a unit test's "walk from last stop" equals the walk `scheduleDay` computes after appending the same item, both within a park and across parks, and that the table is symmetric with a dash on the diagonal
- [x] 3.4 Add the route model from `scheduleDay` slots: day-wide stop numbers, solid segments within the shown park, and dashed park-change segments to the entrance (Decision 5). Verify unit tests for three Disneyland Park stops numbered 1, 2, 3, and for Big Thunder Mountain → Frozen Ever After producing an outgoing dashed segment labelled "to Disney Adventure World"

## 4. Map UI

- [x] 4.1 Add `catalogView` and `mapParkId` session state and the "List | Map" switch in the catalog header (Decision 6). Verify a component test: switching to Map shows the map and keeps the current filters
- [x] 4.2 Build the map view: park switch, area zones and labels, markers by type, greyed unsuitable items, emphasised search matches, dashed approximate markers, zoom buttons, pinch, drag and wheel, and the official map link. Verify component tests for the zone count (five per park), an attraction filter hiding restaurants, and a greyed 120 cm ride with a 110 cm profile
- [x] 4.3 Build the item card (name, park and area, key facts, walk from the last stop, walks to areas, Add, Details, the approximate note) and the area walking times sheet. Verify component tests for "No day yet" (no last-stop line), "Add from the map", and the table rows for Disneyland Park
- [x] 4.4 Draw the selected day's route (numbered stops, solid and dashed segments, other-park marker). Verify a component test with a cross-park day showing stops 1 and 3 on Disneyland Park and the "to Disney Adventure World" marker

## 5. Catalog details

- [ ] 5.1 Add the "Official page" link (only when `officialUrl` is set), "Open in Maps" (Decision 9, with the approximate wording), and the height check level with the posted-signs advice to item details. Verify component tests: Big Thunder Mountain's official link, the Maps link containing Phantom Manor's coordinates, Autopia marked official, and an unverified ride marked not yet verified

## 6. Integration checks

- [ ] 6.1 Add Playwright tests at 390×844: switch to Map, zoom in, tap Phantom Manor after planning Big Thunder Mountain and see the same walk as the timeline then shows, add from the card, see numbered stops, open the area table, reload offline and still see the map; and at 1280×800, check the map renders beside the plan. Verify `npm run e2e` passes
- [ ] 6.2 Update the README and `data/README.md` (map view, official links, height levels, official guide snapshot); verify the documented commands run as written
- [ ] 6.3 Run `openspec validate add-park-maps --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`, push, and check CI; verify all pass
- [ ] 6.4 Owner checks the deployed map on a phone (find items by area, see the route of a park-hopping day, open an official page and "Open in Maps") and reviews the remaining draft heights in `data/REVIEW.md`; verify findings are fixed or recorded as follow-ups
