# Tasks

## 1. Domain and store

- [x] 1.1 Add `dueBy` to scheduled slots in `src/domain/schedule.ts` (design Decision 9): a show's start minus its `arriveEarlyMin`, and a restaurant's meal time plus 30. Leave it unset for attractions and for restaurants without a meal time. Verify with new `schedule.test.ts` cases:
  - a 14:05 show with 20 early minutes reached at 14:12 has `lateBy` 27 and `dueBy` 13:45;
  - lunch at 12:00 reached at 12:45 has `lateBy` 15 and `dueBy` 12:30.
- [x] 1.2 Rename `lastRouteChange` and `undoRouteChange` in `src/state/store.ts` to `lastOrderChange` and `undoOrderChange`, with every caller updated, and make `moveItem` record the slot too (design Decision 7). Verify with new `store.test.ts` cases:
  - a move followed by `undoOrderChange` restores the order;
  - a move, then another edit, then `undoOrderChange` leaves the day as it is;
  - grouping, optimizing, swapping and switching parks still undo.
- [x] 1.3 Replace the session-only `catalogView` and `planView` with `mapMode: 'day' | 'all'` (default `'day'`), and make `showInTimeline(key)` only set `planFocusKey` (design Decision 8). Verify:
  - `store.test.ts` checks the default and that `mapMode` is not part of what `persistence.ts` saves;
  - `npm run typecheck` reports no other users of the removed fields.
- [x] 1.4 Add `{ name: 'map' }` to `Route` in `src/routing.ts` for `#/map`, keeping `#/catalog` and `#/plan` (design Decision 1). Verify with a new `src/routing.test.ts` that `#/catalog`, `#/plan`, `#/map`, an empty hash and `#/about` parse as expected.

## 2. App frame: header, More menu, bottom bar, messages

- [x] 2.1 Rebuild the header in `src/App.tsx` as one row on every screen, with the `NightSky` `row` variant (design Decision 3):
  - with a trip: the trip select (label "Trip"), Share and a "More" `IconButton`;
  - with no trip: the wordmark;
  - on wide screens: the wordmark on the left and the trip controls on the right.

  Remove the header's About link and the two-row `header` variant of `NightSky`, updating `nightSky.test.tsx`. Verify `App.test.tsx` covers both header states, and `npm test` passes.
- [x] 2.2 Add the More sheet (design Decision 3) with New trip, Rename, Number of days, Delete trip, a divider, and About and data sources:
  - New trip, Rename and Delete keep today's flows, including the confirmation before deleting.
  - Number of days opens a sheet with today's days select and its confirm-before-removing flow, moved out of `TripBar`.

  Verify with unit tests for each action and for closing without choosing. Update `e2e/trip-options.phone.spec.ts` to open "More", and confirm it passes.
- [x] 2.3 Add the `Dock` below 1024 px (design Decision 2):
  - the one-line `FitBar` (`fit-summary`) when a trip exists, and the three-link tab bar (Explore, My day, Map) with icons and `aria-current="page"`;
  - `bg-sky`, with the current tab in `star` on a `star/15` pill and the others `on-sky-muted`;
  - the safe-area padding, and `--dock-h` set from the dock's measured height and used as bottom padding for the main content.

  Remove the header tabs. Verify:
  - `App.test.tsx` finds the three links and the current one;
  - `e2e/helpers.ts` `showTab` uses `getByRole('link', …)` with the new names;
  - `contrast.test.ts` and `guard.test.ts` pass unchanged.
- [x] 2.4 Add the wide-screen "Explore | Map" control above the left column, linking to `#/catalog` and `#/map`, with My day always in the right column (`plan-column`). Verify an `App.test.tsx` case at the wide query shows the Map in the left column and the plan on the right, with no bottom bar.
- [x] 2.5 Add the open-sheet counter to `Sheet` and use it in `ToastProvider` (design Decision 10):
  - with no sheet open, the toast sits above the dock on phones and above the sticky fit bar on wide screens;
  - with a sheet open, it sits at the top, under the safe-area inset;
  - sheets get `max-h-[calc(100dvh-5.5rem)]`.

  Verify:
  - a unit test checks the toast's placement with and without an open sheet;
  - a new e2e check shows that a toast raised with the filters sheet open does not overlap any of the sheet's controls;
  - `e2e/plan.desktop.spec.ts`'s toast-above-fit-bar check still passes.
- [x] 2.6 Update the README's feature list for the bottom bar, the More menu and the Map tab. Verify the list names Explore, My day, Map and More, and no longer says "Trip options" or "Switch the catalog to a map".

## 3. My day: date chips, day card and day sheet

- [x] 3.1 Replace the day tabs with date chips in `PlanScreen` (design Decision 4):
  - 60 × 64 px, weekday over date, a dot for days with items;
  - `role="tab"` names such as "Day 1 · Wed 12 Aug · DLP + DAW";
  - the row scrolls sideways inside its own container, and the selected chip scrolls into view.

  Verify:
  - `plan.test.tsx` selects days by chip;
  - `createTrip` in `e2e/helpers.ts` still finds "Day 1";
  - at 360 px, three chips fit without page overflow.
- [x] 3.2 Add the day card (design Decision 4): the date in Fraunces, the hours, the number of stops, and on a two-park day the park order and "Two-park ticket needed" (`ticket-reminder`), on `bg-sky` with `NightSky`. Verify `timeline.test.tsx` and `plan.test.tsx` find the reminder on two-park days and not on one-park days.
- [x] 3.3 Add the day sheet, opened from the card. It holds `DayHours` (Start and End labels unchanged) and, on two-park days, `TicketReminder` and `ParkOrder` with Switch order, its hint, its warning sheet and Undo. Verify:
  - unit tests change the hours from the sheet;
  - unit tests switch the park order of a grouped day through the warning;
  - `e2e/plan.phone.spec.ts`'s hours and park-switch tests open the card first and pass.
- [x] 3.4 Make "Optimize route" the primary button and "Group by area" a secondary action below it, in `RouteActions` (design Decision 8; route-optimization delta). Verify:
  - the `plan.test.tsx` checks for both actions, their messages and Undo pass;
  - "Group by area" is unavailable for a day with fewer than two items.

## 4. Timeline rows and the stop sheet

- [x] 4.1 Rebuild `SlotCard` as `StopRow` in `DayTimeline` (design Decision 5). Each row has:
  - the stop node, start and end times, the name, and area with wait;
  - tags for meal time, show time with a lock icon, late with "arrives … · be there by …", unsuitable, "Ends after …" and "N quicker options";
  - the grip;
  - one open button named "Open stop N, <name>".

  Park sections are drawn as row classes, with the "Walk to … · N min" pill (`park-change`) and the walk line with free time (`free-time`). Missing entries keep an inline Remove. Verify `timeline.test.tsx` covers every tag, the late explanation, the section pill, free time and a missing entry. Keep the test ids listed in the design's Goals.
- [x] 4.2 Add `StopSheet` (design Decision 6) with:
  - the four time tiles (Arrive/Be there for shows) and the late explanation;
  - the meal-time or show-time select and the lock toggle, moved from the card;
  - restaurant suggestions with swap and Undo;
  - Move to top, Move to bottom, and the "Stop N of M" stepper with "Move … up" and "Move … down";
  - Remove from day, and Details, which opens `ItemDetail`.

  Verify with unit tests:
  - the sheet's times equal the row's schedule;
  - changing the meal time updates the timeline with the sheet still open;
  - locking a show shows the lock on its row;
  - the stepper keeps the sheet open on the moved item;
  - Move to top and Move to bottom produce the expected order;
  - Remove and Undo restore the item.
- [x] 4.3 Update `meals.test.tsx` and the e2e meal, suggestion, move-up and remove tests in `plan.phone.spec.ts` and `journey.phone.spec.ts` to act through the stop sheet. Verify they pass.

## 5. Drag and drop

- [x] 5.1 Change `TouchSensor` in `PlannerDnd` to `{ distance: 4 }`, and give the grip and `catalog-drag-handle` `touch-action: none` (design Decision 7). Verify:
  - `dnd.test.ts` checks the sensor settings;
  - a new e2e touch drag in `plan.phone.spec.ts` moves without waiting first. Add a `touchDrag` option without the 350 ms hold.
- [x] 5.2 Show the dragged row as a lifted card in `DragOverlay`, with the original at 30% opacity. Turn off sortable transitions and the drop animation under reduced motion. Verify:
  - `e2e/motion.phone.spec.ts` (reduced motion) finds no running animations after a drop;
  - a desktop mouse drag still reorders, in `plan.desktop.spec.ts`.
- [x] 5.3 Report every move ("Moved <name> to stop N") with Undo through `undoOrderChange`, for drops, the stepper and Move to top/bottom. Verify:
  - unit tests check each source's message and Undo;
  - the e2e test "drag the first stop to the fourth place, then Undo" restores the order.
- [x] 5.4 Verify the e2e test "drag into the part of the day below the screen" on a 390 × 844 phone with a 10-item day: dropping near the bottom auto-scrolls and lands the stop below the first screen.

## 6. Map tab

- [x] 6.1 Add `MapScreen` with a "Map view" control (My day, All places) bound to `mapMode` (design Decision 8):
  - My day renders `PlanMap`, keyed by day.
  - All places renders `ParkMap` with the same filtered items as Explore, plus a line with the match count, Filters (opens `FilterPanel`) and "Clear filters".

  Verify `map.test.tsx` and `planMap.test.tsx`:
  - the mode is kept across tab changes and day changes;
  - All places follows a type filter set in Explore;
  - the route is drawn in both modes.
- [x] 6.2 Make "Show in timeline" call `showInTimeline(key)` and navigate to `#/plan`, where the timeline scrolls the item into view. Verify:
  - `planMap.test.tsx` and `store.test.ts` cover it;
  - `e2e/map.phone.spec.ts`'s Show in timeline test passes from the Map tab.
- [x] 6.3 Update `e2e/map.phone.spec.ts` and `e2e/map.desktop.spec.ts` to reach the maps through the Map tab or the wide "Explore | Map" control, instead of "Catalog view" and "Plan view". Verify the zoom, pinch, offline and route tests pass.

## 7. Explore

- [x] 7.1 Turn `CatalogScreen` into Explore (design Decision 11):
  - remove the "Catalog view" switch;
  - make Filters an icon button with a count badge;
  - add the All, Attractions, Restaurants and Shows chips writing `filters.types`.

  Verify with `catalog.test.tsx`:
  - each chip filters the list, and the count updates;
  - choosing two types in the filters leaves no chip marked and the badge shows 1.
- [x] 7.2 Restyle the list rows with a type tile, keeping park and area, type, rating, duration, height, thrill, the August wait range, the planned label and tint, and the unsuitable mark. Verify:
  - the `catalog.test.tsx` and `e2e/catalog.phone.spec.ts` checks for these facts and labels pass;
  - `row-name` is unchanged.
- [x] 7.3 Add the sticky "Show N results" and "Clear filters" footer to `FilterPanel`, and move `ItemDetail`'s "Add to day" into a sticky footer. Verify:
  - unit tests check the result count in the footer;
  - unit tests check that Add stays visible after scrolling the details;
  - `about.test.tsx` and the details checks pass.

## 8. Integration checks

- [ ] 8.1 Update the fold check in `e2e/plan.phone.spec.ts` to three items. On 390 × 844, with a six-item two-park day, the third `timeline-slot`'s bottom must be at or above the `fit-summary`'s top. Verify it passes, and record the measured block positions in design Decision 12's table.
- [ ] 8.2 Extend `e2e/shell.phone.spec.ts` 8.1 at 360 × 740 to cover the bottom bar, the date chips, the day card, the stop sheet, the More sheet and the Map tab: no horizontal overflow, and every control at least 44 × 44 px. Verify it passes.
- [ ] 8.3 Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e`. Verify all pass, including 8.2 offline and installability and the motion checks.
- [ ] 8.4 Take phone (390 × 844) and desktop (1280 × 800) screenshots of My day, the stop sheet, the day sheet, Explore, item details, the filters, both Map modes, the More menu and About. Store them in the change's `screenshots/` folder and review them against the mockup. Verify each screen matches the Midnight look and that nothing is cut off or overlapping.
