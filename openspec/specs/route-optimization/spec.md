# route-optimization Specification

## Purpose

Reorders a day's planned items so the visitor spends less time walking between areas and parks, while meals and shows stay at the time of day the visitor planned them.

## Requirements

### Requirement: Group a day by area
The Plan tab SHALL offer a "Group by area" action for the selected day. It SHALL reorder the day's attractions so that items in the same park are next to each other, and within a park items in the same area are next to each other. The park of the day's first item SHALL come first. Within an area, items SHALL keep their order. Grouping SHALL happen once: items added or moved later SHALL NOT be regrouped. The action SHALL be unavailable for a day with fewer than two items.

#### Scenario: Day that switches parks
- **WHEN** a day holds, in this order, Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, and the user chooses "Group by area"
- **THEN** the two Disneyland Park attractions come first and the two Disney Adventure World attractions follow, so the day has one park change instead of three

#### Scenario: Same area keeps the user's order
- **WHEN** Phantom Manor is planned before Big Thunder Mountain, both in Frontierland, and the user groups the day
- **THEN** Phantom Manor is still before Big Thunder Mountain

#### Scenario: Day that starts in the second park
- **WHEN** the first item of the day is in Disney Adventure World and the user groups the day
- **THEN** the Disney Adventure World items come before the Disneyland Park items

#### Scenario: Items no longer in the catalog
- **WHEN** a day holds an entry marked "No longer available" and the user groups the day
- **THEN** that entry moves to the end of the day

#### Scenario: Adding after grouping
- **WHEN** the user groups a day and then taps the add button on another attraction
- **THEN** the attraction is appended to the end of the day and the rest of the order is unchanged

#### Scenario: Nothing to group
- **WHEN** the selected day has no items or one item
- **THEN** the "Group by area" action is unavailable

### Requirement: Area order with the least walking
Within each park, grouping SHALL visit the areas in the order with the least total walking. Walking SHALL be measured with the timeline's estimate, from the park's entrance through the day's items in that park. In a park that the day later leaves for the other park, the walk from the last item back to that park's entrance SHALL count.

#### Scenario: Nearer area first
- **WHEN** a day holds Frozen Ever After and then Crush's Coaster, both in Disney Adventure World, and the user groups the day
- **THEN** Crush's Coaster comes first, because walking from the entrance to Worlds of Pixar and then to World of Frozen is shorter than the reverse

#### Scenario: Park the day leaves
- **WHEN** a day visits several areas of Disneyland Park and then goes to Disney Adventure World
- **THEN** the Disneyland Park area order is the one with the least walking from the entrance, through those areas and back to the entrance

### Requirement: Meals and shows keep their time
Grouping SHALL reorder only attractions. Each restaurant SHALL be placed where the user's arrival there is closest to the arrival time it had before grouping. Each show SHALL be placed before the first attraction that would make the user late for it, counting the recommended early arrival. Restaurants and shows SHALL keep their order relative to each other.

#### Scenario: Lunch keeps its time
- **WHEN** a restaurant was reached at 12:30 before grouping
- **THEN** after grouping it is placed where the new timeline reaches it closest to 12:30, and not with the other items of its area

#### Scenario: Afternoon parade
- **WHEN** a 17:30 parade with a recommended 20-minute early arrival is the second item of a day whose attractions run past 17:10, and the user groups the day
- **THEN** the parade comes before the first attraction that would make the user arrive after 17:10, and the timeline does not flag it as late

#### Scenario: Meal before a show
- **WHEN** a day plans lunch before an afternoon show and the user groups the day
- **THEN** lunch is still before the show

### Requirement: Report and undo grouping
After grouping, the app SHALL show the day's total walking minutes before and after, with an Undo action that restores the previous order. Undo SHALL leave the day unchanged if the day was edited after grouping. When grouping would not change the order, the app SHALL say the day is already grouped by area and SHALL NOT offer Undo.

#### Scenario: See the saving and undo
- **WHEN** the user groups a day whose walking drops from 95 to 48 minutes
- **THEN** a message such as "Grouped by area · walking 95 → 48 min" appears with Undo, and choosing Undo restores the previous order

#### Scenario: Edited after grouping
- **WHEN** the user groups a day, moves an item, and then chooses Undo on the grouping message
- **THEN** the day keeps its current order

#### Scenario: Already grouped
- **WHEN** the user groups a day that is already in grouped order
- **THEN** the order does not change and the message says the day is already grouped by area, without Undo
