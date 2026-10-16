# Spec Delta

## MODIFIED Requirements

### Requirement: Day timeline
For each day the app SHALL compute a timeline in the user's order, starting at the day's start time at the entrance of the park of the day's first item. Each item SHALL show its walking time, typical wait, start time and end time, and its arrival time SHALL be shown in its sheet.

#### Scenario: First item
- **WHEN** a day starts at 09:30 and its first attraction is a 4-minute walk from its park's entrance with a typical wait of 15 minutes at 09:34
- **THEN** the timeline item shows start 09:49 and an end time 9:49 plus the ride duration, and its sheet shows arrival 09:34

#### Scenario: Day that starts in the second park
- **WHEN** the first item of a day is in Disney Adventure World
- **THEN** the walk to it is measured from the Disney Adventure World entrance

## ADDED Requirements

### Requirement: Late flags say why
A show or restaurant flagged late SHALL also show the time the user is projected to arrive and the time they need to be there: for a show, its start time minus the recommended early-arrival minutes; for a restaurant, 30 minutes after its meal time.

#### Scenario: Late for a show
- **WHEN** a 14:05 show recommends arriving 20 minutes early and the user would arrive at 14:12
- **THEN** the show is flagged "27 min late" with "arrives 14:12" and "be there by 13:45"

#### Scenario: Late for lunch
- **WHEN** lunch is set at 12:00 and the user would reach the restaurant at 12:45
- **THEN** the restaurant is flagged "15 min late" with "arrives 12:45" and "be there by 12:30"

#### Scenario: On time
- **WHEN** a show or restaurant is not flagged late
- **THEN** no arrival explanation is shown for it

### Requirement: Sheet for each timeline item
Opening a scheduled item in the day's timeline SHALL show a sheet with its name, stop number and area, its arrival, wait, start and end times, any flag with its explanation, and its actions: the meal time, or the show time and lock; the restaurant suggestions when there are any; moving it; removing it; and opening its details. Changes made in the sheet SHALL update the timeline at once. The timeline item SHALL show a short tag when the sheet holds suggestions.

#### Scenario: Open a stop
- **WHEN** the user taps the third item of the day
- **THEN** a sheet shows "Stop 3", its area, and the same arrival, wait, start and end times the timeline uses for it

#### Scenario: Change the meal time in the sheet
- **WHEN** the user opens a lunch planned at 12:00 and changes its meal time to 12:30 in the sheet
- **THEN** the restaurant's meal time is 12:30 and the timeline updates without closing the sheet

#### Scenario: Lock a show from the sheet
- **WHEN** the user opens a parade planned at 17:30 and locks its time
- **THEN** the parade's timeline item shows it as locked

#### Scenario: Quicker restaurants
- **WHEN** a lunch has restaurant suggestions
- **THEN** its timeline item shows a tag such as "2 quicker options", and its sheet lists the suggestions with the minutes each saves

#### Scenario: Open the details
- **WHEN** the user chooses "Details" in a stop's sheet
- **THEN** the item's full details open
