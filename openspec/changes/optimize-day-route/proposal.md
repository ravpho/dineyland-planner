# Proposal

## Why

"Group by area" cuts walking, but it ignores queues. It always starts in the park of the day's first item and visits areas in the order nearest the entrance. So the busiest rides often land in the midday peak. A test day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, grouped, reaches Crush's Coaster at 10:52 with a 60-minute queue. Starting in Disney Adventure World with Crush's Coaster at opening, the queue is 30 minutes. The whole day then ends 13 minutes earlier than the grouped order and 70 minutes earlier than the order the rides were added.

Meals and shows also shape the day, and today the planner treats both as fixed points it can't question:
- **Meals have no time of their own.** Lunch only keeps whatever time it happened to have, so a family can't say "lunch at 12:00, dinner at 18:00" and have the plan hold it.
- **No warning about a badly placed restaurant.** A lunch booked in the other park can cost two park changes, about 45 minutes, with no hint of a nearer choice.
- **Shows keep the performance picked when they were added,** even when another performance fits the day far better.

This is the follow-up the `group-day-by-area` change named: it may change which park comes first and it reduces queueing.

## What Changes

- **"Optimize route" button on the Plan tab**, next to "Group by area". One tap reorders the selected day's attractions so the day ends as early as possible:
  - **Inputs:** the timeline's own walking times and the typical wait at each projected arrival time.
  - **Ties:** when two orders end at the same time, the one with less queueing and walking wins. This matters on a day that ends with a fixed-time show, such as the fireworks.
  - **Freedom:** it may change which park comes first, and may split an area's rides when that ends the day earlier (for example, the busiest ride at opening, its neighbours later).
  - **Never worse:** it never makes the user later for a show or meal, and never ends the day later at the same lateness. If it finds nothing quicker, the day stays as it is.
- **Show times chosen by Optimize, unless locked.** For each show, Optimize picks the performance that gives the best day, for example The Lion King at 13:10 instead of 16:45. A lock on the show's timeline item keeps the user's time.
- **Meal times.** Tapping add on a restaurant asks when the user will eat: lunch 11:30–13:30, dinner 18:00–20:00, or "Any time". The time can be changed later in the plan.
  - **In the timeline:** a meal is reached within 30 minutes of its time. Arriving earlier shows free time; arriving more than 30 minutes after is flagged as late.
  - **When reordering:** grouping and optimizing place a timed meal where the arrival is closest to its time. Optimizing ranks lateness first, so it never makes a meal later than it was.
- **Restaurant suggestions.** When a restaurant would be reached late, or another restaurant of the same service type would end the day at least 15 minutes earlier, its timeline item suggests up to three, with the minutes each saves. One tap swaps it, keeping the meal time, with Undo.
- **Message and Undo:**
  - The message shows when the day ends and the minutes of queueing and walking, before → after, and names changed show times. For example: "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min".
  - Undo restores the order and the show times.
  - When nothing changes, it says "No quicker order found", without Undo.
  - Like grouping, this is a one-time action, not a mode.
- **Same result every time:** the same day always gives the same result. The search uses no randomness and no clock.

## Capabilities

### New Capabilities
None. `route-optimization` already owns reordering a day.

### Modified Capabilities
- `route-optimization`:
  - adds the "Optimize route" action, its ordering goal, show-time choice, restaurant suggestions, and its message and Undo;
  - "Meals and shows keep their time" now covers optimizing and meal times.
- `day-schedule`:
  - "Meals in the timeline" adds the 30-minute meal window, with free time when early and a late flag after it;
  - "Instant recalculation" adds meal-time changes and restaurant swaps.
- `trip-itinerary`:
  - adds choosing a meal time;
  - adds keeping meal times and show locks in saved trips and share links;
  - "Show start time" adds the lock.

## Impact

- **Code:**
  - A new pure domain module for the route search, and one for restaurant suggestions, with unit tests.
  - A shared fast day simulation with the meal and show placement. Grouping switches to it; its existing tests must pass unchanged.
  - The per-item timing in `scheduleDay` moves into a helper the search shares, and gains the meal window.
  - Store actions to optimize, swap a restaurant, set a meal time and lock a show. The session-only undo slot is shared by grouping, optimizing and swapping.
  - The Plan screen gets:
    - a second button in the route row;
    - a meal-time picker when adding a restaurant;
    - meal-time and lock controls on timeline items;
    - suggestions on restaurant items.
- **Data:**
  - Plan entries gain an optional meal time (restaurants) and lock (shows).
  - Saved trips need no migration.
  - Share links move to a new version that carries both. Links from earlier versions still import, but an app that hasn't updated yet can't read the new links.
- **Dependencies:** none.
- **Out of scope:**
  - Waiting on purpose for a shorter queue later, such as leaving a gap before a ride.
  - Swapping restaurants automatically during Optimize.
  - Restaurant opening hours and table-service bookings (not in the catalog).
  - Pinning an attraction to a position.
  - Live waits.
