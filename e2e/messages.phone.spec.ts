import { expect, test, type Locator } from '@playwright/test'
import { addFromCatalog, createTrip } from './helpers'

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

async function boxes(locator: Locator) {
  const out = []
  for (const el of await locator.all()) if (await el.isVisible()) out.push({ el: await el.evaluate((e) => e.outerHTML.slice(0, 60)), box: (await el.boundingBox())! })
  return out
}

test('a message raised while the filters sheet is open covers none of its controls (app-shell spec: Messages never cover a sheet)', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  const toast = page.getByTestId('toast')
  await expect(toast).toBeVisible()
  await page.getByRole('button', { name: /Filters/ }).click()
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await expect(sheet).toBeVisible()
  await expect(toast).toBeVisible()
  const t = (await toast.boundingBox())!
  const covered = (await boxes(sheet.locator('button, input, select, label, a'))).filter((c) => overlaps(t, c.box))
  expect(covered.map((c) => c.el), `toast ${JSON.stringify(t)} covers sheet controls`).toEqual([])
  expect(overlaps(t, (await sheet.boundingBox())!), 'toast over the sheet').toBe(false)
})

test('with no sheet open, a message sits above the fit status and the bottom bar', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  const t = (await page.getByTestId('toast').boundingBox())!
  const dock = (await page.getByTestId('dock').boundingBox())!
  expect(t.y + t.height).toBeLessThanOrEqual(dock.y)
})
