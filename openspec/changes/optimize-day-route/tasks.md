# Tasks

## 1. Meal times and show locks in the plan

- [ ] 1.1 Add `mealTime?: string` and `timeLocked?: true` to `PlanItem`, `mealTime` to the `addItem` options, and the store actions `setMealTime(dayId, key, time | undefined)` and `setShowLock(dayId, key, locked)` (design Decision 6). Verify store tests:
  - "Lunch at 12:00": adding a restaurant with `mealTime: '12:00'` stores it.
  - Changing and clearing a meal time.
  - Locking and unlocking a show.
  - A saved state written before these fields loads, and its entries have neither field.
- [ ] 1.2 Move share links to v3: items are `[code]`, `[code, time]` or `[code, time, 1]` (design Decision 6). Verify `shareLink.test.ts`:
  - "Share a day with times": a trip with lunch at 12:00 and a parade locked at 17:30 round-trips with both.
  - "Link from before meal times": v1 and v2 links still import, with no meal times and no locks.
  - A damaged v3 link still reports that it cannot be read.

## 2. Timeline

- [ ] 2.1 Move the per-item timing out of the loop in `scheduleDay` into an exported `timeItem(item, entry, arrive, park, month)`, and add the 30-minute meal window with `MEAL_WINDOW_MIN = 30` (design Decisions 2 and 3). Verify:
  - all existing `schedule.test.ts`, `grouping.test.ts` and timeline component tests pass unchanged;
  - new tests for "Early for lunch" (25 minutes free, wait from 11:30), "Late for lunch" ("15 min late", next items from the meal's end), "Restaurant without a meal time" (timed as before, never late), and "Change a meal time";
  - the breakdown still adds up to the timeline's length.

## 3. Shared day model

- [ ] 3.1 Add `src/domain/route.ts` with `dayModel(day, catalog)` and `simulate(model, attractions, showTimes)` (design Decision 3):
  - the walking table is filled once per model;
  - anchor targets: a meal time, else the old arrival; for shows, the start minus the early arrival;
  - anchors are sorted by target, with the user's order on a tie;
  - restaurants go closest to their target, and shows before the first attraction that would make the user late;
  - missing entries go at the end.

  Verify with a property test on at least 50 bundled-catalog days made by a seeded generator, each with timed and untimed restaurants and up to two shows:
  - for random attraction orders, `simulate` gives the same end, total lateness, queueing and walking as `scheduleDay` on `simulate(...).items`;
  - on days without meal times and with anchors in time order, `simulate(model, groupedAttractions, currentShowTimes).items` equals the current `groupByArea` output.
- [ ] 3.2 Switch `groupByArea` to `simulate` for meals and shows, and add the `{ firstPark?: ParkId }` option. Verify:
  - every existing grouping test passes unchanged;
  - with `firstPark: 'daw'`, the day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster puts both Disney Adventure World attractions first;
  - grouping a day with lunch at 12:00 places it closest to 12:00.

## 4. Route search

- [ ] 4.1 Add `src/domain/optimize.ts` with `optimizeRoute(day, catalog)` for the attraction order (design Decisions 1 and 4):
  - ranking: (minutes late for shows and meals, end of day, queueing + walking);
  - three seeds: the current order, grouped, and grouped from the other park;
  - moves: runs of 1–3 attractions;
  - a budget of 20,000 candidates per seed;
  - strict improvement, ties keep the earlier seed, and the day is unchanged unless the result ranks better than the day as it is.

  Verify unit tests on the bundled catalog (August, 09:30–23:00):
  - "Busiest ride at opening": The Twilight Zone Tower of Terror, Crush's Coaster becomes Crush's Coaster, Tower of Terror. The day ends at 10:37 instead of 10:42.
  - "Other park first": Big Thunder Mountain, Frozen Ever After, Phantom Manor, Crush's Coaster becomes Crush's Coaster, Frozen Ever After, Phantom Manor, Big Thunder Mountain. It has one park change and ends at 13:19 (14:29 before, 13:32 grouped).
  - "Items no longer in the catalog": they move to the end.
  - "Day that ends with the fireworks": the end stays at 22:20, and queueing plus walking falls from 155 to 147.
  - "Already the quickest order": Crush's Coaster, Frozen Ever After returns the same entries in the same order.
  - "Same day, same result": two runs on the same day give equal results.
  - Exhaustive check: on the fixed small days from the design's Context (up to 6 rides), the result ranks equal to the best of every order.
  - Budget: a 30-ride day evaluates no more than 20,000 candidates per seed, and the result never ranks worse than the day as it was.
- [ ] 4.2 Add show-time moves for shows that are not locked (design Decision 4). Verify unit tests:
  - "An earlier performance fits better": in the 8-item day from the design's Context, The Lion King: Rhythms of the Pride Lands moves from 16:45 to 13:10, after the 12:00 lunch, and the day ends earlier than with the show at 16:45.
  - "Locked show keeps its time": the same day with the show locked keeps 16:45.
  - A show whose only typical time is its current one is left alone.
- [ ] 4.3 Cover meals and shows in the search (spec "Optimizing never makes the day worse" and the modified "Meals and shows keep their time"). Verify unit tests:
  - "Show stays on time": a day with Disney Stars on Parade at 11:30 reached on time stays on time.
  - "Late show made reachable": the 10-item day reaches The Lion King: Rhythms of the Pride Lands at 15:45 108 minutes late before, and with `lateBy` 0 after.
  - Lateness first: in a fixture where the only on-time result ends later than a late one, the on-time result wins.
  - "Lunch at 12:00 and dinner at 18:00": the 12-ride day from the design's Context reaches lunch between 11:30 and 12:30 and dinner between 17:30 and 18:30, with no meal flagged late.
  - "Lunch keeps its time when optimizing": for a restaurant without a meal time, given the optimized attraction order, no other position puts its arrival closer to its old arrival.
  - Lunch planned before a show is still before it.

## 5. Restaurant suggestions and store actions

- [ ] 5.1 Add `src/domain/restaurants.ts` with `restaurantSuggestions(day, catalog, key)` (design Decision 5):
  - candidates are the same service type, in either park, swapped in place keeping the meal time;
  - a candidate is offered when it ranks better and either reduces lateness or ends the day at least 15 minutes earlier;
  - at most three, best first, each with minutes saved.

  Verify unit tests:
  - "Lunch in the other park": the Disney Adventure World day with Au Chalet de la Marionnette at 12:00 suggests Disney Adventure World counter-service restaurants, including Stark Factory, each saving more than 40 minutes.
  - "Late for a meal": a lunch reached 15 minutes past its window suggests a restaurant that can be reached in time, even with a saving under 15 minutes.
  - "Restaurant that fits": no suggestions.
  - Suggestions never include the current restaurant or another service type.
- [ ] 5.2 Rename the undo slot to `lastRouteChange` and `undoRouteChange`, and add `optimizeDayRoute(dayId)` and `swapRestaurant(dayId, key, itemId)` (design Decisions 6 and 7). Update `groupDayByArea`, `RouteActions` and their tests. Verify store tests:
  - Existing grouping store and component tests pass with the new names, and `lastRouteChange` is not written to storage.
  - `optimizeDayRoute` returns end and queueing-plus-walking before and after equal to `scheduleDay(...)`, and lists changed show times.
  - An unchanged day returns `changed: false` and is left alone.
  - Undo restores the previous order and show times.
  - "Optimize after grouping": Undo returns the grouped order.
  - "Edited after optimizing": Undo after `moveItem`, `setShowTime` or `setMealTime` leaves the day unchanged.
  - "Adding after optimizing" appends to the end.
  - "Swap and undo": `swapRestaurant` replaces the restaurant in place with its meal time, and Undo restores it.

## 6. Plan screen

- [ ] 6.1 Add the meal-time controls and the show lock (design Decision 8):
  - tapping add on a restaurant opens `MealTimePicker` (11:30–13:30, 18:00–20:00, "Any time");
  - dragging a restaurant adds it without a time;
  - restaurant timeline items get a "Meal time" select;
  - show timeline items get a lock toggle with `aria-pressed`.

  Verify component tests:
  - "Lunch at 12:00", "Dinner at 18:00" and "Snack at any time" from the picker.
  - "Change it in the plan".
  - "Lock a show time": the toggle shows the locked state.
  - A late meal shows the "N min late" badge.
- [ ] 6.2 Add the "Optimize route" button to `RouteActions`, after "Group by area":
  - it is disabled for fewer than two items;
  - on tap it shows "Optimizing…" and runs after a `setTimeout(…, 0)`;
  - then it shows "Route optimized · ends HH:MM → HH:MM · queues and walking X → Y min", plus any changed show times, with Undo, or "No quicker order found" without Undo.

  Verify component tests:
  - "Nothing to optimize".
  - "See the saving and undo": the message matches the format, and Undo restores the order.
  - "Changed show time in the message".
  - "No quicker order".
  - The busy label shows before the result, using fake timers.
- [ ] 6.3 Show restaurant suggestions below restaurant timeline items (design Decision 8):
  - up to three buttons with minutes saved or "on time";
  - "booking usually needed" on table service;
  - a tap swaps the restaurant and shows "Swapped to <name>" with Undo.

  Verify component tests:
  - "Swap and undo".
  - No suggestions for a restaurant that fits.
  - The table-service note.
- [ ] 6.4 Add Playwright tests at 390×844 to `e2e/plan.phone.spec.ts`:
  - Optimize: add Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, then tap "Optimize route".
    - The slots read Crush's Coaster, Frozen Ever After, Phantom Manor, Big Thunder Mountain, with one park-change step.
    - The message reads "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min".
    - Undo restores the original order.
    - Both route buttons are visible without horizontal page scroll.
  - Meal time and suggestion: add Crush's Coaster, Frozen Ever After and The Twilight Zone Tower of Terror, then Au Chalet de la Marionnette at 12:00 from the picker, then Spider-Man W.E.B. Adventure.
    - The lunch shows Disney Adventure World suggestions.
    - Tapping the first swaps it, still at 12:00, and Undo restores Au Chalet de la Marionnette.
  - Verify `npm run e2e` passes.
- [ ] 6.5 Update the README:
  - add to the feature list: "Optimize route" (busiest rides at the quietest times, either park first, show times chosen unless locked, Undo); meal times with their 30-minute window; restaurant suggestions;
  - add the route search and restaurant suggestions to the `src/domain/` row of the project layout.

  Verify the README describes the new behaviour and its commands still run as written

## 7. Integration checks

- [ ] 7.1 Run `openspec validate optimize-day-route --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`; verify all pass and CI on the branch is green
- [ ] 7.2 Owner opens the deployed update on a phone, plans a real day with lunch at 12:00, dinner at 18:00 and an unlocked show, and optimizes it. Verify:
  - the end time drops in the message;
  - both meals stay within 30 minutes of their times;
  - the show time chosen is named in the message;
  - there is no noticeable pause after tapping;
  - a badly placed restaurant shows suggestions, and swapping one works;
  - Undo restores the day.
