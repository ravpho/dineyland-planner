# Spec Delta

## MODIFIED Requirements

### Requirement: Reorder and remove items
The user SHALL be able to reorder a day's items by dragging an item's handle, with both touch and mouse. On a touch screen the drag SHALL start as soon as the finger moves on the handle, without a long press. While dragging, the other items SHALL move apart to show where the item will land. The user SHALL also be able to move an item up or down one place, and to the top or bottom of the day, without dragging. Each move SHALL offer Undo. The user SHALL be able to remove an item and undo the last removal.

#### Scenario: Drag on a phone
- **WHEN** on a touch screen the user presses an item's handle and at once drags it above the previous item
- **THEN** the previous item moves down to show where it will land, and on release the two items swap places

#### Scenario: Drag into the other park
- **WHEN** a day holds three Disneyland Park items followed by two Disney Adventure World items, and the user drags the first item below the fourth
- **THEN** it becomes the fourth item of the day

#### Scenario: Drag past the edge of the screen
- **WHEN** on a phone the user drags an item towards the bottom of the screen while the day continues below
- **THEN** the day scrolls so the item can be dropped further down

#### Scenario: Move without dragging
- **WHEN** the user activates "move up" on the third item
- **THEN** it becomes the second item

#### Scenario: Move to the top
- **WHEN** the user chooses "Move to top" for the fifth item
- **THEN** it becomes the first item and the items before it move down one place

#### Scenario: Move to the bottom
- **WHEN** the user chooses "Move to bottom" for the second item of a six-item day
- **THEN** it becomes the sixth item

#### Scenario: Undo a move
- **WHEN** the user drags the first item to the fourth place and then chooses "Undo" on the message
- **THEN** the day returns to its previous order

#### Scenario: Undo removal
- **WHEN** the user removes an item and then chooses "Undo"
- **THEN** the item is restored to its previous position
