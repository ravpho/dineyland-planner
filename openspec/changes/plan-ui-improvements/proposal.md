# Proposal

## Why

Three everyday tasks in the planner take more effort than they should:

- **No lasting sign that an item is planned.** After adding an item, a toast says "Added …" for four seconds. After that, the catalog row looks the same as before, so it's easy to add a ride twice by mistake, or to lose track of what's already in the day.
- **The route is hidden in the catalog.** The only way to see the day's route is to leave the plan, open the Catalog, switch it to Map and pick a park. There, the route is drawn under every catalog marker that passes the filters.
- **Switching which park comes first means moving every item.** On a day that visits both parks, doing Disney Adventure World in the morning instead of the afternoon takes one move per item.

## What Changes

- **Planned items are marked in the catalog:**
  - An item in the selected day gets a tinted row and a label such as "In Day 1 · stop 4". A repeated item lists all its stops: "stops 4, 9".
  - An item planned only on another day of the trip gets a muted "In Day 3" label, without the tint.
  - The add button stays, because the same item can be planned more than once. The "Added" toast stays too.
  - The unsuitable mark still shows on a planned item.
  - The same label appears in the item's details and on its card on the catalog map.
- **Stop numbers on timeline items.** Each scheduled item in the timeline shows its stop number. This is the number the map route and the new catalog label use, so "stop 4" can be found in the plan.
- **Map in the plan.** The Plan gets a "Timeline | Map" switch:
  - **What it shows:** only the selected day's stops, numbered and named and joined in plan order, drawn as the catalog map draws the route. No catalog items, and no reordering on the map.
  - **Park:** it opens on the park of the day's first item. The park switch says which stops are in each park.
  - **Tapping a stop** shows its times from the timeline, and "Show in timeline" switches back and brings that item into view.
  - **Other parts:**
    - The fit status stays visible.
    - The choice lasts for the session only, like the catalog's List/Map switch.
    - An empty day shows "Nothing planned yet".
    - The catalog map keeps drawing the route.
- **Switch the park order of a day:**
  - **Where:** a day whose attractions are in both parks shows its park order, for example "Disneyland Park → Disney Adventure World", with a "Switch order" action.
  - **When it's available:** only when the day is grouped, meaning each park's attractions are together, with one park change between attractions. Meals and shows don't count. Otherwise the action is shown unavailable, with a hint to use "Group by area" first.
  - **What it does:**
    - It swaps the two parks' blocks of attractions and keeps the order inside each park.
    - It removes every meal and show from the day.
    - It moves entries marked "No longer available" to the end.
  - **Warning:** if the day has meals or shows, a warning lists them by name before anything changes, with Cancel and "Switch and remove N".
  - **Afterwards:** a message such as "Disney Adventure World first · 2 removed" offers Undo, which restores the previous order and the removed items.

## Capabilities

### New Capabilities
None. Each improvement belongs to an existing capability.

### Modified Capabilities
- `park-catalog`: adds marking planned items in list rows, item details and the map's item card.
- `park-map`: adds the map of the day in the plan, with its stop card and "Show in timeline".
- `trip-itinerary`: adds switching the park order of a day, with its availability rule, warning and Undo.
- `day-schedule`: adds the stop number on each scheduled timeline item.

## Impact

- **Code:**
  - A small pure domain module for a day's stop numbers and where each item is planned across a trip.
  - A pure domain function for a day's park order and the park switch.
  - Both get unit tests.
- **Store:**
  - A `switchParkOrder` action that reuses the session-only undo slot shared with grouping, optimizing and swapping a restaurant.
  - A session-only plan view (timeline or map).
- **UI:**
  - Catalog rows, item details and the map item card show the planned label.
  - Timeline items show stop numbers.
  - The Plan screen gets the "Timeline | Map" switch and a plan map built from the existing map canvas.
  - The two-park reminder gets the park order, the switch and a warning sheet.
- **Data:** none. Saved trips and share links don't change.
- **Dependencies:** none.
- **Out of scope:**
  - Reordering areas inside a park as groups.
  - Group headers in the timeline.
  - Dragging groups.
  - Moving items between days.
  - Keeping meals and shows when switching parks.
  - Reordering on the map.
