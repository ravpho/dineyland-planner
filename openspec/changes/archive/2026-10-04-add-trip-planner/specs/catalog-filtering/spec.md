# Spec Delta

## Purpose

Lets visitors narrow the catalog to what suits their group, mainly children's height and tolerance for fast or scary rides, without re-entering the same limits every time.

## ADDED Requirements

### Requirement: Filter by park, area and type
The catalog SHALL let the user limit the list to one park, to one or more areas of that park, and to one or more item types (attraction, restaurant, show).

#### Scenario: Only attractions in one area
- **WHEN** the user selects Disneyland Park, the Frontierland area and the attraction type
- **THEN** only Frontierland attractions are listed

### Requirement: Filter by height
The catalog SHALL let the user enter a height in centimetres and SHALL treat attractions whose minimum height is above that height as unsuitable.

#### Scenario: Child too short
- **WHEN** the height filter is 110 cm
- **THEN** an attraction requiring 120 cm is treated as unsuitable and an attraction requiring 102 cm is not

#### Scenario: No height limit
- **WHEN** a height filter is set
- **THEN** attractions with no height requirement are never treated as unsuitable because of height

### Requirement: Filter by thrill and scariness
The catalog SHALL let the user choose a maximum thrill level and a maximum scariness level. Attractions above either maximum SHALL be treated as unsuitable.

#### Scenario: No intense rides
- **WHEN** the maximum thrill level is Moderate
- **THEN** attractions rated Thrilling or Intense are treated as unsuitable

#### Scenario: No scary rides
- **WHEN** the maximum scariness level is Mild
- **THEN** attractions rated Spooky or Scary are treated as unsuitable, whatever their thrill level

### Requirement: Grey out or hide unsuitable items
Unsuitable attractions SHALL be greyed out by default and SHALL show the reason, for example "Needs 120 cm". The user SHALL be able to switch to hiding them completely.

#### Scenario: Reason shown
- **WHEN** an attraction is unsuitable because of height
- **THEN** its row is greyed out and shows the required height

#### Scenario: Hide instead
- **WHEN** the user switches on "Hide unsuitable"
- **THEN** unsuitable attractions disappear from the list

### Requirement: Group profile
The user SHALL be able to save a group profile holding the shortest member's height, the maximum thrill level and the maximum scariness level. The profile SHALL be saved on the device and SHALL apply to the catalog automatically until the user changes or clears it.

#### Scenario: Profile applied on return
- **WHEN** the user saved a profile of 110 cm, maximum thrill Moderate, maximum scariness Mild, and reopens the app later
- **THEN** the catalog applies those limits without the user setting the filters again

#### Scenario: Clear profile
- **WHEN** the user clears the group profile
- **THEN** no attraction is treated as unsuitable because of height, thrill or scariness

### Requirement: Unsuitable items can still be planned
Adding an unsuitable attraction to a plan SHALL be allowed. The plan SHALL mark it with the same reason shown in the catalog.

#### Scenario: Parent rides alone
- **WHEN** the user adds an attraction that needs 120 cm while the profile height is 110 cm
- **THEN** the attraction is added and marked "Needs 120 cm" in the plan

### Requirement: Combine, count and clear filters
All active filters SHALL combine so that an item is listed only if it passes every one. The catalog SHALL show how many items match and SHALL offer a single action to clear the filters. Clearing filters SHALL NOT delete the saved group profile.

#### Scenario: Count updates
- **WHEN** the user adds a filter
- **THEN** the shown number of matching items updates immediately

#### Scenario: Clear filters
- **WHEN** the user chooses "Clear filters"
- **THEN** the park, area, type and search filters reset and the group profile remains saved

### Requirement: Sort the list
The catalog SHALL let the user sort by name, by rating, or by typical wait for the month being planned.

#### Scenario: Best first
- **WHEN** the user sorts by rating
- **THEN** items with a rating of 5 appear before items with lower ratings
