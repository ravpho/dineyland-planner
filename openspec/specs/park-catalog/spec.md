# park-catalog Specification

## Purpose

Gives visitors one place to see every attraction, restaurant and show in both Disneyland Paris parks, with the facts they need to decide whether each one is worth their time and suitable for their group.

## Requirements

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
Each row in the catalog list SHALL show the item's name, park, area, type, rating and duration. Attraction rows SHALL also show the height rule, thrill level and the typical wait range for the month being planned.

#### Scenario: Scan the list
- **WHEN** the user scrolls the attraction list while planning a day in August
- **THEN** each attraction row shows its typical lowest and highest wait for August next to its rating and height rule

#### Scenario: Park and area label
- **WHEN** the catalog lists items from both parks
- **THEN** each row shows a label with its park and area, such as "Disneyland Park · Frontierland" or "Disney Adventure World · World of Frozen"

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

### Requirement: Official page link
An item's details SHALL show a link to its official page on the Disneyland Paris website when a confirmed address is known. An item without a confirmed address SHALL show no official link rather than a guessed one.

#### Scenario: Attraction with an official page
- **WHEN** the user opens Big Thunder Mountain's details
- **THEN** an "Official page" link opens its page on disneylandparis.com in a new browser tab

#### Scenario: No confirmed page
- **WHEN** an item has no confirmed official address
- **THEN** its details show no official page link

### Requirement: Open in Maps
An item with a location SHALL offer "Open in Maps", which opens that location in a map app or web map. For an item whose position is approximate, the link SHALL say so.

#### Scenario: Directions to a ride
- **WHEN** the user chooses "Open in Maps" on Phantom Manor
- **THEN** a map opens centred on Phantom Manor's coordinates

### Requirement: Height check level
Each attraction's details SHALL say how its height rule was checked: confirmed by an official Disneyland Paris source, matching in independent sources, or not yet verified. Every height SHALL be shown with the advice to follow the signs posted at the attraction.

#### Scenario: Official height
- **WHEN** the user opens Autopia's details
- **THEN** the height rule is marked as confirmed by an official source

#### Scenario: Unverified height
- **WHEN** an attraction's height rule has not been verified
- **THEN** its details mark the height as not yet verified and advise following the posted signs
