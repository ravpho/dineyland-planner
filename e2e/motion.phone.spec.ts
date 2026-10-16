import { expect, test, type Locator } from '@playwright/test'
import { addFromCatalog, createTrip, showTab, slotNames, touchDrag } from './helpers'

/** Longest transition on an element, in seconds. */
const longestTransition = (l: Locator) =>
  l.evaluate((el) => Math.max(...getComputedStyle(el).transitionDuration.split(',').map((d) => parseFloat(d))))

test.describe('motion allowed (app-shell spec: Reduced motion)', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } })

  test('header sparkles twinkle, and sheets and view changes finish within 300 ms', async ({ page }) => {
    await page.goto('./#/catalog')
    const twinkles = page.locator('header .twinkle')
    await expect(twinkles).toHaveCount(3)
    expect(await twinkles.evaluateAll((els) => els.map((e) => e.getAnimations().length > 0))).toEqual([true, true, true])

    await page.getByRole('button', { name: /Filters/ }).click()
    const panel = page.getByRole('dialog', { name: 'Filters' })
    await expect(panel).toBeVisible()
    for (const l of [panel, panel.locator('xpath=..')]) {
      const seconds = await longestTransition(l)
      expect(seconds).toBeGreaterThan(0)
      expect(seconds).toBeLessThanOrEqual(0.3)
    }
    await page.getByRole('button', { name: 'Close' }).click()

    await page.getByRole('button', { name: 'Map', exact: true }).click()
    const view = page.locator('.view-enter')
    expect(await longestTransition(view)).toBeLessThanOrEqual(0.3)
  })
})

test.describe('reduced motion (app-shell spec: Reduced motion)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('nothing twinkles, and the filters sheet is in its final place at once', async ({ page }) => {
    await page.goto('./#/catalog')
    await page.getByRole('button', { name: /Filters/ }).click()
    const panel = page.getByRole('dialog', { name: 'Filters' })
    await expect(panel).toBeVisible()
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    expect(await longestTransition(panel)).toBe(0)
    expect(await panel.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  })

  test('a dropped stop is in its place at once: no sliding rows and no drop animation', async ({ page }) => {
    await createTrip(page)
    for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
    await showTab(page, 'My day')
    const handles = page.getByTestId('slot-handle')
    await handles.nth(1).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await touchDrag(page, handles.nth(2), handles.nth(0), { dwellMs: 50 })
    await expect.poll(() => slotNames(page)).toEqual(["Peter Pan's Flight", 'Big Thunder Mountain', 'Phantom Manor'])
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
    await expect(page.getByTestId('drag-overlay')).toHaveCount(0)
    expect(await page.getByTestId('timeline-slot').evaluateAll((els) => els.map((el) => getComputedStyle(el).transitionDuration))).toEqual(['0s', '0s', '0s'])
  })
})
