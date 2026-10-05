# Tasks

## 1. Stop numbers and planned marks

- [ ] 1.1 Add `src/domain/stops.ts` with `stopNumbers(day, catalog)` (entry key → number, catalog-known entries counted from 1 in day order) and `plannedMarks(trip, selectedDayId, catalog)` (item id → `{ stops, otherDays }`) (design Decision 1). Verify `stops.test.ts`:
  - "Numbers in plan order": three items get 1, 2 and 3.
  - "Entry no longer available": it has no number and isn't counted.
  - A repeated item in the selected day gets both stop numbers.
  - An item in Day 3 only has `otherDays: [3]` and no stops; an item in Day 1 and Day 3 with Day 1 selected has its stops and `otherDays: [3]`.
  - Items in another trip aren't marked.
  - "Same number on the map": on a day with a repeat and an unknown entry, `buildRoute`'s stop numbers equal `stopNumbers`.
- [ ] 1.2 Add `plannedLabel(mark, selectedDayNumber)` and `formatStops(numbers)` to `src/components/labels.ts` (design Decisions 2 and 5). Verify unit tests:
  - `plannedLabel` gives "In Day 1 · stop 4", "In Day 1 · stops 4, 9", "Also in Day 3", "In Day 3" and "In Days 2, 3".
  - `formatStops` gives "stop 3", "stops 1, 2", "stops 1–4", "stops 1, 2, 5" and "no stops". Runs of three or more consecutive numbers become a range.

## 2. Planned items in the catalog

- [ ] 2.1 Add a `CheckIcon`, a `PlannedLabel` component and a `usePlannedMarks()` hook, and use them in `CatalogList` (design Decision 2):
  - an item in the selected day gets an emerald-tinted row with a left accent and a strong label, and `data-planned="selected"`;
  - an item only on other days gets a muted label without the tint, and `data-planned="other"`;
  - an unsuitable item keeps its grey name and amber badge;
  - the add button's accessible name becomes "Add <name> to day again" when the item is in the selected day.

  Verify component tests in `catalog.test.tsx`:
  - "Just added": tint, "In Day 1 · stop 4", and the "Added" toast still shows.
  - "Planned twice", "Add again", "Unsuitable and planned", "Removed from the day".
  - "Only on another day", "In the selected day and another", "Select another day", "Another trip".
- [ ] 2.2 Show `PlannedLabel` in `ItemDetail` and in the catalog map's `MapItemCard`. Verify:
  - component tests for "Details and map card": both show "In Day 1 · stop 2" for Phantom Manor as the second item of Day 1;
  - all existing `map.test.tsx` tests pass unchanged.
- [ ] 2.3 Add a Playwright test at 390×844 to `e2e/catalog.phone.spec.ts`: create a trip, add Peter Pan's Flight, and check its row shows "In Day 1 · stop 1" while the next row has no label. Add "Planned items are marked in the catalog, with their day and stop number" to the README feature list. Verify `npm run e2e` passes and the README reads correctly.

## 3. Stop numbers in the timeline

- [ ] 3.1 Show each scheduled item's stop number in `SlotCard`, as a small circle in the map's route colour before the time, with "Stop N" for screen readers. `DayTimeline` computes `stopNumbers` once, and missing entries get no circle (design Decision 3). Verify component tests in `timeline.test.tsx`:
  - "Numbers in plan order", "Entry no longer available" and "Reorder": moving the third item up shows 2 on it and 3 on the item it passed.
  - All existing timeline tests pass unchanged.

## 4. Park order and switch logic

- [ ] 4.1 Add `src/domain/parkOrder.ts` with `parkOrder(day, catalog)` and `switchParks(day, catalog)` (design Decision 9). Verify `parkOrder.test.ts` on the bundled catalog:
  - "One visit to each park": `['dlp', 'daw']`.
  - "Back and forth": `['dlp', 'daw', 'dlp']`.
  - "Lunch in the other park": `['dlp']`.
  - "Switch a grouped day": Big Thunder Mountain, Phantom Manor, Crush's Coaster, Frozen Ever After becomes Crush's Coaster, Frozen Ever After, Big Thunder Mountain, Phantom Manor, with the same entry objects.
  - "Lunch between the other park's attractions": the switch is available, and the lunch is in `removed`.
  - Every restaurant and show, with or without a meal time, is in `removed`, in day order.
  - "Entry no longer available": it goes to the end.
  - "Not grouped" and a single-park day: the result is `undefined`.
- [ ] 4.2 Add the store action `switchParkOrder(dayId)` returning `{ changed: false } | { changed: true; firstPark; removed }`. It writes `lastRouteChange` so `undoRouteChange` reverts it (design Decision 10). Verify `store.test.ts`:
  - switching a grouped day reorders it and reports `firstPark: 'daw'` and the removed count;
  - `undoRouteChange` restores the previous order, including the removed restaurant and show;
  - "Edited after switching": moving an item first makes Undo leave the day unchanged;
  - a day that isn't grouped returns `{ changed: false }` and is unchanged;
  - the saved state after a switch holds the new order.

## 5. Park order box on the Plan

- [ ] 5.1 Turn `TicketReminder` into the park-order box (design Decision 11). It keeps its test id and reminder sentence and becomes a `<div role="note">`. When `parkOrder` has two or more parks, it adds:
  - the order, with full park names joined by " → ";
  - a "Switch order" button, disabled unless `switchParks` has a result, with the "Group by area first…" hint linked by `aria-describedby`.

  Verify component tests in `timeline.test.tsx`:
  - "One visit to each park", "Back and forth", "Lunch in the other park" (reminder without park order).
  - "Not grouped": button disabled, with the hint.
  - "Grouped after the hint": after "Group by area" the button is enabled.
  - The existing ticket-reminder tests pass unchanged.
- [ ] 5.2 Add the warning sheet and the result message:
  - when the preview removes items, "Switch order" opens a `Sheet` titled "Start in <park>?", listing each one with its meal or show time, with "Cancel" and "Switch and remove N";
  - otherwise it switches at once;
  - then the toast reads "<park> first" plus " · N removed" when N > 0, with Undo calling `undoRouteChange`.

  Verify component tests:
  - "Lunch and a parade": the sheet names Au Chalet de la Marionnette (12:00) and Disney Stars on Parade (17:30), with "Switch and remove 2".
  - "Confirm": the day holds only the switched attractions.
  - "Cancel": the day is unchanged.
  - "Only attractions": no sheet.
  - "See the result and undo": "Disney Adventure World first · 2 removed", and Undo restores all items.
  - "Nothing removed": the message reads "Disney Adventure World first".
- [ ] 5.3 Add a Playwright test at 390×844 to `e2e/plan.phone.spec.ts`:
  - add Big Thunder Mountain, Crush's Coaster and Phantom Manor; "Switch order" is disabled with the hint;
  - tap "Group by area", then add Au Chalet de la Marionnette at 12:00;
  - tap "Switch order": the sheet lists the restaurant; confirm;
  - the slots start with Crush's Coaster and the restaurant is gone; Undo restores it;
  - the box fits the width without horizontal page scroll.

  Add "Switch which park comes first on a grouped two-park day (meals and shows are removed, with a warning and Undo)" to the README feature list. Verify `npm run e2e` passes and the README reads correctly.

## 6. Map in the plan

- [ ] 6.1 Add session-only `planView: 'timeline' | 'map'` (default `'timeline'`), `setPlanView`, `planFocusKey` and `showInTimeline(key)` to the store (design Decisions 6 and 7). Verify `store.test.ts`:
  - the default is `'timeline'`;
  - `showInTimeline` sets the view to timeline and the focus key;
  - saved state contains neither `planView` nor `planFocusKey`.
- [ ] 6.2 Export `MapCanvas` and add `src/components/PlanMap.tsx` (design Decisions 4 and 5):
  - the markers are the day's scheduled items, deduplicated, with `emphasise` on;
  - the park starts on the first scheduled item's park, or Disneyland Park;
  - the park switch is labelled with `formatStops`;
  - an empty day shows "Nothing planned yet";
  - the wrapper has `data-testid="plan-map"`.

  In `PlanScreen`, add the `Timeline | Map` switch above the route actions. In map mode, show `PlanMap` (with `key={day.id}`) in place of `RouteActions` and `DayTimeline`, keeping the park-order box and `FitBar`.

  Verify component tests in `map.test.tsx` or a new `planMap.test.tsx`:
  - "Switch to the map": three numbered, named stops and no other catalog markers.
  - "Map follows the plan", "Park change on the plan map", "Day that starts in the second park", "Stops in each park", "Empty day".
  - "Back from the catalog" and "Another day" through the store.
  - All existing map tests pass unchanged.
- [ ] 6.3 Add `StopCard` (design Decision 8): name, park and area, then one line per occurrence with the stop number, arrival, wait (not for shows), start–end, and late or after-window badges. "Show in timeline" calls `showInTimeline`. `DayTimeline` scrolls the focused slot into view (when `scrollIntoView` exists), focuses its handle, highlights it briefly and clears the key. Verify component tests:
  - "Times of a stop": the card's times equal the timeline's third item.
  - "Planned twice": two lines.
  - "Show in timeline": the timeline is shown, the stubbed `scrollIntoView` is called on the sixth slot, and its handle has focus.
- [ ] 6.4 Add Playwright tests:
  - at 390×844 in `e2e/map.phone.spec.ts`: plan a two-park day, choose "Map" on the Plan, check the numbered stops, the park switch labels and the visible fit bar, tap a stop, choose "Show in timeline", and check that item is in view;
  - in `e2e/map.desktop.spec.ts`: show the plan map next to the catalog map, with queries scoped by `plan-map`.

  Update the README feature list line about the map to mention the plan's own map of the day, and that the timeline numbers stops like the map. Verify `npm run e2e` passes and the README reads correctly.

## 7. Integration checks

- [ ] 7.1 Run `openspec validate plan-ui-improvements --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`. Verify all pass and CI on the branch is green.
- [ ] 7.2 Owner opens the deployed update on a phone and plans a two-park day. Verify:
  - added items are tinted and labelled in the catalog, and items on another day show a muted label;
  - the plan map shows the day's numbered stops without catalog clutter, and "Show in timeline" lands on the right item;
  - "Switch order" is unavailable until the day is grouped, warns about the lunch and show it removes, and Undo brings them back.
