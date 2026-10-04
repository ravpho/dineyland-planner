# Disneyland Planner

Plan your days at Disneyland Paris. It covers both parks: Disneyland Park and Disney Adventure World.

- Browse every attraction, restaurant and show of both parks in one list, each labelled with its park and area. Each has a description, a "worth it" rating, duration, height limit, thrill level, scariness and typical waits by month and time of day. Sort by name, rating, busiest wait or duration.
- Filter by height, thrill and scariness, or save a group profile so unsuitable rides are greyed out automatically.
- Build a day (or a multi-day trip) that **combines both parks**: items from Disneyland Park and Disney Adventure World in any order, added by tap or drag and reordered by drag.
- See a timeline with walking (including park changes through both entrances), typical queues and fixed show times, and whether the day **fits** your time or how far it runs **over**. Days that use both parks remind you that you need a ticket valid for both.
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

Descriptions, ratings, heights, thrill and scariness start as drafts. Open [data/REVIEW.md](data/REVIEW.md), check each attraction (heights first), correct `data/curated/*.yaml`, set `review: reviewed`, and run `npm run data`.

## Deploy

Pushes to `main` build the site and publish it with GitHub Pages at https://ravpho.github.io/dineyland-planner/. One-time setup: in the repository settings, open **Pages** and set **Source** to **GitHub Actions**.

To build for that path locally: `BASE_PATH=/dineyland-planner/ npm run build`.

## Project layout

| Path | What |
|---|---|
| `src/domain/` | Framework-free logic: catalog schema, wait model, walking, scheduler, filters, share links |
| `src/state/` | Zustand store and device storage |
| `src/components/`, `src/screens/` | React UI |
| `scripts/data/` | Data collection and catalog build |
| `data/` | Raw source snapshots, curated YAML, build report, review checklist |
| `e2e/` | Playwright tests |
| `openspec/` | Specs and change plans ([OpenSpec](https://github.com/Fission-AI/OpenSpec)) |
