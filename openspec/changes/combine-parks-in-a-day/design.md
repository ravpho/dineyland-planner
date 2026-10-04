# Design

## Context

See proposal.md (Why) for motivation and the delta specs for the required behaviour. The current code ties a day to one park in several places:

| Where | What it does today |
|---|---|
| `src/domain/trip.ts` | `Day.parkId` |
| `src/state/store.ts` | `newDay` takes one park's hours; `addItem` rejects other-park items (`reason: 'other-park'`); `setDayPark` filters items |
| `src/domain/schedule.ts` | Uses the day's park for the entrance, for month factors (via `itemWait`), and marks other-park items as `missing` |
| `src/domain/filters.ts` | `CatalogFilters.parkId` is required; the list always shows one park |
| `src/components/CatalogList.tsx` | Forces the filter park to follow the selected day's park |
| `src/domain/shareLink.ts` | Share format v1 stores the park per day (`p`). Item codes already hash the full id (`dlp.…`), so they don't depend on the day's park |
| `src/state/persistence.ts` | Storage schema version 1, with a migration chain (`MIGRATIONS`) |
| UI | `DaySettings` park select, day tab label "DLP/DAW", the other-park toast in `useAddToDay`, sort select inside `FilterPanel` |

The two parks' entrances are 212 m apart (catalog `entrance` coordinates). Both parks have identical typical hours in the current data, but the model must not assume that.

## Goals / Non-Goals

**Goals:**
- Model a park change explicitly, so its cost is correct and visible, and so the follow-up map change can draw it.
- Never lose a trip the owner already saved, and keep old share links working.
- Keep all logic in the pure domain modules with unit tests, as before.

**Non-Goals:**
- Ticket validation, opening-hour differences between parks within a day, or modelling the security check as a separate step.
- Automatic reordering to reduce park changes. The map change will make crossings visible first.

## Decisions

### 1. Remove `Day.parkId` instead of keeping a "main park"
A day becomes `{ id, date, start, end, items }`. Everything the park used to supply now comes from the items themselves (entrance, crowd level) or from both parks (default hours).
*Alternative:* keep a "starting park" field. Rejected because it duplicates what the first item already says, and the user would have to keep it in sync by hand.

### 2. Cross-park walking through both entrances
```
 same park:   walkMin(a, b)                                  (unchanged)
 other park:  ceil((d(a, entranceA) + d(entranceA, entranceB) + d(entranceB, b)) * 1.35 / 65)
              + 1 (overhead) + PARK_CHANGE_MIN (5)
 first item:  walkMin(entrance of first item's park, item)
```
- The three distances are added before converting to minutes, so the 1-minute overhead counts once, as it does for any other walk.
- `PARK_CHANGE_MIN = 5` is a named constant in `walking.ts`, covering exit and entry turnstiles.
- A new `walkBetween(from, to, catalog)` returns `{ minutes, parkChange }`. The scheduler stores `parkChange` on the slot so the UI can label the step "Walk to Disney Adventure World (park change)".
- Example from the current data: Peter Pan's Flight → Frozen Ever After is 588 m + 212 m + 715 m, which comes to 38 minutes including the park change, against 24 for a straight line through the fences.

*Alternative:* a straight line with a larger path factor. Rejected because it can't tell a park change from a long walk inside one park, and the map change needs that distinction.

### 3. Waits use the item's park
`scheduleDay` looks up the park by `item.parkId` for each item when calling `itemWait`. The data makes this matter: for example Adventure World's November factor is about 0.55 against Disneyland Park's 0.77.

### 4. Default day window across both parks
`newDay(date)` takes the earliest `open` and the latest `close` among the parks' hours for that month. Times are `HH:MM`, so plain string comparison is correct.

### 5. Saved data: storage v2 and share format v2
- **Storage:** `SCHEMA_VERSION = 2`, with `MIGRATIONS[1]` removing `parkId` from every day. The existing chain runs v0 → v1 → v2. An older build that meets v2 data already reports "newer" and leaves it alone, so a rollback is safe.
- **Share links:** the format becomes `v: 2` without `p`. The decoder accepts `v: 1` and ignores `p`. Item codes are unchanged, so links made today keep importing.

### 6. Catalog: all parks by default, sort above the list
- `CatalogFilters.parkId` becomes `ParkId | 'all'`, defaulting to `'all'`. `clearFilters()` returns to `'all'`. The effect that copied the day's park into the filter is removed.
- **Areas:** with "All parks", the filter panel lists area chips grouped by park. Area ids are already unique across the parks; a catalog schema check enforces that, so `areaIds` can stay plain ids.
- **Sort:** `SortOrder` gains `'duration'`, the ride, meal (`mealMinutes`) or show length, shortest first. The select moves from `FilterPanel` into the catalog header next to search. The wait option is labelled "Busiest wait".
- **Row label:** a muted line "Disneyland Park · Frontierland" built from catalog park and area names.
- *Added during implementation:* the data build now always lists Disneyland Park first. Before, it followed the curated file names, which put Adventure World first. Day labels ("DLP + DAW"), the park filter and area groups therefore show the parks in a consistent order. The match count reads "N items" plus the park name only when one park is selected.

### 7. Plan UI
- `DaySettings` keeps only start and end. The day tab shows the parks the day uses ("DLP", "DAW", "DLP + DAW", or nothing when empty), derived from its items.
- The timeline labels a park-change step and shows a one-line ticket reminder above the fit summary when the day's scheduled items span both parks. The schedule exposes `parks: ParkId[]` for this.
- `useAddToDay` drops the other-park branch. `addItem` keeps its `unknown-item` and `no-day` results.

## Risks / Trade-offs

- **[Park-change time is an estimate]** Turnstiles and bag checks vary by day and time. → One named constant, shown inside the walk so the user sees it; easy to tune later.
- **[Longer catalog]** 110 items in one list instead of about 70. → Sort, park filter and search are one tap away. The follow-up map change adds area-based browsing.
- **[Migration bugs could lose trips]** → The migration is tested from both v0 and v1 samples. Data that fails to load is reported as "corrupt" and never overwritten, as today.
- **[Opening hours differ between parks]** One window per day can't show that one park closes earlier. → Accepted for now: the data has identical hours, and the user can set the window by hand.

## Migration Plan

Deploying works as before (merge to `main` publishes to GitHub Pages). On first start after the update, each device upgrades its saved trips from v1 to v2 automatically. Rollback: reverting the commit redeploys the old build. That build sees v2 data as "newer", shows its banner and does not overwrite it. Moving forward again restores normal use.

## Open Questions

- The exact park-change time. It is a constant and can be tuned without changing specs or tasks.
