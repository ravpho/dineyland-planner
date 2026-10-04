# Design

## Context

The repository is empty apart from a README and the OpenSpec setup. See proposal.md (Why) for motivation and the specs for required behaviour. Constraints that shape the approach:

- **No server.** The app is personal for now, so it must run as static files with all state on the device.
- **Data access checked during exploration (October 2026):**
  - `queue-times.com` park statistics pages work, both all-time and per year (e.g. `/parks/4/stats/2025`). They give each ride's average and average-maximum queue time, plus crowd level by month and by day of week. Park ids: 4 = Disneyland Park Paris, 28 = Disney Adventure World Paris.
  - Queue-Times per-ride pages, which carry the hour-by-hour charts, sit behind a Cloudflare bot check and cannot be fetched.
  - `api.themeparks.wiki` works. `/v1/entity/<destination>/children` returns 51 attractions, 52 restaurants and 45 shows across both parks, with ids and map coordinates. Destination id: `e8d0207f-da8a-4048-bec8-117aa946b2c2`.
  - `en.wikipedia.org` works.
  - `disneylandparis.com` redirects every request to a virtual queue and cannot be fetched. `thrill-data.com` and `disneyblog.com` block automated requests.
- **Hosting:** the repository is public, so GitHub Pages hosts the app for free.

## Goals / Non-Goals

**Goals:**
- Keep all planning logic (wait model, walking, scheduling, filtering, share-link encoding) in pure, framework-free modules with unit tests. The later live mode will reuse them.
- Make data collection reproducible: fetched source snapshots are committed, so building the app never needs the network.
- Keep everything a person must judge (descriptions, ratings, thrill, scariness, heights) in hand-edited files, separate from generated numbers.

**Non-Goals:**
- Fetching any data at runtime. Live data is the next change.
- Per-ride hour-by-hour wait curves. The source pages are blocked; see Risks.
- Day-of-week adjustment. Queue-Times has the data, but the agreed model is per month. It can be added later without changing the specs.

## Decisions

### 1. Vite + React + TypeScript single-page app
React's drag-and-drop ecosystem decides this (see Decision 7), and TypeScript keeps the catalog data model honest. Vite builds plain static files for GitHub Pages. Routing uses the URL hash (`#/plan`, `#/about`, `#/import/<data>`), so Pages needs no special 404 handling.
*Alternatives:* SvelteKit (smaller bundles but weaker touch drag-and-drop options), Vue (fine, no advantage here), plain JavaScript (too much hand-built UI state).

### 2. Styling with Tailwind CSS
Tailwind's utility classes make the two layouts (phone tabs below 768 px, side-by-side from 1024 px) and the 44 px touch targets quick to build and easy to keep consistent.
*Alternative:* a component library such as MUI. Rejected because it is heavier, its default look is hard to change, and we need few complex widgets.

### 3. Data pipeline: snapshot, then merge
```
 scripts/data/collect.ts   (manual run, needs network)
   |-- ThemeParks.wiki children ---------> data/raw/themeparks-children.json
   |-- Queue-Times /parks/{4,28}/stats/{2023..2025}
   |                                ------> data/raw/queue-times/<park>-<year>.html
   v
 scripts/data/build.ts     (offline, part of `npm run data`)
   |-- parse raw snapshots   -> per-ride averages, monthly crowd levels
   |-- read data/curated/*.yaml (hand-reviewed facts, ids, sources)
   |-- match by recorded ids, report unmatched / missing statistics
   v
 src/data/catalog.json     (generated, committed, validated against a schema)
```
- Curated files are split by park: `data/curated/disneyland-park.yaml` and `data/curated/disney-adventure-world.yaml`. Each entry has a stable app id (for example `dlp.big-thunder-mountain`), the ThemeParks.wiki id, the Queue-Times ride name, descriptive fields, a `sources` list and a `review: draft | reviewed` status.
- The build script never writes to curated files, which satisfies the spec rule that collection must not overwrite hand-reviewed fields.
- Raw snapshots are committed, so CI and anyone else can rebuild without the network, and parser tests run against real saved pages.
- Matching uses ids recorded in the curated files, not fuzzy name matching. Unmatched source items and attractions without statistics are printed and written to `data/build-report.md`.

*Alternative:* fetch inside the app at runtime. Rejected for three reasons: it breaks offline use, Queue-Times does not allow browser requests (checked: its responses carry no `Access-Control-Allow-Origin` header), and it adds load on a free community service. ThemeParks.wiki does allow browser requests (`Access-Control-Allow-Origin: *`), so the later live mode can call it directly without a relay.

### 4. Wait model
For attraction `r`, park `p`, month `m` and clock time `t`:
```
 wait = round5( min( base[r] * month[p][m] * hour(t),  cap[r] * month[p][m] ) )

 base[r]     = mean of r's yearly "average queue time" over 2023-2025
 cap[r]      = mean of r's yearly "average maximum queue time" over 2023-2025
 month[p][m] = crowd level of month m / mean crowd level of all months (park p, 2023-2025)
 hour(t)     = shared time-of-day curve, linear between points, mean ~1.0 over 09:30-21:00
```
Starting curve, to be tuned once the live mode records real data:

| Time | 09:30 | 10:30 | 11:30 | 12:00-15:00 | 16:00 | 17:00 | 18:00 | 19:00 | 20:00+ |
|---|---|---|---|---|---|---|---|---|---|
| Factor | 0.45 | 0.80 | 1.05 | 1.25 | 1.15 | 1.05 | 0.95 | 0.85 | 0.65 |

- The years 2023–2025 are recent full years and leave out the 2020–21 closures. The year list is a single constant in the build script.
- Queue-Times' "average queue time" is averaged over all open hours. Normalising the curve to a mean of about 1 keeps the daily average equal to the measured one.
- **Restaurants:** wait by service type × peak (lunch 12:00–14:00, dinner 18:30–20:30) or off-peak. Counter service 20/5 min, table service 15/5 min, snack 10/3 min. Meal duration defaults: counter 30, table 75, snack 10 min; a curated entry can override them.
- **Shows:** no wait; the curated `arriveEarlyMin` value is used instead.
- **Attractions without statistics** (walk-throughs, play areas): curated `fixedWaitMin`, marked as an estimate.

*Alternatives:* a hand-made wait table per ride per hour (no real data behind it), or scraping per-ride hourly charts (blocked by Cloudflare).

### 5. Walking time from coordinates
```
 walkMin = ceil( haversine(a, b) * 1.35 / 65 ) + 1
```
- 1.35 accounts for paths not being straight lines. 65 m/min is a family walking pace. The extra minute covers getting in and out.
- Each park's entrance coordinates are curated.
- Items missing coordinates (some shows) use their area's centre, computed from the items in that area that do have coordinates.

*Alternative:* a hand-made walking table between areas. Rejected because it is more data work and coarser.

### 6. Scheduler as a pure function
`scheduleDay(day, catalog) → { items: Slot[], summary, breakdown }`. Times are minutes after midnight, in park local time; the date only supplies the month.
```
 t = day.start; at = entrance
 for item in day.items (skip items missing from catalog -> "No longer available"):
   walk = walkMin(at, item.location); arrive = t + walk
   if show:  needBy = item.time - arriveEarly
             free = max(0, needBy - arrive); late = max(0, arrive - needBy)
             start = item.time; end = start + duration
   else:     wait = estimate(item, month, arrive)
             start = arrive + wait; end = start + duration (meal duration for restaurants)
   t = end; at = item.location
 summary: fits if t <= day.end, spare = day.end - t, else over = t - day.end
```
Scheduling runs on every change; at most about 30 items per day keeps it far under a millisecond.

### 7. Drag and drop with dnd-kit
`@dnd-kit/core` + `@dnd-kit/sortable` handle pointer, touch and keyboard input. On touch screens dragging starts after a 200 ms long-press on a handle, so normal scrolling still works. Dragging from the catalog into a day only happens in the wide layout. Move-up and move-down buttons give a way to reorder without dragging.
*Alternatives:* SortableJS (its React wrappers are poorly maintained), the browser's built-in drag and drop (does not work with touch).

### 8. State and persistence
A Zustand store holds trips, the selected trip/day, filters and the group profile. Its persist middleware saves to `localStorage` under a versioned key, with a migration function per schema version. Every access is wrapped in try/catch; if storage is unavailable, a banner says changes will not be kept. The data is small (well under 100 KB), so IndexedDB is not needed.

### 9. Share links
A trip is reduced to `{v, name, days:[{date, park, start, end, items:[[id, showTime?]]}]}`. It is serialised and compressed with `lz-string`, then carried as `#/import/<data>`. On import the data is checked against a schema (zod). If decoding fails, the app shows "link cannot be read". A full 7-day trip with 15 items per day has to stay under 2,000 characters; a unit test enforces this.

### 10. Installable and offline: vite-plugin-pwa
Workbox pre-caches the app shell and `catalog.json`. `registerType: 'prompt'` drives the "new version available" notice. The manifest uses display `standalone`, the name "Disneyland Planner" and generated icons.

### 11. Testing
- **Vitest** for the pure modules: wait model, walking, scheduler (including the spec scenarios as test cases), filters, share-link round-trip and size, and Queue-Times parsing against committed snapshots.
- **A schema test** validates `catalog.json`.
- **Playwright** with the pre-installed Chromium for end-to-end flows at 360×740, 390×844 and 1280×800: create trip, filter, add, reorder by drag and by buttons, fit summary, share link import, and offline reload.

### 12. CI and deployment
- One GitHub Actions workflow runs lint, type-check, unit tests and build on pull requests.
- On pushes to `main` it also runs the end-to-end tests and deploys to GitHub Pages with `actions/deploy-pages`. Vite's `base` is set to `/dineyland-planner/`.
- The existing SessionStart hook is extended to run `npm install` when `package.json` exists, so cloud sessions can run tests.

## Risks / Trade-offs

- **[Shared time-of-day curve]** Rides with unusual patterns, such as headliners that are busy straight after opening, will be off by some minutes. → Values are labelled as typical. The live mode will record real waits through ThemeParks.wiki, and the curve can then be replaced per ride.
- **[Queue-Times page layout changes]** HTML parsing can break. → Raw snapshots are committed, parser tests use them, and a failing parse stops the data build with a clear error instead of shipping bad numbers.
- **[Queue-Times terms and load]** → Collection runs by hand, fetches about 8 pages per run, and the app shows "Powered by Queue-Times.com" with a link as the about-page requirement asks.
- **[Wrong height or thrill data]** Safety-relevant facts come from secondary sources because the official site cannot be fetched. → Every entry lists its sources and starts as `review: draft`. The owner reviews heights first. The about page says to always follow the park's posted signs.
- **[Safari deletes stored data]** Safari can clear website storage after 7 days without a visit, unless the site is added to the home screen. → The app suggests installing to the home screen and offers "Copy share link" as a backup.
- **[Events and weekends]** Halloween, Christmas and weekends shift waits beyond the monthly average. → Accepted for this version; day-of-week and event factors from Queue-Times are a cheap later addition.
- **[Disney trademarks]** Ride names and the app name are fine for a personal tool but need review before any public launch. → Noted for the "make it public" decision; the unofficial-app statement is on the about page from day one.

## Migration Plan

New project, so there is nothing to migrate. Deployment:
1. The owner enables GitHub Pages (Settings → Pages → Source: GitHub Actions).
2. Merging to `main` builds and deploys.

Rollback means reverting the commit on `main`, which redeploys the previous build. Saved trips stay on each device and use versioned storage, so a rollback never deletes them. An older build ignores data saved with a newer schema version instead of overwriting it.

## Open Questions

- **Icon and final display name.** "Disneyland Planner" is the working name. Changing it later is a one-line manifest edit.
- **Typical opening hours per month**, used only as day defaults. They will be drafted from available sources and marked as estimates; the user can override them per day.
