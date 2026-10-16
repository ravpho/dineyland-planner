import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import PlanScreen from '../../screens/PlanScreen'
import { createPlannerStore, selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { PlannerDnd } from '../PlannerDnd'
import { ToastProvider } from '../Toast'

const THUNDER = 'dlp.big-thunder-mountain'
const MANOR = 'dlp.phantom-manor'
const PETER = 'dlp.peter-pans-flight'
const ALICE = 'dlp.alices-curious-labyrinth'

/**
 * jsdom lays nothing out: give each row a 100 px slot so dnd-kit can measure where a stop lands. The lifted card
 * (the drag overlay) starts where its row is.
 */
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const rows = [...document.querySelectorAll<HTMLElement>('[data-testid="timeline-slot"]')]
    const overlay = this.querySelector('[data-testid="drag-overlay"]') ?? this.closest('[data-testid="drag-overlay"]')
    const row = overlay
      ? rows.find((r) => r.querySelector('[data-testid="slot-name"]')?.textContent === overlay.querySelector('.truncate')?.textContent)
      : this.closest<HTMLElement>('[data-testid="timeline-slot"]')
    const index = row ? rows.indexOf(row) : -1
    const top = index >= 0 ? index * 100 : 0
    const height = index < 0 ? 0 : this === row || overlay ? 90 : 40
    return { x: 0, y: top, top, left: 0, width: 300, height, right: 300, bottom: top + height, toJSON: () => ({}) } as DOMRect
  })
})
afterEach(() => vi.restoreAllMocks())

function renderPlan(ids: string[]) {
  const store = createPlannerStore(sampleCatalog)
  store.getState().createTrip('Trip', '2026-08-12')
  const dayId = selectedDay(store.getState())!.id
  for (const id of ids) store.getState().addItem(dayId, id)
  renderWithPlanner(
    <ToastProvider>
      <PlannerDnd>
        <PlanScreen />
      </PlannerDnd>
    </ToastProvider>,
    { store },
  )
  return { ids: () => selectedDay(store.getState())!.items.map((e) => e.itemId) }
}

/** Space picks the stop up, the arrows move it, and Space drops it (dnd-kit's keyboard sensor). */
async function keyboardDrag(name: string, key: 'ArrowDown' | 'ArrowUp', times: number) {
  const handle = screen.getByRole('button', { name: `Reorder ${name}` })
  handle.focus()
  await act(async () => {
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' })
    // The sensor starts listening for keys on the next tick.
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  for (let i = 0; i < times; i++)
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? handle, { key, code: key })
    })
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? handle, { key: ' ', code: 'Space' })
  })
}

const message = (text: string) => screen.getByText(text).closest('[role="status"]') as HTMLElement

describe('a drop says where the stop went, with Undo (trip-itinerary spec: Reorder and remove items)', () => {
  test('dragging the first stop two places down: "Moved … to stop 3", and Undo restores the order', async () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER, ALICE])
    await keyboardDrag('Big Thunder Mountain', 'ArrowDown', 2)
    expect(ids()).toEqual([MANOR, PETER, THUNDER, ALICE])
    fireEvent.click(within(message('Moved Big Thunder Mountain to stop 3')).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, MANOR, PETER, ALICE])
  })

  test('a drop back in its own place moves nothing and says nothing', async () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    await keyboardDrag('Phantom Manor', 'ArrowDown', 0)
    expect(screen.queryByTestId('drag-overlay')).toBeNull()
    expect(ids()).toEqual([THUNDER, MANOR, PETER])
    expect(screen.queryByText(/^Moved /)).toBeNull()
  })

  test('while dragging, a lifted card shows the stop and the row stays behind at 30% (refresh-plan-layout design Decision 7)', async () => {
    renderPlan([THUNDER, MANOR])
    const handle = screen.getByRole('button', { name: 'Reorder Phantom Manor' })
    handle.focus()
    await act(async () => {
      fireEvent.keyDown(handle, { key: ' ', code: 'Space' })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const card = screen.getByTestId('drag-overlay')
    expect(card).toHaveTextContent(/^2\d{2}:\d{2}Phantom Manor$/)
    expect(screen.getAllByTestId('timeline-slot')[1]).toHaveClass('opacity-30')
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? handle, { key: 'Escape', code: 'Escape' })
    })
    expect(screen.queryByTestId('drag-overlay')).toBeNull()
    expect(screen.queryByText(/^Moved /)).toBeNull()
  })
})
