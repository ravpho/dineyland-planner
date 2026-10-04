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

### Requirement: Optimizing chooses show times
For each show whose time is not locked, optimizing SHALL choose the show's start time among its typical start times, by the same rules it uses to choose the order. A show whose time is locked SHALL keep its time. A show's time SHALL NOT be locked until the user locks it.

#### Scenario: An earlier performance fits better
- **WHEN** an August day holds Crush's Coaster, Frozen Ever After, lunch at Au Chalet de la Marionnette at 12:00, Big Thunder Mountain, Phantom Manor, Peter Pan's Flight, The Lion King: Rhythms of the Pride Lands at 16:45 (not locked) and Star Wars Hyperspace Mountain, and the user optimizes the day
- **THEN** the show moves to 13:10, after lunch, and the day ends earlier than it can with the show at 16:45

#### Scenario: Locked show keeps its time
- **WHEN** the same day has The Lion King: Rhythms of the Pride Lands locked at 16:45 and the user optimizes the day
- **THEN** the show is still at 16:45 and only the order changes

### Requirement: Ties go to less queueing and walking
When several orders end the day at the same time, optimizing SHALL choose the one with the least total queueing and walking minutes in the timeline. This applies, for example, to a day whose last item is a fixed-time show.

#### Scenario: Day that ends with the fireworks
- **WHEN** a Disneyland Park day in August holds Big Thunder Mountain, Peter Pan's Flight, Phantom Manor and Star Wars Hyperspace Mountain, then Disney Tales of Magic at 22:00, and the user optimizes the day
- **THEN** the day still ends when the show ends, and the minutes of queueing and walking fall from 155 to 147

### Requirement: Optimizing never makes the day worse
The optimized day SHALL NOT add to the total minutes the user is late for shows and meals. Among results with the same lateness, it SHALL NOT end the day later than the current day. A result that is less late SHALL be preferred even if it ends later. When no result is better by these rules, the day SHALL stay unchanged.

#### Scenario: Show stays on time
- **WHEN** a day reaches Disney Stars on Parade at 11:30 on time before optimizing
- **THEN** after optimizing the parade is still not flagged late

#### Scenario: Late show made reachable
- **WHEN** a day's current order reaches The Lion King: Rhythms of the Pride Lands at 15:45 late, because the rides listed before it run past the time to be there, and the user optimizes the day
- **THEN** the optimized day reaches the show on time

#### Scenario: Already the quickest order
- **WHEN** a day in August starting at 09:30 holds Crush's Coaster and then Frozen Ever After, and the user optimizes the day
- **THEN** the order does not change

### Requirement: Same day, same result
Optimizing SHALL be repeatable. The same day, with the same items, order, time window, date, meal times, show times and show locks, SHALL always give the same result. The result SHALL NOT depend on chance or on how fast the device is.

#### Scenario: Optimize, undo, optimize again
- **WHEN** the user optimizes a day, chooses Undo, and optimizes it again
- **THEN** the second result is the same as the first

### Requirement: Report and undo route optimization
After optimizing, the app SHALL show when the day ends and the total minutes of queueing and walking, before and after, and SHALL name every show whose time changed. It SHALL offer Undo, which restores the previous order and show times. Undo SHALL leave the day unchanged if the day was edited after optimizing. When nothing changes, the app SHALL say no quicker order was found and SHALL NOT offer Undo.

#### Scenario: See the saving and undo
- **WHEN** the user optimizes the day of Big Thunder Mountain, Frozen Ever After, Phantom Manor and Crush's Coaster
- **THEN** a message such as "Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min" appears with Undo, and choosing Undo restores the previous order

#### Scenario: Changed show time in the message
- **WHEN** optimizing moves The Lion King: Rhythms of the Pride Lands from 16:45 to 13:10
- **THEN** the message also reads "The Lion King: Rhythms of the Pride Lands 16:45 → 13:10", and Undo puts the show back at 16:45

#### Scenario: Optimize after grouping
- **WHEN** the user groups a day by area, then optimizes it, then chooses Undo on the optimizing message
- **THEN** the day returns to the grouped order

#### Scenario: Edited after optimizing
- **WHEN** the user optimizes a day, moves an item, and then chooses Undo on the optimizing message
- **THEN** the day keeps its current order

#### Scenario: No quicker order
- **WHEN** optimizing changes neither the order nor any show time
- **THEN** the message says "No quicker order found", without Undo

### Requirement: Suggest a restaurant that fits the day
A restaurant in a day's timeline SHALL suggest up to three other restaurants of the same service type when the user would reach it later than its meal time allows, or when another restaurant would end the day at least 15 minutes earlier. Each suggestion SHALL show the minutes it saves, best first. Choosing one SHALL replace the restaurant in the same position, keep its meal time and leave the other items alone, with Undo.

#### Scenario: Lunch in the other park
- **WHEN** an August day holds Crush's Coaster, Frozen Ever After and The Twilight Zone Tower of Terror, then lunch at Au Chalet de la Marionnette (counter service, Disneyland Park) at 12:00, then Spider-Man W.E.B. Adventure and Ratatouille in Disney Adventure World
- **THEN** the lunch suggests counter-service restaurants in Disney Adventure World, such as Stark Factory, each saving more than 40 minutes, because they avoid two park changes

#### Scenario: Swap and undo
- **WHEN** the user chooses Stark Factory from those suggestions
- **THEN** Stark Factory replaces Au Chalet de la Marionnette in the same position with lunch still at 12:00, a message offers Undo, and Undo restores Au Chalet de la Marionnette

#### Scenario: Late for a meal
- **WHEN** a lunch at 12:00 would be reached at 12:45, and a restaurant of the same service type could be reached by 12:30
- **THEN** that restaurant is suggested, even if it saves less than 15 minutes

#### Scenario: Restaurant that fits
- **WHEN** a restaurant is reached within its meal time and no restaurant of the same service type would end the day at least 15 minutes earlier
- **THEN** no suggestion is shown

## MODIFIED Requirements

### Requirement: Meals and shows keep their time
Grouping and optimizing SHALL reorder only attractions. A restaurant with a meal time SHALL be placed where the user's arrival is closest to that time; one without, closest to its arrival before the reorder. Each show SHALL be placed before the first attraction that would make the user late for it, counting the recommended early arrival. Restaurants and shows SHALL follow the order of these times, keeping the user's order on a tie.

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
- **WHEN** a restaurant without a meal time was reached at 12:30 before optimizing
- **THEN** in the optimized order it is placed where the new timeline reaches it closest to 12:30, given the new order of the attractions

#### Scenario: Lunch at 12:00 and dinner at 18:00
- **WHEN** a day sets lunch at 12:00 and dinner at 18:00, the current order reaches both late, and the user optimizes the day
- **THEN** lunch is reached between 11:30 and 12:30 and dinner between 17:30 and 18:30, so neither is flagged late
