# Proposal

## Why

"Group by area" cuts walking, but it ignores queues. It always starts in the park of the day's first item and visits areas in the order nearest the entrance. So the busiest rides often land in the midday peak. A test day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, grouped, reaches Crush's Coaster at 10:52 with a 60-minute queue. Starting in Disney Adventure World with Crush's Coaster at opening, the queue is 30 minutes. The whole day then ends 13 minutes earlier than the grouped order and 70 minutes earlier than the order the rides were added. This is the follow-up the `group-day-by-area` change named: it may change which park comes first and it reduces queueing.

## What Changes

- **"Optimize route" button on the Plan tab**, next to "Group by area". One tap reorders the selected day's attractions so the day ends as early as possible:
  - **Inputs:** the timeline's own walking times and the typical wait at each projected arrival time.
  - **Ties:** when two orders end at the same time, the one with less queueing and walking wins. This matters on a day that ends with a fixed-time show, such as the fireworks.
  - **Freedom:** it may change which park comes first, and may split an area's rides when that ends the day earlier (for example, the busiest ride at opening, its neighbours later).
  - **Never worse:** it never ends the day later and never makes the user later for a show than the current order. If it finds nothing quicker, the order stays as it is.
- **Meals and shows keep their time**, by the same rule as grouping: restaurants go where arrival is closest to its time before the reorder; shows go before the first attraction that would make the user late.
- **Message and Undo:** the message shows when the day ends and the minutes of queueing and walking, before → after, with Undo. For example: "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min". When nothing quicker is found, it says "No quicker order found", without Undo. Like grouping, this is a one-time action, not a mode.
- **Same result every time:** the same day always gives the same order. The search uses no randomness and no clock.

## Capabilities

### New Capabilities
None. `route-optimization` already owns reordering a day.

### Modified Capabilities
- `route-optimization`: adds the "Optimize route" action, its ordering goal, and its message and Undo. The "Meals and shows keep their time" requirement changes so it covers optimizing as well as grouping.

## Impact

- **Code:**
  - A new pure domain module for the route search, with unit tests.
  - A shared fast day simulation with the anchor placement. Grouping switches to it, with no change in behaviour.
  - The per-item timing in `scheduleDay` moves into a helper the search shares, so times can't disagree.
  - A store action. The session-only undo slot is shared by grouping and optimizing.
  - A second button in the existing route row on the Plan screen.
- **Data, storage and share links:** unchanged. Optimizing only reorders existing entries.
- **Dependencies:** none.
- **Out of scope:**
  - Waiting on purpose for a shorter queue later, such as leaving a gap before a ride.
  - Choosing a different show time or restaurant.
  - Pinning an item to a position.
  - Live waits.
