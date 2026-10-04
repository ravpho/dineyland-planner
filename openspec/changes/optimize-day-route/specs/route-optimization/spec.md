# Spec Delta

## ADDED Requirements

### Requirement: Optimize a day's route
The Plan tab SHALL offer an "Optimize route" action for the selected day, next to "Group by area". It SHALL reorder the day's attractions so the day's last item ends as early as it can find. Times SHALL come from the timeline: its walking times and the typical wait at each projected arrival. The new order SHALL NOT be limited to keeping a park's or an area's attractions together, or to starting in the park of the day's first item.

#### Scenario: Busiest ride at opening
- **WHEN** a day in August starting at 09:30 holds The Twilight Zone Tower of Terror and then Crush's Coaster, and the user chooses "Optimize route"
- **THEN** Crush's Coaster comes first and the day ends at 10:37 instead of 10:42, although Tower of Terror is nearer the entrance and "Group by area" would keep it first

#### Scenario: Other park first
- **WHEN** a day in August starting at 09:30 holds, in this order, Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster, and the user chooses "Optimize route"
- **THEN** the order becomes Crush's Coaster, Frozen Ever After, Phantom Manor, Big Thunder Mountain, with one park change, and the day ends at 13:19 instead of 14:29 (13:32 when grouped by area)

#### Scenario: Items no longer in the catalog
- **WHEN** a day holds an entry marked "No longer available" and the user optimizes the day
- **THEN** that entry moves to the end of the day

### Requirement: Optimizing is a one-time action
Optimizing SHALL change the order once. Items added or moved later SHALL NOT be reordered. The action SHALL be unavailable for a day with fewer than two items.

#### Scenario: Adding after optimizing
- **WHEN** the user optimizes a day and then taps the add button on another attraction
- **THEN** the attraction is appended to the end of the day and the rest of the order is unchanged

#### Scenario: Nothing to optimize
- **WHEN** the selected day has no items or one item
- **THEN** the "Optimize route" action is unavailable

### Requirement: Ties go to less queueing and walking
When several orders end the day at the same time, optimizing SHALL choose the one with the least total queueing and walking minutes in the timeline. This applies, for example, to a day whose last item is a fixed-time show.

#### Scenario: Day that ends with the fireworks
- **WHEN** a Disneyland Park day in August holds Big Thunder Mountain, Peter Pan's Flight, Phantom Manor and Star Wars Hyperspace Mountain, then Disney Tales of Magic at 22:00, and the user optimizes the day
- **THEN** the day still ends when the show ends, and the minutes of queueing and walking fall from 155 to 147

### Requirement: Optimizing never makes the day worse
The optimized order SHALL NOT add to the total minutes the user is late for shows. Among orders with the same lateness, it SHALL NOT end the day later than the current order. An order that is less late for shows SHALL be preferred even if it ends later. When no order is better by these rules, the day's order SHALL stay unchanged.

#### Scenario: Show stays on time
- **WHEN** a day reaches Disney Stars on Parade at 11:30 on time before optimizing
- **THEN** after optimizing the parade is still not flagged late

#### Scenario: Late show made reachable
- **WHEN** a day's current order reaches The Lion King: Rhythms of the Pride Lands at 15:45 late, because the rides listed before it run past the time to be there, and the user optimizes the day
- **THEN** the optimized order reaches the show on time

#### Scenario: Already the quickest order
- **WHEN** a day in August starting at 09:30 holds Crush's Coaster and then Frozen Ever After, and the user optimizes the day
- **THEN** the order does not change

### Requirement: Same day, same result
Optimizing SHALL be repeatable. The same day, with the same items, order, time window, date and show times, SHALL always give the same new order. The result SHALL NOT depend on chance or on how fast the device is.

#### Scenario: Optimize, undo, optimize again
- **WHEN** the user optimizes a day, chooses Undo, and optimizes it again
- **THEN** the second result is the same order as the first

### Requirement: Report and undo route optimization
After optimizing, the app SHALL show when the day ends and the total minutes of queueing and walking, before and after, with an Undo action that restores the previous order. Undo SHALL leave the day unchanged if the day was edited after optimizing. When the order does not change, the app SHALL say no quicker order was found and SHALL NOT offer Undo.

#### Scenario: See the saving and undo
- **WHEN** the user optimizes the day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster
- **THEN** a message such as "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min" appears with Undo, and choosing Undo restores the previous order

#### Scenario: Optimize after grouping
- **WHEN** the user groups a day by area, then optimizes it, then chooses Undo on the optimizing message
- **THEN** the day returns to the grouped order

#### Scenario: Edited after optimizing
- **WHEN** the user optimizes a day, moves an item, and then chooses Undo on the optimizing message
- **THEN** the day keeps its current order

#### Scenario: No quicker order
- **WHEN** optimizing leaves the order unchanged
- **THEN** the message says "No quicker order found", without Undo

## MODIFIED Requirements

### Requirement: Meals and shows keep their time
Grouping and optimizing SHALL reorder only attractions. Each restaurant SHALL be placed where the user's arrival there is closest to the arrival time it had before the reorder. Each show SHALL be placed before the first attraction that would make the user late for it, counting the recommended early arrival. Restaurants and shows SHALL keep their order relative to each other.

#### Scenario: Lunch keeps its time
- **WHEN** a restaurant was reached at 12:30 before grouping
- **THEN** after grouping it is placed where the new timeline reaches it closest to 12:30, and not with the other items of its area

#### Scenario: Afternoon parade
- **WHEN** a 17:30 parade with a recommended 20-minute early arrival is the second item of a day whose attractions run past 17:10, and the user groups the day
- **THEN** the parade comes before the first attraction that would make the user arrive after 17:10, and the timeline does not flag it as late

#### Scenario: Meal before a show
- **WHEN** a day plans lunch before an afternoon show and the user groups the day
- **THEN** lunch is still before the show

#### Scenario: Lunch keeps its time when optimizing
- **WHEN** a restaurant was reached at 12:30 before optimizing
- **THEN** in the optimized order it is placed where the new timeline reaches it closest to 12:30, given the new order of the attractions
