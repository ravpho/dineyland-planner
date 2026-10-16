import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { scheduleDay, type ScheduledSlot } from '../../domain/schedule'
import { formatClock } from '../../domain/time'
import type { PlanItem } from '../../domain/trip'
import PlanScreen from '../../screens/PlanScreen'
import { createPlannerStore, selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { openStop } from '../../test/stops'
import { ToastProvider } from '../Toast'

const THUNDER = 'dlp.big-thunder-mountain'
const MANOR = 'dlp.phantom-manor'
const PETER = 'dlp.peter-pans-flight'
const ALICE = 'dlp.alices-curious-labyrinth'

function renderPlan(entries: (string | Omit<PlanItem, 'key'>)[]) {
  const store = createPlannerStore(sampleCatalog)
  store.getState().createTrip('Trip', '2026-08-12')
  const dayId = selectedDay(store.getState())!.id
  for (const e of entries) {
    const { itemId, ...options } = typeof e === 'string' ? { itemId: e } : e
    store.getState().addItem(dayId, itemId, options)
  }
  renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <PlanScreen />
      </DndContext>
    </ToastProvider>,
    { store },
  )
  const day = () => selectedDay(store.getState())!
  return { store, day, ids: () => day().items.map((e) => e.itemId) }
}

const rows = () => screen.getAllByTestId('timeline-slot')
const rowOf = (name: string) => rows().find((r) => within(r).queryByTestId('slot-name')?.textContent === name)!
const message = (text: string | RegExp) => screen.getByText(text).closest('[role="status"]') as HTMLElement
const tiles = (sheet: HTMLElement) =>
  within(within(sheet).getByTestId('stop-times'))
    .getAllByRole('definition')
    .map((dd) => [dd.previousElementSibling?.textContent ?? dd.nextElementSibling?.textContent, dd.textContent])

describe('stop sheet (day-schedule spec: Sheet for each timeline item)', () => {
  test('the sheet’s times are the row’s schedule: arrive, wait, starts and ends', () => {
    const { day } = renderPlan([THUNDER, MANOR])
    const slot = scheduleDay(day(), sampleCatalog).slots[1] as ScheduledSlot
    const sheet = openStop('Phantom Manor')
    expect(tiles(sheet)).toEqual([
      ['Arrive', formatClock(slot.arrive)],
      ['Wait', `${slot.wait} min`],
      ['Starts', formatClock(slot.start)],
      ['Ends', formatClock(slot.end)],
    ])
    expect(within(rowOf('Phantom Manor')).getByTestId('slot-time')).toHaveTextContent(`${formatClock(slot.start)}–${formatClock(slot.end)}`)
    expect(within(sheet).getByTestId('stop-sheet-place')).toHaveTextContent('Stop 2 · Frontierland · Disneyland Park')
  })

  test('a show’s sheet says when to be there instead of a wait', () => {
    renderPlan([{ itemId: 'dlp.parade', showTime: '17:30' }])
    expect(tiles(openStop('Disney Stars on Parade')).map(([label]) => label)).toEqual(['Arrive', 'Be there', 'Starts', 'Ends'])
    expect(tiles(screen.getByRole('dialog'))[1]).toEqual(['Be there', '17:10'])
  })

  test('changing the meal time updates the timeline while the sheet stays open', () => {
    renderPlan([THUNDER, { itemId: 'dlp.cafe-hyperion', mealTime: '12:00' }])
    const sheet = openStop('Café Hyperion')
    const select = within(sheet).getByRole('combobox', { name: 'Meal time for Café Hyperion' })
    select.focus()
    fireEvent.change(select, { target: { value: '18:30' } })
    expect(within(rowOf('Café Hyperion')).getByText('Dinner 18:30')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Café Hyperion' })).toBe(sheet)
    expect(select).toHaveFocus()
  })

  test('locking a show puts the lock on its row', () => {
    renderPlan([{ itemId: 'dlp.parade', showTime: '17:30' }])
    expect(within(rowOf('Disney Stars on Parade')).queryByText(/time kept when optimizing/)).toBeNull()
    fireEvent.click(within(openStop('Disney Stars on Parade')).getByRole('button', { name: 'Keep Disney Stars on Parade at 17:30 when optimizing' }))
    expect(within(rowOf('Disney Stars on Parade')).getByText(/^Show 17:30/)).toHaveTextContent('Show 17:30 (time kept when optimizing)')
  })

  test('the stepper moves the stop and keeps the sheet open on it, with focus on the pressed button', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    const sheet = openStop("Peter Pan's Flight")
    expect(within(sheet).getByTestId('stop-stepper')).toHaveTextContent('Stop 3 of 3')
    const up = within(sheet).getByRole('button', { name: "Move Peter Pan's Flight up" })
    expect(within(sheet).getByRole('button', { name: "Move Peter Pan's Flight down" })).toBeDisabled()
    fireEvent.click(up)
    expect(ids()).toEqual([THUNDER, PETER, MANOR])
    expect(screen.getByRole('dialog', { name: "Peter Pan's Flight" })).toBe(sheet)
    expect(within(sheet).getByTestId('stop-stepper')).toHaveTextContent('Stop 2 of 3')
    expect(up).toHaveFocus()
    fireEvent.click(up)
    expect(ids()).toEqual([PETER, THUNDER, MANOR])
    expect(up).toBeDisabled()
  })

  test('Move to top and Move to bottom put the stop first or last, and close the sheet', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER, ALICE])
    fireEvent.click(within(openStop('Phantom Manor')).getByRole('button', { name: 'Move to bottom' }))
    expect(ids()).toEqual([THUNDER, PETER, ALICE, MANOR])
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(within(openStop("Alice's Curious Labyrinth")).getByRole('button', { name: 'Move to top' }))
    expect(ids()).toEqual([ALICE, THUNDER, PETER, MANOR])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('the first stop can’t move to the top, and the last can’t move to the bottom', () => {
    renderPlan([THUNDER, MANOR])
    const first = openStop('Big Thunder Mountain')
    expect(within(first).getByRole('button', { name: 'Move to top' })).toBeDisabled()
    expect(within(first).getByRole('button', { name: 'Move to bottom' })).toBeEnabled()
  })

  test('Remove from day closes the sheet, and Undo puts the stop back in its place', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(within(openStop('Phantom Manor')).getByRole('button', { name: 'Remove from day' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ids()).toEqual([THUNDER, PETER])
    fireEvent.click(within(message('Removed Phantom Manor')).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, MANOR, PETER])
  })

  test('Details opens the item’s details above the sheet; Escape closes only the details', () => {
    renderPlan([THUNDER])
    fireEvent.click(within(openStop('Big Thunder Mountain')).getByRole('button', { name: 'Details' }))
    const sheets = screen.getAllByRole('dialog', { name: 'Big Thunder Mountain' })
    expect(sheets).toHaveLength(2)
    expect(within(sheets[1]!).getByText(/typical/)).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getAllByRole('dialog')).toEqual([sheets[0]])
  })

  test('closing the sheet gives focus back to the row', () => {
    renderPlan([THUNDER])
    const open = screen.getByRole('button', { name: 'Open stop 1, Big Thunder Mountain' })
    open.focus()
    openStop('Big Thunder Mountain')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(open).toHaveFocus()
  })
})

describe('every move says where the stop went, with Undo (trip-itinerary spec: Reorder and remove items)', () => {
  test('the stepper: "Moved … to stop 2", and Undo restores the order', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(within(openStop("Peter Pan's Flight")).getByRole('button', { name: "Move Peter Pan's Flight up" }))
    fireEvent.click(within(message("Moved Peter Pan's Flight to stop 2")).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, MANOR, PETER])
  })

  test('Move to top: "Moved … to stop 1", and Undo restores the order', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(within(openStop("Peter Pan's Flight")).getByRole('button', { name: 'Move to top' }))
    fireEvent.click(within(message("Moved Peter Pan's Flight to stop 1")).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, MANOR, PETER])
  })

  test('Move to bottom: "Moved … to stop 3", and Undo restores the order', () => {
    const { ids } = renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(within(openStop('Big Thunder Mountain')).getByRole('button', { name: 'Move to bottom' }))
    fireEvent.click(within(message('Moved Big Thunder Mountain to stop 3')).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, MANOR, PETER])
  })

  test('Undo does nothing once the day has changed again', () => {
    const { ids, store, day } = renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(within(openStop('Big Thunder Mountain')).getByRole('button', { name: 'Move to bottom' }))
    act(() => store.getState().addItem(day().id, ALICE))
    fireEvent.click(within(message('Moved Big Thunder Mountain to stop 3')).getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([MANOR, PETER, THUNDER, ALICE])
  })
})
