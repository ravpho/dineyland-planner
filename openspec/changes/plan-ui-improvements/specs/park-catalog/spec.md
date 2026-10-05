# Spec Delta

## ADDED Requirements

### Requirement: Items planned in the selected day are marked
Each catalog list row, item details view and item card on the catalog map SHALL say whether the item is planned in the selected day. Such an item SHALL carry a label with the day's number and its stop numbers, such as "In Day 1 · stop 4" or "In Day 1 · stops 4, 9", and its list row SHALL be tinted. The add button SHALL stay available, and an unsuitable item SHALL keep its unsuitable mark.

#### Scenario: Just added
- **WHEN** Day 1 holds three items and the user taps add on Peter Pan's Flight
- **THEN** its catalog row is tinted and labelled "In Day 1 · stop 4", and the "Added" message still appears

#### Scenario: Planned twice
- **WHEN** Day 1 holds Big Thunder Mountain as its second and fifth items
- **THEN** its row is labelled "In Day 1 · stops 2, 5"

#### Scenario: Add again
- **WHEN** the user taps add on an attraction that is already in the selected day
- **THEN** another entry for it is added to the day, and its label lists both stops

#### Scenario: Unsuitable and planned
- **WHEN** the group profile height is 110 cm and a ride that needs 120 cm is in the selected day
- **THEN** its row shows both the "Needs 120 cm" mark and the planned label

#### Scenario: Removed from the day
- **WHEN** the user removes the only entry for Peter Pan's Flight from the selected day
- **THEN** its row is no longer tinted and has no planned label

#### Scenario: Details and map card
- **WHEN** Phantom Manor is the second item of Day 1 and the user opens its details, or selects it on the catalog map
- **THEN** the details and the map card show "In Day 1 · stop 2"

### Requirement: Items planned on other days are marked
An item planned on other days of the selected trip SHALL carry a muted label naming those days, such as "In Day 3" or "In Days 2, 3", and its list row SHALL NOT be tinted for them. When the item is also in the selected day, the other days SHALL be named after that day's label, such as "Also in Day 3". Items planned only in other trips SHALL NOT be marked.

#### Scenario: Only on another day
- **WHEN** the user is planning Day 1 and Phantom Manor is planned only on Day 3
- **THEN** its row shows a muted "In Day 3" label and is not tinted

#### Scenario: In the selected day and another
- **WHEN** Phantom Manor is the second item of Day 1 and is also planned on Day 3, and Day 1 is selected
- **THEN** its row is tinted and shows "In Day 1 · stop 2" and "Also in Day 3"

#### Scenario: Select another day
- **WHEN** Phantom Manor is planned only on Day 3 and the user selects Day 3
- **THEN** its row is tinted and labelled with Day 3 and its stop number

#### Scenario: Another trip
- **WHEN** Phantom Manor is planned only in a trip that is not selected
- **THEN** its row has no planned label
