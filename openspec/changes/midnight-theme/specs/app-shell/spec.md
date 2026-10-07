# Spec Delta

## ADDED Requirements

### Requirement: Night-sky theme
The app SHALL use one visual theme on every screen: a navy header with a starfield, above light silver-white content with navy text. Navy SHALL mark the primary actions and the selected tab, day and view, and the fit status SHALL sit on a navy bar. Gold SHALL be used only for rating stars and small highlights. The theme, including its fonts, SHALL look the same without a network connection.

#### Scenario: Plan on a phone
- **WHEN** the user opens the Plan on a phone
- **THEN** the header shows the app's name on a navy sky with stars, the day's timeline items are on light cards with navy text, and the fit status is on a navy bar

#### Scenario: Every screen
- **WHEN** the user opens the Catalog, an item's details, the filters and the About page
- **THEN** each uses the same header, colors and fonts

#### Scenario: Offline
- **WHEN** the installed app is opened without a connection
- **THEN** headings and text use the theme's fonts, as they do online

#### Scenario: Installed app
- **WHEN** the user opens the app from the phone's home screen
- **THEN** the phone's status bar and the app's launch screen are navy

### Requirement: The app's own mark
The theme SHALL NOT use Disney logos, the castle silhouette, character shapes such as Mickey's ears, or Disney typefaces. The app icon SHALL be the app's own mark.

#### Scenario: Home screen icon
- **WHEN** the app is added to a phone's home screen
- **THEN** its icon shows the app's own mark, a gold star over a silver calendar on navy, and no Disney logo or character

### Requirement: Readable colors
Text SHALL have a contrast ratio of at least 4.5:1 against its background. Rating stars, icons that carry meaning, the borders of input fields, focus outlines and status colors SHALL have at least 3:1 against what surrounds them. Status SHALL NOT be shown by color alone: "Fits", "Over by N min", "N min late" and "Ends after" keep their words.

#### Scenario: Muted text on a card
- **WHEN** a timeline card shows an item's area in muted text
- **THEN** that text has a contrast ratio of at least 4.5:1 against the card

#### Scenario: Gold stars on a light row
- **WHEN** a catalog row shows a 4-star rating
- **THEN** the filled stars have a contrast ratio of at least 3:1 against the row

#### Scenario: Text on navy
- **WHEN** the fit bar shows "Fits · 2 h spare"
- **THEN** its text has a contrast ratio of at least 4.5:1 against the navy bar

#### Scenario: Status in words
- **WHEN** a day runs over its time window
- **THEN** the fit bar reads "Over by N min" in words, not only in a different color

### Requirement: Reduced motion
When the device asks for reduced motion, the app SHALL NOT twinkle stars or show sparkles, and sheets, toasts and view changes SHALL appear in their final place at once. Without that setting, sheets, toasts and view changes SHALL finish their animation within 300 ms. No message or result SHALL wait for an animation.

#### Scenario: Reduced motion on
- **WHEN** the phone asks for reduced motion and the user opens the filters
- **THEN** the filters sheet appears at once, and the header stars do not twinkle

#### Scenario: Sparkle after optimizing
- **WHEN** reduced motion is off and "Optimize route" finds a quicker order
- **THEN** a small sparkle plays by the button and fades within a second, and the result message appears at the same time

#### Scenario: No sparkle with reduced motion
- **WHEN** the phone asks for reduced motion and "Optimize route" finds a quicker order
- **THEN** no sparkle plays and the result message appears as usual

### Requirement: Day first on the Plan
On a phone, the Plan SHALL show only these above the selected day's timeline: the trip row, the day tabs, the day's hours, the two-park reminder when it applies, and the Timeline | Map switch with the route actions. On a 390 × 844 px screen, with a day of items from both parks selected, the first two timeline items SHALL be fully visible above the fit status without scrolling.

#### Scenario: Open a two-park day
- **WHEN** on a 390 × 844 px screen the user opens the Plan of a day with six items from both parks
- **THEN** the first two timeline items are fully visible above the fit status, without scrolling

#### Scenario: Change the hours in place
- **WHEN** the user changes the Start time in the day's hours row to 10:00
- **THEN** the day's window starts at 10:00, without opening another screen

#### Scenario: Two-park reminder kept
- **WHEN** the selected day's attractions are in both parks
- **THEN** the compact reminder still says that a ticket valid for both parks is needed, shows the park order and offers "Switch order"

### Requirement: Trip actions in a trip menu
The trip row SHALL show the trip's name with a way to switch trips, the number of days, and Share. New trip, Rename and Delete SHALL be in a trip menu opened from the trip row, on phones and on wide screens. Choosing an action SHALL close the menu and work as before, including the confirmation before deleting a trip.

#### Scenario: Open the menu
- **WHEN** the user opens the trip menu
- **THEN** it offers New trip, Rename and Delete

#### Scenario: Share in one tap
- **WHEN** the user taps Share in the trip row
- **THEN** the share sheet opens

#### Scenario: Delete from the menu
- **WHEN** the user chooses Delete in the trip menu
- **THEN** the menu closes and the app asks to confirm before deleting the trip

#### Scenario: Close without choosing
- **WHEN** the user closes the trip menu without choosing an action
- **THEN** the trip is unchanged
