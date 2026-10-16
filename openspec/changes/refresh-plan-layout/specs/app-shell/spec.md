# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Day first on the Plan`
- TO: `### Requirement: Day first in My day`

- FROM: `### Requirement: Trip actions in a trip menu`
- TO: `### Requirement: Trip actions in the More menu`

## MODIFIED Requirements

### Requirement: Phone layout
On screens narrower than 1024 px the app SHALL show Explore, My day and Map as three tabs in a bar at the bottom of the screen, each with an icon and a label, with the current tab marked. The bar SHALL stay at the bottom while the page scrolls. The app SHALL fit screens from 360 px wide without horizontal scrolling, and SHALL make every interactive control at least 44 by 44 px.

#### Scenario: Small phone
- **WHEN** the app is opened on a 360 px wide screen
- **THEN** all content fits the width and the user switches between Explore, My day and Map with the bar at the bottom of the screen

#### Scenario: Bar stays in reach
- **WHEN** the user scrolls down a long day on a phone
- **THEN** the bottom bar stays at the bottom of the screen, with My day marked as the current tab

### Requirement: Wide-screen layout
On screens 1024 px wide or more, the app SHALL show Explore and the selected day side by side so that items can be dragged from one to the other, and SHALL show no bottom bar. An "Explore | Map" switch above the left column SHALL show the Map there in place of Explore, while the day stays in view.

#### Scenario: Laptop
- **WHEN** the app is opened on a 1280 px wide screen
- **THEN** Explore and the selected day are visible at the same time, and there is no bottom bar

#### Scenario: Map beside the day
- **WHEN** on a 1280 px wide screen the user chooses "Map" above the left column
- **THEN** the left column shows the Map and the selected day stays visible on the right

### Requirement: Always-visible fit status
On a phone, once a trip exists, the selected day's fit summary SHALL stay visible just above the bottom bar on every tab, as the user scrolls.

#### Scenario: Long day
- **WHEN** the user scrolls through a day with 15 items on a phone
- **THEN** the "Fits" or "Over by N min" status remains visible above the bottom bar

#### Scenario: While exploring
- **WHEN** on a phone the user is on Explore and adds an item to the selected day
- **THEN** the fit status above the bottom bar updates for the new item without leaving Explore

### Requirement: Night-sky theme
The app SHALL use one visual theme on every screen: a navy header with a starfield, above light silver-white content with navy text, and on phones a navy bottom bar. Navy SHALL mark the primary actions and the selected day and view, the current tab SHALL be marked in gold on the bottom bar, and the fit status SHALL sit on navy. Gold SHALL be used only for rating stars, the current tab and small highlights. The theme, including its fonts, SHALL look the same without a network connection.

#### Scenario: Plan on a phone
- **WHEN** the user opens My day on a phone
- **THEN** the header shows the trip's name on a navy sky with stars, the day's timeline items are on light cards with navy text, and the fit status and the bottom bar are on navy

#### Scenario: Before the first trip
- **WHEN** no trip exists and the user opens the app
- **THEN** the header shows the app's name on a navy sky with stars

#### Scenario: Every screen
- **WHEN** the user opens Explore, an item's details, the filters, the Map and the About page
- **THEN** each uses the same header, colors and fonts

#### Scenario: Offline
- **WHEN** the installed app is opened without a connection
- **THEN** headings and text use the theme's fonts, as they do online

#### Scenario: Installed app
- **WHEN** the user opens the app from the phone's home screen
- **THEN** the phone's status bar and the app's launch screen are navy

### Requirement: Day first in My day
On a phone, My day SHALL show only the header, the date chips and the day card above the selected day's timeline. The day card SHALL show the day's date, hours and number of stops and, on a day that uses both parks, the park order and the two-park ticket reminder. Tapping the card SHALL open a sheet to change the hours and switch the park order. On a 390 × 844 px screen, the first three timeline items of a two-park day SHALL be fully visible above the fit status.

#### Scenario: Open a two-park day
- **WHEN** on a 390 × 844 px screen the user opens My day for a day with six items from both parks
- **THEN** the first three timeline items are fully visible above the fit status, without scrolling

#### Scenario: Change the hours in place
- **WHEN** the user taps the day card and sets Start to 10:00 in its sheet
- **THEN** the day's window starts at 10:00, and the user is still in My day

#### Scenario: Two-park reminder kept
- **WHEN** the selected day's attractions are in both parks
- **THEN** the day card says that a ticket valid for both parks is needed and shows the park order, and its sheet offers "Switch order"

#### Scenario: One chip per day
- **WHEN** the selected trip has three days
- **THEN** My day shows three date chips, such as "Wed 12", "Thu 13" and "Fri 14", with the selected day marked, and all three fit on a 360 px wide screen

### Requirement: Trip actions in the More menu
The header SHALL show the selected trip's name, with a way to switch trips, and Share. New trip, Rename, Number of days and Delete trip SHALL be in a "More" menu opened from the header, on phones and on wide screens, together with a link to About and data sources. Choosing an action SHALL close the menu and work as before, including the confirmation before deleting a trip or removing days.

#### Scenario: Open the menu
- **WHEN** the user opens the More menu
- **THEN** it offers New trip, Rename, Number of days, Delete trip, and About and data sources

#### Scenario: Share in one tap
- **WHEN** the user taps Share in the header
- **THEN** the share sheet opens

#### Scenario: Delete from the menu
- **WHEN** the user chooses Delete trip in the More menu
- **THEN** the menu closes and the app asks to confirm before deleting the trip

#### Scenario: Fewer days
- **WHEN** the user chooses Number of days in the More menu and reduces a 3-day trip to 2 days
- **THEN** the app asks to confirm before removing the last day and its items

#### Scenario: About from the menu
- **WHEN** the user chooses About and data sources
- **THEN** the About page opens with its data credits

#### Scenario: Close without choosing
- **WHEN** the user closes the More menu without choosing an action
- **THEN** the trip is unchanged

## ADDED Requirements

### Requirement: Earlier links keep working
Links and home-screen shortcuts to the earlier Catalog and Plan screens SHALL open Explore and My day.

#### Scenario: Old Catalog link
- **WHEN** the user opens a link to the app's earlier Catalog address, `#/catalog`
- **THEN** the app opens on Explore

#### Scenario: Old Plan link
- **WHEN** the user opens a link to the app's earlier Plan address, `#/plan`
- **THEN** the app opens on My day

### Requirement: Messages never cover a sheet
A message such as "Added …" or "Moved … to stop 3" SHALL NOT cover any content or control of an open sheet. On a phone with no sheet open, messages SHALL appear above the fit status and the bottom bar.

#### Scenario: Message while the filters are open
- **WHEN** a message appears while the filters sheet is open
- **THEN** every control in the filters sheet stays visible and can be used

#### Scenario: Above the bar
- **WHEN** on a phone the user adds an item and no sheet is open
- **THEN** the "Added" message appears above the fit status and the bottom bar, covering neither
