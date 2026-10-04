# trip-itinerary Specification

## Purpose

Lets visitors build and keep a Disneyland Paris trip of one or more days, each with an ordered list of attractions, meals and shows from either park, and move it between their devices.

## Requirements

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

### Requirement: Keep several trips
The app SHALL keep more than one trip and let the user switch between, rename and delete them. Deleting a trip SHALL require confirmation.

#### Scenario: Switch trips
- **WHEN** the user has two saved trips and selects the other one
- **THEN** that trip's days and items are shown

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

### Requirement: Repeat an attraction
The same attraction SHALL be allowed more than once in a day.

#### Scenario: Ride twice
- **WHEN** the user adds an attraction that is already in the day
- **THEN** a second entry for it appears in the day

### Requirement: Show start time
A show added to a day SHALL take one of its typical start times, chosen by the user, and the user SHALL be able to change that time later.

#### Scenario: Pick the evening showing
- **WHEN** the user adds a parade that has typical start times of 13:30 and 17:30 and picks 17:30
- **THEN** the parade is planned at 17:30

### Requirement: Reorder and remove items
The user SHALL be able to reorder a day's items by dragging, with both touch and mouse, and with move-up and move-down controls that work without dragging. The user SHALL be able to remove an item and undo the last removal.

#### Scenario: Drag on a phone
- **WHEN** on a touch screen the user long-presses an item's handle and drags it above the previous item
- **THEN** the two items swap places

#### Scenario: Move without dragging
- **WHEN** the user activates "move up" on the third item
- **THEN** it becomes the second item

#### Scenario: Undo removal
- **WHEN** the user removes an item and then chooses "Undo"
- **THEN** the item is restored to its previous position

### Requirement: Save on the device
Trips SHALL be saved on the device automatically after every change, with no account and no network needed. Saved trips SHALL survive closing the app, reloading the page and being offline.

#### Scenario: Reopen later
- **WHEN** the user edits a trip, closes the browser and opens the app the next day
- **THEN** the trip is shown exactly as it was left

### Requirement: Share a trip by link
The user SHALL be able to create a link that contains a whole trip. Opening the link in the app on another device SHALL offer to import the trip as a new copy, and SHALL NOT change any existing trip.

#### Scenario: Laptop to phone
- **WHEN** the user creates a share link on a laptop and opens it on a phone
- **THEN** the phone asks whether to import the trip, and on confirmation it appears there as a new trip with the same days and items

#### Scenario: Broken link
- **WHEN** a share link is damaged or incomplete
- **THEN** the app says the link cannot be read and imports nothing

### Requirement: Items no longer in the catalog
If a saved or imported trip refers to an item the current catalog no longer contains, the day SHALL show that entry as "No longer available", leave it out of the schedule, and let the user remove it.

#### Scenario: Ride retired after an update
- **WHEN** a trip contains an attraction that a later catalog update removed
- **THEN** the entry is marked "No longer available" and the rest of the day is scheduled without it

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
