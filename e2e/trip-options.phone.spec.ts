import { expect, test } from '@playwright/test'
import { createTrip } from './helpers'

test('trip options: rename and delete start from the trip options sheet (app-shell spec)', async ({ page }) => {
  await createTrip(page, { name: 'Summer trip' })
  const trip = page.getByLabel('Trip', { exact: true })
  const sheet = page.getByRole('dialog', { name: 'Trip options' })

  page.once('dialog', (d) => {
    expect(d.type()).toBe('prompt')
    void d.accept('Winter trip')
  })
  await page.getByRole('button', { name: 'Trip options' }).click()
  await sheet.getByRole('button', { name: 'Rename' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(trip.locator('option:checked')).toHaveText('Winter trip')

  page.once('dialog', (d) => {
    expect(d.type()).toBe('confirm')
    expect(d.message()).toContain('Delete "Winter trip"?')
    void d.accept()
  })
  await page.getByRole('button', { name: 'Trip options' }).click()
  await sheet.getByRole('button', { name: 'Delete' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Create trip' })).toBeVisible()
  await expect(page.getByText('Plan your days')).toBeVisible()
})
