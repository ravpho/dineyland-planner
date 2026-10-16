import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import type { PlanItem } from '../../domain/trip'
import type { Day } from '../../domain/trip'
import PlanScreen from '../../screens/PlanScreen'
import { dayParksLabel } from '../DayHeader'
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
    fireEvent.click(screen.getByRole('button', { name: 'Edit hours and park order' }))
    expect(screen.getByLabelText('Start')).toBeInTheDocument()
    expect(screen.getByLabelText('End')).toBeInTheDocument()
    expect(screen.queryByLabelText('Park')).toBeNull()
  })

  test('change the hours from the day card (app-shell spec: Day first in My day)', () => {
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
    expect(screen.queryByRole('group', { name: 'Day hours' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit hours and park order' }))
    const sheet = screen.getByRole('dialog', { name: 'Day 1 · Wednesday 12 August' })
    const hours = within(sheet).getByRole('group', { name: 'Day hours' })
    fireEvent.change(within(hours).getByLabelText('Start'), { target: { value: '10:00' } })
    expect(store.getState().trips[0]!.days[0]!.start).toBe('10:00')
    fireEvent.change(within(hours).getByLabelText('End'), { target: { value: '18:00' } })
    expect(store.getState().trips[0]!.days[0]!.end).toBe('18:00')
    // The card behind the sheet updates at once, and the user is still in My day.
    expect(screen.getByTestId('day-card')).toHaveTextContent('10:00–18:00')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'My day' })).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: 'Group by area' })).toBeNull()
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
    expect(screen.queryByRole('button', { name: 'Optimize route' })).toBeNull()
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

describe('date chips and the day card (app-shell spec: Day first in My day)', () => {
  function renderTrip(days: number, items: string[][] = []) {
    const store = createPlannerStore(sampleCatalog)
    store.getState().createTrip('Trip', '2026-08-12', days)
    items.forEach((ids, i) => ids.forEach((id) => store.getState().addItem(store.getState().trips[0]!.days[i]!.id, id)))
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store },
    )
    return store
  }
  const chips = () => within(screen.getByRole('tablist', { name: 'Days' })).getAllByRole('tab')

  test('one chip per day, named in full and showing the weekday and date', () => {
    renderTrip(3, [['dlp.big-thunder-mountain', 'daw.avengers-flight-force']])
    // Node writes "Wed 12 Aug" and browsers "Wed, 12 Aug".
    expect(chips().map((c) => c.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(chips()[0]).toHaveAccessibleName(/^Day 1 · Wed,? 12 Aug · DLP \+ DAW$/)
    expect(chips()[1]).toHaveAccessibleName(/^Day 2 · Thu,? 13 Aug$/)
    expect(chips()[2]).toHaveAccessibleName(/^Day 3 · Fri,? 14 Aug$/)
    expect([...chips()[1]!.querySelectorAll('[aria-hidden]')].map((e) => e.textContent)).toEqual(['Thu', '13', ''])
    expect(chips()[0]).toHaveAttribute('aria-selected', 'true')
  })

  test('selecting a chip shows that day', () => {
    const store = renderTrip(2)
    fireEvent.click(screen.getByRole('tab', { name: /^Day 2/ }))
    expect(store.getState().selectedDayId).toBe(store.getState().trips[0]!.days[1]!.id)
    expect(screen.getByRole('tab', { name: /^Day 2/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('day-card')).toHaveTextContent('Day 2 · Thursday')
    expect(screen.getByTestId('day-card')).toHaveTextContent('13 August')
  })

  test('the card shows the date, hours and stops, and the ticket reminder on a two-park day', () => {
    renderTrip(1, [['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'daw.avengers-flight-force']])
    const card = screen.getByTestId('day-card')
    expect(card).toHaveTextContent('Day 1 · Wednesday')
    expect(card).toHaveTextContent('12 August')
    expect(within(card).getByTestId('day-card-stops')).toHaveTextContent('3 stops')
    expect(within(card).getByTestId('ticket-reminder')).toHaveTextContent('Ticket valid for both parks · Disneyland Park → Disney Adventure World')
  })

  test('a one-park day has no ticket reminder', () => {
    renderTrip(1, [['dlp.big-thunder-mountain', 'dlp.phantom-manor']])
    expect(screen.queryByTestId('ticket-reminder')).toBeNull()
  })

  test('an empty day says it has no stops yet', () => {
    renderTrip(1)
    expect(screen.getByTestId('day-card-stops')).toHaveTextContent('No stops yet')
  })
})
