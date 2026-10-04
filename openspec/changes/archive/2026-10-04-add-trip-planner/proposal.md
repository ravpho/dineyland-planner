# Proposal

## Why

Planning a Disneyland Paris trip means juggling about 60 attractions across two parks, queues that swing from 5 to 90 minutes with the month and hour, and height or thrill limits for children. No single tool shows whether a hand-picked list of rides actually fits into a day. This change builds the first half of the Disneyland Planner: a mobile-friendly planning app for a family trip. Live in-park updates come in a later change.

## What Changes

- New web app (installable on a phone, works offline) for planning a multi-day trip to Disneyland Paris. It covers both parks: Disneyland Park and Disney Adventure World.
- A catalog of attractions, restaurants and shows. Each entry has a short description, a "worth it" rating, duration, minimum height, age rules where they exist, thrill level, scariness level, and typical wait by month and time of day.
- Filters and a reusable group profile (shortest child's height, maximum thrill, maximum scariness) that hide or grey out unsuitable attractions.
- A trip made of days. Each day has a date, one park, an available time window and an ordered list of items. Items are added by tap or drag and reordered by drag on touch screens and with a mouse.
- A day timeline that works out each item's start time from walking time, the typical wait at that hour in that month, and the item's duration. Shows keep their fixed start times. The day reports whether the plan fits the time window or how many minutes it runs over.
- Typical waits computed from real Queue-Times statistics: each ride's average wait and each month's crowd level, combined with a shared time-of-day curve. Every catalog entry records its sources and the date its data was collected.
- Plans saved on the device, and a share link that carries a whole trip to another device. No accounts.
- A repeatable data-collection script that pulls Queue-Times statistics and ThemeParks.wiki entity lists, and combines them with hand-reviewed details into the app's data files.

Out of scope for this change: live wait times and the in-park mode, accounts or server storage, user-submitted ratings, automatic reordering of a plan, Premier Access and single-rider lines, Disney Village restaurants, and languages other than English.

## Capabilities

### New Capabilities
- `park-catalog`: The attractions, restaurants and shows of both parks, with their descriptive, safety and suitability details, source attribution, and the views for browsing and inspecting them.
- `catalog-filtering`: Filtering the catalog by park, area, type, height, thrill and scariness, and the saved group profile that applies those limits.
- `wait-estimates`: Typical wait for any catalog item at a given month and time of day, derived from collected statistics, plus the data-collection process that produces those statistics.
- `trip-itinerary`: Creating and editing a multi-day trip: days, parks, time windows, adding, removing and reordering items, saving on the device, and share links.
- `day-schedule`: Turning a day's ordered items into a timeline with start times, walking, waits and fixed-time shows, and reporting whether the day fits its time window.
- `app-shell`: Navigation, phone and desktop layouts, installation on a phone's home screen, offline use, and the about/attribution page.

### Modified Capabilities
_None. This is the first change in the project._

## Impact

- **Code**: new front-end application in a repository that currently holds only a README and OpenSpec setup.
- **Dependencies**: a JavaScript build toolchain, a UI framework, a touch-capable drag-and-drop library, and an offline/installable-app plugin. Exact choices are in design.md.
- **External services**: Queue-Times.com (statistics, credited in the app as its terms require), ThemeParks.wiki API (entity lists) and Wikipedia (ride facts). They are called only by the data-collection script at build time, never by the app at runtime.
- **Environment**: the cloud development environment must keep these domains allowed: `queue-times.com`, `api.themeparks.wiki`, `en.wikipedia.org`. The SessionStart hook will also install the project's dependencies.
- **Hosting**: the app builds to static files and is published with GitHub Pages from this public repository. The owner must switch Pages on once, under Settings → Pages → Source: GitHub Actions.
