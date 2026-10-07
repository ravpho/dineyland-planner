# Disneyland Planner

Plan your days at Disneyland Paris. It covers both parks: Disneyland Park and Disney Adventure World.

- Browse every attraction, restaurant and show of both parks in one list, each labelled with its park and area. Each has a description, a "worth it" rating, duration, height limit, thrill level, scariness and typical waits by month and time of day. Sort by name, rating, busiest wait or duration.
- Switch the catalog to a **map** of either park: area zones, every item at its position, zoom and drag, the walk from your last planned stop, walking times between areas, and your day's route with numbered stops.
- The plan has its own **map of the day**: only your stops, numbered and named, park by park. Tap a stop to see its times, or jump to it in the timeline, which numbers stops the same way.
- Each item links to its official Disneyland Paris page (where one was found) and opens in your maps app. Heights say how they were checked: official, matching independent sources, or not yet verified.
- Filter by height, thrill and scariness, or save a group profile so unsuitable rides are greyed out automatically.
- Build a day (or a multi-day trip) that **combines both parks**: items from Disneyland Park and Disney Adventure World in any order, added by tap or drag and reordered by drag.
- Planned items are marked in the catalog, with their day and stop number, such as "In Day 1 · stop 4". Items planned on another day of the trip get a quieter "In Day 3".
- **Group by area** in one tap. The day is reordered so each park's rides are together and the areas follow the shortest walk. Meals and shows keep their time. A message shows the walking saved, with Undo.
- **Switch which park comes first** on a grouped two-park day. Meals and shows are removed, with a warning that names them first and Undo afterwards.
- **Optimize route** in one tap. The day is reordered so it ends as early as possible:
  - the busiest rides go to the quietest times, such as Crush's Coaster at opening;
  - the day may start in either park;
  - each show gets the performance that fits the day best, unless you lock its time.

  A message shows when the day ends and the minutes of queueing and walking, before and after, and names any show time it changed. Undo restores the day.
- **Meal times.** Adding a restaurant asks when you'll eat (lunch 11:30–13:30, dinner 18:00–20:00, or any time). The timeline keeps the meal within 30 minutes of that time, shows free time if you'd be early, and flags it if you'd be late. Grouping and optimizing keep meals at their time.
- **Restaurant suggestions.** When a restaurant would be reached late, or another of the same type would end the day at least 15 minutes earlier, it suggests up to three, with the minutes each saves. One tap swaps it, keeping the meal time, with Undo.
- See a timeline with each item's area, walking (including park changes through both entrances), typical queues and fixed show times, and whether the day **fits** your time or how far it runs **over**. Days that use both parks remind you that you need a ticket valid for both.
- Works on phones, installs to the home screen and works offline. Trips stay on your device; share links move them between devices.

Waits are typical values built from real [Queue-Times.com](https://queue-times.com/en-US) statistics, not live data. Live in-park updates are planned next. This is an unofficial app, not affiliated with Disney.

## Run

Requires Node.js 22.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

## Test

```bash
npm run lint
npm run typecheck
npm test           # unit and component tests (Vitest)
npm run e2e        # browser tests (Playwright) at phone and desktop sizes
```

The end-to-end tests build the app and serve it on port 4173. In this repository's cloud sessions Playwright uses the pre-installed Chromium. Elsewhere, run `npx playwright install chromium` once.

## Refresh the data

```bash
npm run data:collect   # fetch fresh snapshots (needs access to queue-times.com and api.themeparks.wiki)
npm run data           # rebuild src/data/catalog.json, data/build-report.md and data/REVIEW.md
```

See [data/README.md](data/README.md) for the sources, the curated file format and how to add or fix an entry.

## Review the data

Descriptions, ratings, heights, thrill and scariness start as drafts. Open [data/REVIEW.md](data/REVIEW.md), check each attraction (heights marked "draft" first), correct `data/curated/*.yaml`, set `review: reviewed`, and run `npm run data`. The height check levels are explained in [data/README.md](data/README.md#height-check-levels).

## Deploy

Pushes to `main` build the site and publish it with GitHub Pages at https://ravpho.github.io/dineyland-planner/. One-time setup: in the repository settings, open **Pages** and set **Source** to **GitHub Actions**.

To build for that path locally: `BASE_PATH=/dineyland-planner/ npm run build`.

## Project layout

| Path | What |
|---|---|
| `src/domain/` | Framework-free logic: catalog schema, wait model, walking, scheduler (with meal times), shared day model, grouping by area, route search, restaurant suggestions, park order and switch, stop numbers and planned marks, filters, map geometry and route, share links |
| `src/state/` | Zustand store and device storage |
| `src/components/`, `src/screens/` | React UI |
| `src/index.css` | Theme: the night-sky colors (raw palette and the roles components use), fonts and motion |
| `src/theme/` | Theme tests: contrast between colors, and a guard against raw Tailwind colors in components |
| `scripts/data/` | Data collection and catalog build |
| `data/` | Raw source snapshots, curated YAML, build report, review checklist |
| `e2e/` | Playwright tests |
| `openspec/` | Specs and change plans ([OpenSpec](https://github.com/Fission-AI/OpenSpec)) |
