# Design

## Context

See proposal.md (Why) for motivation and the delta specs for the required behaviour. What the code offers today:

| Where | What is there |
|---|---|
| `src/domain/schedule.ts` | `scheduleDay(day, catalog)` turns an ordered day into slots with `arrive`, `start`, `end`, and `breakdown.walking`. It is the single source of times |
| `src/domain/walking.ts` | `walkBetween(from, to)` (with park changes through both entrances), `locate(item)` (item position, else area centre), `entranceOf(park)` |
| `src/state/store.ts` | `moveItem` and `removeItem`. Session-only undo state `lastRemoved`, with `undoRemove()`. `updateDay` replaces a day's `items` array only when that day's items change |
| `src/components/Toast.tsx` | `toast(text, { label, run })`, already used for "Removed X · Undo" |
| `src/screens/PlanScreen.tsx` | Day tabs, `DaySettings`, `TicketReminder`, `DayTimeline`, `Breakdown`, `FitBar` |
| `src/components/DayTimeline.tsx` | `SlotCard`: time and name on the first line; walk, arrival and wait on the second. No area shown |
| `ItemDetail.tsx`, `ParkMap.tsx` | Each looks up an area name with `park.areas.find(...)` |

Measured on the real catalog (August, 09:30–21:00):
- Big Thunder Mountain → Frozen Ever After → Phantom Manor → Crush's Coaster walks 95 minutes.
- Grouped as Big Thunder Mountain → Phantom Manor → Crush's Coaster → Frozen Ever After, it walks 48 minutes.
- Grouping the Adventure World areas in the order they first appeared (Frozen before Crush) would walk 59.

## Goals / Non-Goals

**Goals:**
- A pure, deterministic domain function with unit tests, like the rest of `src/domain/`.
- Times come only from `scheduleDay` and `walkBetween`, so the grouping, the message and the timeline never disagree.

**Non-Goals:**
- Changing which park comes first, or reducing queueing. Those are for `optimize-day-route`, which starts from this order.
- Moving a meal to a restaurant in a nearer area, or changing show times.
- A persistent "keep grouped" mode.

## Decisions

### 1. A pure `groupByArea(day, catalog)` that returns the same entries in a new order
- It lives in a new `src/domain/grouping.ts` and returns `PlanItem[]`: the day's own entries (same keys and show times), reordered.
- It needs no group profile, because suitability does not change times.
- Steps:

```
 1. split   day.items -> attractions | anchors (restaurants, shows) | missing
 2. parks   order of first appearance among scheduled items (schedule.parks)
 3. areas   per park: best area order (Decision 2); user order inside each area
 4. anchors put meals and shows back by time (Decision 3)
 5. missing "No longer available" entries go to the end, in their order
```

*Alternative:* sort by catalog area order. Rejected: a fixed order runs one way round the park. It can't end near the entrance when the day leaves for the other park, and it ignores where the planned items actually are.

### 2. Area order by trying every order, measured on the day's own items
- A park has at most 5 areas, so at most 120 orders. Each order is scored as the sum of `walkBetween` along the actual item sequence:
  - from the park's entrance;
  - through each area's items in the user's order;
  - plus the walk from the last item back to the entrance when a later park follows.
- The orders are tried starting from the order of first appearance, and a later order replaces the best only if it walks strictly less. Ties therefore keep the user's arrangement, and the result is deterministic.
- Parks are independent: a park change always goes entrance to entrance. So each park is searched on its own.

*Alternatives:*
- The area-centre walking table. Rejected: Fantasyland alone has 21 items, so its centre can be far from the items actually planned. The day's own items match what the timeline will show.
- Nearest-next area. Rejected: it isn't optimal, and with at most 120 orders there is nothing to save.

### 3. Meals and shows put back by time, in one greedy pass
- Anchors are the day's restaurants and shows, in their current order. Each has a target time:
  - a restaurant: its `arrive` in the schedule before grouping;
  - a show: its show time minus `arriveEarlyMin`, the time the user must be there.
- Only the next anchor is checked at each step, so meals and shows keep their order relative to each other:

```
out = []
for a in grouped attractions:
    while next anchor x exists and goesBefore(x, a): append x to out
    append a to out
append the remaining anchors

goesBefore(restaurant r, a) = |arrive_r(out + r) - target_r|  <=  |arrive_r(out + a + r) - target_r|
goesBefore(show s, a)       =  arrive_s(out + a + s)  >  target_s
```

- `arrive_x(list)` is the arrival of `x` when `scheduleDay` runs on that list.
- **Why the restaurant rule finds the closest slot:** arrival only grows as attractions are added in front, so stopping at the first point where waiting longer gets no closer gives the closest slot.
- **Why the show rule works:** it places the show before the first attraction that would make the user late. If the user is already late, that is right away.
- **Cost:** at most two `scheduleDay` runs per step, each `O(n)`. A 30-item day needs about 60 runs at about 33 µs each, a few milliseconds. The area search adds at most 120 orders per park. It runs only on tap and needs no worker.

*Alternatives:*
- Keep anchors at their list index. Rejected: tap-to-add makes the index reflect browsing order, not the meal time.
- Group anchors like attractions. Rejected: lunch would move to 09:45 and a 17:30 parade into the morning.

### 4. Store action with reference-checked undo
- `groupDayByArea(dayId)` runs `groupByArea` and compares the result with the current order:
  - No change: it returns `{ changed: false }`.
  - Change: it replaces `items`, keeps `lastGrouped = { dayId, previous, grouped }`, and returns `{ changed: true, walkBefore, walkAfter }`. Both walking totals come from `scheduleDay(...).breakdown.walking`.
- `undoGroup()` restores `previous` only if the day's `items` is still the same array object as `grouped`.
  - Every edit to a day's items creates a new array (`updateDay`), so any later add, move, remove or show-time change disables the undo.
  - A window change keeps the array, and undoing then is harmless.
- `lastGrouped` is session-only and never saved, like `lastRemoved`.

*Alternative:* compare key sequences. Rejected: it misses show-time edits; the reference check catches every edit for free.

### 5. UI
- **Plan screen:** a row above the timeline holds a secondary `Button` "Group by area". It is disabled when the day has fewer than two items. `optimize-day-route` will add its button to the same row.
- **Messages:**
  - On a change: `toast("Grouped by area · walking 95 → 48 min", { label: "Undo", run: undoGroup })`.
  - Otherwise: `toast("Already grouped by area")`.
- **Area label:** `SlotCard` shows the area name first on its second line, as `data-testid="slot-area"`.
  - A small `areaName(item, catalog)` helper in `labels.ts` replaces the two `park.areas.find(...)` lookups in `ItemDetail` and `ParkMap`.
  - Missing entries show no area.

## Risks / Trade-offs

- **[A meal in the other park can split a park's block]** For example, a DAW lunch between DLP rides adds two park changes. → The order is still far better than browsing order, and the timeline shows each park change. `optimize-day-route` can move whole area blocks around anchors.
- **[Walking can rise slightly in rare cases]** Anchors are placed by time, not distance. → The message shows the real before and after, and Undo is one tap away.
- **[Typical times decide anchor placement]** If waits change (later, live data), the same day may group differently. → Grouping is a one-time action, so the user sees and keeps the result.

## Migration Plan

No data change. Saved trips and share links are unaffected because grouping only reorders existing entries. Deploy as usual; rollback is a revert.
