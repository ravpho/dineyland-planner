import { expect, test } from '@playwright/test'
import { addFromCatalog, createTrip } from './helpers'

test('6.1 the map renders beside the plan on a wide screen and zooms with the wheel', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await page.getByRole('button', { name: 'Map', exact: true }).click()
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
