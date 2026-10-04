# Design

## Context

See proposal.md (Why) for motivation and the delta spec for the required behaviour. What the code offers today:

| Where | What is there |
|---|---|
| `src/domain/schedule.ts` | `scheduleDay(day, catalog)` is the single source of times. Each call rebuilds its item lookup and area centres, then walks the list. About 70 µs for a 30-item day |
| `src/domain/waits.ts` | One shared time-of-day curve for every attraction (0.45 at 09:30, 1.25 from 12:00 to 15:00, 0.65 after 20:00), scaled by the ride's average and the park's month factor. So moving a busy ride to opening saves the most |
| `src/domain/grouping.ts` | `groupByArea(day, catalog)`: park order by first appearance, area order by trying every order, then `placeAnchors`, which places meals and shows by time. It calls `scheduleDay` about twice per placement step |
| `src/state/store.ts` | `groupDayByArea`, `undoGroup` and the session-only `lastGrouped` slot, with a reference check on the day's items array |
| `src/components/RouteActions.tsx` | The route row above the timeline, with the "Group by area" button and its toast |
| `src/components/Toast.tsx` | Shows one message at a time; a new message replaces the old one |

Measured on the bundled catalog, August, 09:30–23:00:

| Day | Added order | Grouped | Optimized (prototype) |
|---|---|---|---|
| Big Thunder Mountain, Frozen Ever After, Phantom Manor, Crush's Coaster | ends 14:29, queue+walk 280 | 13:32, 223 | 13:19, 210 |
| Tower of Terror, Crush's Coaster | 10:42 | 10:42 | 10:37 |
| 10 items, counter lunch, Lion King show at 15:45 | 20:04, show 108 min late | 19:43 | 18:29, show on time |

- **Exhaustive check:** on every test day of up to 6 rides without meals or shows, the prototype search found the same order as trying every order.
- **Speed:** a 30-ride day needed about 10,000 candidate orders per starting order. With a precomputed walking table each candidate took about 5 µs, so about 50 ms per starting order in the dev container.

## Goals / Non-Goals

**Goals:**
- A pure, deterministic domain function with unit tests, like the rest of `src/domain/`.
- Every time the search compares is the time the timeline will show. Each item's timing has one implementation, shared by `scheduleDay` and the search.
- A 30-ride day finishes in well under a second on a phone, without a worker.

**Non-Goals:**
- A proven optimum. The search is a local search with a fixed work limit, checked against an exhaustive search on small days.
- Leaving gaps on purpose, changing show times or restaurants, or pinning items (proposal, Out of scope).
- Changing how "Group by area" orders a day. It only switches to the shared anchor placement, with the same results.

## Decisions

### 1. Rank orders by lateness, then end of day, then queueing and walking
Each candidate order is ranked by a tuple, compared left to right:

```
rank = ( total minutes late for shows,  end of the day's last item,  queueing + walking )
```

- **Why the end comes before queueing + walking:** on 40 random days with meals and shows, ranking by queueing + walking alone ended the day later on 9 days, by up to 2 h 33 min. It saved queue minutes by leaving up to 233 idle minutes before a show and pushing rides into the evening.
- **Why queueing + walking is still the tie-break:** when the last item is a fixed-time show, every order ends at the same time. Less queueing and walking then becomes free time before the show.
- **Why lateness comes first:** it matches the spec, where an order that is less late for a show wins even if the day ends later.

*Alternatives:*
- A weighted sum. Rejected: the weights would be arbitrary, and the outcome could not be explained in one message.
- Keeping each meal within 30 minutes of its old time. Prototyped and rejected: when the day gets shorter, the search put rides with longer queues before lunch to reach the old lunch time, and the day ended up to 261 minutes later. Meals use grouping's "closest to its old time" rule instead (spec, Meals and shows keep their time).

### 2. A shared day model with a fast simulation
A new `src/domain/route.ts` holds what grouping and optimizing share.

- **`timeItem(item, entry, arrive, park, month)`** is moved out of the loop in `scheduleDay`. It returns `wait`, `waitIsEstimate`, `start`, `end`, `freeBefore` and `lateBy`. `scheduleDay` calls it, so its output is unchanged.
- **`dayModel(day, catalog)`** is built once per action:
  - the day's entries split into attractions, anchors (restaurants and shows, in their order) and missing entries;
  - each entry's position and catalog item, plus the park and month;
  - a walking table between every pair of the day's entries and from each park entrance, filled with `walkBetween`;
  - each anchor's target from `scheduleDay(day)`: a restaurant's `arrive`, or a show's start minus `arriveEarlyMin`.
- **`simulate(model, attractions)`** runs one forward pass over an attraction order. It places anchors with grouping's rule and returns `{ items, late, end, queueing, walking }`, where `items` is the full day: attractions, anchors and then missing entries.
  - Grouping's rule compares "anchor now" with "next attraction, then anchor". The pass keeps the clock and position at the end of the output so far. So each comparison is one or two `timeItem` calls on table lookups, not a `scheduleDay` run.
  - An empty output starts at the entrance of the park of whichever item comes first, as `scheduleDay` does.
- **Grouping** replaces its `placeAnchors` with `simulate(model, grouped).items`. The existing grouping tests must pass unchanged.

*Alternatives:*
- Calling `scheduleDay` for each candidate. Rejected: about 70 µs per call, and anchor placement needs about two calls per step. A 30-item day would take seconds per starting order.
- A separate fast timeline written just for the search. Rejected: two copies of the timing rules would drift. Sharing `timeItem` and the placement rule avoids that. A property test also runs `simulate` and `scheduleDay` on the same orders of random bundled-catalog days, with meals and shows, and requires equal end, lateness, queueing and walking.

### 3. Deterministic local search from three starting orders
A new `src/domain/optimize.ts` exports `optimizeRoute(day, catalog)`, which returns `PlanItem[]`.

```
model   = dayModel(day, catalog)
current = rank of the day exactly as it is (scheduleDay)
seeds   = [ the current order of the attractions,
            groupByArea order (park of the first item first),
            groupByArea order starting in the other park ]   // two-park days only
for each seed, in that order:
    order = seed
    repeat until a full pass finds nothing better or the seed's budget is spent:
        for run length L in 1..3, for each start i, for each target j != i:
            candidate = order with attractions i..i+L-1 moved to position j
            if rank(simulate(model, candidate)) < rank(order): order = candidate
    keep order if it ranks better than the best so far   // ties keep the earlier seed
return best.items if rank(best) < current, else day.items unchanged
```

- **Moving runs of 1–3 rides:** this can move a ride, a pair of neighbours, or a short area block in one step. Single moves alone get stuck when a whole block needs to move past a meal.
- **Seeds:** the grouped orders give the search a low-walking start in each park order. That covers "change which park comes first", which single moves rarely reach because they would add a park change first. The current order is a seed so a hand-tuned day is not thrown away.
- **Budget:** each seed may evaluate at most 20,000 candidates. Work is counted, not timed, so the result does not depend on the device (spec, Same day, same result). That is about twice what a 30-ride day needed in the prototype. A typical 10–15 ride day needs under 3,000.
- **"Better" is strict,** and the final check compares with the day exactly as it is. So an order that only re-places a meal without gaining time leaves the day unchanged.
- **`groupByArea` options:** it gains `{ firstPark?: ParkId }` to build the third seed. Without it, it behaves as today.

*Alternatives:*
- Trying every order. Rejected: n! orders is already too many at 9 rides.
- Dynamic programming over subsets (Held–Karp). Rejected: waits depend on arrival time, so the state would need the clock as well; 2^30 subsets is already too many.
- Simulated annealing with a seeded random generator. Rejected: results depend on tuning and on the seed, it needs many more candidates than local search, and in the prototype it found nothing better on the test days.
- "Busiest ride first" sorting. Rejected: it ignores walking and park changes.

### 4. One undo slot for both reorders
- `lastGrouped` becomes `lastReorder = { dayId, previous, reordered }`, and `undoGroup` becomes `undoReorder`. Both actions write the slot; Undo works only while the day's items are still the same array as `reordered`, as today.
- New store action `optimizeDayRoute(dayId)`. It runs `optimizeRoute` and compares by entry reference:
  - No change: it returns `{ changed: false }`.
  - Change: it returns `{ changed: true, endBefore, endAfter, queueWalkBefore, queueWalkAfter }`. Every number comes from `scheduleDay(...)`: `end`, and `breakdown.queueing + breakdown.walking`.
- The slot stays session-only and is never saved.
- Grouping then optimizing then Undo restores the grouped order, because optimizing wrote the slot last (spec, Optimize after grouping). The toast shows one message at a time, so only the latest Undo is ever offered.

*Alternative:* a second slot for optimizing. Rejected: two live slots for one day add state, and nothing in the UI can reach the older one.

### 5. UI
- **Route row:** `RouteActions` gets a second secondary `Button`, "Optimize route", after "Group by area". On a phone at 390 px the two buttons sit side by side and stay at least 44 px tall. Both are disabled when the day has fewer than two items.
- **Busy state:** on tap, the button shows "Optimizing…" and is disabled. The search runs in a `setTimeout(…, 0)` so that label paints first.
- **Messages:**
  - On a change: `toast("Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min", { label: "Undo", run: undoReorder })`, with times from `formatClock`.
  - Otherwise: `toast("No quicker order found")`.

*Alternative:* a Web Worker. Rejected: it adds a bundle entry and moves the catalog into the worker, to save at most a few hundred milliseconds that the budget already caps.

## Risks / Trade-offs

- **[Local search can miss the best order]** → Mitigations:
  - three starting orders, covering both park orders;
  - unit tests that match an exhaustive search on fixed small days;
  - the result is never worse than the current order;
  - the message shows the real before and after.
- **[A meal can move away from its time]** The order of attractions around it changes. It moves by up to about one ride (queue and ride) from its time, and further when the day gets much shorter. On random days the median shift was 28 minutes, against 16 for grouping. → Mitigations: the same rule as grouping, the timeline shows the new time, and Undo is one tap away. Pinning a meal time is a possible later change.
- **[Splitting an area can look like zig-zagging]** → It only happens when the day then ends earlier, and the message says by how much.
- **[A slow phone may pause briefly on a very large day]** → The per-seed budget caps the work, and the busy label paints first. Task 4.2 checks the pause on a real phone.
- **[Typical waits decide the order]** If waits change (later, live data), the same day may optimize differently. → It is a one-time action, so the user sees and keeps the result.
- **[The shared refactor could change grouping or the timeline]** → `scheduleDay`, grouping and timeline tests must pass unchanged, plus the `simulate` vs `scheduleDay` property test.

## Migration Plan

No data change. Saved trips and share links are unaffected because optimizing only reorders existing entries. The undo slot rename is session-only state, so nothing stored changes. Deploy as usual; rollback is a revert.
