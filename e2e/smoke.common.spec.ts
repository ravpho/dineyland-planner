import { expect, test } from '@playwright/test'

test('app loads', async ({ page }) => {
  await page.goto('./')
  await expect(page).toHaveTitle('Disneyland Planner')
  await expect(page.getByRole('heading', { name: 'Plan' })).toBeVisible()
})
