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

/** Phones: a tab in the bottom bar. Wide screens: Explore or Map in the left column; My day is always shown. */
export async function showTab(page: Page, tab: 'Explore' | 'My day' | 'Map') {
  const bar = page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: tab, exact: true })
  if (await bar.isVisible()) return bar.click()
  if (tab !== 'My day') await page.getByRole('navigation', { name: 'Left column' }).getByRole('link', { name: tab, exact: true }).click()
}

/** `time` picks a button in the sheet that opens for shows (a start time) and restaurants (a meal time or "Any time"). */
export async function addFromCatalog(page: Page, name: string, time?: string) {
  await showTab(page, 'Explore')
  await page.getByLabel('Search by name').fill(name)
  // A planned item's button reads "… to day again" (park-catalog spec: the add button stays).
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^Add ${escaped} to day( again)?$`) }).click()
  if (time) await page.getByRole('dialog').getByRole('button', { name: time, exact: true }).click()
  await page.getByLabel('Search by name').fill('')
}

export const slotNames = (page: Page) => page.getByTestId('slot-name').allTextContents()

type Point = { x: number; y: number }

/**
 * Drags with real touch events. The drag starts as soon as the finger moves (refresh-plan-layout design
 * Decision 7), so there is no hold unless `holdMs` asks for one. `to` is a row to land on, or a point on the
 * screen; `dwellMs` keeps the finger there before lifting it, so the list can scroll under it.
 */
export async function touchDrag(page: Page, from: Locator, to: Locator | Point, { offsetY = -8, holdMs = 0, dwellMs = 100 } = {}) {
  const client = await page.context().newCDPSession(page)
  const a = (await from.boundingBox())!
  const b = 'x' in to ? { x: to.x, y: to.y, width: 0, height: 0 } : (await to.boundingBox())!
  const start = { x: a.x + a.width / 2, y: a.y + a.height / 2 }
  const end = { x: b.x + b.width / 2, y: b.y + b.height / 2 + ('x' in to ? 0 : offsetY) }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  if (holdMs) await page.waitForTimeout(holdMs)
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    const point = { x: start.x + ((end.x - start.x) * i) / steps, y: start.y + ((end.y - start.y) * i) / steps }
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] })
    await page.waitForTimeout(25)
  }
  await page.waitForTimeout(dwellMs)
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

/** Changes the selected day's hours in the day sheet, opened from the day card (app-shell spec: Day first in My day). */
export async function setHours(page: Page, { start, end }: { start?: string; end?: string }) {
  await page.getByRole('button', { name: 'Edit hours and park order' }).click()
  const sheet = page.getByRole('dialog', { name: /^Day \d/ })
  if (start) await sheet.getByLabel('Start').fill(start)
  if (end) await sheet.getByLabel('End').fill(end)
  await sheet.getByRole('button', { name: 'Done' }).click()
}

/** Changes the trip's number of days from the More menu, accepting the confirmation when days are removed. */
export async function setTripDays(page: Page, days: number) {
  await page.getByRole('banner').getByRole('button', { name: 'More' }).click()
  await page.getByRole('dialog', { name: 'More' }).getByRole('button', { name: 'Number of days' }).click()
  const sheet = page.getByRole('dialog', { name: 'Number of days' })
  await sheet.getByLabel('Number of days').selectOption(String(days))
  await sheet.getByRole('button', { name: 'Done' }).click()
}

/** Opens a stop's sheet from its row in My day (day-schedule spec: Sheet for each timeline item). */
export async function openStop(page: Page, name: string): Promise<Locator> {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^Open stop \\d+, ${escaped}$`) }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  return sheet
}

/** Removes a stop through its sheet's "Remove from day". */
export async function removeStop(page: Page, name: string) {
  await (await openStop(page, name)).getByRole('button', { name: 'Remove from day' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
