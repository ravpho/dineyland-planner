import { expect, test } from '@playwright/test'
import { acceptDialogs, addFromCatalog, createTrip, showTab, slotNames, touchDrag } from './helpers'

test('10.1 full phone journey: plan a 2-day August trip, then share it', async ({ page, browser }) => {
  acceptDialogs(page)
  await createTrip(page, { name: 'August family trip', date: '2026-08-12', days: 2 })

  // group profile + filter
  await showTab(page, 'Catalog')
  await page.getByRole('button', { name: /Filters/ }).click()
  const filters = page.getByRole('dialog', { name: 'Filters' })
  await filters.getByLabel('Shortest height (cm)').fill('110')
  await filters.getByLabel('Max thrill').selectOption({ label: 'Thrilling' })
  await filters.getByLabel('Max scariness').selectOption({ label: 'Spooky' })
  await filters.getByRole('button', { name: 'Save profile' }).click()
  await filters.getByRole('button', { name: 'Attraction', exact: true }).click()
  await filters.getByRole('button', { name: 'Show results' }).click()
  await expect(page.getByTestId('catalog-row').filter({ hasText: 'Restaurant' }).first()).toHaveCount(0)
  await expect(page.getByTestId('catalog-row').filter({ hasText: 'Phantom Manor' })).toContainText('Too scary (Scary)')
  await page.getByRole('button', { name: /Filters/ }).click()
  await filters.getByRole('button', { name: 'Clear filters' }).click()
  await filters.getByRole('button', { name: 'Show results' }).click()

  // 8 items including a show and a meal
  const plan = [
    'Big Thunder Mountain',
    "Peter Pan's Flight",
    'Pirates of the Caribbean',
    "Walt's – An American Restaurant",
    'Buzz Lightyear Laser Blast',
    'Star Wars Hyperspace Mountain',
    '"it\'s a small world"',
  ]
  for (const name of plan) await addFromCatalog(page, name, name.startsWith('Walt') ? 'Any time' : undefined)
  await addFromCatalog(page, 'Disney Tales of Magic', '22:00')
  await showTab(page, 'Plan')
  await expect(page.getByTestId('timeline-slot')).toHaveCount(8)
  await expect(page.getByTestId('timeline-slot').filter({ hasText: 'Star Wars Hyperspace Mountain' })).toContainText('Needs 120 cm')

  // a tight window makes the day run over; widening it makes it fit
  const summary = page.getByTestId('fit-summary')
  await page.getByLabel('End').fill('14:00')
  await expect(summary).toContainText('Over by')
  await page.getByLabel('End').fill('23:00')
  await expect(summary).toContainText('Fits')

  // reorder by touch: move the second item to the top and see its wait change
  const before = await slotNames(page)
  const panWaitBefore = await page.getByTestId('timeline-slot').nth(1).getByText(/wait \d+ min/).textContent()
  const handles = page.getByTestId('slot-handle')
  await touchDrag(page, handles.nth(1), handles.nth(0), { offsetY: -12 })
  await expect.poll(() => slotNames(page)).toEqual([before[1], before[0], ...before.slice(2)])
  const panWaitAfter = await page.getByTestId('timeline-slot').nth(0).getByText(/wait \d+ min/).textContent()
  expect(Number(panWaitAfter!.match(/\d+/)![0])).toBeLessThanOrEqual(Number(panWaitBefore!.match(/\d+/)![0]))

  // share and import on another device
  await page.getByRole('button', { name: 'Share' }).click()
  const url = await page.getByLabel('Share link').inputValue()
  await page.getByRole('button', { name: 'Close' }).click()
  const finalOrder = await slotNames(page)

  const other = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await other.goto(url)
  await other.getByRole('button', { name: 'Import trip' }).click()
  expect(await slotNames(other)).toEqual(finalOrder)
  await expect(other.getByRole('tablist', { name: 'Days' }).getByRole('tab')).toHaveCount(2)
  await expect(other.getByLabel('End')).toHaveValue('23:00')
})
