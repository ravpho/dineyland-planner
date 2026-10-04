# park-map Specification

## Purpose

Shows where attractions, restaurants and shows are in each park and how long it takes to walk between them, so visitors can choose items area by area and see how their planned day moves around the parks.

## Requirements

### Requirement: Map view of the catalog
The catalog SHALL offer a "List | Map" switch. The map view SHALL show the items that pass the current park, area, type, search and group-profile filters, and SHALL grey out unsuitable attractions as the list does.

#### Scenario: Switch to the map
- **WHEN** the user chooses "Map" in the catalog
- **THEN** the catalog's items are shown as positions on a map of a park instead of a list

#### Scenario: Filters apply to the map
- **WHEN** the type filter is set to attractions and the map is shown
- **THEN** only attractions appear on the map

#### Scenario: Unsuitable rides on the map
- **WHEN** the group profile height is 110 cm and the map shows a ride that needs 120 cm
- **THEN** that ride's marker is greyed out

### Requirement: One park at a time with zoom
The map SHALL show one park at a time, with a switch between Disneyland Park and Disney Adventure World. It SHALL support zooming in and out with buttons and with a pinch gesture, and moving the map by dragging.

#### Scenario: Change park
- **WHEN** the map shows Disneyland Park and the user switches to Disney Adventure World
- **THEN** the map shows Disney Adventure World's areas and items

#### Scenario: Zoom into a dense area
- **WHEN** the user taps the zoom-in button twice
- **THEN** the map is shown larger and can be dragged to reach any part of the park

### Requirement: Areas and items on the map
Each area of the shown park SHALL be drawn as a labelled zone. Attractions SHALL be drawn as labelled markers. Restaurants and shows SHALL be drawn as smaller markers distinguishable from attractions. Each item SHALL appear at its own location, and an item whose position is only approximate SHALL be marked as approximate.

#### Scenario: Area zones
- **WHEN** the map shows Disneyland Park
- **THEN** Main Street, U.S.A., Frontierland, Adventureland, Fantasyland and Discoveryland are each drawn as a labelled zone

#### Scenario: Approximate position
- **WHEN** the user selects an item whose position is approximate
- **THEN** its card says the position is approximate

### Requirement: Item card with walking times
Selecting an item on the map SHALL show a card with its name, park and area, key facts, the walking time from the selected day's last planned stop, the walking time to each area of that park, and actions to add the item to the day and to open its details. The walking times SHALL be computed with the same estimate the day timeline uses, including park changes.

#### Scenario: Walk from the last planned stop
- **WHEN** the selected day ends with Big Thunder Mountain and the user selects Phantom Manor on the map
- **THEN** the card shows a walking time equal to the one the timeline would show if Phantom Manor were added next

#### Scenario: Walk from the other park
- **WHEN** the selected day ends with an item in Disney Adventure World and the user selects an item in Disneyland Park
- **THEN** the card's walking time includes the park change, as the timeline would

#### Scenario: Add from the map
- **WHEN** the user chooses "Add to day" on the card
- **THEN** the item is added to the end of the selected day, as from the list

#### Scenario: No day yet
- **WHEN** no trip exists and the user selects an item
- **THEN** the card shows the walking times to each area and no time from a last planned stop

### Requirement: Area walking times
The map SHALL make available a table of walking minutes between every pair of areas in the shown park, measured between area centres with the same estimate the timeline uses.

#### Scenario: Open the table
- **WHEN** the user opens the area walking times for Disneyland Park
- **THEN** a table lists the minutes between each pair of its five areas

### Requirement: The day's route on the map
The map SHALL draw the selected day's scheduled items as numbered stops in plan order, joined by lines. A walk that changes park SHALL be drawn as a dashed line to the park entrance with a marker naming the other park. Stops in the other park SHALL be counted but not drawn.

#### Scenario: Numbered stops
- **WHEN** the selected day has three Disneyland Park items and the map shows Disneyland Park
- **THEN** the three items carry the numbers 1, 2 and 3 and are joined in that order

#### Scenario: Park change on the route
- **WHEN** the selected day goes from Big Thunder Mountain to Frozen Ever After
- **THEN** the Disneyland Park map draws a dashed line from Big Thunder Mountain to the entrance marked "to Disney Adventure World"

### Requirement: Works offline
The map, its walking times and the route SHALL work without a network connection, using only the app's bundled data.

#### Scenario: Airplane mode
- **WHEN** the installed app is opened without a connection and the user switches to the map
- **THEN** the map, item cards and route are shown as they are online

### Requirement: Official park map link
The map SHALL offer, for each park, a link to an official park map or official park page. Opening it SHALL leave the app's state unchanged.

#### Scenario: Disneyland Park official map
- **WHEN** the user opens the official map link while the map shows Disneyland Park
- **THEN** the official Disneyland Park map document opens in a new browser tab
