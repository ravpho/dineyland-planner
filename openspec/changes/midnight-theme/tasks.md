# Tasks

## 1. Theme foundation

- [x] 1.1 Add `@fontsource-variable/inter` and `@fontsource-variable/fraunces` as dependencies, import their `wght.css` from `src/index.css`, and add `**/*-latin-*.woff2` to Workbox `globPatterns` in `vite.config.ts` (design Decision 3). Verify:
  - `npm run build` succeeds;
  - `dist/sw.js` precaches the Inter and Fraunces `latin` and `latin-ext` `.woff2` files, and no `cyrillic`, `greek` or `vietnamese` ones.
- [x] 1.2 Write the theme in `src/index.css` (design Decisions 1 and 2):
  - the raw palette as custom properties on `:root`;
  - `@theme`, starting with `--color-*: initial`, then `white` and `black`, every role from Decision 1 with its Decision 2 value, and the map roles from Decision 8;
  - `--font-sans`, `--font-display` and `--shadow-card`;
  - `:root { color-scheme: light; }`, and a base `body` style using `bg-page text-ink font-sans`.

  Verify `npm run build` succeeds, and that the built CSS defines `--color-ink` and `--color-accent` and no `--color-slate-` or `--color-indigo-` variables.
- [x] 1.3 Add `src/theme/contrast.test.ts`. It reads `src/index.css`, resolves each role to its hex value, and checks every pair in design Decision 2's contrast table against its threshold with the WCAG formula (Decision 11). Verify:
  - `npm test` passes;
  - temporarily pointing `ink-muted` at silver-500 makes the test fail and name the pair. Revert afterwards.
- [x] 1.4 Add `src/theme/guard.test.ts` (Decision 11). It scans `src/**/*.tsx` (test files excluded) for numbered default-palette classes and hex color literals. For now it has an allowlist of the component and screen files that still use them; later groups remove their files from it. Verify:
  - `npm test` passes;
  - taking one file off the allowlist makes the test fail and list that file's offending lines.
- [x] 1.5 Add a row to the README's project layout: `src/index.css`, the theme (colors, fonts, motion), and `src/theme/`, its tests. Verify the table renders correctly.

## 2. Shared pieces and the app frame

- [x] 2.1 Restyle `src/components/ui.tsx` with theme roles (design Decision 10):
  - `Button` variants, `IconButton`, `Chip`;
  - `Badge` tones renamed to `neutral`, `warn`, `over`, `fits` and `planned`, with every caller updated;
  - `Stars`: `star-ink` filled, `line-strong` empty;
  - `Sheet`: `surface`, a `font-display` title, a `sky-deep/50` scrim;
  - `Field`, and `inputClass` with a `border-field` border and a `focus` outline.

  Take `ui.tsx` off the guard allowlist. Verify `npm run typecheck`, the guard test and all component tests pass.
- [x] 2.2 Add `src/components/NightSky.tsx` (design Decision 4): a seeded, fixed star field and five sparkles, three of them with the `twinkle` class, `aria-hidden`. Rebuild the header in `App.tsx`:
  - `bg-sky` with `NightSky`;
  - the Fraunces wordmark with a `star` sparkle, and About in `on-sky-muted`;
  - the phone tabs on navy with an `on-sky` underline on the selected tab;
  - `padding-top: env(safe-area-inset-top)`.

  Take `App.tsx` off the allowlist. Verify:
  - a `NightSky` unit test: two renders give the same star positions, and the SVG is `aria-hidden`;
  - `App.test.tsx` and the guard test pass;
  - the tabs keep `role="tab"` and `aria-selected`.
- [x] 2.3 Restyle the rest of the frame:
  - `FitBar`: `bg-sky`, with the status words in `fits-on-sky` or `over-on-sky`, a `star` sparkle when the day fits, and the times in `on-sky-muted`;
  - `Breakdown`;
  - `Toast`: `bg-sky`, the action in `star`, `bottom-24` plus the safe-area inset at every width;
  - `StorageBanner` and `UpdatePrompt` (design Decision 10).

  Take `FitSummary.tsx`, `Toast.tsx` and `UpdatePrompt.tsx` off the allowlist. Verify:
  - the guard test passes;
  - the timeline and plan tests that read "Fits" and "Over by N min" pass unchanged;
  - a new check in `e2e/plan.desktop.spec.ts`: after adding an item at 1280 × 800, the toast's box doesn't overlap the `fit-summary` box.

## 3. Catalog, details and other screens

- [ ] 3.1 Restyle `CatalogList.tsx` and `PlannedLabel.tsx` (design Decision 10):
  - the sticky bar on `bg-page`;
  - rows on `surface`;
  - planned rows: `accent-soft` with an `accent` inset bar and the `planned` badge;
  - unsuitable rows: `surface-muted` with `ink-muted` names;
  - the List/Map switch, the drag handle and the add button;
  - `data-testid="row-name"` on the name.

  Update `catalog.test.tsx` lines 176 and 214 to check `data-planned`, and `e2e/catalog.phone.spec.ts` to use `getByTestId('row-name')`. Take both files off the allowlist. Verify `catalog.test.tsx`, `npm run e2e -- catalog` and the guard test pass.
- [ ] 3.2 Move `ItemDetail`, `FilterPanel`, `ProfileEditor`, `MealTimePicker`, `ShowTimePicker`, `ShareSheet` and `CreateTripForm` to theme roles, with links in `accent` and underlined. Take them off the allowlist. Verify the guard test and all component tests (`catalog`, `meals`, `plan`) pass.
- [ ] 3.3 Restyle `AboutScreen` and `ImportScreen`: `font-display` headings, `accent` links, and the unofficial note in `warn-soft`. Take them off the allowlist. Verify `about.test.tsx` and the guard test pass, and the About page still shows the Queue-Times link and the unofficial statement.

## 4. Constellation timeline

- [ ] 4.1 Turn each `SlotCard` `<li>` into the rail and card grid (design Decision 5):
  - the rail line, extended over the gap to the next item;
  - the stop node: 26 px `accent`, `on-accent` number, `star` ring, still `data-testid="slot-stop"` with its "Stop " `sr-only` prefix;
  - a hollow, dashed node with no number for missing entries;
  - the inline badge removed;
  - the time in `tabular-nums` instead of `font-mono`.

  Verify:
  - `timeline.test.tsx` "Numbers in plan order", "Entry no longer available" and "Reorder" pass unchanged;
  - a new test: a missing entry's rail node has no number;
  - `npm run e2e -- plan` passes, since drag still uses `slot-handle`.
- [ ] 4.2 Finish the timeline (design Decisions 5 and 10):
  - park change and free time drawn as rail nodes (same test ids);
  - the card in `surface` with a `line` hairline and `shadow-card`, with an `over` border when it ends after the window;
  - badges, the show and meal pickers, the lock button, and the restaurant suggestions (`fits-soft`);
  - move and remove colors;
  - the `star-ink` highlight ring, and the `accent-soft` drop zone.

  Take `DayTimeline.tsx` off the allowlist. Verify `timeline.test.tsx`, `meals.test.tsx`, `planMap.test.tsx` ("Show in timeline") and the guard test pass.

## 5. Maps

- [ ] 5.1 Replace `ParkMap.tsx`'s hex constants with `MAP_CLASSES` (complete `fill-*` and `stroke-*` class strings) using the map roles (design Decision 8):
  - the mist ground;
  - zones at 16% opacity, with labels at full opacity;
  - marker colors by type, and `map-unsuitable`;
  - the route in `stroke-accent`;
  - stop badges in `accent` with a `star` ring;
  - the emphasis ring in `star-ink`, and the entrance in `ink-muted`.

  Restyle the map card, legend, zoom buttons, park switch and area walking table. Take `ParkMap.tsx` off the allowlist. Verify:
  - `map.test.tsx` passes unchanged;
  - the guard test passes, with no hex literals left;
  - `npm run e2e -- map` passes at phone and desktop sizes.
- [ ] 5.2 Restyle `PlanMap.tsx`: the stop card, its times in `tabular-nums`, and the park switch with its "stops 1–4" text. Take it off the allowlist. Verify `planMap.test.tsx` and the guard test pass.

## 6. Plan header

- [ ] 6.1 Rebuild `TripBar` as the trip row (design Decision 7):
  - the trip select styled as a title (label "Trip"), and the number-of-days select;
  - Share as an `IconButton` labelled "Share";
  - a "Trip options" `IconButton` with a new `MoreIcon`, opening a "Trip options" `Sheet` with New trip, Rename and Delete. Each closes the sheet first, then runs the current flow.

  Verify new component tests:
  - "Open the menu": it offers New trip, Rename and Delete.
  - "Share in one tap": the share sheet opens.
  - "Delete from the menu": the sheet closes and `window.confirm` is asked; the trip is deleted only when confirmed.
  - "Close without choosing": the trips are unchanged.
- [ ] 6.2 Replace `DaySettings` with `DayHours` (design Decision 7):
  - `role="group"` with the label "Day hours";
  - a `ClockIcon`, and the word "Hours" from 400 px wide;
  - two time inputs whose `<label>` text is an `sr-only` "Start" and "End";
  - 16 px text with a `field` border.

  Verify:
  - a component test for "Change the hours in place": setting Start to 10:00 sets the day's window, with no other screen opened;
  - the e2e `getByLabel('Start')` and `getByLabel('End')` fills in `plan.phone` and `journey.phone` pass unchanged.
- [ ] 6.3 Make the two-park note compact (design Decision 7):
  - `bg-accent-soft` with a `TicketIcon`;
  - the text "You need a ticket valid for Disneyland Park and Disney Adventure World on the same day.";
  - `ParkOrder` as a two-column grid, with the order text beside "Switch order" and the hint spanning both columns.

  Verify:
  - `timeline.test.tsx`'s reminder regex and every park-order and switch test pass unchanged;
  - a new "Two-park reminder kept" test: the note shows the ticket text, the park order and a "Switch order" button.
- [ ] 6.4 In `PlanScreen`:
  - put the Timeline | Map switch and `RouteActions` in one wrapping toolbar row;
  - style the day tabs, with the selected one in `accent` and a `star` sparkle;
  - give the empty Plan a short `NightSky` band headed "Plan your days" above the form.

  Take `PlanScreen.tsx`, `TripBar.tsx`, `DayHours.tsx`, `ParkOrder.tsx` and `RouteActions.tsx` off the allowlist. Verify `plan.test.tsx` and the guard test pass.
- [ ] 6.5 Add e2e checks:
  - **"Open a two-park day"** in `e2e/plan.phone.spec.ts`, at 390 × 844: a day with six items from both parks, at scroll position 0. The second `timeline-slot`'s bottom edge is at or above the top of `fit-summary`.
  - **Trip options:** Rename (answering the prompt) and Delete (accepting the confirm), both started from the trip options sheet.
  - **Shell 8.1:** in `e2e/shell.phone.spec.ts`, also open the trip options sheet and run `checkLayout` at 360 × 740.

  Verify `npm run e2e` passes.

## 7. Motion

- [ ] 7.1 Add the motion block to `src/index.css` inside `@media (prefers-reduced-motion: no-preference)` (design Decision 6), and apply its classes:
  - the sheet panel and scrim entries with `@starting-style`;
  - the toast entry;
  - a keyed view wrapper that fades in, for List/Map and Timeline/Map;
  - the `twinkle` keyframes on `NightSky`;
  - the highlight pulse on the timeline node.

  Verify a new `e2e/motion.phone.spec.ts`:
  - with motion allowed, the `.twinkle` sparkles have running animations, and the filters sheet panel's transition lasts 0.3 s or less;
  - with `reducedMotion: 'reduce'`, after opening the filters, `document.getAnimations()` is empty and the sheet is in its final place at once.
- [ ] 7.2 Add the `Sparkle` component and show it from `RouteActions` when optimizing changed the day. It isn't rendered when `useMediaQuery('(prefers-reduced-motion: reduce)')` is true, and it is removed on `animationend` or after 1 s (design Decision 6). Verify component tests in `plan.test.tsx`:
  - "Sparkle after optimizing": the sparkle and the result toast appear in the same update.
  - "No sparkle with reduced motion": no sparkle, and the toast still shows.
  - With fake timers, the sparkle is gone after 1 s.
- [ ] 7.3 Add to the README feature list: "A night-sky look: navy, silver and gold stars, readable in sunlight, with animations turned off when your phone asks for reduced motion." Verify the README reads correctly.

## 8. App icon and installed look

- [ ] 8.1 Draw the new `public/icon.svg` and `public/favicon.svg` (design Decision 9): a navy rounded square, a silver calendar, a gold four-point star and two tiny silver stars. Change `scripts/make-icons.ts`'s background to `#0a1433` and regenerate the PNGs with `npx tsx scripts/make-icons.ts`. Verify:
  - the four PNGs are rewritten and show the new mark;
  - the maskable icon keeps its safe-zone padding;
  - the favicon shows in the browser tab of `npm run preview`.
- [ ] 8.2 Set the manifest's `theme_color` and `background_color` to `#0a1433`. In `index.html`, set `theme-color` to `#0a1433` and add `<meta name="color-scheme" content="light">` and `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`. Extend shell test 8.2 to check:
  - the manifest has `theme_color: '#0a1433'` and `background_color: '#0a1433'`, and the `theme-color` meta tag matches;
  - after the offline reload, `document.fonts.check('16px "Inter Variable"')` and `document.fonts.check('16px "Fraunces Variable"')` are true;
  - `installabilityErrors` is still empty.

  Verify `npm run e2e -- shell` passes.

## 9. Integration checks

- [ ] 9.1 Remove the guard test's allowlist, which should be empty by now, and run `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e` (phone and desktop projects). Verify all pass.
- [ ] 9.2 Take screenshots at 360 × 740, 390 × 844 and 1280 × 800 of:
  - the catalog list and the catalog map;
  - the Plan timeline (a two-park day) and the Plan map;
  - the item details, filters, trip options and share sheets;
  - the About page and the empty Plan.

  Review them against design Decisions 4–10. Verify:
  - no element is left without its theme colors;
  - stars appear only in the header and the empty Plan band;
  - gold appears only on stars, stop rings and highlights;
  - the screenshots are attached to the pull request.
- [ ] 9.3 Run `openspec validate midnight-theme --strict` and verify it reports the change as valid.
