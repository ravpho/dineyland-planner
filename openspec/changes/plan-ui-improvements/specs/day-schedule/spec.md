# Spec Delta

## ADDED Requirements

### Requirement: Stop number of each timeline item
Each scheduled item in a day's timeline SHALL show its stop number: its position among the day's scheduled items, counting from 1. The day's route on the maps and the catalog's planned labels SHALL use the same numbers. Entries marked "No longer available" SHALL have no number and SHALL NOT be counted.

#### Scenario: Numbers in plan order
- **WHEN** a day holds Big Thunder Mountain, Phantom Manor and Peter Pan's Flight in that order
- **THEN** their timeline items show stop numbers 1, 2 and 3

#### Scenario: Entry no longer available
- **WHEN** a day holds Big Thunder Mountain, an entry marked "No longer available" and Phantom Manor
- **THEN** Big Thunder Mountain is stop 1, Phantom Manor is stop 2, and the unavailable entry has no number

#### Scenario: Same number on the map
- **WHEN** Phantom Manor is stop 2 in the timeline
- **THEN** the route on the map numbers Phantom Manor 2

#### Scenario: Reorder
- **WHEN** the user moves the third item up
- **THEN** it shows stop number 2 and the item it passed shows 3
