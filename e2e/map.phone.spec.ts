import { expect, test, type Locator, type Page } from '@playwright/test'
import { addFromCatalog, createTrip, showTab } from './helpers'

const map = (page: Page) => page.getByTestId('park-map')
const marker = (page: Page, name: string) => map(page).getByRole('button', { name, exact: true })

async function centreOf(locator: Locator) {
  const b = (await locator.boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

/** One-finger drag with real touch events. */
async function touchPan(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] })
  for (let i = 1; i <= 10; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('6.1 plan from the map: zoom, drag, tap, add, route, area table', async ({ page }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await showTab(page, 'Catalog')
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  await expect(map(page)).toBeVisible()
  await expect(map(page).getByTestId('map-zone')).toHaveCount(5)

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(map(page)).toHaveAttribute('data-zoom', '1.5')

  // Drag Phantom Manor to the middle of the map, then tap it.
  await touchPan(page, await centreOf(marker(page, 'Phantom Manor')), await centreOf(map(page)))
  const box = (await map(page).boundingBox())!
  const at = await centreOf(marker(page, 'Phantom Manor'))
  expect(Math.abs(at.x - (box.x + box.width / 2))).toBeLessThan(40)
  expect(Math.abs(at.y - (box.y + box.height / 2))).toBeLessThan(40)
  await marker(page, 'Phantom Manor').tap()

  const card = page.getByTestId('map-card')
  await expect(card.getByRole('heading', { name: 'Phantom Manor' })).toBeVisible()
  const walkText = await card.getByTestId('walk-from-last').textContent()
  const minutes = walkText!.match(/(\d+) min walk from Big Thunder Mountain/)![1]
  await card.getByRole('button', { name: 'Add to day' }).click()
  await expect(map(page).getByTestId('route-stop')).toHaveText(['1', '2'])

  await page.getByRole('button', { name: 'Area walking times' }).click()
  const table = page.getByRole('dialog', { name: 'Walking times in Disneyland Park' }).getByTestId('area-table')
  await expect(table.locator('tbody tr')).toHaveCount(5)
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click()

  // The timeline shows the same walk the card showed.
  await showTab(page, 'Plan')
  await expect(page.getByTestId('slot-name')).toHaveText(['Big Thunder Mountain', 'Phantom Manor'])
  await expect(page.getByTestId('slot-walk').nth(1)).toHaveText(`${minutes} min`)
})

test('6.1 pinch zooms the map', async ({ page }) => {
  await page.goto('./#/catalog')
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  const c = await centreOf(map(page))
  const cdp = await page.context().newCDPSession(page)
  const fingers = (gap: number) => [
    { x: c.x - gap, y: c.y, id: 1 },
    { x: c.x + gap, y: c.y, id: 2 },
  ]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(20) })
  for (let gap = 25; gap <= 80; gap += 5) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(gap) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await expect.poll(async () => Number(await map(page).getAttribute('data-zoom'))).toBeGreaterThan(2)
})

test('6.1 the map works offline after the first visit', async ({ page, context }) => {
  await createTrip(page)
  await addFromCatalog(page, 'Big Thunder Mountain')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await showTab(page, 'Catalog')
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  await expect(map(page).getByTestId('map-zone')).toHaveCount(5)
  await expect(map(page).getByTestId('route-stop')).toHaveText(['1'])
  await marker(page, 'Phantom Manor').tap()
  await expect(page.getByTestId('map-card').getByTestId('walk-from-last')).toContainText('walk from Big Thunder Mountain')
  await context.setOffline(false)
})
