# Spec Delta

## ADDED Requirements

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
