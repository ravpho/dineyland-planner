# Design

## Context

See proposal.md (Why) for motivation and the delta specs for the required behaviour. What the code offers today:

| Where | What is there |
|---|---|
| `src/components/CatalogList.tsx` | List rows: drag handle (wide screens), `RowBody`, add `IconButton`. Unsuitable rows get `bg-slate-50`, a grey name and an amber badge. The rows know nothing about the plan |
| `src/app/useAddToDay.ts`, `Toast.tsx` | Adding shows a 4-second "Added …" toast, one toast at a time |
| `src/components/ItemDetail.tsx` | Details sheet with type badge, park and area, and the unsuitable note |
| `src/components/ParkMap.tsx` | `MapCanvas` (internal) draws zones, markers from a `ListedItem[]`, and the route from a `DaySchedule` through `buildRoute`. A tap selects a marker's item. `emphasise` labels restaurants and shows at any zoom. `ParkMap` wraps it with the park switch (`mapPark` / `setMapPark` in the store), `MapItemCard`, legend, area walking times and the official link |
| `src/domain/map.ts` | `buildRoute` numbers stops by their index among the schedule's scheduled slots, so entries marked "No longer available" are not counted. An item planned twice carries two numbers |
| `src/components/DayTimeline.tsx` | `SlotCard` shows time, name, area, walk, arrival and wait. There is no stop number |
| `src/screens/PlanScreen.tsx` | Trip bar, day tabs, `DaySettings`, `TicketReminder`, `RouteActions`, `DayTimeline`, `Breakdown`, `FitBar`. On wide screens the plan column is its own scroll container |
| `src/components/FitSummary.tsx` | `TicketReminder` is a `<p role="note">`, shown when `schedule.parks` has both parks. That includes days where only a meal or show is in the second park. `FitBar` is fixed to the bottom on phones |
| `src/state/store.ts` | `catalogView` is session-only, and the saving subscriber writes only trips, selection and profile. `lastRouteChange` with `undoRouteChange` reverts the last grouping, optimizing or restaurant swap, guarded by a reference check on the day's items array |
| `src/components/ui.tsx` | `Sheet`, `Badge` (tones: slate, amber, red, green, indigo), `Button`, `IconButton`. Destructive confirmations today use `window.confirm` (`TripBar`) |
| Tests | Component tests in `src/components/__tests__/` look up `park-map` and `ticket-reminder` by test id. jsdom has no `scrollIntoView` |

## Goals / Non-Goals

**Goals:**
- One rule for stop numbers, shared by the catalog label, the timeline and both maps.
- Pure, tested domain functions for the planned marks, the park order and the park switch, like the rest of `src/domain/`.
- The plan map reuses the catalog map's canvas and route drawing, so the two maps can't drift apart.
- No change to saved trips or share links.

**Non-Goals:**
- Changing the catalog map's behaviour, beyond showing the planned label on its card.
- A new navigation route or URL for the plan map.
- Any change to grouping or optimizing. The park switch is a separate action.

## Decisions

### 1. Stop numbers come from the day's items, not from a schedule
A new `src/domain/stops.ts` holds:
- `stopNumbers(day, catalog)`: entry key → stop number. Entries whose item is in the catalog are counted from 1 in day order, and unknown entries are skipped.
- `plannedMarks(trip, selectedDayId, catalog)`: item id → `{ stops: number[]; otherDays: number[] }`. `stops` are the item's stop numbers in the selected day, and `otherDays` are the 1-based numbers of the other days it appears in.

`buildRoute` counts the same way, because scheduled slots are the catalog-known entries in day order. A unit test checks that `buildRoute` and `stopNumbers` give equal numbers on a day with a repeat and an unknown entry.

*Alternative:* number from `scheduleDay` slots. Rejected: the catalog needs marks for every day of the trip, and scheduling each day on every catalog render would only produce positions that the item list already gives.

### 2. One planned label, rendered in three places
- **Building the text:** `plannedLabel(mark, selectedDayNumber)` in `src/components/labels.ts` returns:
  - the strong text: "In Day 1 · stop 4" or "In Day 1 · stops 4, 9";
  - the muted text: "Also in Day 3", or "In Day 3" / "In Days 2, 3" when the item isn't in the selected day.
- **Rendering:** a small `PlannedLabel` component shows it in `RowBody`, `ItemDetail` and `MapItemCard`.
- **Computing the marks:** a `usePlannedMarks()` hook memoizes `plannedMarks` on the selected trip, the selected day and the catalog. That costs one pass over the trip's entries per change.
- **Styling:**
  - A row in the selected day gets `bg-emerald-50` with a left emerald accent, and an emerald (`green`) badge with a new `CheckIcon`.
  - Other-day text uses the slate badge.
  - When the item is also unsuitable, the emerald tint replaces the row's slate background, and the grey name and amber badge stay.
  - The add button's accessible name becomes "Add <name> to day again" for an item already in the selected day.
  - The row carries `data-planned="selected" | "other"` for tests.

*Alternative:* an indigo tint. Rejected: indigo already means "selected" in this app (day tabs, view switches, primary buttons), and a planned row isn't a selection. Emerald already means "done/fits" here.

### 3. Stop numbers in the timeline look like the map's stop markers
`SlotCard` gets a small indigo circle with the stop number, before the time, in the route colour of the map. Screen readers hear "Stop 4". `DayTimeline` computes `stopNumbers` once and passes each card its number. Missing entries get no circle.

### 4. Plan map = `MapCanvas` with the day's items as its markers
- **Reuse:** `MapCanvas` is exported from `ParkMap.tsx` unchanged.
- **New component:** `src/components/PlanMap.tsx` renders it with:
  - `listed`: the day's scheduled items, deduplicated by item id. Each one's unsuitable reason comes from its schedule slot.
  - `schedule`: the day's schedule, so `buildRoute` draws the numbered route exactly as on the catalog map.
  - `emphasise`: `true`, so every stop is labelled at any zoom, not only attractions.
- **What it leaves out:** catalog markers, the legend, the area walking times and the official link. The wrapper carries `data-testid="plan-map"`, so tests can scope `park-map` lookups when both maps are on screen on a wide screen.

*Alternatives:*
- A route-only canvas without markers. Rejected: markers carry the tap targets and labels, and a second canvas would duplicate gestures and label placement.
- Showing catalog items faded. Rejected: the agreed view shows only the day.

### 5. Park on the plan map is local to the plan map
- **Starting park:** `PlanMap` keeps the shown park in component state. It starts as the park of the day's first scheduled item, or Disneyland Park for an empty day.
- **When it resets:** `PlanScreen` renders it with `key={day.id}`, so it remounts, and picks the first park again, when the day changes or the map is shown again.
- **Stop labels:** the park switch labels each park with `formatStops(numbers)`, for example "stops 1–4", "stops 1, 2, 5", "stop 3" or "no stops". Runs of three or more consecutive numbers become a range.
- **Empty day:** the map is shown with "Nothing planned yet".

*Alternative:* reuse the store's `mapParkId`. Rejected: `setMapPark` also changes a single-park catalog filter, and the plan map shouldn't touch catalog filters.

### 6. Plan view is session-only store state, like `catalogView`
- **State:** `planView: 'timeline' | 'map'` in `PlannerState`, default `'timeline'`, with `setPlanView`. It isn't part of `SavedState`, so the saving subscriber ignores it, and it survives tab switches because the store outlives the screens.
- **Layout:** `PlanScreen` shows a `Timeline | Map` segmented switch (same style as the catalog's) above `RouteActions`. In map mode it shows `PlanMap` in place of `DayTimeline` and `RouteActions`. `FitBar` and the two-park reminder stay.

*Alternative:* a hash route such as `#/plan/map`. Rejected: a reload keeps the hash, which would break "timeline when the app starts". It would also add a route for what is only a view switch.

### 7. "Show in timeline" goes through a session-only focus key
- **Store:** `showInTimeline(key)` sets `planView: 'timeline'` and a session-only `planFocusKey`.
- **Timeline:** when `DayTimeline` mounts with a matching slot, it calls `scrollIntoView({ block: 'center' })` (when available), focuses that slot's reorder handle, highlights the card for about two seconds, and clears `planFocusKey`.
- **Wide screens:** this also works inside the plan column's own scroll container.

*Alternative:* query the DOM from the card's click handler. Rejected: the timeline isn't mounted until the view switches. A store field survives that remount.

### 8. Stop card shows the schedule's times for every occurrence
- **Content:** selecting a stop shows `StopCard`, with the name, park and area, then one line per slot of that item: "Stop N · arrive HH:MM · wait N min · HH:MM–HH:MM". Shows have no wait. A "N min late" or "Ends after HH:MM" badge appears when the timeline shows one.
- **Action:** "Show in timeline" focuses the first occurrence, or the one tapped when the card lists several.
- **Data:** the card reads the same `DaySchedule` the timeline renders, so the times match by construction.

### 9. Park order and switch are pure functions over attractions
A new `src/domain/parkOrder.ts` holds:
- `parkOrder(day, catalog)`: the parks of the catalog-known attractions, with consecutive repeats collapsed, for example `['dlp', 'daw', 'dlp']`. Restaurants, shows and unknown entries are ignored.
- `switchParks(day, catalog)`: returns `undefined` unless `parkOrder` has exactly two parks. Otherwise it returns:
  - `items`: the second park's attractions in day order, then the first park's attractions in day order, then unknown entries in day order;
  - `removed`: the restaurants and shows, in day order;
  - `firstPark`: the park that now comes first.

The entries are the day's own objects (same keys), as `groupByArea` does.

*Alternatives:*
- Reuse `groupAttractions(…, { firstPark })`. Rejected: it also reorders areas, and the agreed switch keeps the order inside each park.
- A stored "grouped" flag. Rejected: deriving availability from the order also covers days arranged by hand or imported, and needs no migration.

### 10. Store action reuses the route-change undo slot
- **Action:** `switchParkOrder(dayId)` returns `{ changed: false } | { changed: true; firstPark; removed: number }`.
- **Undo:** it writes `lastRouteChange` with the previous items, so the existing `undoRouteChange` restores the order and the removed meals and shows. It does nothing if the day was edited since. Grouping, optimizing, swapping and switching share one slot because only one toast, and so one Undo, is visible at a time.
- **Unchanged:** `lastRemoved` (single-item undo) is untouched.

### 11. The two-park reminder becomes the park-order box
`TicketReminder` keeps its test id and reminder sentence, and changes from a `<p>` to a `<div role="note">`. When `parkOrder` has two or more parks, it adds:
- the order, with full park names joined by " → ";
- a "Switch order" button.

The button is disabled unless `switchParks` returns a result. When disabled, a hint linked with `aria-describedby` reads "Group by area first so each park's attractions are together, then you can switch the order." Days whose attractions are in one park show the reminder alone, as today.

- **Confirming:**
  - When the preview's `removed` list is non-empty, the button opens a `Sheet` titled "Start in <park>?". It lists each removed item with its meal time or show time when it has one, and offers "Cancel" and "Switch and remove N".
  - With nothing to remove, it switches at once.
- **Afterwards:** the toast reads "<park> first" plus " · N removed" when N > 0, with Undo.

*Alternative:* `window.confirm`, as `TripBar` does. Rejected: the warning lists items with times and needs a styled, accessible list. The existing `Sheet` already provides focus and Escape handling.

## Risks / Trade-offs

- **Label collisions:** on the plan map, label placement may drop a stop's name where labels would overlap at low zoom. → Numbers are always drawn, the selected stop's label is always placed, and zooming in reveals more. The catalog map already behaves this way.
- **Two `park-map` elements on wide screens** when both maps are shown. → The plan map is wrapped in `data-testid="plan-map"`, and tests scope their queries. Existing tests keep the default timeline view, so they see one map.
- **Removing meals and shows is destructive, and Undo is lost after the next edit,** the same as grouping. → The warning names every item before anything changes, and the toast offers Undo straight away.
- **Contrast:** the emerald tint behind the grey name of an unsuitable item could lower contrast. → Check slate-500 on emerald-50 meets 4.5:1 (it is about 4.6:1). If a different shade is chosen, darken the name.
- **Phone width:** a stop circle on every timeline item takes width at 360 px. → It replaces no control, it is 20 px, and the phone e2e test checks for no horizontal scrolling.
- **Refactor risk:** exporting `MapCanvas` and adding the label to `MapItemCard` touch the catalog map. → The existing map component and e2e tests must pass unchanged.
- **jsdom has no `scrollIntoView`.** → It is called only when available, and the focus test stubs it.

## Migration Plan

None. No saved or shared data changes, and the new state is session-only. Rolling back means reverting the change.
