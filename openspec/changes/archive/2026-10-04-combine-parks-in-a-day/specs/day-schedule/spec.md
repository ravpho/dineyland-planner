# Spec Delta

## MODIFIED Requirements

### Requirement: Day timeline
For each day the app SHALL compute a timeline in the user's order, starting at the day's start time at the entrance of the park of the day's first item. Each item SHALL show its walking time, arrival time, typical wait, start time and end time.

#### Scenario: First item
- **WHEN** a day starts at 09:30 and its first attraction is a 4-minute walk from its park's entrance with a typical wait of 15 minutes at 09:34
- **THEN** the timeline shows arrival 09:34, start 09:49, and an end time 9:49 plus the ride duration

#### Scenario: Day that starts in the second park
- **WHEN** the first item of a day is in Disney Adventure World
- **THEN** the walk to it is measured from the Disney Adventure World entrance

### Requirement: Walking time between items
Walking time SHALL be estimated from the distance between consecutive items' locations, and from the park entrance to the first item. Items without a precise location SHALL use the centre of their area. Between items in different parks, the walk SHALL go to the first park's entrance, across to the other park's entrance, and on to the item, plus a fixed park-change time.

#### Scenario: Neighbouring attractions
- **WHEN** two consecutive attractions are next to each other
- **THEN** the walking time between them is shorter than between attractions on opposite sides of the park

#### Scenario: Switch parks
- **WHEN** an item in Disneyland Park is followed by an item in Disney Adventure World
- **THEN** the walking time is the walk to the Disneyland Park entrance, plus the walk between the two entrances, plus the park-change time, plus the walk from the Disney Adventure World entrance to the item, and the timeline labels the step as a park change

### Requirement: Wait depends on arrival time
The wait used for each item SHALL be its typical wait for the day's month, based on the crowd level of the item's own park, at the time the user is projected to arrive there. Changing the order SHALL therefore change the waits.

#### Scenario: Move a ride to the morning
- **WHEN** the user moves an attraction from an early-afternoon slot to the first slot of the day
- **THEN** its wait is recalculated for its new, earlier arrival time

#### Scenario: Each park's own crowd level
- **WHEN** a day in a month that is busier than average at Disneyland Park and quieter than average at Disney Adventure World holds an attraction from each park
- **THEN** each attraction's wait uses its own park's level for that month

## ADDED Requirements

### Requirement: Two-park reminder
When a day contains items from both parks, the day SHALL show a reminder that the plan needs a ticket valid for both parks. The reminder SHALL NOT appear for a day whose items are all in one park.

#### Scenario: Park-hopping day
- **WHEN** a day contains an attraction from each park
- **THEN** the day shows a reminder that a ticket valid for both parks is needed

#### Scenario: Single-park day
- **WHEN** all of a day's items are in Disneyland Park
- **THEN** no ticket reminder is shown
