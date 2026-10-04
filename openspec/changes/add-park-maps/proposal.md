# Proposal

## Why

The owner wants to pick attractions area by area instead of zig-zagging across a park. Today the catalog is only a list, so there's no way to see where things are, how far apart they are, or how a planned day criss-crosses the parks. The catalog also has no link to the official pages or to a real map. The drafted data still has unchecked heights and durations (open task 3.7 from the first change), and an official Disneyland Park guide can now be read to improve them.

## What Changes

- **Map view in the catalog:** a "List | Map" switch. The map shows one park at a time with zoom and pan, area zones, labelled attraction dots, and restaurant and show icons. It applies the same filters, search and group profile as the list. It is drawn by the app from the catalog's coordinates, so it works offline.
- **Walking times on the map:** tapping an item shows a card with its key facts, the walking time from the selected day's last planned stop, and the walking time to each area of that park, plus Add and Details actions. The times use the same estimate as the day timeline, so the two never disagree.
- **Area walking times:** a small table of walking minutes between the areas of the current park.
- **The day's route:** the selected day's items are drawn as numbered stops joined in order. A park change is drawn as a dashed line through the entrances.
- **Official park map:** each park links to an official map or park page. For Disneyland Park that is the official accessibility guide, which contains the park map.
- **Official page per item:** items get a link to their page on disneylandparis.com, but only where a real address was found. Items without one get no link.
- **"Open in Maps":** every item with coordinates opens its location in a map app or web map.
- **Height check level:** attraction details say how the height rule was checked: an official source, matching independent guides, or not yet verified.
- **Data improvements:**
  - Disneyland Park durations take the official guide's "about N minutes" values.
  - Rides the guide says may frighten younger guests get at least Mild scariness.
  - Heights are marked official, corroborated or draft.
  - The three items without coordinates (Meet Mickey Mouse, Princess Pavilion, Welcome to Starport) get approximate positions.

## Capabilities

### New Capabilities
- `park-map`: the catalog's map view. It covers the per-park map and its controls, filters on the map, item cards with walking times, area walking times, the day's route, and the official park map links.

### Modified Capabilities
- `park-catalog`: adds official page links, "Open in Maps", and the height check level on attraction details. No existing requirement changes.

## Impact

- **Code:**
  - New map module: projection, area zones, label placement, route geometry.
  - New UI: map view and item card.
  - Catalog switch.
  - Item detail links.
  - Catalog schema (`officialUrl`, `heightSource` shipped to the app, `locationApproximate`, `officialMapUrl` per park).
  - Data build and the review checklist.
- **Data:**
  - Curated YAML updates (durations, scariness, heights, approximate positions, official links).
  - A text snapshot of the official guide in `data/raw/`.
  - A rebuilt `catalog.json`.
- **Environment:** `brochure.disneylandparis.com` (already allowed) for the guide; web search for official page addresses. Neither is needed at runtime; "Open in Maps" and official links need a connection only when tapped.
- **No new runtime services or map tiles.** The map is drawn from bundled data.
- **Dependencies:** none planned.
