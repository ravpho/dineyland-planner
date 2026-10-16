import { expect, test } from '@playwright/test'
import { createTrip } from './helpers'

test('More menu: rename, number of days and delete start from the More sheet (app-shell spec)', async ({ page }) => {
  await createTrip(page, { name: 'Summer trip', days: 3 })
  const trip = page.getByLabel('Trip', { exact: true })
  const sheet = page.getByRole('dialog', { name: 'More' })
  const more = page.getByRole('banner').getByRole('button', { name: 'More' })

  page.once('dialog', (d) => {
    expect(d.type()).toBe('prompt')
    void d.accept('Winter trip')
  })
  await more.click()
  await sheet.getByRole('button', { name: 'Rename' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(trip.locator('option:checked')).toHaveText('Winter trip')

  page.once('dialog', (d) => {
    expect(d.message()).toBe('Remove the last day?')
    void d.accept()
  })
  await more.click()
  await sheet.getByRole('button', { name: 'Number of days' }).click()
  const length = page.getByRole('dialog', { name: 'Number of days' })
  await length.getByLabel('Number of days').selectOption('2')
  await length.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('tab', { name: /^Day \d/ })).toHaveCount(2)

  page.once('dialog', (d) => {
    expect(d.type()).toBe('confirm')
    expect(d.message()).toContain('Delete "Winter trip"?')
    void d.accept()
  })
  await more.click()
  await sheet.getByRole('button', { name: 'Delete trip' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create trip' })).toBeVisible()
  await expect(page.getByText('Plan your days')).toBeVisible()

  await more.click()
  await sheet.getByRole('button', { name: 'About and data sources' }).click()
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible()
})
