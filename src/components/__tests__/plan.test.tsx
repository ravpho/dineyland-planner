import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Day } from '../../domain/trip'
import PlanScreen, { dayParksLabel } from '../../screens/PlanScreen'
import { createPlannerStore } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { CreateTripForm } from '../CreateTripForm'
import { ToastProvider } from '../Toast'
import { DndContext } from '@dnd-kit/core'

const day = (itemIds: string[]): Day => ({ id: 'd', date: '2026-08-12', start: '09:30', end: '22:00', items: itemIds.map((itemId, i) => ({ key: `k${i}`, itemId })) })

describe('plan screens (trip-itinerary spec)', () => {
  test('the new-trip form is preset to 1 day', () => {
    renderWithPlanner(<CreateTripForm />)
    expect(screen.getByLabelText('Number of days')).toHaveValue('1')
  })

  test('day tab label shows the parks the day uses', () => {
    expect(dayParksLabel(day([]), sampleCatalog)).toBe('')
    expect(dayParksLabel(day(['dlp.big-thunder-mountain']), sampleCatalog)).toBe('DLP')
    expect(dayParksLabel(day(['daw.avengers-flight-force']), sampleCatalog)).toBe('DAW')
    expect(dayParksLabel(day(['daw.avengers-flight-force', 'dlp.big-thunder-mountain']), sampleCatalog)).toBe('DLP + DAW')
  })

  test('day settings have only a time window, no park', () => {
    const { store } = renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }))
    expect(store.getState().trips[0]!.days).toHaveLength(1)
    expect(screen.getByLabelText('Start')).toBeInTheDocument()
    expect(screen.getByLabelText('End')).toBeInTheDocument()
    expect(screen.queryByLabelText('Park')).toBeNull()
  })
})

describe('group by area (route-optimization spec)', () => {
  function renderPlan(itemIds: string[]) {
    const store = createPlannerStore(sampleCatalog)
    store.getState().createTrip('Trip', '2026-08-12')
    const dayId = store.getState().trips[0]!.days[0]!.id
    for (const id of itemIds) store.getState().addItem(dayId, id)
    return renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store },
    )
  }
  const names = () => screen.getAllByTestId('slot-name').map((n) => n.textContent)
  const button = () => screen.getByRole('button', { name: 'Group by area' })
  const message = (text: RegExp | string) => screen.getByText(text).closest('[role="status"]') as HTMLElement

  test('nothing to group with fewer than two items', () => {
    const { store } = renderPlan([])
    expect(button()).toBeDisabled()
    act(() => void store.getState().addItem(store.getState().trips[0]!.days[0]!.id, 'dlp.big-thunder-mountain'))
    expect(names()).toEqual(['Big Thunder Mountain'])
    expect(button()).toBeDisabled()
  })

  test('grouping shows the walking saved, and Undo restores the order', () => {
    renderPlan(['dlp.big-thunder-mountain', 'daw.avengers-flight-force', 'dlp.phantom-manor'])
    expect(button()).toBeEnabled()
    fireEvent.click(button())
    expect(names()).toEqual(['Big Thunder Mountain', 'Phantom Manor', 'Avengers Assemble: Flight Force'])
    const toast = message(/^Grouped by area · walking \d+ → \d+ min$/)
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    expect(names()).toEqual(['Big Thunder Mountain', 'Avengers Assemble: Flight Force', 'Phantom Manor'])
  })

  test('an already grouped day says so, without Undo', () => {
    renderPlan(['dlp.big-thunder-mountain', 'dlp.phantom-manor'])
    fireEvent.click(button())
    expect(within(message('Already grouped by area')).queryByRole('button')).toBeNull()
    expect(names()).toEqual(['Big Thunder Mountain', 'Phantom Manor'])
  })
})
