# Tasks

## 1. Shared day model

- [ ] 1.1 Move the per-item timing out of the loop in `scheduleDay` into an exported `timeItem(item, entry, arrive, park, month)` (design Decision 2). `scheduleDay` calls it and its output does not change. Verify all existing `schedule.test.ts`, `grouping.test.ts` and timeline component tests pass unchanged
- [ ] 1.2 Add `src/domain/route.ts` with `dayModel(day, catalog)` and `simulate(model, attractions)` (design Decision 2):
  - the walking table is filled once per model with `walkBetween`;
  - anchors are placed by grouping's rule in one forward pass;
  - missing entries go at the end;
  - an empty output starts at the entrance of the park of whichever item comes first.

  Verify with a property test on at least 50 bundled-catalog days made by a seeded generator, each with a restaurant and up to two shows:
  - for random attraction orders, `simulate` gives the same end, total lateness, queueing and walking as `scheduleDay` on `simulate(...).items`;
  - `simulate(model, groupedAttractions).items` equals the current `groupByArea` output.
- [ ] 1.3 Switch `groupByArea` to `simulate` for meals and shows, and add the `{ firstPark?: ParkId }` option (design Decision 3). Verify:
  - every existing grouping test passes unchanged;
  - a new test: with `firstPark: 'daw'`, the day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster puts both Disney Adventure World attractions first.

## 2. Route search

- [ ] 2.1 Add `src/domain/optimize.ts` with `optimizeRoute(day, catalog)` (design Decisions 1 and 3):
  - ranking: (minutes late for shows, end of day, queueing + walking);
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
  - "Same day, same result": two runs on the same day give equal orders.
  - Exhaustive check: on the fixed small days from the design's Context (up to 6 rides), the result ranks equal to the best of every order.
  - Budget: a 30-ride day evaluates no more than 20,000 candidates per seed, and the result never ranks worse than the day as it was.
- [ ] 2.2 Cover meals and shows in the search (spec "Optimizing never makes the day worse" and the modified "Meals and shows keep their time"). Verify unit tests:
  - "Show stays on time": a day with Disney Stars on Parade at 11:30 reached on time stays on time.
  - "Late show made reachable": the 10-item day from the design's Context reaches The Lion King: Rhythms of the Pride Lands at 15:45 108 minutes late before, and with `lateBy` 0 after.
  - Lateness first: in a fixture where the only on-time order ends later than a late order, the on-time order wins.
  - "Lunch keeps its time when optimizing": given the optimized attraction order, no other position puts the restaurant's arrival closer to its old arrival.
  - Lunch planned before a show is still before it.

## 3. Store

- [ ] 3.1 Rename the undo slot (design Decision 4): `lastGrouped` becomes `lastReorder = { dayId, previous, reordered }` and `undoGroup` becomes `undoReorder`. Update `groupDayByArea`, `RouteActions` and their tests. Verify:
  - every existing grouping store and component test passes with the new names;
  - `lastReorder` is not written to storage.
- [ ] 3.2 Add `optimizeDayRoute(dayId)`. It returns `{ changed: false }` or `{ changed: true, endBefore, endAfter, queueWalkBefore, queueWalkAfter }` and writes `lastReorder`. Verify store tests:
  - The returned numbers equal `scheduleDay(...).end` and `breakdown.queueing + breakdown.walking` before and after.
  - An unchanged order returns `changed: false` and leaves the day alone.
  - Undo restores the previous order.
  - "Optimize after grouping": Undo returns the grouped order.
  - "Edited after optimizing": Undo after `moveItem` or `setShowTime` leaves the day unchanged.
  - "Adding after optimizing" appends to the end.

## 4. Plan screen

- [ ] 4.1 Add the "Optimize route" button to `RouteActions`, after "Group by area" (design Decision 5):
  - it is disabled for a day with fewer than two items;
  - on tap it shows "Optimizing…" and runs the search after a `setTimeout(…, 0)`;
  - then it shows "Route optimized · ends HH:MM → HH:MM · queues and walking X → Y min" with Undo, or "No quicker order found" without Undo.

  Verify component tests:
  - "Nothing to optimize".
  - "See the saving and undo": the message matches the format, and Undo restores the order.
  - "No quicker order".
  - The busy label shows before the result, using fake timers.
- [ ] 4.2 Add a Playwright test at 390×844 to `e2e/plan.phone.spec.ts`:
  - Add Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, then tap "Optimize route".
  - The slots read Crush's Coaster, Frozen Ever After, Phantom Manor, Big Thunder Mountain, with one park-change step.
  - The message reads "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min".
  - Undo restores the original order.
  - Both route buttons are visible without horizontal page scroll.
  - Verify `npm run e2e` passes.
- [ ] 4.3 Update the README:
  - add "Optimize route" to the feature list: busiest rides at the quietest times, either park first, meals and shows keep their time, Undo;
  - add the route search to the `src/domain/` row of the project layout.

  Verify the README describes the new behaviour and its commands still run as written

## 5. Integration checks

- [ ] 5.1 Run `openspec validate optimize-day-route --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`; verify all pass and CI on the branch is green
- [ ] 5.2 Owner opens the deployed update on a phone and optimizes a real planned day that includes lunch and a show. Verify:
  - the end time drops in the message;
  - lunch stays near its planned time;
  - the show is not flagged late;
  - there is no noticeable pause after tapping;
  - Undo restores the day.
