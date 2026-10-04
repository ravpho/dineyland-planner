import { expect, test } from '@playwright/test'
import { createTrip, showTab } from './helpers'

test.beforeEach(async ({ page }) => {
  await createTrip(page)
  await showTab(page, 'Catalog')
})

test('6.1 typing "thunder" filters the list', async ({ page }) => {
  const rows = page.getByTestId('catalog-row')
  const before = await rows.count()
  await page.getByLabel('Search by name').fill('thunder')
  await expect(rows.filter({ hasText: 'Big Thunder Mountain' })).toHaveCount(1)
  const names = await rows.locator('span.block').allTextContents()
  expect(names.every((n) => n.toLowerCase().includes('thunder'))).toBe(true)
  await expect(page.getByTestId('match-count')).toHaveText(`${names.length} items in Disneyland Park`)
  expect(before).toBeGreaterThan(50)
})

test('6.2 a 110 cm profile greys out a 120 cm ride, then hides it', async ({ page }) => {
  await page.getByRole('button', { name: /Filters/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await dialog.getByLabel('Shortest height (cm)').fill('110')
  await dialog.getByRole('button', { name: 'Save profile' }).click()
  await dialog.getByRole('button', { name: 'Show results' }).click()

  await page.getByLabel('Search by name').fill('hyperspace')
  const row = page.getByTestId('catalog-row').filter({ hasText: 'Star Wars Hyperspace Mountain' })
  await expect(row).toHaveAttribute('data-unsuitable', 'true')
  await expect(row).toContainText('Needs 120 cm')

  await page.getByRole('button', { name: /Filters/ }).click()
  await dialog.getByLabel('Hide unsuitable').check()
  await dialog.getByRole('button', { name: 'Show results' }).click()
  await expect(row).toHaveCount(0)

  // the profile survives a reload
  await page.reload()
  await showTab(page, 'Catalog')
  await page.getByLabel('Search by name').fill('hyperspace')
  await expect(page.getByTestId('catalog-row').first()).toContainText('Needs 120 cm')
})
