import { expect, test } from '@playwright/test'
import { addFromCatalog, createTrip, showTab } from './helpers'

test.beforeEach(async ({ page }) => {
  await createTrip(page)
  await showTab(page, 'Explore')
})

test('6.1 typing "thunder" filters the list', async ({ page }) => {
  const rows = page.getByTestId('catalog-row')
  const before = await rows.count()
  await page.getByLabel('Search by name').fill('thunder')
  // Wait for the list to follow the search: one Big Thunder Mountain row is there before it too.
  await expect.poll(async () => (await rows.getByTestId('row-name').allTextContents()).every((n) => n.toLowerCase().includes('thunder'))).toBe(true)
  await expect(rows.filter({ hasText: 'Big Thunder Mountain' })).toHaveCount(1)
  const names = await rows.getByTestId('row-name').allTextContents()
  await expect(page.getByTestId('match-count')).toHaveText(`${names.length} items`)
  expect(before).toBeGreaterThan(50)
})

test('6.2 a 110 cm profile greys out a 120 cm ride, then hides it', async ({ page }) => {
  await page.getByRole('button', { name: /Filters/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await dialog.getByLabel('Shortest height (cm)').fill('110')
  await dialog.getByRole('button', { name: 'Save profile' }).click()
  await dialog.getByRole('button', { name: /^Show \d+ results?$/ }).click()

  await page.getByLabel('Search by name').fill('hyperspace')
  const row = page.getByTestId('catalog-row').filter({ hasText: 'Star Wars Hyperspace Mountain' })
  await expect(row).toHaveAttribute('data-unsuitable', 'true')
  await expect(row).toContainText('Needs 120 cm')

  await page.getByRole('button', { name: /Filters/ }).click()
  await dialog.getByLabel('Hide unsuitable').check()
  await dialog.getByRole('button', { name: /^Show \d+ results?$/ }).click()
  await expect(row).toHaveCount(0)

  // the profile survives a reload
  await page.reload()
  await showTab(page, 'Explore')
  await page.getByLabel('Search by name').fill('hyperspace')
  await expect(page.getByTestId('catalog-row').first()).toContainText('Needs 120 cm')
})

test('3.2 both parks are listed with labels, and sorting works without opening the filters', async ({ page }) => {
  const places = await page.getByTestId('row-place').allTextContents()
  expect(places.some((p) => p.startsWith('Disneyland Park · '))).toBe(true)
  expect(places.some((p) => p.startsWith('Disney Adventure World · '))).toBe(true)

  await page.getByLabel('Sort by').selectOption('duration')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const names = await page.getByTestId('catalog-row').getByTestId('row-name').allTextContents()
  expect(names.indexOf('RC Racer')).toBeLessThan(names.indexOf('Pirates of the Caribbean')) // 1 min < 10 min
  expect(names.indexOf('Pirates of the Caribbean')).toBeLessThan(names.indexOf('Auberge de Cendrillon')) // < 90 min meal

  await page.getByLabel('Sort by').selectOption('rating')
  const top = await page.getByTestId('catalog-row').first().getByLabel(/Rated \d out of 5/).getAttribute('aria-label')
  expect(top).toBe('Rated 5 out of 5')
})


test('a planned item is tinted and labelled with its day and stop (park-catalog spec)', async ({ page }) => {
  await addFromCatalog(page, "Peter Pan's Flight")
  const peter = page.getByTestId('catalog-row').filter({ hasText: "Peter Pan's Flight" })
  await expect(peter).toHaveAttribute('data-planned', 'selected')
  await expect(peter.getByTestId('planned-label')).toHaveText('In Day 1 · stop 1')
  const manor = page.getByTestId('catalog-row').filter({ hasText: 'Phantom Manor' })
  await expect(manor).not.toHaveAttribute('data-planned')
  await expect(manor.getByTestId('planned-label')).toHaveCount(0)
})

test('the details and the filters keep their main action at the bottom of the sheet while it scrolls', async ({ page }) => {
  await page.goto('./#/catalog')
  await page.getByTestId('row-name').filter({ hasText: 'Big Thunder Mountain' }).click()
  const details = page.getByRole('dialog', { name: 'Big Thunder Mountain' })
  const add = details.getByRole('button', { name: 'Add to day' })
  // Visible at once, flush with the bottom of the sheet, and still there after scrolling the details.
  await expect(add).toBeInViewport()
  const gap = async () => {
    const sheet = (await details.boundingBox())!
    const footer = (await details.getByTestId('sheet-footer').boundingBox())!
    return Math.abs(footer.y + footer.height - (sheet.y + sheet.height))
  }
  for (const top of [0, 10000]) {
    await details.evaluate((el, y) => el.scrollTo(0, y), top)
    // Measured once the sheet has slid into place.
    await expect.poll(gap).toBeLessThanOrEqual(1)
    await expect(add).toBeInViewport()
  }
  await details.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: /^Filters/ }).click()
  const filters = page.getByRole('dialog', { name: 'Filters' })
  const show = filters.getByRole('button', { name: /^Show \d+ results$/ })
  await expect(show).toBeInViewport()
  await filters.evaluate((el) => el.scrollTo(0, 10000))
  await expect(show).toBeInViewport()
  await expect(filters.getByRole('button', { name: 'Clear filters' })).toBeInViewport()
})

test('type chips filter Explore at once (refresh-plan-layout design Decision 11)', async ({ page }) => {
  await page.goto('./#/catalog')
  const chips = page.getByRole('group', { name: 'Type' })
  await chips.getByRole('button', { name: 'Shows' }).click()
  await expect(chips.getByRole('button', { name: 'Shows' })).toHaveAttribute('aria-pressed', 'true')
  const tiles = page.getByTestId('catalog-row').getByTestId('type-tile')
  expect(await tiles.evaluateAll((els) => els.every((el) => el.getAttribute('data-type') === 'show'))).toBe(true)
  await expect(page.getByRole('button', { name: 'Filters, 1 on' })).toBeVisible()
  await chips.getByRole('button', { name: 'All' }).click()
  await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible()
})
