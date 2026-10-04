# day-schedule Specification

## Purpose

Turns a day's ordered list into a realistic timeline, including walking, typical queues, ride and meal durations and fixed show times, and tells the visitor whether the day fits the time they have.

## Requirements

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

### Requirement: Fixed-time shows
A show SHALL start at its planned time. If the user can arrive, including the recommended early-arrival minutes, before that time, the gap SHALL be shown as free time. If not, the show SHALL be flagged with how many minutes late the user would be.

#### Scenario: Time to spare before a show
- **WHEN** the previous item ends at 16:50 and a 17:30 parade recommends arriving 20 minutes early after a 5-minute walk
- **THEN** the timeline shows 15 minutes of free time before the early-arrival period

#### Scenario: Cannot make the show
- **WHEN** the user would reach the show's location 10 minutes after the time they need to be there
- **THEN** the show is flagged "10 min late" and the following items are scheduled from the show's end

### Requirement: Meals in the timeline
A restaurant in a day SHALL take its typical wait for that time plus its typical meal duration.

#### Scenario: Table service lunch
- **WHEN** a table-service restaurant with a 75-minute typical meal is planned at 12:30
- **THEN** it occupies its typical wait plus 75 minutes in the timeline

### Requirement: Fit summary
Each day SHALL show whether its timeline ends within the time window: "Fits" with the spare minutes, or "Over by N min". Items that would end after the window's end SHALL be marked.

#### Scenario: Plan fits
- **WHEN** a day's last item ends at 17:20 and the window ends at 18:00
- **THEN** the summary reads "Fits" with 40 minutes spare

#### Scenario: Plan runs over
- **WHEN** a day's last item ends at 18:25 and the window ends at 18:00
- **THEN** the summary reads "Over by 25 min" and every item ending after 18:00 is marked

### Requirement: Time breakdown
Each day SHALL show the total minutes spent queueing, on attractions, at meals, at shows, walking and as free time.

#### Scenario: Where the day goes
- **WHEN** the user opens a day's breakdown
- **THEN** the totals for queueing, attractions, meals, shows, walking and free time are shown and add up to the timeline's length

### Requirement: Instant recalculation
The timeline, fit summary and breakdown SHALL update immediately after any change to the day: adding, removing or reordering items, changing a show time, or changing the park or time window.

#### Scenario: Remove an item
- **WHEN** the user removes an item from a day that was "Over by 10 min"
- **THEN** the summary updates without a page reload, for example to "Fits"

### Requirement: Suitability warnings in the timeline
Items that the group profile marks as unsuitable SHALL stay in the timeline and be scheduled normally, and SHALL carry their unsuitability reason.

#### Scenario: Scheduled with warning
- **WHEN** a day contains an attraction marked "Needs 120 cm"
- **THEN** the attraction appears in the timeline with its times and the "Needs 120 cm" mark

### Requirement: Two-park reminder
When a day contains items from both parks, the day SHALL show a reminder that the plan needs a ticket valid for both parks. The reminder SHALL NOT appear for a day whose items are all in one park.

#### Scenario: Park-hopping day
- **WHEN** a day contains an attraction from each park
- **THEN** the day shows a reminder that a ticket valid for both parks is needed

#### Scenario: Single-park day
- **WHEN** all of a day's items are in Disneyland Park
- **THEN** no ticket reminder is shown

### Requirement: Area of each timeline item
Each scheduled item in a day's timeline SHALL show the name of its area, so the visitor can see where the day moves between areas. Entries marked "No longer available" SHALL show no area.

#### Scenario: Attraction in Fantasyland
- **WHEN** a day holds Peter Pan's Flight
- **THEN** its timeline item shows "Fantasyland"

#### Scenario: Items from both parks
- **WHEN** a day holds Big Thunder Mountain and Frozen Ever After
- **THEN** their timeline items show "Frontierland" and "World of Frozen"
