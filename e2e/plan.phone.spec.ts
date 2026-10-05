import { expect, test } from '@playwright/test'
import { acceptDialogs, addFromCatalog, createTrip, showTab, slotNames, touchDrag } from './helpers'

test.beforeEach(({ page }) => acceptDialogs(page))

test('7.1 a 3-day trip has the right dates, and its length can change', async ({ page }) => {
  await createTrip(page, { name: 'Summer trip', date: '2026-08-12', days: 3 })
  const tabs = page.getByRole('tablist', { name: 'Days' }).getByRole('tab')
  await expect(tabs).toHaveText([/Day 1 · Wed,? 12 Aug/, /Day 2 · Thu,? 13 Aug/, /Day 3 · Fri,? 14 Aug/])
  await page.getByLabel('Number of days').selectOption('2')
  await expect(tabs).toHaveCount(2)
  await expect(page.getByLabel('Park')).toHaveCount(0) // days are not tied to a park
  await addFromCatalog(page, 'Frozen Ever After')
  await addFromCatalog(page, 'Big Thunder Mountain')
  await showTab(page, 'Plan')
  await expect(tabs.first()).toContainText('DLP + DAW')
})

test('7.2 add from both parks, remove with undo, move up', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, 'Phantom Manor')
  await addFromCatalog(page, "Peter Pan's Flight")

  // an item from the other park joins the same day
  await addFromCatalog(page, 'Frozen Ever After')
  await showTab(page, 'Plan')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight", 'Frozen Ever After'])
  await page.getByRole('button', { name: 'Remove Frozen Ever After' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"])

  await page.getByRole('button', { name: 'Remove Phantom Manor' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight"])
  await page.getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"])

  await page.getByRole('button', { name: "Move Peter Pan's Flight up" }).click()
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
})

test('7.3 reorder by touch drag on a phone', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
  await showTab(page, 'Plan')
  const handles = page.getByTestId('slot-handle')
  // Scroll the items clear of the fit bar pinned to the bottom of the screen.
  await handles.nth(1).evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await touchDrag(page, handles.nth(2), handles.nth(1))
  await expect.poll(() => slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
})

test('7.5 summary turns from Over by to Fits, and stays visible while scrolling', async ({ page }) => {
  await createTrip(page)
  await showTab(page, 'Plan')
  await page.getByLabel('Start').fill('10:00')
  await page.getByLabel('End').fill('11:00')
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, "Walt's – An American Restaurant", 'Any time')
  await showTab(page, 'Plan')
  const summary = page.getByTestId('fit-summary')
  await expect(summary).toContainText('Over by')
  await page.getByRole('button', { name: "Remove Walt's – An American Restaurant" }).click()
  await expect(summary).toContainText('Fits')

  await page.getByLabel('End').fill('23:00')
  for (let i = 0; i < 14; i++) await addFromCatalog(page, i % 2 ? 'Phantom Manor' : "Peter Pan's Flight")
  await showTab(page, 'Plan')
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
  await showTab(page, 'Plan')
  await page.getByRole('tab', { name: /^Day 2/ }).click()
  await addFromCatalog(page, 'Frozen Ever After')
  await showTab(page, 'Plan')
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByLabel('Share link').inputValue()
  expect(url).toMatch(/#\/import\//)

  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const other = await fresh.newPage()
  await other.goto(url)
  await expect(other.getByText(/Import Shared trip with 2 days and 3 planned items/)).toBeVisible()
  await other.getByRole('button', { name: 'Import trip' }).click()
  await expect(other.getByLabel('Trip')).toHaveValue(/.+/)
  await expect(other.getByLabel('Trip').locator('option:checked')).toHaveText('Shared trip')
  expect(await slotNames(other)).toEqual(['Big Thunder Mountain', 'Disney Stars on Parade'])
  await expect(other.getByLabel('Start time for Disney Stars on Parade')).toHaveValue('11:30')
  await other.getByRole('tab', { name: /^Day 2/ }).click()
  expect(await slotNames(other)).toEqual(['Frozen Ever After'])

  await other.goto(url.slice(0, url.length - 20))
  await expect(other.getByRole('alert')).toContainText('cannot be read')
  await fresh.close()
})

test('park-hopping day: two park changes, ticket reminder, and a share round trip', async ({ page, browser }) => {
  await createTrip(page, { name: 'Hopper day' })
  for (const n of ['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor']) await addFromCatalog(page, n)
  await showTab(page, 'Plan')
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
  await showTab(page, 'Plan')
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
  await showTab(page, 'Plan')

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
  await showTab(page, 'Plan')

  const lunch = page.getByTestId('timeline-slot').filter({ hasText: 'Au Chalet de la Marionnette' })
  await expect(lunch.getByLabel('Meal time for Au Chalet de la Marionnette')).toHaveValue('12:00')
  const suggestions = lunch.getByTestId('restaurant-suggestions').getByRole('button')
  await expect(suggestions).toHaveCount(3)
  const names = (await suggestions.allTextContents()).map((t) => t.split(' · ')[0])
  expect(names).toEqual(['Stark Factory', 'The Hollywood Gardens Restaurant', 'Café Luminosity'])

  await suggestions.first().click()
  const stark = page.getByTestId('timeline-slot').filter({ hasText: 'Stark Factory' })
  await expect(stark.getByLabel('Meal time for Stark Factory')).toHaveValue('12:00')
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Frozen Ever After', 'The Twilight Zone Tower of Terror', 'Stark Factory', 'Spider-Man W.E.B. Adventure'])
  await expect(page.getByTestId('park-change')).toHaveCount(0)

  await page.getByRole('status').filter({ hasText: 'Swapped to Stark Factory' }).getByRole('button', { name: 'Undo' }).click()
  expect(await slotNames(page)).toEqual(["Crush's Coaster", 'Frozen Ever After', 'The Twilight Zone Tower of Terror', 'Au Chalet de la Marionnette', 'Spider-Man W.E.B. Adventure'])
  await expect(page.getByTestId('timeline-slot').filter({ hasText: 'Au Chalet de la Marionnette' }).getByLabel('Meal time for Au Chalet de la Marionnette')).toHaveValue('12:00')
})

test('switch park order: unavailable until grouped, warns about the lunch, and undo', async ({ page }) => {
  await createTrip(page, { name: 'Two parks' })
  for (const n of ['Big Thunder Mountain', "Crush's Coaster", 'Phantom Manor']) await addFromCatalog(page, n)
  await showTab(page, 'Plan')
  const box = page.getByTestId('ticket-reminder')
  const switchOrder = box.getByRole('button', { name: 'Switch order' })
  await expect(box.getByTestId('park-order-text')).toHaveText('Disneyland Park → Disney Adventure World → Disneyland Park')
  await expect(switchOrder).toBeDisabled()
  await expect(box.getByTestId('park-order-hint')).toContainText('Group by area first')

  await page.getByRole('button', { name: 'Group by area' }).click()
  await addFromCatalog(page, 'Au Chalet de la Marionnette', '12:00')
  await showTab(page, 'Plan')
  expect(await slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', "Crush's Coaster", 'Au Chalet de la Marionnette'])
  await expect(switchOrder).toBeEnabled()

  // The box fits a phone without horizontal page scroll.
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
