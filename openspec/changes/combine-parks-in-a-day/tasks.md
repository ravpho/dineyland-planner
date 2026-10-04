# Tasks

## 1. Day model and saved data

- [x] 1.1 Remove `Day.parkId` (design Decision 1). In the store: `newDay` defaults to the earliest opening and latest closing of both parks (Decision 4); `addItem` accepts items from either park; remove `setDayPark` and the `other-park` result; the new-trip length defaults to 1. Verify with store unit tests for "Item from the other park" (both added in order), "Default window covers both parks" (fixture where the parks' hours differ) and "One day by default"
- [x] 1.2 Raise storage to schema version 2 with a migration that drops `parkId` from every day (Decision 5). Verify unit tests load a v1 sample and a v0 sample into the same days, windows and items, and that a v3 sample is still left alone as "newer"
- [x] 1.3 Change the share format to `v: 2` without the per-day park, and keep decoding `v: 1` links (Decision 5). Verify unit tests: v2 round trip, a committed v1 link string imports with the same days, windows and items, and the 7-day × 15-item size test stays under 2,000 characters

## 2. Scheduling across parks

- [x] 2.1 Add `walkBetween` with routing through both entrances and the `PARK_CHANGE_MIN = 5` constant (Decision 2). Verify unit tests: a same-park walk equals today's `walkMinutes`; a cross-park walk equals the summed-distance formula plus 5 and reports `parkChange: true`; Peter Pan's Flight → Frozen Ever After on the real catalog is 38 minutes
- [x] 2.2 Update `scheduleDay`: start at the entrance of the first item's park, look up waits by each item's own park (Decision 3), store `parkChange` on slots, expose `parks`, and stop marking other-park items as missing. Verify unit tests for "Day that starts in the second park", "Switch parks", "Each park's own crowd level", and that every existing day-schedule test still passes

## 3. Catalog

- [x] 3.1 Make `CatalogFilters.parkId` accept `'all'` (the default), have `clearFilters` return to `'all'`, add the `'duration'` sort (ride, meal or show length), and add a schema check that area ids are unique across parks (Decision 6). Verify unit tests for "Both parks by default", "Clear filters" and "Shortest first", and a schema test that rejects a duplicated area id
- [x] 3.2 Update the catalog UI: sort select in the header next to search (labelled Name, Rating, Busiest wait, Duration) and removed from the filter panel; park filter with "All parks"; area chips grouped by park; a "Park · Area" line on every row; match count without a park name unless one park is selected; remove the effect that copied the day's park into the filter. Verify a component test for the row label and a Playwright test that changes the sort without opening the filters and sees both parks listed

## 4. Plan screens

- [x] 4.1 Remove the park select from day settings, show the parks a day uses on its tab ("DLP", "DAW", "DLP + DAW"), drop the other-park toast from `useAddToDay`, and preset the new-trip form to 1 day. Verify component tests for the tab label and the form default
- [x] 4.2 Label park-change steps in the timeline ("Walk to Disney Adventure World · park change") and show the two-park ticket reminder only when a day's items span both parks. Verify component tests for "Park-hopping day" and "Single-park day"
- [x] 4.3 Update the Playwright tests that relied on one park per day (7.1, 7.2, 7.6, the catalog count) and add a park-hopping test at 390×844: one day with Big Thunder Mountain, then Frozen Ever After, then Phantom Manor, showing two park-change steps, the ticket reminder and a share-link round trip. Verify `npm run e2e` passes
- [x] 4.4 Update the README feature list to mention combining both parks in one day. Verify the README describes the new behaviour and its commands still run as written

## 5. Integration checks

- [x] 5.1 Run `openspec validate combine-parks-in-a-day --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`; verify all pass and CI on the branch is green
- [ ] 5.2 Owner opens the deployed update on the phone that already holds a saved trip; verify the trip is still there and a park-hopping day can be planned
- [ ] 5.3 When archiving, update the `trip-itinerary` main spec Purpose so it no longer says "one park … for each day"; verify `openspec validate --specs --strict` passes after the archive
