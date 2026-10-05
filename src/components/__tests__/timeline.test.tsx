import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import { scheduleDay } from '../../domain/schedule'
import type { Day, PlanItem } from '../../domain/trip'
import { createPlannerStore, selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import PlanScreen from '../../screens/PlanScreen'
import { DayTimeline } from '../DayTimeline'
import { Breakdown, FitBar, TicketReminder } from '../FitSummary'
import { ToastProvider } from '../Toast'

function renderDay(day: Day, profile?: { heightCm?: number }) {
  const schedule = scheduleDay(day, sampleCatalog, profile)
  renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <TicketReminder schedule={schedule} day={day} />
        <DayTimeline day={day} schedule={schedule} />
        <Breakdown schedule={schedule} />
        <FitBar schedule={schedule} />
      </DndContext>
    </ToastProvider>,
  )
  return schedule
}

const day = (items: (string | [string, string])[], start = '09:30', end = '22:00'): Day => ({
  id: 'd', date: '2026-08-12', start, end,
  items: items.map((x, i) => (typeof x === 'string' ? { key: `k${i}`, itemId: x } : { key: `k${i}`, itemId: x[0], showTime: x[1] })),
})
const slots = () => screen.getAllByTestId('timeline-slot')

describe('timeline marks (day-schedule spec)', () => {
  test('each slot shows walk, arrival, wait, start and end', () => {
    renderDay(day(['dlp.big-thunder-mountain']))
    const [slot] = slots()
    expect(within(slot!).getByTestId('slot-time')).toHaveTextContent(/^\d{2}:\d{2}–\d{2}:\d{2}$/)
    expect(within(slot!).getByText(/arrive \d{2}:\d{2}/)).toBeInTheDocument()
    expect(within(slot!).getByText(/wait \d+ min/)).toBeInTheDocument()
    expect(within(slot!).getByText('(typical)')).toBeInTheDocument()
  })

  test('unsuitable items carry their reason', () => {
    renderDay(day(['dlp.star-wars-hyperspace-mountain']), { heightCm: 110 })
    expect(within(slots()[0]!).getByText('Needs 120 cm')).toBeInTheDocument()
  })

  test('late shows are flagged', () => {
    renderDay(day(['dlp.walts', 'dlp.walts', 'dlp.walts', ['dlp.parade', '13:30']]))
    expect(within(slots()[3]!).getByText(/\d+ min late/)).toBeInTheDocument()
  })

  test('free time before a show is shown', () => {
    renderDay(day([['dlp.parade', '17:30']], '16:00'))
    expect(screen.getByTestId('free-time')).toHaveTextContent(/Free time/)
  })

  test('items ending after the window are marked and the summary says Over by', () => {
    renderDay(day(['dlp.walts', 'dlp.walts'], '09:30', '11:00'))
    expect(within(slots()[1]!).getByText('Ends after 11:00')).toBeInTheDocument()
    expect(screen.getByTestId('fit-summary')).toHaveTextContent(/Over by \d+ min/)
  })

  test('items not in the catalog show "No longer available"', () => {
    renderDay(day(['dlp.retired', 'dlp.peter-pans-flight']))
    expect(within(slots()[0]!).getByText('No longer available')).toBeInTheDocument()
  })

  test('fit summary and breakdown', () => {
    const s = renderDay(day(['dlp.big-thunder-mountain'], '09:30', '18:00'))
    expect(screen.getByTestId('fit-summary')).toHaveTextContent(/^Fits · .+ spare/)
    expect(s.fits).toBe(true)
    const breakdown = screen.getByTestId('breakdown')
    for (const label of ['Queueing', 'Attractions', 'Meals', 'Shows', 'Walking', 'Free time']) expect(within(breakdown).getByText(label)).toBeInTheDocument()
  })

  test('park-hopping day: park change is labelled and the ticket reminder shows', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'daw.avengers-flight-force']))
    const changes = screen.getAllByTestId('park-change')
    expect(changes).toHaveLength(1)
    expect(changes[0]).toHaveTextContent(/Walk to Disney Adventure World · park change · \d+ min/)
    expect(within(slots()[1]!).getByTestId('park-change')).toBeInTheDocument()
    expect(screen.getByTestId('ticket-reminder')).toHaveTextContent(/ticket valid for Disneyland Park and Disney Adventure World/)
  })

  test('each item shows its area', () => {
    renderDay(day(['dlp.peter-pans-flight']))
    expect(within(slots()[0]!).getByTestId('slot-area')).toHaveTextContent('Fantasyland')
  })

  test('items from both parks show their own areas', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'daw.avengers-flight-force']))
    expect(screen.getAllByTestId('slot-area').map((a) => a.textContent)).toEqual(['Frontierland', 'Avengers Campus'])
  })

  test('an entry no longer available shows no area', () => {
    renderDay(day(['dlp.retired']))
    expect(within(slots()[0]!).queryByTestId('slot-area')).toBeNull()
  })

  test('single-park day: no park change and no ticket reminder', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'dlp.phantom-manor']))
    expect(screen.queryByTestId('park-change')).toBeNull()
    expect(screen.queryByTestId('ticket-reminder')).toBeNull()
  })
})

describe('stop numbers in the timeline (day-schedule spec)', () => {
  const stopsShown = () => slots().map((s) => within(s).queryByTestId('slot-stop')?.textContent ?? null)

  test('numbers in plan order', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight']))
    expect(stopsShown()).toEqual(['Stop 1', 'Stop 2', 'Stop 3'])
  })

  test('an entry no longer available has no number and is not counted', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'dlp.retired', 'dlp.phantom-manor']))
    expect(stopsShown()).toEqual(['Stop 1', null, 'Stop 2'])
  })

  test('reorder: the moved item and the one it passed swap numbers', () => {
    const { store } = renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
    )
    act(() => {
      store.getState().createTrip('Trip', '2026-08-12', 1)
      const id = selectedDay(store.getState())!.id
      for (const item of ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight']) store.getState().addItem(id, item)
    })
    fireEvent.click(screen.getByRole('button', { name: "Move Peter Pan's Flight up" }))
    const byName = (name: string) => within(slots().find((s) => within(s).queryByTestId('slot-name')?.textContent === name)!).getByTestId('slot-stop')
    expect(byName("Peter Pan's Flight")).toHaveTextContent('Stop 2')
    expect(byName('Phantom Manor')).toHaveTextContent('Stop 3')
  })
})

describe('park order and switch (trip-itinerary spec)', () => {
  const real = parseCatalog(catalogJson)
  const THUNDER = 'dlp.big-thunder-mountain'
  const MANOR = 'dlp.phantom-manor'
  const CRUSH = 'daw.crushs-coaster'
  const FROZEN = 'daw.frozen-ever-after'
  const CHALET = 'dlp.au-chalet-de-la-marionnette'
  const PARADE = 'dlp.disney-stars-on-parade'

  function renderPlan(entries: (string | Omit<PlanItem, 'key'>)[]) {
    const store = createPlannerStore(real)
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
      { store, catalog: real },
    )
    return { store, ids: () => selectedDay(store.getState())!.items.map((e) => e.itemId) }
  }
  const switchButton = () => screen.getByRole('button', { name: 'Switch order' })
  const lunchAndParade = [THUNDER, { itemId: CHALET, mealTime: '12:00' }, MANOR, CRUSH, { itemId: PARADE, showTime: '17:30' }]

  test('one visit to each park: the order is shown and the switch is available', () => {
    renderPlan([THUNDER, MANOR, CRUSH, FROZEN])
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World')
    expect(switchButton()).toBeEnabled()
    expect(screen.queryByTestId('park-order-hint')).toBeNull()
  })

  test('back and forth: the switch is unavailable, with a hint to group by area first', () => {
    renderPlan([THUNDER, CRUSH, MANOR])
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World → Disneyland Park')
    expect(switchButton()).toBeDisabled()
    expect(switchButton()).toHaveAccessibleDescription(/Group by area first so each park's attractions are together/)
  })

  test('grouped after the hint: grouping by area makes the switch available', () => {
    renderPlan([THUNDER, CRUSH, MANOR])
    fireEvent.click(screen.getByRole('button', { name: 'Group by area' }))
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World')
    expect(switchButton()).toBeEnabled()
  })

  test('lunch in the other park: the reminder shows, without a park order', () => {
    renderPlan([THUNDER, MANOR, { itemId: 'daw.regal-view-restaurant', mealTime: '12:00' }])
    expect(screen.getByTestId('ticket-reminder')).toBeInTheDocument()
    expect(screen.queryByTestId('park-order')).toBeNull()
  })

  test('lunch and a parade: the warning names both with their times', () => {
    renderPlan(lunchAndParade)
    fireEvent.click(switchButton())
    const sheet = screen.getByRole('dialog', { name: 'Start in Disney Adventure World?' })
    expect(within(within(sheet).getByTestId('switch-removed')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Au Chalet de la Marionnette (12:00)',
      'Disney Stars on Parade (17:30)',
    ])
    expect(within(sheet).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Switch and remove 2' })).toBeInTheDocument()
  })

  test('confirm: the parks are switched and the restaurant and parade are removed', () => {
    const { ids } = renderPlan(lunchAndParade)
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Switch and remove 2' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ids()).toEqual([CRUSH, THUNDER, MANOR])
  })

  test('cancel: the day keeps its order, restaurant and parade', () => {
    const { ids } = renderPlan(lunchAndParade)
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ids()).toEqual([THUNDER, CHALET, MANOR, CRUSH, PARADE])
  })

  test('only attractions: switched at once without a warning, and the message has no count', () => {
    const { ids } = renderPlan([THUNDER, MANOR, CRUSH, FROZEN])
    fireEvent.click(switchButton())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(ids()).toEqual([CRUSH, FROZEN, THUNDER, MANOR])
    expect(screen.getByText('Disney Adventure World first')).toBeInTheDocument()
  })

  test('see the result and undo: the message counts the removed items, and Undo restores them', () => {
    const { ids } = renderPlan(lunchAndParade)
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Switch and remove 2' }))
    expect(screen.getByText('Disney Adventure World first · 2 removed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, CHALET, MANOR, CRUSH, PARADE])
  })
})
