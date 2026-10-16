import { expect, test } from '@playwright/test'
import { acceptDialogs, addFromCatalog, createTrip, openStop, removeStop, setHours, setTripDays, showTab, slotNames, touchDrag } from './helpers'

test.beforeEach(({ page }) => acceptDialogs(page))

test('7.1 a 3-day trip has the right dates, and its length can change', async ({ page }) => {
  await createTrip(page, { name: 'Summer trip', date: '2026-08-12', days: 3 })
  const tabs = page.getByRole('tablist', { name: 'Days' }).getByRole('tab')
  await expect(tabs).toHaveText([/Day 1 · Wed,? 12 Aug/, /Day 2 · Thu,? 13 Aug/, /Day 3 · Fri,? 14 Aug/])
  await setTripDays(page, 2)
  await expect(tabs).toHaveCount(2)
  await expect(page.getByLabel('Park', { exact: true })).toHaveCount(0) // days are not tied to a park
  await addFromCatalog(page, 'Frozen Ever After')
  await addFromCatalog(page, 'Big Thunder Mountain')
  await showTab(page, 'My day')
  await expect(tabs.first()).toContainText('DLP + DAW')
})

test('7.2 add from both parks, remove with undo, move up', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, 'Phantom Manor')
  await addFromCatalog(page, "Peter Pan's Flight")

  // an item from the other park joins the same day
  await addFromCatalog(page, 'Frozen Ever After')
  await showTab(page, 'My day')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight", 'Frozen Ever After'])
  await removeStop(page, 'Frozen Ever After')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"])

  await removeStop(page, 'Phantom Manor')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight"])
  await page.getByRole('status').filter({ hasText: 'Removed Phantom Manor' }).getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"])

  // The stepper keeps the sheet open on the stop it moved.
  const sheet = await openStop(page, "Peter Pan's Flight")
  await sheet.getByRole('button', { name: "Move Peter Pan's Flight up" }).click()
  await expect(sheet.getByTestId('stop-stepper')).toContainText('Stop 2 of 3')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
  await sheet.getByRole('button', { name: 'Close' }).click()

  // Move to top and Move to bottom close it.
  await (await openStop(page, 'Phantom Manor')).getByRole('button', { name: 'Move to top' }).click()
  expect(await slotNames(page)).toEqual(['Phantom Manor', 'Big Thunder Mountain', "Peter Pan's Flight"])
  await expect(page.getByRole('status').filter({ hasText: 'Moved Phantom Manor to stop 1' })).toBeVisible()
  await (await openStop(page, 'Phantom Manor')).getByRole('button', { name: 'Move to bottom' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
})

test('7.3 reorder by touch drag on a phone: the drag starts on the grip at once, with no long press', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  const handles = page.getByTestId('slot-handle')
  // Scroll the items clear of the bottom bar.
  await handles.nth(1).evaluate((el) => el.scrollIntoView({ block: 'center' }))
  expect(await handles.first().evaluate((el) => getComputedStyle(el).touchAction)).toBe('none')
  await touchDrag(page, handles.nth(2), handles.nth(1), { holdMs: 0 })
  await expect.poll(() => slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
})

test('a swipe on the row itself scrolls the day and moves nothing', async ({ page }) => {
  await createTrip(page)
  for (let i = 0; i < 8; i++) await addFromCatalog(page, i % 2 ? 'Phantom Manor' : "Peter Pan's Flight")
  await showTab(page, 'My day')
  const before = await slotNames(page)
  const name = page.getByTestId('slot-name').nth(2)
  await name.scrollIntoViewIfNeeded()
  const scrolled = await page.evaluate(() => window.scrollY)
  const box = (await name.boundingBox())!
  await touchDrag(page, name, { x: box.x + box.width / 2, y: box.y - 250 })
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled + 100)
  expect(await slotNames(page)).toEqual(before)
  await expect(page.getByTestId('drag-overlay')).toHaveCount(0)
})

test('drag the first stop to the fourth place, then Undo (trip-itinerary spec: Reorder and remove items)', async ({ page }) => {
  await createTrip(page)
  const names = ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight", 'Autopia']
  for (const n of names) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  const handles = page.getByTestId('slot-handle')
  await handles.nth(0).evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await touchDrag(page, handles.nth(0), handles.nth(3), { offsetY: 12 })
  await expect.poll(() => slotNames(page)).toEqual(['Phantom Manor', "Peter Pan's Flight", 'Autopia', 'Big Thunder Mountain'])
  await page.getByRole('status').filter({ hasText: 'Moved Big Thunder Mountain to stop 4' }).getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(names)
})

test('drag into the part of the day below the screen: the day scrolls under the finger', async ({ page }) => {
  await createTrip(page)
  const names = [
    'Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight", 'Autopia', 'Pirates of the Caribbean',
    "Alice's Curious Labyrinth", 'Dumbo the Flying Elephant', 'Buzz Lightyear Laser Blast', 'Star Wars Hyperspace Mountain', 'Adventure Isle',
  ]
  await setHours(page, { end: '23:00' })
  for (const n of names) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  expect(await slotNames(page)).toEqual(names)
  const handles = page.getByTestId('slot-handle')
  await handles.nth(0).scrollIntoViewIfNeeded()
  const dockTop = (await page.getByTestId('dock').boundingBox())!.y
  // The first stop that starts below the screen, above the bottom bar.
  const tops = await page.getByTestId('timeline-slot').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  const firstHidden = tops.findIndex((top) => top > dockTop)
  expect(firstHidden).toBeGreaterThan(0)

  const box = (await handles.nth(0).boundingBox())!
  await touchDrag(page, handles.nth(0), { x: box.x + box.width / 2, y: dockTop - 12 }, { dwellMs: 1500 })
  await expect.poll(async () => (await slotNames(page)).indexOf('Big Thunder Mountain')).toBeGreaterThanOrEqual(firstHidden)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
})

test('7.5 summary turns from Over by to Fits, and stays visible while scrolling', async ({ page }) => {
  await createTrip(page)
  await showTab(page, 'My day')
  await setHours(page, { start: '10:00', end: '11:00' })
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, "Walt's – An American Restaurant", 'Any time')
  await showTab(page, 'My day')
  const summary = page.getByTestId('fit-summary')
  await expect(summary).toContainText('Over by')
  await removeStop(page, "Walt's – An American Restaurant")
  await expect(summary).toContainText('Fits')

  await setHours(page, { end: '23:00' })
  for (let i = 0; i < 14; i++) await addFromCatalog(page, i % 2 ? 'Phantom Manor' : "Peter Pan's Flight")
  await showTab(page, 'My day')
  await expect(page.getByTestId('timeline-slot')).toHaveCount(15)
  await page.mouse.wheel(0, 4000)
  await page.waitForTimeout(200)
  await expect(summary).toBeInViewport()
  await page.getByTestId('timeline-slot').nth(8).scrollIntoViewIfNeeded()
  await expect(summary).toBeInViewport()
})

test('7.6 share link imports an identical copy in a fresh browser', async ({ page, browser }) => {
  await createTrip(page, { name: 'Shared trip', days: 2 })
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, 'Disney Stars on Parade', '11:30')
  await showTab(page, 'My day')
  await page.getByRole('tab', { name: /^Day 2/ }).click()
  await addFromCatalog(page, 'Frozen Ever After')
  await showTab(page, 'My day')
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByLabel('Share link').inputValue()
  expect(url).toMatch(/#\/import\//)

  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const other = await fresh.newPage()
  await other.goto(url)
  await expect(other.getByText(/Import Shared trip with 2 days and 3 planned items/)).toBeVisible()
  await other.getByRole('button', { name: 'Import trip' }).click()
  await expect(other.getByLabel('Trip', { exact: true })).toHaveValue(/.+/)
  await expect(other.getByLabel('Trip', { exact: true }).locator('option:checked')).toHaveText('Shared trip')
  expect(await slotNames(other)).toEqual(['Big Thunder Mountain', 'Disney Stars on Parade'])
  const show = await openStop(other, 'Disney Stars on Parade')
  await expect(show.getByLabel('Start time for Disney Stars on Parade')).toHaveValue('11:30')
  await show.getByRole('button', { name: 'Close' }).click()
  await other.getByRole('tab', { name: /^Day 2/ }).click()
  expect(await slotNames(other)).toEqual(['Frozen Ever After'])

  await other.goto(url.slice(0, url.length - 20))
  await expect(other.getByRole('alert')).toContainText('cannot be read')
  await fresh.close()
})

test('park-hopping day: two park changes, ticket reminder, and a share round trip', async ({ page, browser }) => {
  await createTrip(page, { name: 'Hopper day' })
  for (const n of ['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor']) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor'])
  const changes = page.getByTestId('park-change')
  await expect(changes).toHaveCount(2)
  await expect(changes.nth(0)).toContainText('Walk to Disney Adventure World · park change')
  await expect(changes.nth(1)).toContainText('Walk to Disneyland Park · park change')
  await expect(page.getByTestId('ticket-reminder')).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Day 1/ })).toContainText('DLP + DAW')

  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByLabel('Share link').inputValue()
  const other = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await other.goto(url)
  await other.getByRole('button', { name: 'Import trip' }).click()
  expect(await slotNames(other)).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor'])
  await expect(other.getByTestId('park-change')).toHaveCount(2)
})


test('group by area: one park change, areas shown, and undo', async ({ page }) => {
  await createTrip(page, { name: 'Zig-zag day' })
  for (const n of ['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"]) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  await expect(page.getByTestId('park-change')).toHaveCount(3)

  await page.getByRole('button', { name: 'Group by area' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Crush's Coaster", 'Frozen Ever After'])
  expect(await page.getByTestId('slot-area').allTextContents()).toEqual(['Frontierland', 'Frontierland', 'Worlds of Pixar', 'World of Frozen'])
  await expect(page.getByTestId('park-change')).toHaveCount(1)
  await expect(page.getByRole('status').filter({ hasText: 'Grouped by area' })).toHaveText(/Grouped by area · walking 95 → 48 min/)

  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"])
  await expect(page.getByTestId('park-change')).toHaveCount(3)
})

test('optimize route: the other park first, one park change, the message and undo', async ({ page }) => {
  await createTrip(page, { name: 'Queue day' })
  for (const n of ['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"]) await addFromCatalog(page, n)
  await showTab(page, 'My day')

  // Both route buttons fit on a phone without horizontal page scroll.
  for (const name of ['Group by area', 'Optimize route']) {
    const box = (await page.getByRole('button', { name }).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByRole('button', { name: 'Optimize route' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Route optimized' })).toHaveText(/Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min/)
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Frozen Ever After', 'Phantom Manor', 'Big Thunder Mountain'])
  await expect(page.getByTestId('park-change')).toHaveCount(1)

  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"])
  await expect(page.getByTestId('park-change')).toHaveCount(3)
})

test('meal time and restaurant suggestion: lunch at 12:00 in the other park, swap and undo', async ({ page }) => {
  await createTrip(page, { name: 'Lunch day' })
  for (const n of ["Crush's Coaster", 'Frozen Ever After', 'The Twilight Zone Tower of Terror']) await addFromCatalog(page, n)
  await addFromCatalog(page, 'Au Chalet de la Marionnette', '12:00')
  await addFromCatalog(page, 'Spider-Man W.E.B. Adventure')
  await showTab(page, 'My day')

  const lunchRow = page.getByTestId('timeline-slot').filter({ hasText: 'Au Chalet de la Marionnette' })
  await expect(lunchRow).toContainText('Lunch 12:00')
  await expect(lunchRow).toContainText('3 quicker options')
  const sheet = await openStop(page, 'Au Chalet de la Marionnette')
  await expect(sheet.getByLabel('Meal time for Au Chalet de la Marionnette')).toHaveValue('12:00')
  const suggestions = sheet.getByTestId('restaurant-suggestions').getByRole('button')
  await expect(suggestions).toHaveCount(3)
  const names = (await suggestions.allTextContents()).map((t) => t.split(' · ')[0])
  expect(names).toEqual(['Stark Factory', 'The Hollywood Gardens Restaurant', 'Café Luminosity'])

  // The sheet follows the stop, now Stark Factory, and the message sits above it.
  await suggestions.first().click()
  await expect(sheet).toHaveAccessibleName('Stark Factory')
  await expect(sheet.getByLabel('Meal time for Stark Factory')).toHaveValue('12:00')
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Frozen Ever After', 'The Twilight Zone Tower of Terror', 'Stark Factory', 'Spider-Man W.E.B. Adventure'])
  await expect(page.getByTestId('park-change')).toHaveCount(0)

  await page.getByRole('status').filter({ hasText: 'Swapped to Stark Factory' }).getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Frozen Ever After', 'The Twilight Zone Tower of Terror', 'Au Chalet de la Marionnette', 'Spider-Man W.E.B. Adventure'])
  await expect(sheet.getByLabel('Meal time for Au Chalet de la Marionnette')).toHaveValue('12:00')
})

test('switch park order: unavailable until grouped, warns about the lunch, and undo', async ({ page }) => {
  await createTrip(page, { name: 'Two parks' })
  for (const n of ['Big Thunder Mountain', "Crush's Coaster", 'Phantom Manor']) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  await expect(page.getByTestId('card-park-order')).toHaveText('Disneyland Park → Disney Adventure World → Disneyland Park')
  const edit = page.getByRole('button', { name: 'Edit hours and park order' })
  const daySheet = page.getByRole('dialog', { name: /^Day 1/ })
  const box = daySheet.getByTestId('two-park-note')
  const switchOrder = box.getByRole('button', { name: 'Switch order' })
  await edit.click()
  await expect(box.getByTestId('park-order-text')).toHaveText('Disneyland Park → Disney Adventure World → Disneyland Park')
  await expect(switchOrder).toBeDisabled()
  await expect(box.getByTestId('park-order-hint')).toContainText('Group by area first')
  await daySheet.getByRole('button', { name: 'Done' }).click()

  await page.getByRole('button', { name: 'Group by area' }).click()
  await addFromCatalog(page, 'Au Chalet de la Marionnette', '12:00')
  await showTab(page, 'My day')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Crush's Coaster", 'Au Chalet de la Marionnette'])
  await edit.click()
  await expect(switchOrder).toBeEnabled()

  // The note fits a phone without horizontal page scroll.
  const b = (await box.boundingBox())!
  expect(b.x).toBeGreaterThanOrEqual(0)
  expect(b.x + b.width).toBeLessThanOrEqual(390)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await switchOrder.click()
  const sheet = page.getByRole('dialog', { name: 'Start in Disney Adventure World?' })
  await expect(sheet.getByTestId('switch-removed')).toHaveText('Au Chalet de la Marionnette (12:00)')
  await sheet.getByRole('button', { name: 'Switch and remove 1' }).click()
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Big Thunder Mountain', 'Phantom Manor'])
  await expect(page.getByRole('status').filter({ hasText: 'first' })).toHaveText(/Disney Adventure World first · 1 removed/)

  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Crush's Coaster", 'Au Chalet de la Marionnette'])
})

test('day first: on a 390x844 phone the first two items of a two-park day show without scrolling (app-shell spec)', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight", "Crush's Coaster", 'Frozen Ever After', 'RC Racer']) await addFromCatalog(page, n)
  await showTab(page, 'My day')
  await expect(page.getByTestId('timeline-slot')).toHaveCount(6)
  await expect(page.getByTestId('ticket-reminder')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  const second = (await page.getByTestId('timeline-slot').nth(1).boundingBox())!
  const fit = (await page.getByTestId('fit-summary').boundingBox())!
  expect(second.y, 'second item starts on screen').toBeGreaterThanOrEqual(0)
  expect(second.y + second.height, `second item ends at ${second.y + second.height}, fit bar starts at ${fit.y}`).toBeLessThanOrEqual(fit.y)
})
