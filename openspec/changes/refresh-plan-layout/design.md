# Design

## Context

See proposal.md (Why) for the motivation and the delta specs for the required behaviour. The reviewed mockup is the visual reference: Midnight direction, phone width. What the code offers today:

| Where | What is there |
|---|---|
| `src/App.tsx` | Sticky navy header with the wordmark and About. Below 1024 px (`WIDE_QUERY`), `role="tab"` links Catalog and Plan sit in the header. From 1024 px, `CatalogScreen` and `PlanScreen` sit side by side inside one `PlannerDnd`, and the plan column is sticky (`data-testid="plan-column"`) |
| `src/routing.ts` | Hash routes `#/catalog`, `#/plan` (the default), `#/about`, `#/import/…`. The manifest's `start_url` is `./`, which opens the Plan |
| `src/screens/PlanScreen.tsx` | `TripBar` (trip select, days select, Share, Trip options), day tabs (`role="tab"` in a "Days" tablist), `DayHours`, `TicketReminder` with `ParkOrder`, a "Plan view" Timeline/Map switch with `RouteActions`, then `DayTimeline` or `PlanMap`, `Breakdown`, and `FitBar` |
| `src/components/DayTimeline.tsx` | `SlotCard`: a rail node, the grip (`slot-handle`, a dnd-kit activator), time, name, area, walk, arrival and wait, badges, inline show-time select and lock, meal-time select, restaurant suggestions, then move up, move down and remove `IconButton`s |
| `src/components/PlannerDnd.tsx` | One `DndContext` for reordering and for catalog-to-day drops. Sensors: `MouseSensor` (5 px), `TouchSensor` (`delay: 200, tolerance: 8`) and `KeyboardSensor` |
| `src/components/CatalogList.tsx` | Search, Filters, a "Catalog view" List/Map switch, the match count and sort, then the list rows or `ParkMap` |
| `src/components/ParkMap.tsx`, `PlanMap.tsx` | Both draw on the shared `MapCanvas`. `ParkMap` takes the filtered `listed` items, with item cards and area walking times. `PlanMap` shows the day's stops and a stop card with "Show in timeline" |
| `src/state/store.ts` | Session-only `catalogView`, `planView`, `planFocusKey` and `mapParkId`. `showInTimeline(key)` sets `planView` and the focus key. `moveItem` has no undo. One `lastRouteChange` slot (`previous`, `changed`) backs Undo for grouping, optimizing, a restaurant swap and a park switch, and only undoes a day that is still untouched |
| `src/components/Toast.tsx`, `ui.tsx` | The toast is fixed at `bottom-24`, `z-50`. `Sheet` is a portal at `z-40`, so a toast covers an open sheet |
| `src/components/FitSummary.tsx` | `FitBar` is fixed at the bottom on phones (`z-30`) and sticky inside the plan column on wide screens |
| Tests | Unit tests use the Catalog and Plan tab names, "Plan view" and "Catalog view", the hours labels Start and End, `ticket-reminder`, the inline move buttons and "Show in timeline". About 20 e2e tests use the same, plus `touchDrag` (which waits 350 ms before moving) and the two-item fold check at 390 × 844 |

## Goals / Non-Goals

**Goals:**
- Build the refresh from today's components: keep the domain, the store's planning actions, dnd-kit, `MapCanvas`, `Sheet`, `FilterPanel`, `ItemDetail`, `ParkOrder` and `ShareSheet`, and move them into the new places.
- Keep the test ids that still name the same thing (`timeline-slot`, `slot-stop`, `slot-name`, `slot-area`, `slot-time`, `slot-handle`, `park-change`, `free-time`, `fit-summary`, `plan-column`, `catalog-drag-handle`, `toast`), so most tests change only in how they reach a control.
- Keep every theme token. New surfaces (the bottom bar, the day card) use the existing roles. `guard.test.ts` and `contrast.test.ts` stay green without changes.

**Non-Goals:**
- New domain logic, apart from the arrival deadline for late flags (Decision 9).
- Changing how trips are saved or shared.
- Changing the maps' drawing.
- A separate tablet layout between phone and wide screen. Below 1024 px is the phone layout, as today.

## Decisions

### 1. Routes keep their addresses; the tab names change
- `#/catalog` is Explore and `#/plan` is My day. A new `#/map` is the Map tab.
- Old links and the installed app's `start_url` (`./`, which opens `#/plan`) keep working with no redirect code. This meets "Earlier links keep working".
- `Route` gains `{ name: 'map' }`.
- *Alternative:* new addresses (`#/explore`, `#/day`) with redirects from the old ones. Rejected: they add code and a redirect hop just to change the URL's wording.

### 2. Bottom bar and dock on phones
- A new `Dock`, fixed to the bottom below 1024 px, holds two parts:
  - **Fit strip:** a one-line `FitBar`, kept as `data-testid="fit-summary"`, shown only when a trip exists.
  - **Tab bar:** a `<nav aria-label="Sections">` with three links, Explore, My day and Map. Each has an icon and a label, and the current one has `aria-current="page"`.
- **Look:**
  - The dock is `bg-sky`, with `pb-[env(safe-area-inset-bottom)]`.
  - The current tab gets a `star`-colored label and icon on a `star/15` pill. The others are `on-sky-muted`.
- **Space below the content:** the main content gets bottom padding equal to the dock height, exposed as a CSS custom property (`--dock-h`) that is set once from the dock's measured height with a `ResizeObserver`. It is 0 on wide screens.
- **Links, not tabs:** the bar uses links with `aria-current`, not `role="tab"`. It is navigation between screens, and the tab pattern would promise arrow-key behaviour and tab panels that aren't there. Tests reach the bar with `getByRole('link', { name: 'Explore' })`.
- *Alternative:* keep the tabs in the header. Rejected by the review: they are out of reach in the park.
- *Alternative:* a Material-style bar that hides on scroll. Rejected: the fit status must stay visible.

### 3. One-row header and the More menu
- **Header contents:** `App` renders one header row on every screen, using the `NightSky` `row` variant. The two-row `header` variant and its sparkle placements are removed.
  - With a trip, the row holds the trip select (today's `TripBar` select, styled as a title, label "Trip"), Share and a "More" `IconButton`.
  - Before any trip exists, the row holds the wordmark.
  - On wide screens the wordmark stays on the left, and the trip controls sit on the right.
- **The More sheet:**
  - It holds New trip, Rename, Number of days and Delete trip, then a divider and "About and data sources".
  - Number of days opens a small sheet with today's days select and its confirm-before-removing flow, moved out of `TripBar`.
- **About:** the header's About link goes away. The About page is reached from the More menu, and on phones the bottom bar stays visible there with no tab marked.
- *Alternative:* a separate About icon in the header. Rejected: it adds a third icon to a row that must fit 360 px next to a long trip name.

### 4. My day: date chips, day card and day sheet
- **Date chips** replace the day tabs:
  - Each chip is 60 × 64 px, with the weekday over the date, a dot when the day has items, and the selected chip in `accent`.
  - They keep `role="tab"` in the "Days" tablist, with names such as "Day 1 · Wed 12 Aug · DLP + DAW". The e2e helper's `getByRole('tab', { name: /^Day 1/ })` keeps working.
  - Seven chips (the longest trip) take 7 × 68 = 476 px, so the row scrolls sideways inside its own container, and the selected chip is scrolled into view.
- **The day card** is a `button` styled like the mockup's Midnight card (`bg-sky` with `NightSky`). It shows:
  - the date (Fraunces), the hours, the number of stops;
  - on a two-park day, the park order from `parkOrder()` and "Two-park ticket needed". That text keeps `data-testid="ticket-reminder"`.
- **The day sheet:**
  - Tapping the card opens a `Sheet` titled with the date. It holds today's `DayHours` (inputs still labelled Start and End) and, on a two-park day, today's `TicketReminder` and `ParkOrder`, unchanged.
  - Switch order, its availability hint, its warning sheet and its Undo keep working as before. The warning sheet opens above the day sheet.
- *Alternative:* edit the hours in place on the card. Rejected: two time inputs on the card bring back the crowding the refresh removes.

### 5. Timeline: one flat sortable list, drawn as park sections
- **One list:** `DayTimeline` keeps one `<ol aria-label="Day plan">` inside one `SortableContext`. The park sections from the mockup are drawn with per-row classes: a section starts after a park change and ends before the next one. The rows are not split into separate lists.
  - A park change is drawn as the mockup's "Walk to Disney Adventure World · 20 min" pill (`park-change`), at the top of the row that starts the section.
  - Free time joins that row's walk line, as in "7 min walk · 12 min free" (`free-time`).
- **The row (`StopRow`)** is a grid of:
  - the stop node (`slot-stop`);
  - the start and end times (`slot-time`);
  - the name (`slot-name`), with area and wait below it (`slot-area`);
  - tags: meal time, show time with a lock icon when locked, late, unsuitable, "Ends after …", and "N quicker options";
  - the grip (`slot-handle`).
- **Two buttons per row:**
  - One button covers the node, times and text. Its name is "Open stop 3, Big Thunder Mountain", and it opens the stop sheet.
  - The grip is the dnd-kit activator, named "Reorder Big Thunder Mountain", as today.
- **"No longer available" entries** keep an inline Remove button, because they have nothing else to show in a sheet.
- *Alternative:* one list per park, as in the mockup. Rejected: dnd-kit needs one `SortableContext` to drag across parks, and the sections change with every move.

### 6. Stop sheet
- `StopSheet` opens from a row. It is keyed by the entry's `key`, so it follows the item when it moves. It holds:
  - **Times:** a four-tile grid of Arrive, Wait, Starts and Ends. For shows it is Arrive, Be there, Starts and Ends.
  - **Late explanation**, when the item is late (Decision 9).
  - **Meal or show time:** the meal-time select (with "Any time") or the show-time select with its lock toggle. These are today's controls, moved from the card, with labels unchanged.
  - **Restaurant suggestions:** today's list, with swap and Undo.
  - **Move to top and Move to bottom** buttons.
  - **A "Stop 3 of 7" stepper** with "Move … up" and "Move … down" `IconButton`s (today's labels). The stepper keeps the sheet open, and the focus stays on the pressed button.
  - **Remove from day:** it closes the sheet and shows today's message with Undo.
  - **Details:** it opens `ItemDetail` above the sheet.
- Edits go through the existing store actions, so the timeline behind the sheet updates at once.
- *Alternative:* swipe actions on rows. Rejected: they hide the actions and conflict with vertical scrolling and the browser's back gesture.

### 7. Drag and drop: start on movement, show the gap, undo every move
- **Touch sensor:** `TouchSensor` changes from `{ delay: 200, tolerance: 8 }` to `{ distance: 4 }`.
  - The grip and `catalog-drag-handle` get `touch-action: none`, so the browser never scrolls from them.
  - Scrolling starts anywhere else on the row, so it is unaffected.
- **Showing the landing place:** dnd-kit's `verticalListSortingStrategy` slides the other rows apart while dragging, which shows where the stop will land.
  - A `DragOverlay` shows the dragged row as a lifted card (`shadow-lg`, `scale: 1.02`), and the original row fades to 30% opacity.
  - dnd-kit's built-in auto-scroll moves the page near the edges, so dragging into the part of the day below the screen works.
- **Undo for moves:**
  - `moveItem` records `lastRouteChange` (renamed `lastOrderChange`, since it now covers moves) with the previous and new item arrays.
  - Every move from a drop, the stepper or Move to top/bottom shows "Moved Big Thunder Mountain to stop 4" with Undo, through the existing `undoRouteChange` (renamed `undoOrderChange`).
  - The slot's untouched-day rule stays, and one slot is enough because only the latest change is undoable.
- **Reduced motion:** with reduced motion, sortable transitions and the drop animation are turned off, so rows jump to their places.
- **Keyboard:** dnd-kit's keyboard sensor stays: Space picks up, the arrows move, and Space drops.
- *Alternative:* the mockup's custom pointer code with a drop line. Rejected: it would duplicate dnd-kit, lose its keyboard support and screen-reader announcements, and need its own catalog-to-day drop handling.

### 8. Map tab with "My day | All places"
- **`MapScreen`** shows a "Map view" segmented control with My day and All places.
  - **My day** renders today's `PlanMap`, keyed by the day's id.
  - **All places** renders today's `ParkMap`, with `listed` from the same `filterCatalog(filters, search)` call that Explore uses. Above it, one line says how many places match, with a Filters button that opens `FilterPanel` and "Clear filters".
- **Store:**
  - `catalogView` and `planView` are replaced by `mapMode: 'day' | 'all'`, which is session-only and defaults to `'day'`.
  - `showInTimeline(key)` only sets `planFocusKey`. "Show in timeline" calls it and then, on phones, `navigate({ name: 'plan' })`. Wide screens already show My day beside the map, so the map stays and the right column scrolls to the stop.
  - `DayTimeline` already scrolls to the focused key, and keeps doing so.
- **Wide screens:** a segmented "Explore | Map" control above the left column links to `#/catalog` and `#/map`, and the right column always shows My day.
- *Alternative:* keep the maps inside Explore and My day. Rejected in the review: it means two maps in two places.

### 9. Late flags carry their deadline from the domain
- `schedule.ts` adds `dueBy` (minutes) to each scheduled slot that can be late:
  - for a show, its start minus `arriveEarlyMin`;
  - for a restaurant with a meal time, the meal time plus 30.
- The row's tag reads "27 min late" with "arrives 14:12 · be there by 13:45" beneath it. The sheet says the same in a sentence.
- Unit tests cover both cases.
- *Alternative:* compute the deadline in the component. Rejected: the 30-minute meal rule and the early-arrival minutes already live in the domain.

### 10. Toasts move to the top while a sheet is open
- `Sheet` reports itself to a small open-sheet counter in a React context. `ToastProvider` reads it:
  - **With no sheet open**, the toast sits `calc(var(--dock-h) + 8px)` above the bottom on phones, and above the sticky fit bar on wide screens, as today.
  - **With a sheet open**, the toast sits at the top, below the safe-area inset and above the scrim (`z-50`).
- Sheets get `max-h-[calc(100dvh-5.5rem)]`, so the top band is never part of a sheet.
- *Alternative:* queue toasts until the sheet closes. Rejected: Undo would arrive late or after the user has moved on.

### 11. Explore keeps its rows' facts and gets quick type chips
- `CatalogScreen` becomes Explore, and its "Catalog view" switch goes. The search, the Filters button (now an icon with a count badge) and sort stay. A row of type chips is added: All, Attractions, Restaurants, Shows.
  - The chips write `filters.types` as `[]` or `[type]`. When the filters hold several types, no chip is marked and the Filters badge counts them.
- **List rows** gain a 40 px type tile (icon in the type's tint) and lose nothing that "Catalog list summary" and the planned-label requirements need: park and area, type, rating, duration, height, thrill, the wait range, the planned label and the tint.
- **`FilterPanel`** ends with a sticky footer holding "Show N results", which closes it, and "Clear filters".
- **`ItemDetail`** is unchanged inside. Its "Add to day" button moves into a sticky footer.

### 12. Fold budget at 390 × 844 for three stops
Estimate for a two-park day of six items, measured by the e2e check after implementation:

| Block | Top–bottom (px) |
|---|---|
| Header (one row) | 0–56 |
| Date chips | 64–128 |
| Day card (three lines) | 140–270 |
| Park label | 282–302 |
| Stops 1–3 (about 76 px each, with two 20 px walk lines; +26 px if one has a tag row) | 310–574 (600 with a tag) |
| Fit strip and bottom bar | 740–844 |

That leaves about 140 px of slack. The e2e check measures the third `timeline-slot` against the top of `fit-summary`.

## Risks / Trade-offs

- [Immediate touch drag on the grip could start a drag when the user meant to scroll] → Only the 44 × 48 px grip has `touch-action: none`, and the rest of the row scrolls. The 4 px distance stops a tap from turning into a drag.
- [A toast after every drag could be noisy] → It is the same short message as other actions, and it is the only Undo path for an accidental drop. It times out after 7 s.
- [Renaming the tabs breaks many tests at once] → The test ids stay, and only the ways of reaching controls change. The helpers (`showTab`, `createTrip`) change first so most specs follow without edits.
- [The fixed dock covers content] → The page gets bottom padding from `--dock-h`. The 360 × 740 check (8.1) and the fold check cover it.
- [Two sheets open at once: the day sheet with the park-switch warning, or the stop sheet with details] → Both are portals, and the later one is on top. Escape and Close close the top one first, as `Sheet` already handles its own keys.
- [On-sky colors on the bottom bar must stay readable] → The current tab uses `star` on `sky` (12.6:1) and the others `on-sky-muted` (8.6:1), pairs already in `contrast.test.ts`.

## Migration Plan

- No data migration. Saved trips, share links and the catalog are unchanged. The removed session fields (`catalogView`, `planView`) were never persisted.
- Ship as one release through the existing update prompt. Installed apps keep opening on `#/plan`, which is My day.
- Rollback: revert the change's commits. There is no state to undo.
