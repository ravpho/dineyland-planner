# Spec Delta

## ADDED Requirements

### Requirement: Area of each timeline item
Each scheduled item in a day's timeline SHALL show the name of its area, so the visitor can see where the day moves between areas. Entries marked "No longer available" SHALL show no area.

#### Scenario: Attraction in Fantasyland
- **WHEN** a day holds Peter Pan's Flight
- **THEN** its timeline item shows "Fantasyland"

#### Scenario: Items from both parks
- **WHEN** a day holds Big Thunder Mountain and Frozen Ever After
- **THEN** their timeline items show "Frontierland" and "World of Frozen"
