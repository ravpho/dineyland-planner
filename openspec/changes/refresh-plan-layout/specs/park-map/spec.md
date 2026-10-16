# Spec Delta

## MODIFIED Requirements

### Requirement: Map view of the catalog
The Map tab SHALL offer an "All places" view. It SHALL show the items that pass Explore's current park, area, type, search and group-profile filters, SHALL grey out unsuitable attractions as the list does, and SHALL show how many items match, with a way to change or clear the filters.

#### Scenario: Switch to the map
- **WHEN** the user opens the Map tab and chooses "All places"
- **THEN** the catalog's items are shown as positions on a map of a park, with the number that match

#### Scenario: Filters apply to the map
- **WHEN** the type filter is set to attractions in Explore and the user shows "All places"
- **THEN** only attractions appear on the map

#### Scenario: Unsuitable rides on the map
- **WHEN** the group profile height is 110 cm and the map shows a ride that needs 120 cm
- **THEN** that ride's marker is greyed out

### Requirement: Map of the day in the plan
The Map tab SHALL offer a "My day | All places" switch. "My day" SHALL show only the day's scheduled items, as numbered stops labelled with their names and joined in plan order as "All places" draws the route, one park at a time, with the same zoom and dragging. It SHALL show no other catalog items and SHALL offer no way to reorder or remove items.

#### Scenario: Switch to the map
- **WHEN** the selected day holds Big Thunder Mountain, Phantom Manor and Peter Pan's Flight and the user opens the Map tab on "My day"
- **THEN** the map shows the three items numbered 1, 2 and 3 with their names, joined in that order, and no other catalog items

#### Scenario: Map follows the plan
- **WHEN** the user moves the third item up in My day and then opens the Map tab
- **THEN** that item carries number 2 on the map

#### Scenario: Park change on the plan map
- **WHEN** the selected day goes from Big Thunder Mountain to Frozen Ever After and the plan map shows Disneyland Park
- **THEN** a dashed line runs from Big Thunder Mountain to the entrance marked "to Disney Adventure World"

#### Scenario: Fit status with the map
- **WHEN** the map of the day is shown on a phone
- **THEN** the day's "Fits" or "Over by N min" status stays visible above the bottom bar

#### Scenario: Catalog map keeps the route
- **WHEN** the user switches the Map tab to "All places"
- **THEN** the selected day's route is still drawn there, as before

### Requirement: Stop card on the plan map
Selecting a stop on the plan map SHALL show a card with the item's name, area and stop number, and its arrival, wait, start and end times as the timeline shows them, once for each time it is in the day. The card SHALL offer "Show in timeline", which SHALL open My day and bring that item into view.

#### Scenario: Times of a stop
- **WHEN** the user selects stop 3 on the plan map
- **THEN** the card shows the same arrival, wait, start and end times as the third item of the timeline

#### Scenario: Planned twice
- **WHEN** Big Thunder Mountain is stops 2 and 5 and the user selects it on the plan map
- **THEN** the card shows the times of both stops

#### Scenario: Show in timeline
- **WHEN** the user chooses "Show in timeline" on the card for stop 6 of a long day
- **THEN** My day opens with the sixth item scrolled into view

## ADDED Requirements

### Requirement: Map choice kept for the session
The Map tab SHALL show "My day" when the app starts. The "My day" or "All places" choice SHALL be kept while the app stays open, including when the user changes day or tab, and SHALL NOT be saved with trips or share links.

#### Scenario: Back from Explore
- **WHEN** on a phone the user shows "All places" on the Map tab, opens Explore and returns to Map
- **THEN** "All places" is still shown

#### Scenario: Another day
- **WHEN** the map of the day is shown and the user selects another day
- **THEN** the map shows the new day, on the park of its first item

#### Scenario: Reopen the app
- **WHEN** the user shows "All places" and then reloads the app
- **THEN** the Map tab shows "My day"

## REMOVED Requirements

### Requirement: Plan view kept for the session
**Reason**: The Plan no longer has a "Timeline | Map" switch; the map of the day moved to the Map tab.
**Migration**: The session-only choice now belongs to the Map tab ("My day" or "All places"), under "Map choice kept for the session". My day always shows the timeline.
