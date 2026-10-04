import { expect, type Locator, type Page } from '@playwright/test'

/** Accept every confirm/prompt dialog (prompts get their default value unless `answer` is given). */
export function acceptDialogs(page: Page, answer?: string) {
  page.on('dialog', (d) => void (answer !== undefined && d.type() === 'prompt' ? d.accept(answer) : d.accept()))
}

export async function createTrip(page: Page, { name = 'Test trip', date = '2026-08-12', days = 1 } = {}) {
  await page.goto('./#/plan')
  await page.getByLabel('Trip name').fill(name)
  await page.getByLabel('First day').fill(date)
  await page.getByLabel('Number of days').selectOption(String(days))
  await page.getByRole('button', { name: 'Create trip' }).click()
  await expect(page.getByRole('tab', { name: /^Day 1/ })).toBeVisible()
}

/** Phone layout: switch tabs. No-op on wide screens where both panes are visible. */
export async function showTab(page: Page, tab: 'Catalog' | 'Plan') {
  const link = page.getByRole('tab', { name: tab, exact: true })
  if (await link.isVisible()) await link.click()
}

export async function addFromCatalog(page: Page, name: string, showTime?: string) {
  await showTab(page, 'Catalog')
  await page.getByLabel('Search by name').fill(name)
  await page.getByRole('button', { name: `Add ${name} to day`, exact: true }).click()
  if (showTime) await page.getByRole('dialog').getByRole('button', { name: showTime, exact: true }).click()
  await page.getByLabel('Search by name').fill('')
}

export const slotNames = (page: Page) => page.getByTestId('slot-name').allTextContents()

/** Long-press and drag with real touch events (dnd-kit TouchSensor needs a 200 ms press). */
export async function touchDrag(page: Page, from: Locator, to: Locator, { offsetY = -8 } = {}) {
  const client = await page.context().newCDPSession(page)
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 + offsetY }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await page.waitForTimeout(350)
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    const point = { x: start.x + ((end.x - start.x) * i) / steps, y: start.y + ((end.y - start.y) * i) / steps }
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
    await page.waitForTimeout(25)
  }
  await page.waitForTimeout(100)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

export async function mouseDrag(page: Page, from: Locator, to: Locator, { offsetY = -8 } = {}) {
  const a = (await from.boundingBox())!
  const b = (await to.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + offsetY, { steps: 15 })
  await page.waitForTimeout(100)
  await page.mouse.up()
}
