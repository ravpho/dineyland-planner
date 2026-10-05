# Spec Delta

## MODIFIED Requirements

### Requirement: Meals in the timeline
A restaurant in a day SHALL take its typical wait for that time plus its typical meal duration. A restaurant with a meal time SHALL be reached within 30 minutes of that time. If the user would arrive earlier, the gap until 30 minutes before the meal time SHALL be shown as free time, and the wait SHALL be counted from then. If the user would arrive more than 30 minutes after the meal time, the restaurant SHALL be flagged with how many minutes late the user would be.

#### Scenario: Table service lunch
- **WHEN** a table-service restaurant with a 75-minute typical meal is planned at 12:30
- **THEN** it occupies its typical wait plus 75 minutes in the timeline

#### Scenario: Early for lunch
- **WHEN** lunch is set at 12:00, the previous item ends at 11:00, and the restaurant is a 5-minute walk away
- **THEN** the timeline shows 25 minutes of free time, and the restaurant's wait starts at 11:30

#### Scenario: Late for lunch
- **WHEN** lunch is set at 12:00 and the user would reach the restaurant at 12:45
- **THEN** the restaurant is flagged "15 min late" and the following items are scheduled from the meal's end

#### Scenario: Restaurant without a meal time
- **WHEN** a restaurant has no meal time
- **THEN** it starts with its wait as soon as the user arrives, and it is never flagged late

### Requirement: Instant recalculation
The timeline, fit summary and breakdown SHALL update immediately after any change to the day: adding, removing, reordering or swapping items, changing a show time or a meal time, or changing the park or time window.

#### Scenario: Remove an item
- **WHEN** the user removes an item from a day that was "Over by 10 min"
- **THEN** the summary updates without a page reload, for example to "Fits"

#### Scenario: Change a meal time
- **WHEN** the user changes a lunch from 12:00 to 13:00 and the previous item ends at 11:50
- **THEN** the timeline immediately shows free time before the lunch instead of starting it at once
