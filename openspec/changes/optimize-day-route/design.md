# Design

## Context

See proposal.md (Why) for motivation and the delta specs for the required behaviour. What the code offers today:

| Where | What is there |
|---|---|
| `src/domain/schedule.ts` | `scheduleDay(day, catalog)` is the single source of times. Each call rebuilds its item lookup and area centres, then walks the list. About 70 µs for a 30-item day. Slots already carry `freeBefore` and `lateBy` (used by shows) |
| `src/domain/waits.ts` | One shared time-of-day curve for every attraction (0.45 at 09:30, 1.25 from 12:00 to 15:00, 0.65 after 20:00), scaled by the ride's average and the park's month factor. So moving a busy ride to opening saves the most. Restaurant waits depend on the lunch and dinner peaks |
| `src/domain/grouping.ts` | `groupByArea(day, catalog)`: park order by first appearance, area order by trying every order, then `placeAnchors`, which places meals and shows by time in their current relative order. It calls `scheduleDay` about twice per placement step |
| `src/domain/trip.ts` | `PlanItem` is `{ key, itemId, showTime? }`. Restaurants have no time |
| `src/domain/shareLink.ts` | Share format v2: each item is `[code]` or `[code, showTime]`. The decoder accepts v1 and v2 |
| `src/state/persistence.ts` | `SCHEMA_VERSION` 2. Items are stored as they are, without per-field checks, so new optional fields need no migration |
| `src/state/store.ts` | `groupDayByArea`, `undoGroup` and the session-only `lastGrouped` slot, with a reference check on the day's items array. `addItem` sets a show's `showTime`; `setShowTime` changes it |
| `CatalogList.tsx`, `ShowTimePicker.tsx`, `PlannerDnd.tsx` | Tapping add on a show opens a sheet of its typical times. Dragging a show adds it at its first time |
| `src/components/DayTimeline.tsx` | `SlotCard` shows a "Start" select on shows and the "N min late" badge. Restaurants have no time control |
| `src/components/RouteActions.tsx`, `Toast.tsx` | The route row with "Group by area"; one toast at a time, a new one replaces the old |
| Catalog | 52 restaurants (16 counter, 12 table, 24 snack), all with coordinates, no opening hours |

Measured with a prototype on the bundled catalog, August, 09:30–23:00:

| Day | Before | Grouped | Optimized |
|---|---|---|---|
| Big Thunder Mountain, Frozen Ever After, Phantom Manor, Crush's Coaster | ends 14:29, queue+walk 280 | 13:32, 223 | 13:19, 210 |
| Tower of Terror, Crush's Coaster | 10:42 | 10:42 | 10:37 |
| 8 items, lunch at Au Chalet de la Marionnette at 12:00, The Lion King at 16:45 | 18:09 | — | 17:29, show moved to 13:10, lunch reached 11:53. 17:45 with the show locked |
| 12 rides, lunch at 12:00, dinner at Bistrot Chez Rémy at 18:00 | 23:05, lunch 45 and dinner 144 min late | — | 20:12, lunch reached 11:46, dinner 17:47 |
| Disney Adventure World rides, lunch in Disneyland Park at 12:00 | 15:34 | — | Suggestions: Stark Factory saves 47 min, The Hollywood Gardens Restaurant 46, Café Luminosity 43 |

- **Exhaustive check:** on every test day of up to 6 rides without meals or shows, the prototype search found the same order as trying every order.
- **Speed:** a 30-ride day needed about 10,000 candidate orders per starting order. With a precomputed walking table each candidate took about 5 µs, so about 50 ms per starting order in the dev container.

## Goals / Non-Goals

**Goals:**
- Pure, deterministic domain functions with unit tests, like the rest of `src/domain/`.
- Every time the search compares is the time the timeline will show. Each item's timing, including the meal window, has one implementation, shared by `scheduleDay`, the search and the restaurant suggestions.
- A 30-ride day finishes in well under a second on a phone, without a worker.

**Non-Goals:**
- A proven optimum. The search is a local search with a fixed work limit, checked against an exhaustive search on small days.
- Leaving gaps on purpose, swapping restaurants during Optimize, pinning attractions, or modelling restaurant opening hours and bookings (proposal, Out of scope).
- Changing how "Group by area" picks park and area order. Grouping only takes the new meal targets and the shared placement.

## Decisions

### 1. Rank by lateness, then end of day, then queueing and walking
Each candidate day (attraction order plus show times) is ranked by a tuple, compared left to right:

```
rank = ( total minutes late for shows and meals,  end of the day's last item,  queueing + walking )
```

- **Why the end comes before queueing + walking:** on 40 random days with meals and shows, ranking by queueing + walking alone ended the day later on 9 days, by up to 2 h 33 min. It saved queue minutes by leaving up to 233 idle minutes before a show and pushing rides into the evening.
- **Why queueing + walking is still the tie-break:** when the last item is a fixed-time show, every order ends at the same time. Less queueing and walking then becomes free time before the show.
- **Why lateness comes first:** it matches the spec, where a result that is less late wins even if the day ends later. Because meal lateness is in the first place, optimizing never pushes a timed meal further outside its window.

*Alternatives:*
- A weighted sum. Rejected: the weights would be arbitrary, and the outcome could not be explained in one message.
- For meals without a time, keeping each within 30 minutes of its old time. Prototyped and rejected: when the day got shorter, the search put rides with longer queues before lunch to reach the old time, and the day ended up to 261 minutes later. A meal time the user sets is different: it states when they want to eat, so it is a real constraint (Decision 2).

### 2. Meal times in the timeline: a 30-minute window
A restaurant entry may carry a `mealTime`. In `timeItem` (Decision 3), with `MEAL_WINDOW_MIN = 30` in `schedule.ts`:

```
open = mealTime - 30,  close = mealTime + 30
freeBefore = max(0, open - arrive)        // early: free time until the window opens
begin      = arrive + freeBefore
wait       = restaurant wait at begin     // peaks still apply
end        = begin + wait + meal duration
lateBy     = max(0, arrive - close)       // late: flagged, and the day goes on from the meal's end
```

- **Reusing the slot fields:** this uses the slot's existing `freeBefore` and `lateBy`. So the "N min late" badge, free time in the breakdown and the fit summary work without new fields.
- **Restaurants without a meal time** behave exactly as today.

*Alternatives:*
- An exact time, like shows. Rejected by the owner: a counter-service lunch has no reservation, and a fixed start leaves idle time for no reason.
- A target without a window. Rejected: there would be nothing to flag, and "lunch at 12:00" could drift without limit.

### 3. A shared day model with a fast simulation
A new `src/domain/route.ts` holds what grouping, optimizing and suggestions share.

- **`timeItem(item, entry, arrive, park, month)`** is moved out of the loop in `scheduleDay` and gains the meal window. It returns `wait`, `waitIsEstimate`, `start`, `end`, `freeBefore` and `lateBy`. `scheduleDay` calls it.
- **`dayModel(day, catalog)`** is built once per action:
  - the day's entries split into attractions, anchors (restaurants and shows) and missing entries;
  - each entry's position and catalog item, plus the park and month;
  - a walking table between every pair of the day's entries and from each park entrance, filled with `walkBetween`;
  - each anchor's **target time**:
    - a restaurant with a meal time: that time;
    - a restaurant without one: its `arrive` in `scheduleDay(day)`;
    - a show: its start minus `arriveEarlyMin`.
- **`simulate(model, attractions, showTimes)`** runs one forward pass. It returns `{ items, late, end, queueing, walking }`, where `items` is the full day (attractions, anchors, then missing entries, with the given show times).
  - Anchors are sorted by target time; a tie keeps the user's order.
  - A restaurant goes where its arrival is closest to its target.
  - A show goes before the first attraction that would make the user late.
  - The pass keeps the clock and position at the end of the output so far. So each comparison is one or two `timeItem` calls on table lookups.
  - An empty output starts at the entrance of the park of whichever item comes first, as `scheduleDay` does.
- **Grouping** replaces its `placeAnchors` with `simulate(model, grouped, currentShowTimes).items`.
  - Sorting anchors by target matches today's "keep their relative order" whenever the anchors are already in time order.
  - It differs only when one of them is already late or far off its time, and then it helps.
  - The existing grouping tests must pass unchanged.

*Alternatives:*
- Calling `scheduleDay` for each candidate. Rejected: about 70 µs per call, and anchor placement needs about two calls per step. A 30-item day would take seconds per starting order.
- A separate fast timeline written just for the search. Rejected: two copies of the timing rules would drift. Sharing `timeItem` and the placement rule avoids that. A property test also runs `simulate` and `scheduleDay` on random bundled-catalog days, with timed and untimed meals and shows, and requires equal end, lateness, queueing and walking.

### 4. Deterministic local search over order and show times
A new `src/domain/optimize.ts` exports `optimizeRoute(day, catalog)`, which returns `PlanItem[]` (entries in the new order, show times possibly changed).

```
model   = dayModel(day, catalog)
current = rank of the day exactly as it is (scheduleDay)
seeds   = [ the current order of the attractions,
            groupByArea order (park of the first item first),
            groupByArea order starting in the other park ]   // two-park days only
for each seed, in that order, with the current show times:
    repeat until a full pass finds nothing better or the seed's budget is spent:
        for run length L in 1..3, for each start i, for each target j != i:
            move attractions i..i+L-1 to position j; keep it if it ranks better
        for each show whose time is not locked, in day order:
            for each of its typical start times: keep it if it ranks better
    keep the result if it ranks better than the best so far   // ties keep the earlier seed
return best.items if rank(best) < current, else day.items unchanged
```

- **Moving runs of 1–3 rides:** this can move a ride, a pair of neighbours, or a short area block in one step. Single moves alone get stuck when a whole block needs to move past a meal.
- **Show-time moves:** these sit in the same pass. When a show changes time, its target changes and the anchors are sorted again, so a show can pass a meal; for example, The Lion King moves from 16:45 to 13:10, after a 12:00 lunch. A show has at most 24 typical times, so these moves are cheap. Locked shows are never touched.
- **Seeds:** the grouped orders give the search a low-walking start in each park order. That covers "change which park comes first", which single moves rarely reach because they would add a park change first. The current order is a seed so a hand-tuned day is not thrown away.
- **Budget:** each seed may evaluate at most 20,000 candidates, counting both kinds of move. Work is counted, not timed, so the result does not depend on the device (spec, Same day, same result). That is about twice what a 30-ride day needed in the prototype. A typical 10–15 ride day needs under 3,000.
- **"Better" is strict,** and the final check compares with the day exactly as it is.
- **`groupByArea` options:** it gains `{ firstPark?: ParkId }` to build the third seed. Without it, it behaves as today.

*Alternatives:*
- Trying every order. Rejected: n! orders is already too many at 9 rides.
- Dynamic programming over subsets (Held–Karp). Rejected: waits depend on arrival time, so the state would need the clock as well; 2^30 subsets is already too many.
- Simulated annealing with a seeded random generator. Rejected: results depend on tuning and on the seed, it needs many more candidates than local search, and in the prototype it found nothing better on the test days.
- Choosing show times first, then the order. Rejected: the best performance depends on where the day is at that time, so the two must be searched together.

### 5. Restaurant suggestions
A new `src/domain/restaurants.ts` exports `restaurantSuggestions(day, catalog, key)`.

- **Candidates:** every other catalog restaurant of the same service type, in either park.
- **Scoring:** each candidate replaces the entry's `itemId` in the same position, keeping its key and meal time. The day is then timed with `scheduleDay` and ranked as in Decision 1.
- **Which ones show:** a candidate is offered when it ranks better than the current day and either:
  - it reduces the minutes late (the current restaurant is outside its window), or
  - it ends the day at least 15 minutes earlier (`SUGGEST_MIN_SAVING = 15`).

  At most three are returned, best first, each with its saving in minutes and whether it removes lateness.
- **Cost:** at most 23 candidates per restaurant at about 70 µs each, about 2 ms per restaurant item. The timeline computes suggestions in a `useMemo` keyed on the day, so a day with two or three meals stays well under a frame.

*Alternatives:*
- Nearest restaurant by distance. Rejected: it ignores the meal window and the knock-on effect on later queues.
- Re-optimizing the whole day for each candidate. Rejected: too slow per render. It would also reorder other items, which the spec forbids for a swap.

### 6. Data, store and share links
- **`PlanItem`** gains `mealTime?: string` (restaurants) and `timeLocked?: true` (shows).
- **Store:**
  - `addItem` options gain `mealTime`.
  - New `setMealTime(dayId, key, time | undefined)`, `setShowLock(dayId, key, locked)` and `swapRestaurant(dayId, key, itemId)`.
  - New `optimizeDayRoute(dayId)` returns `{ changed: false }` or `{ changed: true, endBefore, endAfter, queueWalkBefore, queueWalkAfter, showTimes: { name, before, after }[] }`. The numbers come from `scheduleDay(...)`: `end`, and `breakdown.queueing + breakdown.walking`.
- **Share links v3:**
  - Each item is `[code]`, `[code, time]` or `[code, time, 1]`. `time` is a show's start or a restaurant's meal time, and `1` marks a locked show.
  - The decoder accepts v1, v2 and v3; the encoder writes v3. A v2 restaurant entry never has a time, so old links import with no meal times and no locks.
- **Saved trips:** no migration and no `SCHEMA_VERSION` bump. The fields are optional, and entries saved earlier simply lack them.

*Alternatives:*
- Reusing `showTime` for meal times. Rejected: code that reads `showTime` assumes a show, and the name would mislead.
- Keeping v2 and appending a third tuple element. Rejected: a v2 decoder rejects the longer tuple anyway. A new version number keeps decoding explicit.

### 7. One undo slot for every route change
- `lastGrouped` becomes `lastRouteChange = { dayId, previous, changed }`, and `undoGroup` becomes `undoRouteChange`. Grouping, optimizing and swapping a restaurant write it.
- Undo works only while the day's items are still the same array as `changed`.
- Show times live on the entries, so restoring `previous` also restores them.
- The slot stays session-only and is never saved.
- Grouping then optimizing then Undo restores the grouped order, because optimizing wrote the slot last (spec, Optimize after grouping). The toast shows one message at a time, so only the latest Undo is ever offered.

*Alternative:* one slot per action. Rejected: several live slots for one day add state, and nothing in the UI can reach the older ones.

### 8. UI
- **Route row:** `RouteActions` gets a second secondary `Button`, "Optimize route", after "Group by area".
  - On a phone at 390 px the two buttons sit side by side and stay at least 44 px tall.
  - Both are disabled when the day has fewer than two items.
  - On tap, the button shows "Optimizing…" and is disabled. The search runs in a `setTimeout(…, 0)` so that label paints first.
- **Optimize message:**
  - On a change: `"Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min"`, then ` · <show name> 16:45 → 13:10` for each changed show, with Undo (`undoRouteChange`).
  - Otherwise: `"No quicker order found"`.
- **Meal-time picker:** tapping add on a restaurant in `CatalogList` opens a new `MealTimePicker` sheet, like `ShowTimePicker`. It has buttons for 11:30–13:30 and 18:00–20:00 in 30-minute steps, and "Any time". `PlannerDnd` adds a dragged restaurant without a time.
- **Restaurant timeline item:** a "Meal time" select offers "Any time" plus 30-minute steps across the day's window, and keeps a current value outside those steps. The late badge is the existing one.
- **Show timeline item:** a lock toggle sits next to the Start select. It is an `IconButton` with `aria-pressed`, labelled "Keep <name> at <time> when optimizing".
- **Suggestions:** below a restaurant item, "Fits better:" heads up to three buttons, such as "Stark Factory · saves 47 min" or "… · on time".
  - A table-service suggestion adds "booking usually needed".
  - A tap calls `swapRestaurant` and shows "Swapped to Stark Factory" with Undo.

*Alternative:* a Web Worker for the search. Rejected: it adds a bundle entry and moves the catalog into the worker, to save at most a few hundred milliseconds that the budget already caps.

## Risks / Trade-offs

- **[Local search can miss the best result]** → Mitigations:
  - three starting orders, covering both park orders;
  - unit tests that match an exhaustive search on fixed small days;
  - the result is never worse than the current day;
  - the message shows the real before and after.
- **[A meal without a time can move away from its old time]** It moves by up to about one ride from its time, more when the day gets much shorter. On random days the median shift was 28 minutes, against 16 for grouping. → Mitigations: a meal time keeps it within 30 minutes; the timeline shows the new time; Undo is one tap away.
- **[A timed meal can sit near the edge of its window]** → Placement aims at the meal time itself, not the window edge. In the prototype, lunch at 12:00 was reached at 11:46 and 11:53, and dinner at 18:00 at 17:47.
- **[Optimize may pick a performance the user wanted to avoid]** → The message names every changed show, Undo restores it, and a lock keeps it next time.
- **[Suggestions don't know opening hours or bookings]** Some restaurants open only for lunch or dinner, or close for the season. → Mitigations: suggestions keep the same service type; table service says a booking is usually needed; item details link to the official page.
- **[An app that hasn't updated yet can't read new share links]** → It says the link cannot be read rather than importing something wrong. The installed app picks up the new version through its "New version" notice. Links made earlier still import.
- **[Splitting an area can look like zig-zagging]** → It only happens when the day then ends earlier, and the message says by how much.
- **[A slow phone may pause briefly on a very large day]** → The per-seed budget caps the work, and the busy label paints first. Task 7.2 checks the pause on a real phone.
- **[Typical waits decide the result]** If waits change (later, live data), the same day may optimize differently. → It is a one-time action, so the user sees and keeps the result.
- **[The shared refactor could change grouping or the timeline]** → Mitigations:
  - `scheduleDay`, grouping and timeline tests must pass unchanged;
  - the `simulate` vs `scheduleDay` property test;
  - restaurants without a meal time are timed exactly as before.

## Migration Plan

- **Saved trips:** no stored-data migration. Old entries lack the new optional fields and behave as before.
- **Share links:** move to v3; v1 and v2 links still import.
- **Undo slot:** the rename is session-only state.
- **Deploy and rollback:** deploy as usual; rollback is a revert. After a rollback, links made by the new version can't be read until it is redeployed.
