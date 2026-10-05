import { expect, test } from '@playwright/test'
import { addFromCatalog, createTrip } from './helpers'

test('6.1 the map renders beside the plan on a wide screen and zooms with the wheel', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  // The plan column has its own Timeline | Map switch, so pick the catalog's.
  await page.getByRole('group', { name: 'Catalog view' }).getByRole('button', { name: 'Map' }).click()
  const map = page.getByTestId('park-map')
  await expect(map).toBeVisible()
  await expect(page.getByTestId('plan-column')).toBeVisible()
  const m = (await map.boundingBox())!
  const plan = (await page.getByTestId('plan-column').boundingBox())!
  expect(m.x + m.width).toBeLessThanOrEqual(plan.x)
  expect(m.width).toBeGreaterThan(300)

  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
  await page.mouse.wheel(0, -200)
  await expect.poll(async () => Number(await map.getAttribute('data-zoom'))).toBeGreaterThan(1)
  await expect(page.getByTestId('slot-name')).toHaveText(['Big Thunder Mountain'])
})

test('the plan map shows beside the catalog map, each with its own markers', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor']) await addFromCatalog(page, n)
  await page.getByRole('group', { name: 'Catalog view' }).getByRole('button', { name: 'Map' }).click()
  await page.getByRole('group', { name: 'Plan view' }).getByRole('button', { name: 'Map' }).click()
  const planMap = page.getByTestId('plan-map')
  await expect(page.getByTestId('park-map')).toHaveCount(2)
  await expect(planMap.getByTestId('map-marker')).toHaveCount(2)
  await expect(planMap.getByTestId('route-stop')).toHaveText(['1', '2'])
  expect(await page.getByTestId('map-view').getByTestId('map-marker').count()).toBeGreaterThan(10)
  await expect(page.getByTestId('fit-summary')).toBeVisible()
})
