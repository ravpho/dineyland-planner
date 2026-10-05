# Spec Delta

## ADDED Requirements

### Requirement: Map of the day in the plan
The Plan SHALL offer a "Timeline | Map" switch for the selected day. The map SHALL show only the day's scheduled items, as numbered stops labelled with their names and joined in plan order as the catalog map draws the route, one park at a time, with the same zoom and dragging. It SHALL show no other catalog items and SHALL offer no way to reorder or remove items.

#### Scenario: Switch to the map
- **WHEN** the selected day holds Big Thunder Mountain, Phantom Manor and Peter Pan's Flight and the user chooses "Map" on the Plan
- **THEN** the map shows the three items numbered 1, 2 and 3 with their names, joined in that order, and no other catalog items

#### Scenario: Map follows the plan
- **WHEN** the user moves the third item up in the timeline and then shows the map
- **THEN** that item carries number 2 on the map

#### Scenario: Park change on the plan map
- **WHEN** the selected day goes from Big Thunder Mountain to Frozen Ever After and the plan map shows Disneyland Park
- **THEN** a dashed line runs from Big Thunder Mountain to the entrance marked "to Disney Adventure World"

#### Scenario: Fit status with the map
- **WHEN** the plan map is shown on a phone
- **THEN** the day's "Fits" or "Over by N min" status stays visible at the bottom of the screen

#### Scenario: Catalog map keeps the route
- **WHEN** the user switches the catalog to its map
- **THEN** the selected day's route is still drawn there, as before

### Requirement: Park shown on the plan map
The plan map SHALL open on the park of the day's first scheduled item, or on Disneyland Park for a day with no scheduled items. Its park switch SHALL say which stop numbers are in each park. A day with no scheduled items SHALL show "Nothing planned yet" with the map.

#### Scenario: Day that starts in the second park
- **WHEN** the selected day's first item is Crush's Coaster and the user shows the plan map
- **THEN** the map shows Disney Adventure World

#### Scenario: Stops in each park
- **WHEN** the selected day's stops 1 to 4 are in Disneyland Park and stops 5 to 7 in Disney Adventure World
- **THEN** the park switch shows "stops 1–4" for Disneyland Park and "stops 5–7" for Disney Adventure World

#### Scenario: Empty day
- **WHEN** the selected day has no items and the user shows the plan map
- **THEN** the map shows Disneyland Park with the message "Nothing planned yet"

### Requirement: Stop card on the plan map
Selecting a stop on the plan map SHALL show a card with the item's name, area and stop number, and its arrival, wait, start and end times as the timeline shows them, once for each time it is in the day. The card SHALL offer "Show in timeline", which SHALL switch the Plan to the timeline and bring that item into view.

#### Scenario: Times of a stop
- **WHEN** the user selects stop 3 on the plan map
- **THEN** the card shows the same arrival, wait, start and end times as the third item of the timeline

#### Scenario: Planned twice
- **WHEN** Big Thunder Mountain is stops 2 and 5 and the user selects it on the plan map
- **THEN** the card shows the times of both stops

#### Scenario: Show in timeline
- **WHEN** the user chooses "Show in timeline" on the card for stop 6 of a long day
- **THEN** the Plan shows the timeline with the sixth item scrolled into view

### Requirement: Plan view kept for the session
The Plan SHALL show the timeline when the app starts. The Timeline or Map choice SHALL be kept while the app stays open, including when the user changes day or switches between the Catalog and Plan tabs, and SHALL NOT be saved with trips or share links.

#### Scenario: Back from the catalog
- **WHEN** on a phone the user shows the plan map, opens the Catalog tab and returns to Plan
- **THEN** the plan map is still shown

#### Scenario: Another day
- **WHEN** the plan map is shown and the user selects another day
- **THEN** the plan map shows the new day, on the park of its first item

#### Scenario: Reopen the app
- **WHEN** the user shows the plan map and then reloads the app
- **THEN** the Plan shows the timeline
