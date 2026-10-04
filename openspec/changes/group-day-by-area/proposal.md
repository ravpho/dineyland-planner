# Proposal

## Why

Tapping "Add" appends to the end of the day, so a day is built in browsing order and zig-zags across areas and between the parks. A test day of 16 rides entered alternately between the parks walked for 406 minutes. The same rides grouped by park and area walked for 113 minutes. Fixing that today means dragging every item by hand. This is the first of two route changes; the follow-up `optimize-day-route` will start from the grouped order.

## What Changes

- **"Group by area" button on the Plan tab:** one tap reorders the selected day so the items of each park are together, and within each park the items of each area are together.
  - **Park order:** the park of the day's first item comes first.
  - **Area order:** within each park, the areas follow the order with the least walking. In a park the day later leaves, the loop ends near the entrance, where the walk to the other park starts.
  - **Within an area:** items keep the user's order.
- **Meals and shows keep their time:** only attractions are regrouped. Restaurants go back where the new timeline reaches the time they had before. Shows go at the last point where the user still arrives on time.
- **Undo:** after grouping, a message shows the walking time before and after, with an Undo action that restores the previous order. Grouping is a one-time action, not a mode: later adds and drags work as before.
- **Area label in the timeline:** every scheduled item shows its area name, such as "Fantasyland", so the groups are visible.

## Capabilities

### New Capabilities
- `route-optimization`: reordering a day's items to cut walking (and, in the follow-up change, queueing). This change adds grouping by area, how meals and shows keep their time, and undo.

### Modified Capabilities
- `day-schedule`: adds a requirement that each timeline item shows its area. No existing requirement changes.

## Impact

- **Code:**
  - A new pure domain module for grouping, with unit tests.
  - A store action that sets a day's new order and keeps the previous order for undo.
  - A button on the Plan screen.
  - An area label in the timeline item.
- **Data, storage and share links:** unchanged. Grouping only changes the order of the existing entries; it adds no fields.
- **Dependencies:** none.
