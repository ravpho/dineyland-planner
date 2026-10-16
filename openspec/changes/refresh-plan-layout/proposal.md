# Proposal

## Why

The night-sky theme made the planner look right, but using it on a phone in the park still takes too much effort:

- **Too much sits above the day.** The Plan opens with a trip row, day tabs, an hours row, a ticket note, a view switch and two route buttons. The day itself starts halfway down the screen.
- **Navigation is out of reach.** The Catalog and Plan tabs are at the top of the screen, far from the thumb. Each tab also has its own List/Map or Timeline/Map switch, so there are two maps in two places.
- **Every timeline card carries every control.** Grip, move up, move down, remove, meal and show pickers, lock and suggestions are all shown at once. Cards are tall, and a delete button sits next to the move buttons.
- **Small reorders are fiddly.** On a touch screen a drag only starts after a long press, and big moves take many taps on "move up".
- **Some messages hide what they talk about.** A late show says "24 min late" next to an arrival only four minutes after its start time, and a toast can cover a sheet's controls.

A clickable mockup of the refreshed layout was reviewed and chosen. It keeps the Midnight look and changes how the screens are arranged and how the day is edited.

## What Changes

- **A bottom bar on phones, with three tabs:**
  - **Explore**, which was the Catalog.
  - **My day**, which was the Plan.
  - **Map**, new: it takes over both of today's maps.
  - The fit status ("Fits · 6 h 34 min spare" or "Over by N min") sits just above the bar on all three tabs, so it stays in view.
  - Old links to `#/catalog` and `#/plan` keep working.
- **A one-row header:**
  - It shows the trip's name, which also switches trips, with Share and a "More" menu.
  - The menu holds New trip, Rename, Number of days, Delete trip, and About and data sources.
  - Before any trip exists, the header shows the app's name instead.
- **My day puts the day first:**
  - **Date chips** show one compact chip per day, such as "Wed 12".
  - **The day card** shows the date, the hours, the number of stops and, on a two-park day, the park order and the ticket reminder.
    - Tapping it opens a sheet to change the hours and switch the park order.
    - Switch order keeps today's rules, warning and Undo.
  - **The timeline comes right after.** On a 390 × 844 phone the first three stops are in view without scrolling.
- **Clean, draggable stops:**
  - **Each stop shows** its number, times, name, area and wait.
  - **Small tags** show the meal or show time, a lock, and the late, unsuitable and "ends after" flags.
  - **A grip handle** on each stop starts a drag as soon as the finger moves on it, with touch or mouse.
    - The dragged stop lifts and a line shows where it will land, across both parks' sections.
    - The list scrolls near the edges, and Undo restores the old order.
  - **Tapping a stop opens its sheet**, which holds:
    - arrival, wait, start and end times, and why it is late when it is;
    - the meal or show time and the show lock;
    - quicker restaurant suggestions;
    - **Move to top** and **Move to bottom**, plus a "Stop 3 of 7" stepper with move up and move down;
    - Remove, with Undo.
- **One main action.** "Optimize route" is the day's main button, and "Group by area" becomes a secondary action under it. Both keep their messages and Undo.
- **Late flags explain themselves.** For example: "24 min late · arrives 14:12, be there by 13:45".
- **One Map tab:**
  - It opens on **My day**: the day's numbered stops, the park switch with stop numbers, and the stop card with "Show in timeline".
  - A switch changes it to **All places**: today's catalog map, with the same filters and search as Explore, and its item cards and walking times.
  - The choice lasts for the session.
- **Explore:**
  - The rows keep all their facts in a cleaner layout with a type tile, and the planned labels stay.
  - Quick type chips sit under the search.
  - The filters sheet ends with "Show N results".
  - Item details stay complete, with "Add to Day N" fixed at the bottom of the sheet.
- **Wide screens (1024 px and up):**
  - Explore is on the left and My day on the right, as today, and dragging items from Explore into the day still works.
  - An "Explore | Map" switch above the left column shows the Map there instead.
  - There is no bottom bar on wide screens.
- **Messages never cover a sheet.** While a sheet is open, toasts wait or appear above it, never over its controls.
- **No change** to the theme's colors, fonts, motion rules, the app's mark, saved trips, share links, or how anything is calculated.

## Capabilities

### New Capabilities
None. Every change belongs to an existing capability.

### Modified Capabilities
- `app-shell`:
  - The phone layout becomes three bottom tabs with the fit status above them.
  - The wide-screen layout gains the Explore | Map switch.
  - The header becomes one row with a More menu, which now also holds About.
  - "Day first on the Plan" becomes the date chips and day card, with three stops in view.
  - Messages must not cover an open sheet.
- `trip-itinerary`: dragging starts at once on the handle, and stops can move to the top or bottom of the day.
- `day-schedule`:
  - Each timeline item opens a sheet with its times and actions.
  - Late shows and meals say when the user arrives and when they need to be there.
- `park-map`:
  - The catalog's List/Map switch and the Plan's Timeline/Map switch are replaced by the Map tab's "My day | All places" switch.
  - "Show in timeline" opens My day.
  - The session-only choice moves to the Map tab.
- `route-optimization`: "Optimize route" and "Group by area" belong to My day, with Optimize as the main action.

## Impact

- **UI:**
  - `App.tsx` gets the header, the bottom bar and the wide-screen switch.
  - The Plan screen gets the date chips, the day card and its sheet.
  - The timeline items are rebuilt as compact rows with a stop sheet, which replaces the inline pickers and buttons.
  - The Catalog screen becomes Explore, with type chips and a filters footer.
  - A new Map screen hosts the two existing maps.
  - `Toast` and `Sheet` get the new stacking rule.
- **Routing and store:**
  - A `#/map` route is added. `#/catalog` and `#/plan` keep their meaning under the new names.
  - The session-only `planView` and `catalogView` are replaced by one `mapMode`.
  - "Show in timeline" switches to the My day tab.
- **Drag and drop:**
  - The touch sensor starts from a short movement on the handle instead of a 200 ms press.
  - Today's dnd-kit context is kept, so catalog-to-day drops still work on wide screens.
  - A drop indicator is added.
- **Tests:**
  - Unit and end-to-end tests that use the Catalog and Plan tab names, the Plan view and Catalog view switches, the hours row, the inline move buttons or the trip row change to the new names and places.
  - The fold check moves from two stops to three.
  - New checks cover the bottom bar, the stop sheet, move to top and bottom, the Map tab and toasts with an open sheet.
- **Data:** none. Saved trips, share links and the catalog don't change.
- **Dependencies:** none.
- **Out of scope:**
  - A dark mode.
  - Changing the Midnight colors or fonts.
  - Renaming "Optimize route" or other action labels the specs name.
  - Adding days from a chip in the date row.
  - Swipe gestures on stops.
  - Reordering on the map.
  - Moving stops between days.
