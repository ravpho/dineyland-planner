import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import { scheduleDay, type ScheduledSlot } from '../../domain/schedule'
import { formatClock } from '../../domain/time'
import type { Day, PlanItem } from '../../domain/trip'
import { createPlannerStore, selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { openStop } from '../../test/stops'
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
  test('each row shows its walk, wait, start and end; the arrival is in its sheet', () => {
    const schedule = renderDay(day(['dlp.big-thunder-mountain']))
    const slot = schedule.slots[0] as ScheduledSlot
    const [row] = slots()
    expect(within(row!).getByTestId('slot-time')).toHaveTextContent(`${formatClock(slot.start)}–${formatClock(slot.end)}`)
    expect(within(row!).getByTestId('slot-walk')).toHaveTextContent(`${slot.walk} min`)
    expect(within(row!).getByText(/from the entrance/)).toBeInTheDocument()
    expect(within(row!).getByText(new RegExp(`wait ${slot.wait} min`))).toBeInTheDocument()
    expect(within(row!).queryByText(/arrive/)).toBeNull()
    expect(within(openStop('Big Thunder Mountain')).getByTestId('stop-times')).toHaveTextContent(`Arrive${formatClock(slot.arrive)}`)
  })

  test('one button opens the stop, named with its number; the grip is separate', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'dlp.phantom-manor']))
    expect(within(slots()[1]!).getByRole('button', { name: 'Open stop 2, Phantom Manor' })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(slots()[1]!).getByRole('button', { name: 'Reorder Phantom Manor' })).toHaveAttribute('data-testid', 'slot-handle')
    expect(within(slots()[1]!).queryByRole('button', { name: /Move|Remove/ })).toBeNull()
  })

  test('a restaurant with quicker options of the same kind says how many', () => {
    const real = parseCatalog(catalogJson)
    const d = day(['daw.crushs-coaster', 'daw.frozen-ever-after', 'daw.twilight-zone-tower-of-terror'])
    d.items.push({ key: 'lunch', itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' })
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <DayTimeline day={d} schedule={scheduleDay(d, real)} />
        </DndContext>
      </ToastProvider>,
      { catalog: real },
    )
    expect(within(slots()[3]!).getByText(/^\d+ quicker options?$/)).toBeInTheDocument()
    expect(within(slots()[0]!).queryByText(/quicker option/)).toBeNull()
  })

  test('unsuitable items carry their reason', () => {
    renderDay(day(['dlp.star-wars-hyperspace-mountain']), { heightCm: 110 })
    expect(within(slots()[0]!).getByText('Needs 120 cm')).toBeInTheDocument()
  })

  test('late shows are flagged with when you arrive and when to be there (day-schedule spec: Late flags say why)', () => {
    const schedule = renderDay(day(['dlp.walts', 'dlp.walts', 'dlp.walts', ['dlp.parade', '13:30']]))
    const show = schedule.slots[3] as ScheduledSlot
    expect(within(slots()[3]!).getByText(`${show.lateBy} min late`)).toBeInTheDocument()
    expect(within(slots()[3]!).getByTestId('late-note')).toHaveTextContent(`arrives ${formatClock(show.arrive)} · be there by 13:10`)
    expect(within(openStop('Disney Stars on Parade')).getByTestId('late-explanation')).toHaveTextContent(
      `You’d arrive at ${formatClock(show.arrive)}, ${show.lateBy} min after the recommended 13:10.`,
    )
  })

  test('a late meal is due 30 min after its meal time', () => {
    const schedule = renderDay({ ...day(['dlp.walts', 'dlp.walts']), items: [...day(['dlp.walts', 'dlp.walts']).items, { key: 'm', itemId: 'dlp.cafe-hyperion', mealTime: '11:00' }] })
    const meal = schedule.slots[2] as ScheduledSlot
    expect(within(slots()[2]!).getByTestId('late-note')).toHaveTextContent(`arrives ${formatClock(meal.arrive)} · be there by 11:30`)
    expect(within(openStop('Café Hyperion')).getByTestId('late-explanation')).toHaveTextContent('after the latest arrival for this meal, 11:30')
  })

  test('tags: lunch and dinner times, and the show time with its lock', () => {
    renderDay({
      ...day([]),
      items: [
        { key: 'a', itemId: 'dlp.cafe-hyperion', mealTime: '12:30' },
        { key: 'b', itemId: 'dlp.parade', showTime: '17:30', timeLocked: true },
        { key: 'c', itemId: 'dlp.walts', mealTime: '19:00' },
      ],
    })
    expect(within(slots()[0]!).getByText('Lunch 12:30')).toBeInTheDocument()
    expect(within(slots()[1]!).getByText(/^Show 17:30/)).toHaveTextContent('Show 17:30 (time kept when optimizing)')
    expect(within(slots()[2]!).getByText('Dinner 19:00')).toBeInTheDocument()
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

  test('items not in the catalog show "No longer available", with Remove on the row', () => {
    renderDay(day(['dlp.retired', 'dlp.peter-pans-flight']))
    expect(within(slots()[0]!).getByText('No longer available')).toBeInTheDocument()
    expect(within(slots()[0]!).queryByRole('button', { name: /^Open stop/ })).toBeNull()
    fireEvent.click(within(slots()[0]!).getByRole('button', { name: 'Remove No longer available' }))
    expect(screen.getByText('Removed No longer available')).toBeInTheDocument()
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
    // The walk is in the note, so the row has no walk line of its own.
    expect(within(slots()[1]!).queryByTestId('slot-walk')).toBeNull()
    expect(screen.getByTestId('first-park')).toHaveTextContent('Disneyland Park')
    expect(screen.getByTestId('two-park-note')).toHaveTextContent(/ticket valid for Disneyland Park and Disney Adventure World/)
  })

  test('two-park reminder kept: the note has the ticket text, the park order and Switch order (app-shell spec)', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'daw.avengers-flight-force']))
    const note = screen.getByTestId('two-park-note')
    expect(note).toHaveTextContent('You need a ticket valid for Disneyland Park and Disney Adventure World on the same day.')
    expect(within(note).getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World')
    expect(within(note).getByRole('button', { name: 'Switch order' })).toBeInTheDocument()
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
    expect(screen.queryByTestId('two-park-note')).toBeNull()
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

  test('an entry no longer available gets a hollow rail node without a number (midnight-theme design Decision 5)', () => {
    renderDay(day(['dlp.big-thunder-mountain', 'dlp.retired', 'dlp.phantom-manor']))
    const missing = within(slots()[1]!).getByTestId('slot-node-missing')
    expect(missing).toHaveTextContent('')
    expect(slots().map((s) => within(s).queryByTestId('slot-node-missing') !== null)).toEqual([false, true, false])
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
    fireEvent.click(within(openStop("Peter Pan's Flight")).getByRole('button', { name: "Move Peter Pan's Flight up" }))
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
  /** Switch order lives in the day sheet, opened from the day card (refresh-plan-layout design Decision 4). */
  const openDay = () => fireEvent.click(screen.getByRole('button', { name: 'Edit hours and park order' }))
  const warning = () => screen.queryByRole('dialog', { name: /^Start in/ })
  const lunchAndParade = [THUNDER, { itemId: CHALET, mealTime: '12:00' }, MANOR, CRUSH, { itemId: PARADE, showTime: '17:30' }]

  test('one visit to each park: the order is shown and the switch is available', () => {
    renderPlan([THUNDER, MANOR, CRUSH, FROZEN])
    openDay()
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World')
    expect(switchButton()).toBeEnabled()
    expect(screen.queryByTestId('park-order-hint')).toBeNull()
  })

  test('back and forth: the switch is unavailable, with a hint to group by area first', () => {
    renderPlan([THUNDER, CRUSH, MANOR])
    openDay()
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World → Disneyland Park')
    expect(switchButton()).toBeDisabled()
    expect(switchButton()).toHaveAccessibleDescription(/Group by area first so each park's attractions are together/)
  })

  test('grouped after the hint: grouping by area makes the switch available', () => {
    renderPlan([THUNDER, CRUSH, MANOR])
    fireEvent.click(screen.getByRole('button', { name: 'Group by area' }))
    openDay()
    expect(screen.getByTestId('park-order-text')).toHaveTextContent('Disneyland Park → Disney Adventure World')
    expect(switchButton()).toBeEnabled()
  })

  test('lunch in the other park: the reminder shows, without a park order', () => {
    renderPlan([THUNDER, MANOR, { itemId: 'daw.regal-view-restaurant', mealTime: '12:00' }])
    expect(screen.getByTestId('ticket-reminder')).toHaveTextContent('Ticket valid for both parks')
    expect(screen.queryByTestId('card-park-order')).toBeNull()
    openDay()
    expect(screen.getByTestId('two-park-note')).toBeInTheDocument()
    expect(screen.queryByTestId('park-order')).toBeNull()
  })

  test('lunch and a parade: the warning names both with their times', () => {
    renderPlan(lunchAndParade)
    openDay()
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
    openDay()
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Switch and remove 2' }))
    expect(warning()).toBeNull()
    expect(ids()).toEqual([CRUSH, THUNDER, MANOR])
  })

  test('cancel: the day keeps its order, restaurant and parade', () => {
    const { ids } = renderPlan(lunchAndParade)
    openDay()
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(warning()).toBeNull()
    expect(ids()).toEqual([THUNDER, CHALET, MANOR, CRUSH, PARADE])
  })

  test('only attractions: switched at once without a warning, and the message has no count', () => {
    const { ids } = renderPlan([THUNDER, MANOR, CRUSH, FROZEN])
    openDay()
    fireEvent.click(switchButton())
    expect(warning()).toBeNull()
    expect(ids()).toEqual([CRUSH, FROZEN, THUNDER, MANOR])
    expect(screen.getByText('Disney Adventure World first')).toBeInTheDocument()
  })

  test('see the result and undo: the message counts the removed items, and Undo restores them', () => {
    const { ids } = renderPlan(lunchAndParade)
    openDay()
    fireEvent.click(switchButton())
    fireEvent.click(screen.getByRole('button', { name: 'Switch and remove 2' }))
    expect(screen.getByText('Disney Adventure World first · 2 removed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(ids()).toEqual([THUNDER, CHALET, MANOR, CRUSH, PARADE])
  })
})
