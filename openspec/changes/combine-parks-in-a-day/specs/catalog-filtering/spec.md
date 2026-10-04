# Spec Delta

## MODIFIED Requirements

### Requirement: Filter by park, area and type
The catalog SHALL list both parks by default. It SHALL let the user limit the list to one park, to one or more areas, and to one or more item types (attraction, restaurant, show).

#### Scenario: Both parks by default
- **WHEN** the user opens the catalog without choosing a park
- **THEN** items from Disneyland Park and Disney Adventure World are listed together

#### Scenario: Only attractions in one area
- **WHEN** the user selects Disneyland Park, the Frontierland area and the attraction type
- **THEN** only Frontierland attractions are listed

### Requirement: Combine, count and clear filters
All active filters SHALL combine so that an item is listed only if it passes every one. The catalog SHALL show how many items match and SHALL offer a single action to clear the filters. Clearing filters SHALL return to both parks and SHALL NOT delete the saved group profile.

#### Scenario: Count updates
- **WHEN** the user adds a filter
- **THEN** the shown number of matching items updates immediately

#### Scenario: Clear filters
- **WHEN** the user chooses "Clear filters"
- **THEN** the area, type and search filters reset, both parks are listed again, and the group profile remains saved

### Requirement: Sort the list
The catalog SHALL let the user sort by name, by rating, by typical wait or by duration, with a sort control shown above the list. The wait sort SHALL use the busiest typical wait in the month being planned and list items without a queue estimate last. Duration SHALL mean the ride, meal or show length.

#### Scenario: Best first
- **WHEN** the user sorts by rating
- **THEN** items with a rating of 5 appear before items with lower ratings

#### Scenario: Shortest first
- **WHEN** the user sorts by duration
- **THEN** a 2-minute ride appears before a 10-minute boat ride, which appears before a 75-minute table-service meal

#### Scenario: Sort without opening the filters
- **WHEN** the user is looking at the catalog list
- **THEN** the sort control is visible above the list and changing it reorders the list immediately
