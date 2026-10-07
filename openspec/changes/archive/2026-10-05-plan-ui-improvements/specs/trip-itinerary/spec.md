# Spec Delta

## ADDED Requirements

### Requirement: Park order of a day
A day whose attractions are in both parks SHALL show, with its two-park reminder, the order in which its attractions visit the parks, such as "Disneyland Park → Disney Adventure World". Only attractions SHALL count. A day whose attractions are all in one park SHALL show no park order, even when a restaurant or show in it is in the other park.

#### Scenario: One visit to each park
- **WHEN** a day holds Big Thunder Mountain and Phantom Manor followed by Crush's Coaster and Frozen Ever After
- **THEN** the day shows the park order "Disneyland Park → Disney Adventure World"

#### Scenario: Back and forth
- **WHEN** a day holds Big Thunder Mountain, Crush's Coaster and Phantom Manor in that order
- **THEN** the day shows the park order "Disneyland Park → Disney Adventure World → Disneyland Park"

#### Scenario: Lunch in the other park
- **WHEN** all of a day's attractions are in Disneyland Park and its lunch is in Disney Adventure World
- **THEN** the day shows the two-park reminder but no park order

### Requirement: Switch the park order
When each park's attractions are together, with one park change between attractions, the user SHALL be able to switch the park order. Switching SHALL put the other park's attractions first, keep the order of the attractions inside each park, remove every restaurant and show from the day, and move entries marked "No longer available" to the end. Restaurants and shows SHALL NOT affect whether the attractions are together.

#### Scenario: Switch a grouped day
- **WHEN** a day holds Big Thunder Mountain, Phantom Manor, Crush's Coaster and Frozen Ever After and the user switches the park order
- **THEN** the day holds Crush's Coaster, Frozen Ever After, Big Thunder Mountain and Phantom Manor, in that order

#### Scenario: Lunch between the other park's attractions
- **WHEN** a day holds Big Thunder Mountain, Crush's Coaster, lunch at Au Chalet de la Marionnette and Frozen Ever After
- **THEN** switching the park order is available, because the attractions visit each park once

#### Scenario: Entry no longer available
- **WHEN** a day holds Big Thunder Mountain, an entry marked "No longer available" and Crush's Coaster, and the user switches the park order
- **THEN** the day holds Crush's Coaster, Big Thunder Mountain and then the unavailable entry

#### Scenario: Not grouped
- **WHEN** a day holds Big Thunder Mountain, Crush's Coaster and Phantom Manor in that order
- **THEN** switching the park order is shown as unavailable, with a hint to use "Group by area" first so each park's attractions are together

#### Scenario: Grouped after the hint
- **WHEN** the user groups that day by area
- **THEN** switching the park order becomes available

### Requirement: Warning before removing meals and shows
Before switching the park order of a day that holds restaurants or shows, the app SHALL warn that they will be removed, naming each one with its meal time or show time when it has one, and SHALL switch only after the user confirms. Cancelling SHALL leave the day unchanged. A day without restaurants or shows SHALL switch without a warning.

#### Scenario: Lunch and a parade
- **WHEN** the user switches the park order of a grouped day that holds lunch at Au Chalet de la Marionnette at 12:00 and Disney Stars on Parade at 17:30
- **THEN** a warning names Au Chalet de la Marionnette (12:00) and Disney Stars on Parade (17:30) and offers "Cancel" and "Switch and remove 2"

#### Scenario: Confirm
- **WHEN** the user chooses "Switch and remove 2"
- **THEN** the park order is switched and the restaurant and the parade are no longer in the day

#### Scenario: Cancel
- **WHEN** the user chooses "Cancel" on the warning
- **THEN** the day keeps its order, its restaurant and its parade

#### Scenario: Only attractions
- **WHEN** the user switches the park order of a grouped day that holds only attractions
- **THEN** the park order is switched without a warning

### Requirement: Report and undo a park switch
After switching the park order, the app SHALL say which park now comes first and how many items were removed, with an Undo action that restores the previous order and the removed restaurants and shows. Undo SHALL leave the day unchanged if the day was edited after the switch.

#### Scenario: See the result and undo
- **WHEN** the user switches a day to start in Disney Adventure World and two items are removed
- **THEN** a message such as "Disney Adventure World first · 2 removed" appears with Undo, and choosing Undo restores the previous order, the restaurant and the show

#### Scenario: Nothing removed
- **WHEN** the user switches a day that holds only attractions to start in Disney Adventure World
- **THEN** the message reads "Disney Adventure World first" with Undo

#### Scenario: Edited after switching
- **WHEN** the user switches the park order, moves an item, and then chooses Undo on the message
- **THEN** the day keeps its current order
