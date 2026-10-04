# Spec Delta

## Purpose

Gives visitors one place to see every attraction, restaurant and show in both Disneyland Paris parks, with the facts they need to decide whether each one is worth their time and suitable for their group.

## ADDED Requirements

### Requirement: Catalog covers both parks
The catalog SHALL contain the attractions, restaurants and shows of Disneyland Park and Disney Adventure World. Every item SHALL belong to exactly one park and one named area of that park, and SHALL have a type of attraction, restaurant or show.

#### Scenario: Browse one park
- **WHEN** the user selects Disneyland Park in the catalog
- **THEN** the catalog lists only items whose park is Disneyland Park, grouped or labelled by area

#### Scenario: Every item has park, area and type
- **WHEN** any catalog item is displayed
- **THEN** its park, area and type are shown

### Requirement: Attraction details
Each attraction SHALL show its name, a short description of at most 300 characters, a "worth it" rating from 1 to 5 with a one-line reason, ride duration in minutes, minimum height in centimetres or "No height requirement", age rules where the park publishes any, a thrill level and a scariness level.

#### Scenario: Open an attraction
- **WHEN** the user opens an attraction's details
- **THEN** the name, description, rating with reason, duration, height rule, thrill level and scariness level are all visible

#### Scenario: Attraction without a height limit
- **WHEN** an attraction has no minimum height
- **THEN** its details show "No height requirement" instead of a number

#### Scenario: Attraction with an age rule
- **WHEN** an attraction has a published age rule, such as children under a given age needing an accompanying adult
- **THEN** that rule is shown in its details

### Requirement: Thrill and scariness scales
Thrill level SHALL use a five-step named scale: Gentle, Mild, Moderate, Thrilling, Intense. Scariness SHALL use a four-step named scale: None, Mild, Spooky, Scary. Each attraction SHALL have one value on each scale, and the two scales SHALL be shown separately.

#### Scenario: Slow but spooky ride
- **WHEN** an attraction is slow-moving but dark and frightening
- **THEN** it can show a Gentle or Mild thrill level together with a Spooky or Scary scariness level

### Requirement: Restaurant details
Each restaurant SHALL show its name, service type (counter service, table service or snack), a short description, a "worth it" rating from 1 to 5, and a typical meal duration in minutes.

#### Scenario: Open a restaurant
- **WHEN** the user opens a restaurant's details
- **THEN** its service type, description, rating and typical meal duration are visible

### Requirement: Show details
Each show SHALL show its name, a short description, duration, one or more typical start times, and a recommended number of minutes to arrive early.

#### Scenario: Open a show
- **WHEN** the user opens a show such as the evening fireworks
- **THEN** its typical start times, duration and recommended early-arrival minutes are visible

### Requirement: Catalog list summary
Each row in the catalog list SHALL show the item's name, type, rating and duration. Attraction rows SHALL also show the height rule, thrill level and the typical wait range for the month being planned.

#### Scenario: Scan the list
- **WHEN** the user scrolls the attraction list while planning a day in August
- **THEN** each attraction row shows its typical lowest and highest wait for August next to its rating and height rule

### Requirement: Search by name
The catalog SHALL let the user find items by typing part of a name. Matching SHALL ignore letter case and accents.

#### Scenario: Partial name
- **WHEN** the user types "thunder"
- **THEN** the list shows Big Thunder Mountain and hides items whose names do not contain "thunder"

#### Scenario: Accents ignored
- **WHEN** the user types "cafe"
- **THEN** items whose names contain "Café" are shown

### Requirement: Source attribution and data date
Every catalog item SHALL list the sources its facts and wait statistics came from. The app SHALL show the date the catalog data was collected.

#### Scenario: Check where facts came from
- **WHEN** the user opens any item's details
- **THEN** a sources section lists at least one source, with a link where the source is a web page

#### Scenario: See data freshness
- **WHEN** the user opens the about page
- **THEN** the date the catalog and wait statistics were collected is shown
