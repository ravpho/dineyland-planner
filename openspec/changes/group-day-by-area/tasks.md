# Tasks

## 1. Grouping logic

- [ ] 1.1 Add `src/domain/grouping.ts` with `groupByArea(day, catalog)` (design Decisions 1 and 2). It splits attractions, anchors and missing entries; orders parks by first appearance; picks each park's area order by trying every order of the day's own items, counting the walk back to the entrance in a park the day later leaves; keeps user order inside an area; and moves missing entries to the end. Leave anchors at the end for now. Verify unit tests:
  - "Day that switches parks", on the bundled catalog: Big Thunder Mountain, Frozen Ever After, Phantom Manor, Crush's Coaster becomes Big Thunder Mountain, Phantom Manor, Crush's Coaster, Frozen Ever After, and walking falls from 95 to 48 minutes.
  - "Same area keeps the user's order", "Day that starts in the second park" and "Items no longer in the catalog".
  - "Nearer area first" (Crush's Coaster before Frozen Ever After).
  - "Park the day leaves": a fixture where the best open-ended order and the best loop back to the entrance differ, and the loop wins.
  - A tie keeps the order of first appearance, and the same input always gives the same output.
- [ ] 1.2 Put meals and shows back by time (design Decision 3). Restaurants go where arrival is closest to their arrival before grouping. Shows go before the first attraction that would make the user late. Anchors keep their relative order, and any left over go at the end. Verify unit tests:
  - "Lunch keeps its time": no other position puts the restaurant's arrival closer to its old arrival.
  - "Afternoon parade": a 17:30 parade listed second ends up before the first attraction that would make arrival later than 17:10, with `lateBy` 0.
  - "Meal before a show".
  - A show that can't be reached in time from anywhere is placed right away.

## 2. Store

- [ ] 2.1 Add `groupDayByArea(dayId)` and `undoGroup()` with session-only `lastGrouped` (design Decision 4). Verify store unit tests:
  - Grouping reorders the day and returns walking before and after equal to `scheduleDay(...).breakdown.walking`.
  - "Already grouped" returns `changed: false` and leaves the order alone.
  - Undo restores the previous order.
  - "Edited after grouping": undo after `moveItem` or `setShowTime` leaves the day unchanged.
  - "Adding after grouping" appends to the end.
  - `lastGrouped` is not written to storage.

## 3. Plan screen

- [ ] 3.1 Add an `areaName(item, catalog)` helper to `labels.ts`. Show the area first on each scheduled timeline item's second line (`data-testid="slot-area"`), and switch `ItemDetail` and `ParkMap` to the helper. Verify component tests for "Attraction in Fantasyland", "Items from both parks", and that a "No longer available" entry shows no area. Existing item-detail and map tests must still pass.
- [ ] 3.2 Add a "Group by area" button in a row above the timeline (design Decision 5). It is disabled for a day with fewer than two items. Tapping it shows "Grouped by area · walking X → Y min" with Undo, or "Already grouped by area" without Undo. Verify component tests for "Nothing to group", "See the saving and undo" (Undo restores the order) and "Already grouped"
- [ ] 3.3 Add a Playwright test at 390×844 to `e2e/plan.phone.spec.ts`:
  - Add Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, then tap "Group by area".
  - The slots read Big Thunder Mountain, Phantom Manor, Crush's Coaster, Frozen Ever After, with areas Frontierland, Frontierland, Worlds of Pixar, World of Frozen.
  - There is one park-change step.
  - Undo restores the original order.
  - Verify `npm run e2e` passes.
- [ ] 3.4 Mention "Group by area" and the area label in the README feature list. Verify the README describes the new behaviour and its commands still run as written

## 4. Integration checks

- [ ] 4.1 Run `openspec validate group-day-by-area --strict`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e`; verify all pass and CI on the branch is green
- [ ] 4.2 Owner opens the deployed update on a phone, groups a real planned day that includes lunch and a show; verify walking drops in the message, lunch stays near its planned time, the show is not flagged late, and Undo restores the day
