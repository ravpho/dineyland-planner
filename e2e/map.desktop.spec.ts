import { expect, test } from '@playwright/test'
import { addFromCatalog, createTrip, showTab } from './helpers'

test('6.1 the map renders beside My day on a wide screen and zooms with the wheel', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  // The left column's Explore | Map control.
  await showTab(page, 'Map')
  await page.getByRole('group', { name: 'Map view' }).getByRole('button', { name: 'All places' }).click()
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

test('the Map column: My day’s stops or all places, with the route in both, beside the timeline', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor']) await addFromCatalog(page, n)
  await showTab(page, 'Map')
  const column = page.getByRole('navigation', { name: 'Left column' })
  await expect(column.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page')
  const planMap = page.getByTestId('plan-map')
  await expect(planMap.getByTestId('map-marker')).toHaveCount(2)
  await expect(planMap.getByTestId('route-stop')).toHaveText(['1', '2'])
  await expect(page.getByTestId('plan-column').getByTestId('timeline-slot')).toHaveCount(2)

  await page.getByRole('group', { name: 'Map view' }).getByRole('button', { name: 'All places' }).click()
  await expect(planMap).toHaveCount(0)
  await expect(page.getByTestId('park-map').getByTestId('route-stop')).toHaveText(['1', '2'])
  expect(await page.getByTestId('map-view').getByTestId('map-marker').count()).toBeGreaterThan(10)
  await expect(page.getByTestId('fit-summary')).toBeVisible()
})

test('Show in timeline on a wide screen keeps the map and brings the stop into view beside it', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
  await showTab(page, 'Map')
  await page.getByTestId('plan-map').getByRole('button', { name: "Peter Pan's Flight", exact: true }).click()
  await page.getByTestId('stop-card').getByRole('button', { name: 'Show in timeline' }).click()
  await expect(page).toHaveURL(/#\/map$/)
  await expect(page.getByTestId('plan-map')).toBeVisible()
  await expect(page.getByTestId('timeline-slot').nth(2).getByTestId('slot-handle')).toBeFocused()
})
