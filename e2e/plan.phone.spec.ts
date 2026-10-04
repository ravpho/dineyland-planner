import { expect, test } from '@playwright/test'
import { acceptDialogs, addFromCatalog, createTrip, showTab, slotNames, touchDrag } from './helpers'

test.beforeEach(({ page }) => acceptDialogs(page))

test('7.1 a 3-day trip has the right dates, and its length can change', async ({ page }) => {
  await createTrip(page, { name: 'Summer trip', date: '2026-08-12', days: 3 })
  const tabs = page.getByRole('tablist', { name: 'Days' }).getByRole('tab')
  await expect(tabs).toHaveText([/Day 1 · Wed,? 12 Aug/, /Day 2 · Thu,? 13 Aug/, /Day 3 · Fri,? 14 Aug/])
  await page.getByLabel('Number of days').selectOption('2')
  await expect(tabs).toHaveCount(2)
  await page.getByLabel('Park').selectOption('daw')
  await expect(tabs.first()).toContainText('DAW')
})

test('7.2 add, other-park message, remove with undo, move up', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, 'Phantom Manor')
  await addFromCatalog(page, "Peter Pan's Flight")

  // item from the other park
  await page.getByRole('button', { name: /Filters/ }).click()
  await page.getByRole('dialog').getByLabel('Park').selectOption('daw')
  await page.getByRole('dialog').getByRole('button', { name: 'Show results' }).click()
  await page.getByLabel('Search by name').fill('frozen ever')
  await page.getByRole('button', { name: 'Add Frozen Ever After to day' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'This day is set to Disneyland Park' })).toBeVisible()

  await showTab(page, 'Plan')
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
  await touchDrag(page, handles.nth(2), handles.nth(1))
  await expect.poll(() => slotNames(page)).toEqual(['Big Thunder Mountain', "Peter Pan's Flight", 'Phantom Manor'])
})

test('7.5 summary turns from Over by to Fits, and stays visible while scrolling', async ({ page }) => {
  await createTrip(page)
  await showTab(page, 'Plan')
  await page.getByLabel('Start').fill('10:00')
  await page.getByLabel('End').fill('11:00')
  await addFromCatalog(page, 'Big Thunder Mountain')
  await addFromCatalog(page, "Walt's – An American Restaurant")
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
  await page.getByLabel('Park').selectOption('daw')
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
