# Spec Delta

## Purpose

Provides the frame of the planner: navigation, layouts that work on phones and desktops, installation on a phone, offline use, and the page that credits data sources.

## ADDED Requirements

### Requirement: Phone layout
On screens narrower than 768 px the app SHALL show the catalog and the plan as separate tabs, SHALL fit screens from 360 px wide without horizontal scrolling, and SHALL make every interactive control at least 44 by 44 px.

#### Scenario: Small phone
- **WHEN** the app is opened on a 360 px wide screen
- **THEN** all content fits the width and the user switches between Catalog and Plan with tabs

### Requirement: Wide-screen layout
On screens 1024 px wide or more, the app SHALL show the catalog and the selected day side by side so that items can be dragged from one to the other.

#### Scenario: Laptop
- **WHEN** the app is opened on a 1280 px wide screen
- **THEN** the catalog and the selected day are visible at the same time

### Requirement: Always-visible fit status
While a day is shown on a phone, its fit summary SHALL stay visible at the bottom of the screen as the user scrolls.

#### Scenario: Long day
- **WHEN** the user scrolls through a day with 15 items on a phone
- **THEN** the "Fits" or "Over by N min" status remains visible

### Requirement: Install on a phone
The app SHALL be installable to a phone's home screen and SHALL open there full screen, with its own name and icon.

#### Scenario: Add to home screen
- **WHEN** the user chooses "Add to Home Screen" in a phone browser
- **THEN** an app icon appears and opens the planner without browser address bars

### Requirement: Works offline
After the app has been opened once with a connection, it SHALL open and work without a network: catalog, filters, trips and schedules SHALL all be available.

#### Scenario: Airplane mode
- **WHEN** the user opens the installed app with no connection
- **THEN** the catalog, saved trips and day timelines work as they do online

### Requirement: New version notice
When a newer version of the app or its data is available, the app SHALL tell the user and apply it when they agree or the next time the app starts. Saved trips SHALL be kept.

#### Scenario: Data refreshed
- **WHEN** a new version with refreshed wait statistics is published and the user opens the app online
- **THEN** the app offers to update, and after updating all saved trips are still present

### Requirement: About and attribution
The app SHALL have an about page that credits Queue-Times.com with a visible "Powered by Queue-Times.com" link, credits ThemeParks.wiki and Wikipedia, shows the data collection date, and states that the app is unofficial and not affiliated with Disney.

#### Scenario: Open about
- **WHEN** the user opens the about page
- **THEN** the Queue-Times link, the other data credits, the data date and the unofficial-app statement are shown
