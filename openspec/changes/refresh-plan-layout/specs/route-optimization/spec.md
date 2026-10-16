# Spec Delta

## MODIFIED Requirements

### Requirement: Group a day by area
My day SHALL offer a "Group by area" action for the selected day. It SHALL reorder the day's attractions so that items in the same park are next to each other, and within a park items in the same area are next to each other. The park of the day's first item SHALL come first. Within an area, items SHALL keep their order. Grouping SHALL happen once: items added or moved later SHALL NOT be regrouped. The action SHALL be unavailable for a day with fewer than two items.

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

### Requirement: Optimize a day's route
My day SHALL offer an "Optimize route" action for the selected day as its main action, with "Group by area" below it. It SHALL reorder the day's attractions so the day's last item ends as early as it can find. Times SHALL come from the timeline: its walking times and the typical wait at each projected arrival. The new order SHALL NOT be limited to keeping a park's or an area's attractions together, or to starting in the park of the day's first item.

#### Scenario: Busiest ride at opening
- **WHEN** a day in August starting at 09:30 holds The Twilight Zone Tower of Terror and then Crush's Coaster, and the user chooses "Optimize route"
- **THEN** Crush's Coaster comes first and the day ends at 10:37 instead of 10:42, although Tower of Terror is nearer the entrance and "Group by area" would keep it first

#### Scenario: Other park first
- **WHEN** a day in August starting at 09:30 holds, in this order, Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, and the user chooses "Optimize route"
- **THEN** the order becomes Crush's Coaster, Frozen Ever After, Phantom Manor, Big Thunder Mountain, with one park change, and the day ends at 13:19 instead of 14:29 (13:32 when grouped by area)

#### Scenario: Items no longer in the catalog
- **WHEN** a day holds an entry marked "No longer available" and the user optimizes the day
- **THEN** that entry moves to the end of the day
