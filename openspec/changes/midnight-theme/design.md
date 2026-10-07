# Design

## Context

See proposal.md (Why) for motivation and the app-shell delta spec for the required behaviour. What the code offers today:

| Where | What is there |
|---|---|
| `src/index.css` | One line: `@import 'tailwindcss'` (Tailwind 4.3). There are no theme values, fonts or motion |
| Components | About 280 `className` strings in 25 files use raw Tailwind colors: `slate-*` for text and borders, `indigo-*` for selection and primary, `emerald-*` for fits and planned, `amber-*` and `red-*` for warnings. `ParkMap.tsx` has 14 hard-coded hex colors (`AREA_COLOURS`, `TYPE_COLOURS`, `ROUTE_COLOUR`, the ground `#eef3ea`) |
| `src/components/ui.tsx` | `Button` (primary, secondary, ghost, danger), `IconButton`, `Chip`, `Badge` (tones slate, amber, red, green, indigo), `Stars`, `Sheet`, `Field`, `inputClass` |
| `src/App.tsx` | A white header with an indigo wordmark and About. Catalog and Plan tabs show below 1024 px. On wide screens the catalog and plan sit side by side, and the plan column scrolls on its own |
| `src/screens/PlanScreen.tsx` | `TripBar` (trip select, days select, Share, New trip, Rename, Delete), day tabs, `DaySettings` (labelled Start and End fields), `TicketReminder` with `ParkOrder`, the Timeline/Map switch, `RouteActions`, `DayTimeline` or `PlanMap`, `Breakdown`, `FitBar` |
| `src/components/DayTimeline.tsx` | `SlotCard`: grip handle (`slot-handle`), an inline stop badge (`slot-stop`), the time in `font-mono`, name, area, walk, arrival and wait, then badges, show and meal pickers and suggestions, then move up, move down and remove. Park change and free time are `pl-14` paragraphs above the card |
| `src/components/FitSummary.tsx` | `FitBar` is emerald or red, fixed to the bottom on phones and sticky inside the plan column on wide screens. `Toast.tsx` sits at `bottom-24`, or `lg:bottom-6`, where it covers the sticky fit bar on wide screens |
| PWA | `index.html` and the manifest use `theme_color #3730a3` and `background_color #f8fafc`. `scripts/make-icons.ts` renders `public/icon.svg` to four PNGs on an indigo background. Workbox precaches `**/*.{js,css,html,svg,png,webmanifest}`, which leaves out fonts |
| Tests | `catalog.test.tsx` checks `className` for `bg-emerald-50` twice. `e2e/catalog.phone.spec.ts` selects names with `span.block.font-medium`. Everything else finds elements by role, label or test id. `shell.phone.spec.ts` 8.1 measures horizontal overflow and 44 × 44 controls at 360 × 740, and 8.2 checks offline use and installability. No test clicks New trip, Rename or Delete |

Measured on a 390 × 844 phone with a two-park day, the first timeline item starts about 700 px down.

## Goals / Non-Goals

**Goals:**
- The theme lives in one place. Components name a color's role (`ink`, `accent`, `fits`), never its value.
- Raw Tailwind palette classes and hex colors can't creep back into components. A test catches them.
- Contrast is checked by a test against the actual theme values, not by eye.
- No new runtime library. Motion is plain CSS and turns off by default when reduced motion is asked for.
- Test ids, roles and accessible names the tests rely on stay the same.

**Non-Goals:**
- A dark theme. The two-layer colors (Decision 1) make it a later change.
- Restyling the browser's own `confirm` and `prompt` dialogs.
- Any change to the catalog's layout, the maps' geometry, or how anything is computed.

## Decisions

### 1. Theme colors as two layers in `src/index.css`, with Tailwind's palette switched off
- **Raw palette:** plain custom properties on `:root`, such as `--night-800` and `--silver-200`. They generate no utilities, so components can't use them directly.
- **Roles:** declared in `@theme` and pointing at the raw palette, such as `--color-ink: var(--night-ink)`. Tailwind makes utilities from them: `bg-surface`, `text-ink-muted`, `border-line`, `fill-map-zone-2`.
- **Default palette off:** `@theme` starts with `--color-*: initial`, which removes Tailwind's default palette (`slate`, `indigo` and so on), then adds back `white` and `black`. A leftover `bg-slate-50` then produces no CSS, and the guard test (Decision 11) names it.

Roles (Decision 2 has the values):

| Role | Use |
|---|---|
| `page`, `surface`, `surface-muted` | Page background, cards and sheets, quiet fills (segmented-control tracks, other-day badges) |
| `line`, `line-strong`, `field` | Hairlines between rows, card and button borders, input borders (3:1) |
| `ink`, `ink-soft`, `ink-muted`, `ink-faint` | Body text, secondary strong text, muted text (4.5:1), meaningful icons such as grips and walk (3:1) |
| `accent`, `accent-hover`, `accent-soft`, `on-accent` | Primary buttons, the selected day and view, stop nodes, the planned badge. `accent-soft` tints planned rows, drop zones and the two-park note |
| `sky`, `sky-deep`, `on-sky`, `on-sky-muted` | Header, fit bar, toast, sheet scrim |
| `star`, `star-ink` | Gold on navy, and gold on light surfaces (rating stars, the focus highlight) |
| `fits`, `fits-soft`, `fits-on-sky` / `over`, `over-soft`, `over-on-sky` / `warn`, `warn-soft` | Status colors |
| `focus`, `focus-on-sky` | Focus outlines on light surfaces and on navy |
| `map-ground`, `map-zone-1` to `map-zone-5`, `map-attraction`, `map-restaurant`, `map-show`, `map-unsuitable` | Map colors (Decision 8) |

`sky` is the header's night sky. Tailwind's own `sky-*` scale is switched off, and the guard test only rejects numbered default-palette names, so the two can't be confused.

Other theme values: `--font-sans`, `--font-display`, and `--shadow-card`, a soft navy-tinted shadow (`0 1px 2px rgb(10 20 51 / .06), 0 4px 12px rgb(10 20 51 / .06)`).

*Alternatives:*
- A JavaScript Tailwind config: Tailwind 4 is configured in CSS, so this adds a second source.
- CSS-in-JS or a component library (shadcn/ui, MUI): rejected while exploring. They mean rewriting every component, a runtime cost, and swapping out native pickers that work well on phones.
- Semantic names only, with no raw layer: this works, but a later dark theme would have to repeat every value instead of remapping roles.

### 2. Palette values and their measured contrast
| Raw | Value | | Raw | Value |
|---|---|---|---|---|
| night-950 (`sky-deep`) | `#060b1f` | | silver-50 (`page`) | `#f6f8fc` |
| night-900 (`sky`) | `#0a1433` | | silver-100 (`surface-muted`, `on-sky`) | `#eceff6` |
| night-800 (`accent`) | `#111e48` | | silver-200 (`line`) | `#dde2ec` |
| night-700 (`accent-hover`) | `#1b2b5e` | | silver-300 (`line-strong`, `map-unsuitable`) | `#c9d1e0` |
| night-50 (`accent-soft`) | `#eef1fa` | | silver-400 (`on-sky-muted`) | `#a9b3c7` |
| night-ink (`ink`) | `#0e1631` | | silver-500 (`ink-faint`, `field`) | `#7a859e` |
| night-soft (`ink-soft`) | `#2c3654` | | silver-600 (`ink-muted`) | `#5c6784` |
| gold-300 (`star`) | `#f2d48b` | | gold-700 (`star-ink`) | `#a87b1f` |
| teal: `fits` / `fits-soft` / `fits-on-sky` | `#0f766e` / `#e6f6f4` / `#5eead4` | | rose: `over` / `over-soft` / `over-on-sky` | `#be123c` / `#fdecef` / `#fda4af` |
| amber: `warn` / `warn-soft` | `#92400e` / `#fef3c7` | | `focus` / `focus-on-sky` | `#3b5bdb` / gold-300 |

Contrast ratios (WCAG formula), computed while planning:

| Pair | Ratio | Needs |
|---|---|---|
| ink on surface / page | 17.8 / 16.8 | 4.5 |
| ink-muted on surface / page / surface-muted / accent-soft | 5.6 / 5.3 / 4.9 / 5.0 | 4.5 |
| ink-faint on surface / page (icons only) | 3.7 / 3.5 | 3 |
| on-accent on accent | 16.1 | 4.5 |
| on-sky / on-sky-muted on sky | 15.7 / 8.6 | 4.5 |
| star on sky / on accent | 12.6 / 11.2 | 3 |
| star-ink on surface / page / accent-soft | 3.8 / 3.6 / 3.4 | 3 |
| fits on surface / fits-soft, fits-on-sky on sky | 5.5 / 4.9, 12.2 | 4.5 |
| over on surface / over-soft, over-on-sky on sky | 6.3 / 5.5, 9.6 | 4.5 |
| warn on warn-soft | 6.4 | 4.5 |
| focus on surface / page | 5.7 / 5.3 | 3 |
| field (input border) on surface | 3.7 | 3 |
| map zone labels (#9d3a5e, #8a5a12, #1f6e64, #5a46a0, #2f639a) on map-ground `#edf1f7` | 5.8, 5.2, 5.3, 6.6, 5.5 | 4.5 |

Gold is never used for text on light surfaces. `ink-faint` is never used for text.

### 3. Fonts: Inter and Fraunces, self-hosted, Latin subsets precached
- **Packages:** `@fontsource-variable/inter` and `@fontsource-variable/fraunces`, both OFL 1.1, imported from `index.css` through their `wght.css` (weight axis only).
- **Font roles:**
  - `--font-sans`: `'Inter Variable', ui-sans-serif, system-ui, sans-serif`.
  - `--font-display`: `'Fraunces Variable', ui-serif, Georgia, serif`.
- **Where Fraunces is used:** only for the wordmark, screen headings (`h2`) and sheet titles, never for body text, controls or numbers.
- **Times:** they lose `font-mono` and use `tabular-nums` (Inter has tabular figures), so columns of times still line up.
- **Offline:** Workbox `globPatterns` gains `**/*-latin-*.woff2`, which matches both the `latin` and `latin-ext` files: about 48 KB (Inter) and 37 KB (Fraunces) for Latin, plus their latin-ext files. The Cyrillic, Greek and Vietnamese files stay out of the precache. `font-display: swap` (Fontsource's default) keeps text visible while fonts load. The French accents in item names are in these subsets.

*Alternatives:*
- Google Fonts from its CDN: breaks offline use and sends a request to a third party.
- System fonts only: gives the app no identity.
- Playfair Display: too high-contrast at small sizes.
- Cormorant: too thin on phones.
- The Fraunces `SOFT` and `WONK` axes (`full.css`, 121 KB): too much weight for a small difference.

### 4. Header sky: a static SVG with a fixed star pattern
A new `src/components/NightSky.tsx` draws an `aria-hidden`, `pointer-events-none` SVG behind the header content:
- **Background:** a vertical gradient from `sky-deep` to `sky`.
- **Stars:** 34 small stars (radius 0.4–1.2 px, opacity 0.3–0.9, `on-sky`) in a 480 × 120 px tile, repeated across the width with an SVG `<pattern>`. There are also 5 four-point sparkles (`star`, 2.5–5 px), placed by percentage of the width and height. Each sparkle is one path, `SPARKLE_PATH` in `icons.tsx`, scaled.
- **Positions:** generated once at module load by a small seeded generator (mulberry32 with a fixed seed). They are the same on every load and in every screenshot.
- **Scaling:** stars keep their pixel size at every width, because the tile repeats instead of stretching. A single `slice`-scaled viewBox would make the stars about three times larger on a 1280 px wide, 48 px tall header.
- **Twinkle:** three sparkles carry a `twinkle` class with staggered delays (Decision 6).

The same component, shorter, heads the "create a trip" card on an empty Plan. Stars never sit behind body text.

The header becomes `bg-sky` with `NightSky`, a Fraunces wordmark in `on-sky` with a small `star` sparkle before it, and About in `on-sky-muted`. The phone tabs sit on the same navy: `on-sky-muted` text, with `on-sky` and a 2 px `on-sky` underline for the selected tab. In the installed iPhone app the header extends under the status bar (Decision 9), so it gets `padding-top: env(safe-area-inset-top)`.

*Alternatives:*
- A CSS `radial-gradient` field: blurry at scale and hard to place.
- `<canvas>`: needs script to paint, and gives nothing an SVG can't.
- A bitmap image: not sharp, and heavier.

### 5. Constellation timeline: a rail beside the cards; the stop node replaces the inline badge
Each `SlotCard` `<li>` becomes a two-column grid: a 32 px rail, then the card.

- **The rail's line:** a 1.5 px `line-strong` line runs the full height of the `<li>` and extends over the gap to the next item (`-bottom-2`), so it reads as one line down the day. The first item's line starts at its node, and the last item's line ends there.
- **The stop node:** sits on the rail, level with the card's first text line. It is a 26 px `accent` circle with the number in `on-accent`, `tabular-nums`, and a 1.5 px `star` ring.
  - It keeps `data-testid="slot-stop"` and its "Stop " `sr-only` prefix.
  - The inline badge in the card goes. The card's text column gets back the 24 px the badge took.
- **Missing entries** ("No longer available") show a hollow, dashed `ink-faint` node with no number.
- **Park change and free time** stay as the `<li>`'s first rows (same test ids), drawn as small nodes on the rail:
  - A park change is a small `accent` diamond, with a dotted segment from the previous item.
  - Free time is a hollow `fits` circle with `fits` text.
- **The card:**
  - Styles: `bg-surface`, a `line` hairline, `shadow-card`, `rounded-xl`. A `line` border becomes `over` when the item ends after the window.
  - The grip handle (`slot-handle`), the move buttons and remove keep their size, accessible names and source order. Their colors change: grips `ink-faint`, remove `over`.
  - The card is a CSS grid: handle, then time, name, details, then the controls, in that source and Tab order.
    - **On phones:** the controls sit at the top right, on the time's row, and the name gets its own line below. Before, the controls took a row of their own, which made cards about 150 px tall and left the fold check only 4 px to spare (measured).
    - **From `sm` up:** time and name share one line, details sit below, and the controls are at the top right.
  - First line: time (`tabular-nums font-semibold text-ink`), then the name (`font-medium`).
  - Second line: area (`ink-soft`), walk, arrival and wait (`ink-muted`).
- **The focus highlight** (`data-highlight`) changes from `ring-amber-400` to a 2 px `star-ink` ring, and the node's ring pulses once (Decision 6).
- **While dragging,** the rail moves with its card. A gap in the line during a drag is acceptable.

*Alternatives:*
- Making the node itself the drag handle: it saves width, but would change the handle's content and accessible name, and lose the grip cue.
- A rail outside the `<ol>`, drawn once: it can't follow dnd-kit's per-item transforms.

### 6. Motion: plain CSS, enabled only when reduced motion isn't asked for
All motion rules live in `index.css` inside `@media (prefers-reduced-motion: no-preference)`. Without that, there is no animation, which meets the "Reduced motion" requirement without any script.

| What | How | Time |
|---|---|---|
| Sheet panel | `transition: translate, opacity`. `@starting-style` starts it 24 px lower and transparent on phones, and at `scale: .98` on `sm` and wider | 220 ms ease-out |
| Sheet scrim | `opacity` from 0 (`sky-deep` at 50%, no blur, which is costly on older phones) | 160 ms |
| Toast | `opacity` and `translate` from 8 px below | 180 ms |
| List/Map and Timeline/Map views | The view's wrapper is keyed by view and fades in with `@starting-style { opacity: 0 }` | 150 ms |
| Header twinkle | `@keyframes twinkle` (opacity 1 → .35 → 1). Delays 0 s, 2.3 s and 4.1 s | 6 s, repeating |
| Timeline highlight | The node ring pulses once (`scale` 1 → 1.25 → 1) | 600 ms |
| Optimize sparkle | See below | 700 ms |

Closing a sheet or toast isn't animated: React unmounts it at once, so nothing waits for an animation. Browsers without `@starting-style` (older than Safari 17.5, Chrome 117 or Firefox 129) show the final state at once.

The **sparkle** is a new `Sparkle` component. `RouteActions` renders it over the Optimize button when the result has `changed: true`:
- **What it shows:** five `star` four-point stars that scale up and fade out. The toast is shown in the same handler, so the message never waits.
- **Removal:** the sparkle is removed on `animationend`, or after 1 s as a fallback.
- **Reduced motion:** it isn't rendered at all when `useMediaQuery('(prefers-reduced-motion: reduce)')` is true, which also keeps it out of the accessibility tree and out of tests.

*Alternatives:*
- Motion (motion.dev): its layout animations fight dnd-kit's transforms, and it adds about 30 KB.
- The View Transitions API: React state updates need `flushSync` wrapping to use it, for little gain over a fade.
- Tailwind's `motion-safe:` variant on each element: it spreads the motion rules across components. A few named classes in one CSS block are easier to audit.

### 7. Plan header: trip row, trip options sheet, hours row, compact two-park note, toolbar
**Trip row** (`TripBar`): one flex row.
- **Trip select** (label "Trip", unchanged): styled as a title: `font-display text-xl`, no border, transparent background, `appearance-none`, a chevron icon, `min-w-0 flex-1 truncate`, and still 44 px tall.
- **Number of days:** the select stays, label unchanged, compact.
- **Share:** becomes an `IconButton` with the label "Share", so `getByRole('button', { name: 'Share' })` still finds it.
- **Trip options:** a new `IconButton` with the label "Trip options" and a new `MoreIcon`. It opens a `Sheet` titled "Trip options" with three full-width, 44 px buttons:
  - **New trip:** closes this sheet and opens the existing "New trip" sheet.
  - **Rename:** closes, then runs the current `window.prompt` flow.
  - **Delete:** `over` text; closes, then runs the current `window.confirm` flow.
- The `Sheet` gives Escape, scrim tap and the Close button for free, is a bottom sheet under the thumb on phones, and is already accessible.

*Alternative:* a dropdown using the `popover` attribute and CSS anchor positioning. Rejected: anchor positioning isn't in every browser this app supports yet, and a hand-made menu needs its own focus and keyboard handling.

**Hours row** (`DaySettings`, renamed `DayHours`):
- `<div role="group" aria-label="Day hours">` holding a `ClockIcon`, the visible word "Hours" (shown from 400 px wide), then two time inputs separated by an en dash.
- Each input sits in a `<label>` whose text is an `sr-only` "Start" or "End", so `getByLabel('Start')` and `getByLabel('End')` work unchanged.
- The inputs keep 16 px text (smaller text makes iOS zoom in), use a `field` border, `rounded-lg` and `min-h-11`, and are sized to their content.
- At 360 px: icon 20 + inputs 2 × 120 + dash 16 + gaps 24 = 300 px, which fits the 328 px content width.

**Two-park note** (`TicketReminder` and `ParkOrder`):
- Still `role="note"` with `data-testid="ticket-reminder"`, now `bg-accent-soft rounded-xl px-3 py-2 text-sm`.
- **First line:** a `TicketIcon`, then "You need a ticket valid for Disneyland Park and Disney Adventure World on the same day." The existing test's regex still matches. "This day uses both parks:" goes, because the park order directly below says it.
- **`ParkOrder`:** becomes `grid grid-cols-[1fr_auto] items-center gap-x-3`. The park order text (`park-order-text`, full park names, may wrap to two lines) sits beside "Switch order". The hint (`park-order-hint`) spans both columns. The warning sheet doesn't change.

**Toolbar:**
- `PlanScreen` puts the Timeline | Map switch and, in timeline view, `RouteActions` in one `flex flex-wrap items-center justify-between gap-2` row.
- Below about 430 px the two route buttons wrap onto a second line, keeping their full labels and accessible names.

*Alternative:* short visible labels ("Group", "Optimize") with `aria-label`s. Rejected: the visible text and accessible name would differ, and the busy label "Optimizing…" would need the same treatment.

**Fold budget** at 390 × 844 for a two-park day with six items, measured in Chromium after implementation. The spec's check is that the first two items are visible:

| Block | Top–bottom (px) |
|---|---|
| Header: wordmark row + tabs | 0–92 |
| Trip row | 104–148 |
| Day tabs | 156–204 |
| Hours row | 212–256 |
| Two-park note (2 lines of text, then the park order beside "Switch order") | 264–370 |
| Toolbar: view switch, then the route buttons on a second row | 378–476 |
| Timeline item 1 (128 px) | 488–616 |
| Timeline item 2 (128 px) | 616–744 |
| Fit bar | 796–844 |

That leaves about 50 px of slack. The Plan's blocks are 8 px apart. The e2e check (Task 6.5) measures the real layout on every run.

**Selected day tab:** `bg-accent text-on-accent` with a small `star` sparkle before "Day N". Other tabs use `bg-surface border-line`.

### 8. Maps take their colors from the theme through `fill-*` and `stroke-*` classes
`ParkMap.tsx` and `PlanMap.tsx` stop using hex values. A small `MAP_CLASSES` constant in `ParkMap.tsx` lists complete class strings, so Tailwind's scanner sees them:
- **Zones:** `ZONE_FILL = ['fill-map-zone-1 stroke-map-zone-1', …]`, plus `ZONE_LABEL`.
- **Markers:** `TYPE_FILL`, `TYPE_STROKE`.
- **Route:** `ROUTE = 'stroke-accent'`.

Values:
- **Ground:** `map-ground` `#edf1f7`, a cool mist.
- **Zones** use the label colors from Decision 2, drawn at 16% opacity. Labels use the same color at full opacity, so they pass 4.5:1.
- **Markers:** attraction `#0a1433`, restaurant `#a8551a` (copper), show `#a2306b` (plum), unsuitable `silver-300` (deliberately faint, being an inactive state).
- **Route and stops:** route lines `accent`. Stop badges `accent` with `on-accent` text and a `star` ring, like the timeline nodes.
- **Other:** the emphasis ring uses `star-ink`, and the entrance uses `ink-muted`.
- The map card, legend and zoom buttons use the shared roles.

Classes are used rather than `fill="var(--…)"`. Chromium accepts `var()` in SVG attributes (checked while planning), but WebKit and Gecko support couldn't be checked here, and classes are plain CSS everywhere. jsdom map tests don't assert colors.

### 9. Icon, installed-app colors and native controls
- **Icon:** `public/icon.svg` and `public/favicon.svg` get the new mark:
  - a rounded navy square (a gradient from `#060b1f` to `#111e48`);
  - a silver (`#dde2ec`) calendar outline;
  - a gold (`#f2d48b`) four-point star in its middle;
  - two tiny silver stars in the top corners.
- **Icon PNGs:** `scripts/make-icons.ts` renders on `#0a1433` instead of `#3730a3`, and is run to regenerate the four PNGs, keeping the maskable safe-zone padding.
- **Installed colors:**
  - The manifest and `<meta name="theme-color">` use `#0a1433`.
  - The manifest's `background_color` becomes `#0a1433` too, so the launch screen is navy and runs straight into the navy header.
  - `index.html` adds `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, so on an iPhone home-screen app the navy header shows under the status bar (with the safe-area padding from Decision 4).
- **Native controls:** `:root { color-scheme: light; }` and `<meta name="color-scheme" content="light">` keep native pickers, selects and scrollbars light. They match the light content, and the browser won't darken them on its own.

### 10. The rest of the UI, by component
Most of the work is swapping names, following this table:

| Today | Becomes |
|---|---|
| `bg-slate-50` page, `bg-white` cards | `bg-page`, `bg-surface` |
| `border-slate-200` / `-300` | `border-line` / `border-line-strong` (inputs: `border-field`) |
| `text-slate-900` / `-800`, `-700` | `text-ink`, `text-ink-soft` |
| `text-slate-600` / `-500` | `text-ink-muted` |
| `text-slate-400` (icons) | `text-ink-faint` |
| `bg-indigo-700` primary or selected, `text-indigo-*` links | `bg-accent text-on-accent`, `text-accent underline` |
| `bg-indigo-50`, the drop zone `bg-indigo-50 ring-indigo-300` | `bg-accent-soft`, `bg-accent-soft ring-accent/30` |
| `emerald-*` for planned rows and badges | `accent-soft` row tint with a 4 px `accent` inset bar, and an `accent` badge with `on-accent` text and the check icon |
| `emerald-*` for fits, free time and suggestions | `fits`, `fits-soft` |
| `red-*` | `over`, `over-soft` |
| `amber-*` warnings and banners | `warn`, `warn-soft` |
| `text-amber-500` stars | `text-star-ink`. Empty stars become `text-line-strong`, which is decorative because the rating is in the `aria-label` |
| Focus `outline-indigo-600` | `outline-focus`, and `outline-focus-on-sky` in the header |

Component notes:
- **`ui.tsx`:**
  - `Badge` tones become `neutral`, `warn`, `over`, `fits` and `planned`, replacing the old color names.
  - `Button` primary uses `accent` and `accent-hover`; secondary uses `surface` and `line-strong`; danger uses `over`.
  - `Sheet` gets the motion classes, a `font-display` title and a `sky-deep/50` scrim.
- **`FitBar`:**
  - `bg-sky`. The status word ("Fits · 6 h 59 min spare" or "Over by N min") is in `fits-on-sky` or `over-on-sky`, with a small `star` sparkle when it fits.
  - The window and end time are in `on-sky-muted`.
  - On wide screens it keeps its sticky, rounded form.
- **`Toast`:** `bg-sky text-on-sky`, with the action in `star`. It moves to sit above the fit bar at every width: `bottom-24` everywhere, plus the safe-area inset.
- **`StorageBanner`** uses `warn-soft`/`warn`. **`UpdatePrompt`** uses `accent-soft`/`ink` with a primary button.
- **Catalog:**
  - The sticky search bar background becomes `bg-page`.
  - The row name `<span>` gains `data-testid="row-name"`.
  - Unsuitable rows get `bg-surface-muted` with `ink-muted` names.
- **About and Import:** `font-display` headings. The unofficial note uses `warn-soft`.
- **Empty Plan:** a short `NightSky` band headed "Plan your days" (Fraunces, `on-sky`) above the existing form.

### 11. Tests that guard the theme
- **`src/theme/contrast.test.ts`:** reads `src/index.css` and resolves each role's `var(--raw)` to its hex value. It checks every pair in Decision 2's table against its threshold with the WCAG formula, so a palette change that breaks contrast fails `npm test`.
- **`src/theme/guard.test.ts`:** scans `src/**/*.tsx` (tests excluded) and fails on:
  - a numbered default-palette class: a regex over the `bg`, `text`, `border`, `ring`, `fill`, `stroke`, `outline`, `from`, `to`, `via`, `divide`, `shadow`, `decoration` and `placeholder` prefixes and every Tailwind palette name, followed by `-\d{2,3}`;
  - a hex color literal.
  Each failure names the file and line.
- **Existing tests:**
  - `catalog.test.tsx` lines 176 and 214 check `data-planned` instead of `className`.
  - `e2e/catalog.phone.spec.ts` uses `getByTestId('row-name')` instead of `span.block.font-medium`.
- **New e2e checks** (Task 7):
  - The fold check at 390 × 844.
  - The trip options flow.
  - Reduced motion: `test.use({ reducedMotion: 'reduce' })`, and no running animations on the header or an opened sheet.
  - Motion on: the twinkle runs and the sheet's transition lasts 300 ms or less.
  - 8.2 extended: after the offline reload, `document.fonts.check` is true for both fonts, and the manifest has `theme_color: '#0a1433'`.
  - 8.1 at 360 × 740 also covers the new trip row, hours row and trip options sheet.

## Risks / Trade-offs

- [Every component changes, so a missed class silently loses its color] → The default palette is off, so a missed class has no CSS at all. The guard test names every leftover, and the screenshot review (Task 8) covers each screen.
- [jsdom doesn't load CSS, so component tests can't see visual problems] → Contrast is tested on the actual theme values. The e2e checks and screenshots run in Chromium.
- [The fonts add about 200 KB (Inter and Fraunces, Latin and Latin Extended) to the precache, and the text style shifts briefly on the first visit] → Only the Latin subsets are cached. `swap` keeps text readable, and later visits load from the cache.
- [The fold budget is tight: a longer park order, larger system text or a new note above the timeline could push item 2 below the fit bar] → The e2e check measures the real layout at 390 × 844, so a regression fails CI. There is about 50 px of slack, measured; the compact card layout (Decision 5) is what makes room for it.
- [Phones narrower than 360 px, or with very large text, won't show two items without scrolling] → The spec's check is 390 × 844. The existing 360 px no-overflow and 44 px checks still hold.
- [Starting animations with `@starting-style` doesn't work in older browsers] → They show the final state at once, which is also the reduced-motion behavior.
- [A sheet for three trip actions is heavier on desktop than a dropdown] → It's a rare action, accessible and consistent with the rest of the app. A popover can replace it once anchor positioning is everywhere.
- [Navy and gold could read as Disney branding] → Only colors and generic stars are used: no logos, castle, characters or Disney typefaces, and the About page's unofficial statement stays. The "The app's own mark" requirement makes this checkable.
- [`black-translucent` puts content under the iPhone status bar] → The header gets `env(safe-area-inset-top)` padding, and only the navy sky sits there.

## Migration Plan

- No data migration: saved trips, share links and the store don't change.
- Ship as one release. The service worker's update prompt delivers the new CSS, fonts and icons, so installed phones see the new theme after "Update", or on the next start.
- Home-screen icons on already-installed phones may keep the old image until the operating system refreshes the manifest. That's acceptable.
- Rollback: revert the change's commits. There is no state to undo.
