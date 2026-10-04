# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog list summary
Each row in the catalog list SHALL show the item's name, park, area, type, rating and duration. Attraction rows SHALL also show the height rule, thrill level and the typical wait range for the month being planned.

#### Scenario: Scan the list
- **WHEN** the user scrolls the attraction list while planning a day in August
- **THEN** each attraction row shows its typical lowest and highest wait for August next to its rating and height rule

#### Scenario: Park and area label
- **WHEN** the catalog lists items from both parks
- **THEN** each row shows a label with its park and area, such as "Disneyland Park · Frontierland" or "Disney Adventure World · World of Frozen"
