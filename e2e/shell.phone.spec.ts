import { expect, test, type Page } from '@playwright/test'
import { acceptDialogs, addFromCatalog, createTrip, showTab } from './helpers'

async function checkLayout(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0)
  const controls = page.locator('button:visible, select:visible, input:visible, a[role="tab"]:visible, header a:visible')
  const small: string[] = []
  for (const control of await controls.all()) {
    // A checkbox inside a <label> is toggled by tapping anywhere on the label, so measure that.
    const target = (await control.evaluate((e) => e instanceof HTMLInputElement && e.type === 'checkbox' && !!e.closest('label')))
      ? control.locator('xpath=ancestor::label[1]')
      : control
    const box = await target.boundingBox()
    if (box && (box.width < 43.5 || box.height < 43.5)) small.push(`${await control.evaluate((e) => e.outerHTML.slice(0, 80))} ${box.width}x${box.height}`)
  }
  expect(small, 'controls smaller than 44x44').toEqual([])
}

test.describe('small phone 360x740', () => {
  test.use({ viewport: { width: 360, height: 740 } })

  test('8.1 no horizontal scroll and every control at least 44x44', async ({ page }) => {
    acceptDialogs(page)
    await createTrip(page, { days: 3 })
    await checkLayout(page)
    await addFromCatalog(page, 'Big Thunder Mountain')
    await addFromCatalog(page, 'Disney Stars on Parade', '11:30')
    await showTab(page, 'Catalog')
    await checkLayout(page)
    await page.getByRole('button', { name: /Filters/ }).click()
    await checkLayout(page)
    await page.getByRole('button', { name: 'Close' }).click()
    await showTab(page, 'Plan')
    await checkLayout(page)
    await page.getByRole('link', { name: 'About' }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('8.2 works offline after the first visit and passes the installability check', async ({ page, context }) => {
  await createTrip(page, { name: 'Offline trip' })
  await addFromCatalog(page, 'Big Thunder Mountain')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // Chrome's own install criteria (manifest, icons, service worker), as used by Lighthouse.
  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: unknown[] }
  expect(installabilityErrors).toEqual([])
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href)).json())
  expect(manifest).toMatchObject({ name: 'Disneyland Planner', display: 'standalone' })

  await context.setOffline(true)
  await page.reload()
  await showTab(page, 'Plan')
  await expect(page.getByLabel('Trip').locator('option:checked')).toHaveText('Offline trip')
  await expect(page.getByTestId('timeline-slot')).toHaveCount(1)
  await showTab(page, 'Catalog')
  await expect(page.getByTestId('catalog-row').first()).toBeVisible()
  await context.setOffline(false)
})
