# Spec Delta

## MODIFIED Requirements

### Requirement: Create a trip
The user SHALL be able to create a trip with a name, a first date and a number of days from 1 to 7. The number of days SHALL default to 1. The app SHALL create one day for each date in the range.

#### Scenario: Three-day trip
- **WHEN** the user creates "Summer trip" starting 12 August with 3 days
- **THEN** the trip has days for 12, 13 and 14 August

#### Scenario: One day by default
- **WHEN** the user opens the new-trip form
- **THEN** the number of days is preset to 1

#### Scenario: Change the length
- **WHEN** the user reduces a 3-day trip to 2 days
- **THEN** the last day and its items are removed after the user confirms

### Requirement: Add items to a day
The user SHALL be able to add an attraction, restaurant or show from either park to any day, either with an add button or, on wider screens, by dragging it from the catalog to a position in the day. The add button SHALL add to the end of the selected day.

#### Scenario: Tap to add
- **WHEN** the user taps the add button on an attraction
- **THEN** it is appended to the end of the currently selected day

#### Scenario: Drag into position
- **WHEN** on a wide screen the user drags an attraction from the catalog and drops it between the second and third items of a day
- **THEN** it becomes the third item of that day

#### Scenario: Item from the other park
- **WHEN** the user adds Big Thunder Mountain from Disneyland Park and then Frozen Ever After from Disney Adventure World to the same day
- **THEN** both are added to that day in that order

## ADDED Requirements

### Requirement: Day time window
Each day SHALL have an available time window with a start and end time and SHALL NOT be tied to a park. A new day SHALL default to the earliest typical opening time and the latest typical closing time of the two parks for that month. The user SHALL be able to change both times.

#### Scenario: Set my own hours
- **WHEN** the user sets a day's window to 10:00 to 18:00
- **THEN** that day's schedule is checked against 10:00 to 18:00

#### Scenario: Default window covers both parks
- **WHEN** a new day is created for a month in which one park typically opens at 09:30 and closes at 21:00 and the other opens at 10:00 and closes at 22:00
- **THEN** the day's window defaults to 09:30 to 22:00

### Requirement: Trips saved before days could combine parks
Trips saved on the device and share links created when every day had a single park SHALL keep working. Each of their days SHALL keep its date, time window and items, and SHALL lose only its park setting.

#### Scenario: Saved trip after the update
- **WHEN** the user opens the updated app on a device holding a trip saved by the earlier version
- **THEN** the trip appears with the same days, windows and items, and items from either park can now be added to its days

#### Scenario: Old share link
- **WHEN** the user opens a share link created by the earlier version
- **THEN** the app offers to import it, and the imported trip has the same days, windows and items as the original

## REMOVED Requirements

### Requirement: Day settings
**Reason**: A day no longer has a park, so the requirement's park setting and its "change the park" rule no longer apply. The time-window part continues as the new "Day time window" requirement.
**Migration**: Days keep their date, time window and items; the park setting is dropped when saved trips and share links are loaded (see "Trips saved before days could combine parks").
