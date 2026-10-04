# Spec Delta

## ADDED Requirements

### Requirement: Meal time
When the user taps the add button on a restaurant, the app SHALL ask when they will eat. It SHALL offer lunch times from 11:30 to 13:30 and dinner times from 18:00 to 20:00, in 30-minute steps, and "Any time". A restaurant added by dragging SHALL have no meal time. The user SHALL be able to set, change or clear a restaurant's meal time later in the plan.

#### Scenario: Lunch at 12:00
- **WHEN** the user taps add on Au Chalet de la Marionnette and picks 12:00
- **THEN** the restaurant is planned with its meal time at 12:00

#### Scenario: Dinner at 18:00
- **WHEN** the user adds Bistrot Chez Rémy and picks 18:00
- **THEN** the restaurant is planned with its meal time at 18:00

#### Scenario: Snack at any time
- **WHEN** the user adds a snack stand and picks "Any time"
- **THEN** the restaurant is planned without a meal time

#### Scenario: Change it in the plan
- **WHEN** the user changes a restaurant's meal time from 12:00 to 12:30 on its timeline item
- **THEN** the restaurant's meal time is 12:30

### Requirement: Meal times and show locks are kept
Saved trips and share links SHALL keep each restaurant's meal time and whether each show's time is locked. Trips saved and share links created before meal times existed SHALL keep working: their restaurants SHALL have no meal time and their shows SHALL NOT be locked.

#### Scenario: Share a day with times
- **WHEN** the user shares a trip with lunch at 12:00 and a parade locked at 17:30, and the link is imported on another device
- **THEN** the imported trip has lunch at 12:00 and the parade locked at 17:30

#### Scenario: Link from before meal times
- **WHEN** the user opens a share link created before meal times existed
- **THEN** the app imports it with the same days and items, its restaurants without a meal time and its shows not locked

## MODIFIED Requirements

### Requirement: Show start time
A show added to a day SHALL take one of its typical start times, chosen by the user, and the user SHALL be able to change that time later. The user SHALL be able to lock a show's time so that optimizing keeps it, and unlock it again.

#### Scenario: Pick the evening showing
- **WHEN** the user adds a parade that has typical start times of 13:30 and 17:30 and picks 17:30
- **THEN** the parade is planned at 17:30

#### Scenario: Lock a show time
- **WHEN** the user locks a parade planned at 17:30
- **THEN** its timeline item shows it as locked, and optimizing the day keeps it at 17:30
