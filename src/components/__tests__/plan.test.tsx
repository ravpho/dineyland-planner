import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import type { PlanItem } from '../../domain/trip'
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

  test('change the hours in place (app-shell spec: Day first on the Plan)', () => {
    const store = createPlannerStore(sampleCatalog)
    store.getState().createTrip('Trip', '2026-08-12')
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store },
    )
    const hours = screen.getByRole('group', { name: 'Day hours' })
    fireEvent.change(within(hours).getByLabelText('Start'), { target: { value: '10:00' } })
    expect(store.getState().trips[0]!.days[0]!.start).toBe('10:00')
    fireEvent.change(within(hours).getByLabelText('End'), { target: { value: '18:00' } })
    expect(store.getState().trips[0]!.days[0]!.end).toBe('18:00')
    expect(screen.queryByRole('dialog')).toBeNull()
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

describe('optimize route (route-optimization spec)', () => {
  const real = parseCatalog(catalogJson)
  afterEach(() => vi.useRealTimers())

  function renderPlan(entries: (string | Omit<PlanItem, 'key'>)[], catalog = real) {
    const store = createPlannerStore(catalog)
    store.getState().createTrip('Trip', '2026-08-12')
    const dayId = store.getState().trips[0]!.days[0]!.id
    for (const e of entries) {
      const entry = typeof e === 'string' ? { itemId: e } : e
      store.getState().addItem(dayId, entry.itemId, entry)
    }
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store, catalog },
    )
    return store
  }
  const names = () => screen.getAllByTestId('slot-name').map((n) => n.textContent)
  const button = () => screen.getByRole('button', { name: 'Optimize route' })
  const message = (text: RegExp | string) => screen.getByText(text).closest('[role="status"]') as HTMLElement
  /** Taps Optimize route and runs the deferred search, but not the toast's own timer. */
  const optimize = () => {
    vi.useFakeTimers()
    fireEvent.click(button())
    act(() => vi.advanceTimersByTime(1))
  }

  test('nothing to optimize with fewer than two items', () => {
    const store = renderPlan([])
    expect(button()).toBeDisabled()
    act(() => void store.getState().addItem(store.getState().trips[0]!.days[0]!.id, 'dlp.big-thunder-mountain'))
    expect(button()).toBeDisabled()
  })

  test('optimizing shows the end and queueing and walking before and after, and Undo restores the order', () => {
    renderPlan(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    optimize()
    expect(names()).toEqual(["Crush's Coaster", 'Frozen Ever After', 'Phantom Manor', 'Big Thunder Mountain'])
    const toast = message(/^Route optimized · ends \d{2}:\d{2} → \d{2}:\d{2} · queues and walking \d+ → \d+ min$/)
    expect(toast).toHaveTextContent('Route optimized · ends 14:29 → 13:19 · queues and walking 280 → 210 min')
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    expect(names()).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"])
  })

  describe('sparkle (app-shell spec: Reduced motion)', () => {
    afterEach(() => vi.unstubAllGlobals())
    /** Pretends the device asks for reduced motion, or not. */
    const reduceMotion = (reduce: boolean) =>
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }))
    const day = ['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster']

    test('sparkle after optimizing: it plays by the button, in the same update as the message', () => {
      reduceMotion(false)
      renderPlan(day)
      optimize()
      expect(screen.getByTestId('sparkle')).toBeInTheDocument()
      expect(button().parentElement).toContainElement(screen.getByTestId('sparkle'))
      expect(message(/^Route optimized/)).toBeInTheDocument()
    })

    test('no sparkle with reduced motion, and the message still shows', () => {
      reduceMotion(true)
      renderPlan(day)
      optimize()
      expect(screen.queryByTestId('sparkle')).toBeNull()
      expect(message(/^Route optimized/)).toBeInTheDocument()
    })

    test('the sparkle is gone after 1 s at most', () => {
      reduceMotion(false)
      renderPlan(day)
      optimize()
      act(() => vi.advanceTimersByTime(1000))
      expect(screen.queryByTestId('sparkle')).toBeNull()
      expect(message(/^Route optimized/)).toBeInTheDocument()
    })

    test('no sparkle when no quicker order is found', () => {
      reduceMotion(false)
      renderPlan(day)
      optimize()
      act(() => vi.advanceTimersByTime(1000))
      // Optimizing an optimized day finds nothing quicker.
      fireEvent.click(button())
      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByText('No quicker order found')).toBeInTheDocument()
      expect(screen.queryByTestId('sparkle')).toBeNull()
    })
  })

  test('a changed show time is named in the message', () => {
    renderPlan([
      'daw.crushs-coaster', 'daw.frozen-ever-after', { itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' }, 'dlp.big-thunder-mountain',
      'dlp.phantom-manor', 'dlp.peter-pans-flight', { itemId: 'dlp.the-lion-king-rhythms-of-the-pride-lands', showTime: '16:45' }, 'dlp.star-wars-hyperspace-mountain',
    ])
    optimize()
    expect(message(/^Route optimized/)).toHaveTextContent(/ · The Lion King: Rhythms of the Pride Lands 16:45 → 13:10Undo$/)
    expect(screen.getByRole('combobox', { name: 'Start time for The Lion King: Rhythms of the Pride Lands' })).toHaveValue('13:10')
  })

  test('no quicker order: says so, without Undo', () => {
    renderPlan(['daw.crushs-coaster', 'daw.frozen-ever-after'])
    optimize()
    expect(within(message('No quicker order found')).queryByRole('button')).toBeNull()
    expect(names()).toEqual(["Crush's Coaster", 'Frozen Ever After'])
  })

  test('the button says Optimizing… until the search has run', () => {
    renderPlan(['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor', 'daw.crushs-coaster'])
    vi.useFakeTimers()
    fireEvent.click(button())
    expect(screen.getByRole('button', { name: 'Optimizing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Group by area' })).toBeDisabled()
    expect(names()).toEqual(['Big Thunder Mountain', 'Frozen Ever After', 'Phantom Manor', "Crush's Coaster"])
    act(() => vi.advanceTimersByTime(1))
    expect(button()).toBeEnabled()
    expect(names()[0]).toBe("Crush's Coaster")
  })
})

describe('trip options (app-shell spec: Trip actions in a trip menu)', () => {
  afterEach(() => vi.restoreAllMocks())

  function renderTrip() {
    const store = createPlannerStore(sampleCatalog)
    store.getState().createTrip('Summer trip', '2026-08-12', 2)
    const view = renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store },
    )
    return { ...view, store }
  }
  const options = () => screen.getByRole('dialog', { name: 'Trip options' })

  test('open the menu: it offers New trip, Rename and Delete', () => {
    renderTrip()
    expect(screen.queryByRole('button', { name: /Rename/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    expect(within(options()).getByRole('button', { name: /New trip/ })).toBeInTheDocument()
    expect(within(options()).getByRole('button', { name: /Rename/ })).toBeInTheDocument()
    expect(within(options()).getByRole('button', { name: /Delete/ })).toBeInTheDocument()
  })

  test('share in one tap: the share sheet opens from the trip row', () => {
    renderTrip()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByRole('dialog', { name: 'Share this trip' })).toBeInTheDocument()
  })

  test('delete from the menu: the menu closes, then the app asks to confirm', () => {
    const { store } = renderTrip()
    let sheetOpenWhenAsked: boolean | undefined
    const confirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
      sheetOpenWhenAsked = screen.queryByRole('dialog', { name: 'Trip options' }) !== null
      return false
    })
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    fireEvent.click(within(options()).getByRole('button', { name: /Delete/ }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(sheetOpenWhenAsked).toBe(false)
    expect(store.getState().trips).toHaveLength(1)

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    fireEvent.click(within(options()).getByRole('button', { name: /Delete/ }))
    expect(store.getState().trips).toHaveLength(0)
  })

  test('rename from the menu', () => {
    const { store } = renderTrip()
    vi.spyOn(window, 'prompt').mockReturnValue('Winter trip')
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    fireEvent.click(within(options()).getByRole('button', { name: /Rename/ }))
    expect(store.getState().trips[0]!.name).toBe('Winter trip')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('new trip from the menu opens the new-trip form', () => {
    renderTrip()
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    fireEvent.click(within(options()).getByRole('button', { name: /New trip/ }))
    expect(screen.queryByRole('dialog', { name: 'Trip options' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'New trip' })).toBeInTheDocument()
  })

  test('close without choosing: the trip is unchanged', () => {
    const { store } = renderTrip()
    const before = store.getState().trips
    fireEvent.click(screen.getByRole('button', { name: 'Trip options' }))
    fireEvent.click(within(options()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store.getState().trips).toBe(before)
  })
})
