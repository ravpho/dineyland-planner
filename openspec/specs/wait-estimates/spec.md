# wait-estimates Specification

## Purpose

Provides a realistic typical wait for any catalog item at a given month and time of day, based on collected statistics, so plans can be checked before the visit without live data.

## Requirements

### Requirement: Typical attraction wait by month and time of day
For an attraction with collected statistics, the app SHALL give a typical wait for any month and any time within park hours. The value SHALL be based on that attraction's measured average wait and that month's measured crowd level, SHALL vary by time of day, and SHALL be rounded to the nearest 5 minutes.

#### Scenario: Busier month gives longer wait
- **WHEN** the statistics show August is busier than January
- **THEN** the same attraction at the same time of day has an equal or longer typical wait in August than in January

#### Scenario: Midday is busier than opening
- **WHEN** the user compares an attraction at 09:30 and at 14:00 in the same month
- **THEN** the 14:00 typical wait is equal to or longer than the 09:30 one

#### Scenario: Rounded values
- **WHEN** any attraction wait is displayed
- **THEN** it is a whole multiple of 5 minutes, and never negative

### Requirement: Attractions without statistics
An attraction with no collected wait statistics, such as a walk-through, SHALL use a fixed typical wait recorded in its catalog entry. The app SHALL mark that wait as an estimate.

#### Scenario: Walk-through attraction
- **WHEN** the user views an attraction that has no Queue-Times statistics
- **THEN** its wait shows the recorded fixed value with an "estimate" marker

### Requirement: Typical restaurant wait
A restaurant's typical wait SHALL depend on its service type and on whether the time falls in a lunch peak (12:00 to 14:00) or dinner peak (18:30 to 20:30). It SHALL be marked as an estimate.

#### Scenario: Counter service at lunch peak
- **WHEN** a counter-service restaurant is planned at 12:30
- **THEN** its typical wait is longer than the same restaurant at 15:30

### Requirement: Shows have no queue wait
Shows SHALL have no queue wait. Instead each show SHALL use its recommended early-arrival minutes.

#### Scenario: Fireworks
- **WHEN** the evening fireworks are in a plan
- **THEN** no queue wait is shown for them and the recommended early-arrival time is used

### Requirement: Estimates are labelled as typical
Wherever a wait is shown in planning, the app SHALL make clear it is a typical value and not a live one. It SHALL state which years of statistics it is based on and when they were collected.

#### Scenario: Explain the number
- **WHEN** the user opens the explanation next to any wait value
- **THEN** it states that the value is a typical wait, the years of statistics used, and the collection date

### Requirement: Repeatable data collection
The project SHALL include a data-collection process that fetches the current statistics for both parks from Queue-Times and the attraction, restaurant and show lists from ThemeParks.wiki. It SHALL record the source and date of every value and SHALL NOT overwrite hand-reviewed descriptive fields.

#### Scenario: Refresh statistics
- **WHEN** a developer runs the data collection
- **THEN** wait statistics and crowd levels are updated for both parks, each tagged with its source and collection date, and hand-written descriptions and ratings are unchanged

### Requirement: Unmatched items are reported
When the data collection finds an item in one source that it cannot match to a catalog entry, it SHALL list that item in its output rather than drop it silently. It SHALL also list catalog attractions that ended up with no statistics.

#### Scenario: New ride appears
- **WHEN** Queue-Times lists a ride that no catalog entry matches
- **THEN** the collection output names that ride as unmatched

#### Scenario: Ride without statistics
- **WHEN** a catalog attraction receives no statistics from any source
- **THEN** the collection output names it so that a fixed estimate can be recorded
