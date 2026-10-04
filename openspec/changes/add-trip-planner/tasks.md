# Tasks

## 1. Project setup

- [ ] 1.1 Scaffold a Vite + React + TypeScript app with Tailwind CSS at the repository root; verify `npm run dev` serves a page and `npm run build` writes `dist/`
- [ ] 1.2 Add ESLint, Vitest and Playwright (configured to use the pre-installed Chromium at `/opt/pw-browsers`) with scripts `lint`, `typecheck`, `test`, `e2e`; verify each script runs and exits 0 with a placeholder test
- [ ] 1.3 Extend `.claude/hooks/session-start.sh` to run `npm install` when `package.json` exists; verify by running the hook with `CLAUDE_CODE_REMOTE=true` in a clean checkout and seeing `node_modules/` created
- [ ] 1.4 Add hash-based routing with placeholder screens for `#/catalog`, `#/plan`, `#/about` and `#/import/:data`; verify with a Vitest + React Testing Library test that each route renders its screen

## 2. Catalog data model and pipeline

- [ ] 2.1 Define the catalog types and a zod schema (parks, areas, entrance coordinates, attractions, restaurants, shows, thrill and scariness scales, sources, data date); verify unit tests accept a valid sample and reject samples with a missing park, an out-of-range thrill level and a description over 300 characters
- [ ] 2.2 Write `scripts/data/collect.ts` to save the ThemeParks.wiki children list and the Queue-Times stats pages for parks 4 and 28, years 2023–2025, into `data/raw/`; run it and verify all 7 snapshot files exist and are non-empty
- [ ] 2.3 Write the Queue-Times parser (per-ride average and average-maximum queue time, crowd level by month); verify Vitest tests against the committed snapshots return values for known rides and 12 monthly crowd levels per park and year
- [ ] 2.4 Write `scripts/data/build.ts` (`npm run data`) that merges curated YAML with parsed statistics into `src/data/catalog.json`, validates it with the schema, and writes `data/build-report.md` listing unmatched source items and attractions without statistics; verify with a fixture-based test that the report names an unmatched ride and that curated files are byte-identical after the run
- [ ] 2.5 Document the data pipeline (commands, file layout, how to add an entry, which years are used) in `data/README.md`; verify the documented commands run as written

## 3. Curated catalog content

- [ ] 3.1 Draft `data/curated/disneyland-park.yaml` with areas, entrance coordinates and every attraction, including meet-and-greets that have queues. Each entry gets ids, Queue-Times name, a description of at most 300 characters, a rating with reason, duration, minimum height, age rules, thrill, scariness, `fixedWaitMin` where there are no statistics, sources and `review: draft`, based on Wikipedia, ThemeParks.wiki and Queue-Times. Verify `npm run data` reports no unmatched Disneyland Park attractions
- [ ] 3.2 Draft `data/curated/disney-adventure-world.yaml` the same way for Disney Adventure World; verify `npm run data` reports no unmatched attractions for that park
- [ ] 3.3 Add the restaurants of both parks (service type, description, rating, meal-duration override where needed, sources); verify the build report lists no unmatched ThemeParks.wiki restaurants other than ones deliberately excluded, each with a reason
- [ ] 3.4 Add the scheduled shows of both parks (typical start times, duration, `arriveEarlyMin`, area, sources), including the daytime parade and the evening fireworks; verify the schema test passes and each show has at least one start time
- [ ] 3.5 Add typical opening and closing times per park per month, marked as estimates with sources; verify the schema test passes and every month has hours for both parks
- [ ] 3.6 Generate `data/REVIEW.md`, a checklist table of every attraction's height, thrill, scariness and sources for the owner to confirm; verify the file lists every attraction in the catalog
- [ ] 3.7 Owner reviews `data/REVIEW.md`, heights first, and corrections are applied with entries set to `review: reviewed`; verify `npm run data` succeeds and the report shows the reviewed count

## 4. Planning logic (pure modules)

- [ ] 4.1 Implement the wait model (attractions with statistics, fixed-wait attractions, restaurants by service type and peak, shows with no wait) per design Decision 4; verify unit tests for every wait-estimates spec scenario (busier month, midday versus opening, multiples of 5, walk-through estimate, lunch peak, fireworks)
- [ ] 4.2 Implement walking time from coordinates with the area-centre fallback per design Decision 5; verify unit tests show neighbouring items get a shorter walk than opposite sides of the park and that an item without coordinates uses its area centre
- [ ] 4.3 Implement `scheduleDay` per design Decision 6; verify unit tests for every day-schedule spec scenario (first item times, wait recalculated after reordering, free time before a show, late show, table-service meal, fits, over with marked items, breakdown adding up, unsuitable item still scheduled) and that unknown items are skipped
- [ ] 4.4 Implement filtering, suitability reasons, accent- and case-insensitive search and sorting; verify unit tests for every catalog-filtering spec scenario and the park-catalog search scenarios
- [ ] 4.5 Implement share-link encoding and decoding with lz-string and zod validation; verify unit tests for the round trip, a damaged link failing cleanly, and a 7-day trip with 15 items per day encoding to under 2,000 characters

## 5. State and persistence

- [ ] 5.1 Build the Zustand store for trips: create, rename, delete, switch, change length, day park and window with defaults, add, remove with undo, reorder, show times, rejecting items from the other park, and removing items on park change after confirmation; verify unit tests for each trip-itinerary spec scenario that does not need the UI
- [ ] 5.2 Save to `localStorage` under a versioned key with migrations, a "storage unavailable" flag, and a rule that data saved with a newer schema version is left alone; verify unit tests for reload persistence, migration from a v0 sample, unavailable storage and newer-version data
- [ ] 5.3 Store the group profile (saved) and catalog filters (session only) with "clear filters" keeping the profile; verify unit tests for profile persistence and clear behaviour

## 6. Catalog screens

- [ ] 6.1 Build the catalog list (rows with name, type, rating and duration, plus height, thrill and wait range for the planned month on attractions), search box and match count; verify a component test renders rows and a Playwright test filters by typing "thunder"
- [ ] 6.2 Build the filter panel and group profile editor (park, area, type, height, maximum thrill, maximum scariness, greyed or hidden unsuitable items with reasons, clear filters, sort); verify a Playwright test sets a 110 cm profile, sees a 120 cm ride greyed out with "Needs 120 cm", then hides it
- [ ] 6.3 Build the item detail view for attractions, restaurants and shows, with a sources section and the "typical wait" explanation (years used, collection date); verify a component test per item type shows every field the park-catalog spec requires

## 7. Trip and day screens

- [ ] 7.1 Build trip management (create, rename, delete with confirmation, switch, change length with confirmation) and day settings (park, start and end time); verify a Playwright test creates a 3-day trip and sees the right dates
- [ ] 7.2 Build the day item list with tap-to-add from the catalog, the other-park message, a show time picker, remove with undo, and move-up/move-down buttons; verify a Playwright test covering add, other-park rejection, remove with undo and move up
- [ ] 7.3 Add dnd-kit reordering (200 ms long-press on touch, mouse, keyboard) and catalog-to-day dragging in the wide layout; verify Playwright tests reorder by touch drag at 390×844 and drop a catalog item into position at 1280×800
- [ ] 7.4 Render the timeline per item (walk, arrival, wait, start, end, free time, "N min late", marks for items past the window end, unsuitability marks, "No longer available"); verify component tests for each mark type
- [ ] 7.5 Add the fit summary and time breakdown, with the summary pinned to the bottom of the screen on phones; verify a Playwright test sees "Over by" change to "Fits" after removing an item and that the summary stays visible while scrolling a 15-item day
- [ ] 7.6 Add "Copy share link" and the import screen (confirm to add as a new trip, error for unreadable links); verify a Playwright test exports a trip, opens the link in a fresh browser context, imports it and sees identical days and items

## 8. App shell, offline and about

- [ ] 8.1 Build the responsive layouts (tabs below 768 px, side by side from 1024 px, 44 px minimum touch targets); verify a Playwright test at 360×740 finds no horizontal scroll and every button at least 44×44 px
- [ ] 8.2 Configure vite-plugin-pwa (manifest, icons, pre-cache of app and catalog, update prompt that keeps trips); verify a Playwright test loads the app, goes offline, reloads and still sees the catalog and saved trips, and a Lighthouse installability check passes
- [ ] 8.3 Build the about page (Powered by Queue-Times.com link, ThemeParks.wiki and Wikipedia credits, data date, unofficial-app statement, "follow posted signs" note, add-to-home-screen tip); verify a component test finds each element
- [ ] 8.4 Write the project README (what it is, run, test, refresh data, review data, deploy); verify the documented commands run as written

## 9. CI and deployment

- [ ] 9.1 Add a GitHub Actions workflow that runs lint, type-check, unit tests and build on pull requests; verify it passes on the branch
- [ ] 9.2 Add the GitHub Pages deploy job on pushes to `main` (end-to-end tests, build with base `/dineyland-planner/`, `actions/deploy-pages`); verify, after the owner enables Pages, that https://ravpho.github.io/dineyland-planner/ loads and works offline after the first visit

## 10. Integration checks

- [ ] 10.1 Run an end-to-end phone scenario at 390×844: create a 2-day August trip, save a group profile, filter, add 8 items including a show and a meal, reorder by drag, watch the fit summary change, share and import in a new context; verify the whole run passes
- [ ] 10.2 Run `openspec validate add-trip-planner --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`; verify all pass
- [ ] 10.3 Owner checks the deployed app on a real phone (install to home screen, plan a day, airplane-mode reopen); verify issues found are fixed or recorded as follow-ups
