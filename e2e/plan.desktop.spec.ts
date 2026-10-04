import { expect, test } from '@playwright/test'
import { addFromCatalog, createTrip, mouseDrag, slotNames } from './helpers'

test('7.3 drag a catalog item into position on a wide screen', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
  await expect(page.getByTestId('plan-column')).toBeVisible()
  await page.getByLabel('Search by name').fill('pirates of the')
  const handle = page.getByTestId('catalog-row').first().getByTestId('catalog-drag-handle')
  await mouseDrag(page, handle, page.getByTestId('timeline-slot').nth(2))
  await expect.poll(() => slotNames(page)).toEqual(['Big Thunder Mountain', 'Phantom Manor', 'Pirates of the Caribbean', "Peter Pan's Flight"])
})

test('7.3 reorder by mouse drag', async ({ page }) => {
  await createTrip(page)
  for (const n of ['Big Thunder Mountain', 'Phantom Manor', "Peter Pan's Flight"]) await addFromCatalog(page, n)
  const handles = page.getByTestId('slot-handle')
  await mouseDrag(page, handles.nth(0), handles.nth(2), { offsetY: 8 })
  await expect.poll(() => slotNames(page)).toEqual(['Phantom Manor', "Peter Pan's Flight", 'Big Thunder Mountain'])
})
