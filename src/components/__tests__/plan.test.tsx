import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { Day } from '../../domain/trip'
import PlanScreen, { dayParksLabel } from '../../screens/PlanScreen'
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
