# Proposal

## Why

The owner's trip is a single day that uses both Disneyland Park and Disney Adventure World. Today every day is locked to one park: the catalog shows only that park and items from the other one are rejected. A park-hopping day can't be planned. The timeline also has no idea what crossing between the parks costs, and the catalog's sorting is hidden in the filter sheet, where the owner didn't find it.

## What Changes

- **BREAKING (saved data):** a day no longer has a park. It can hold attractions, restaurants and shows from both parks in any order. Saved trips and old share links are migrated: the day's park is dropped and everything else is kept.
- The day's default time window is the earliest opening and latest closing of the two parks for that month.
- Walking between items in different parks goes out through the first park's entrance, across to the other park's entrance, and in again, plus a fixed park-change time. The timeline shows a park change as its own labelled step.
- Typical waits use the monthly crowd level of the item's own park, not of the day.
- A day that uses both parks shows a short reminder that this needs a ticket valid for both parks.
- The catalog shows both parks by default. The park filter becomes optional (all parks, or one park).
- Every catalog row shows its park and area, for example "Disneyland Park · Frontierland".
- Sorting gains duration and moves from the filter sheet to a control above the list. The wait sort is labelled as the busiest typical wait for the month.
- New trips default to 1 day. Multi-day trips stay supported.

Out of scope, planned for the follow-up change `add-park-maps`: the schematic map, the official map link, official page links per item, and the data review (task 3.7 of the archived change).

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `trip-itinerary`: days have no park, so any item can be added to any day. The rules about rejecting other-park items and changing a day's park go away. Saved trips and share links from before the change keep working. New trips default to one day.
- `day-schedule`: the timeline starts at the first item's park entrance, routes walks between parks through both entrances with a park-change time, uses each item's park for its typical wait, and shows a reminder when a day uses both parks.
- `catalog-filtering`: the park filter is optional with all parks by default, clearing filters returns to all parks, and sorting adds duration through a control above the list.
- `park-catalog`: catalog rows show the item's park and area.

## Impact

- **Code:**
  - Domain: `src/domain/trip.ts`, `schedule.ts`, `walking.ts`, `filters.ts`, `shareLink.ts`.
  - State: `src/state/store.ts`, `persistence.ts`.
  - UI: catalog list, filter panel, plan screen, day settings, add-to-day helper.
  - The unit and Playwright tests that assume one park per day.
- **Saved data:** device storage schema version 1 → 2 and share-link format version 1 → 2, both with automatic upgrades of old data.
- **Specs:** four modified capabilities. The `trip-itinerary` Purpose sentence ("with one park … for each day") needs updating when the change is archived.
- **No new dependencies or data collection.** The catalog data and its build are unchanged.
