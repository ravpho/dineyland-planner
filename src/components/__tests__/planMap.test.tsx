import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import { scheduleDay, type ScheduledSlot } from '../../domain/schedule'
import { formatClock } from '../../domain/time'
import PlanScreen from '../../screens/PlanScreen'
import { createPlannerStore, selectedDay, selectedTrip } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { CatalogList } from '../CatalogList'
import { ToastProvider } from '../Toast'

const real = parseCatalog(catalogJson)
const THUNDER = 'dlp.big-thunder-mountain'
const MANOR = 'dlp.phantom-manor'
const PETER = 'dlp.peter-pans-flight'
const CRUSH = 'daw.crushs-coaster'
const FROZEN = 'daw.frozen-ever-after'

const wrap = (ui: React.ReactElement) => (
  <ToastProvider>
    <DndContext>{ui}</DndContext>
  </ToastProvider>
)

/** Stands in for the phone's Catalog and Plan tabs. */
function Tabs() {
  const [tab, setTab] = useState<'Catalog' | 'Plan'>('Plan')
  return (
    <>
      <button type="button" onClick={() => setTab(tab === 'Plan' ? 'Catalog' : 'Plan')}>
        Open {tab === 'Plan' ? 'Catalog' : 'Plan'} tab
      </button>
      {tab === 'Plan' ? <PlanScreen /> : <CatalogList />}
    </>
  )
}

/** The Plan of a trip whose days hold `days` (item ids), with Day 1 selected. */
function renderPlan(...days: string[][]) {
  const store = createPlannerStore(real)
  store.getState().createTrip('Trip', '2026-08-12', Math.max(1, days.length))
  const trip = selectedTrip(store.getState())!
  days.forEach((ids, i) => ids.forEach((id) => store.getState().addItem(trip.days[i]!.id, id)))
  const r = renderWithPlanner(wrap(<Tabs />), { store, catalog: real })
  return { ...r, store, day: () => selectedDay(store.getState())! }
}

const showMap = () => fireEvent.click(screen.getByRole('button', { name: 'Map' }))
const planMap = () => screen.getByTestId('plan-map')
const parkButton = (name: string) => within(within(planMap()).getByRole('group', { name: 'Park on the map' })).getByRole('button', { name: new RegExp(`^${name}`) })
const stopNumbers = () => within(planMap()).getAllByTestId('route-stop').map((s) => [s.getAttribute('data-item'), s.textContent])

describe('map of the day in the plan (park-map spec)', () => {
  test('switch to the map: the day’s stops, numbered and named, and nothing else from the catalog', () => {
    renderPlan([THUNDER, MANOR, PETER])
    expect(screen.queryByTestId('plan-map')).toBeNull()
    showMap()
    expect(screen.queryByTestId('timeline-slot')).toBeNull()
    expect(within(planMap()).getAllByTestId('map-marker').map((m) => m.getAttribute('aria-label'))).toEqual(["Big Thunder Mountain", 'Phantom Manor', "Peter Pan's Flight"])
    expect(stopNumbers()).toEqual([
      [THUNDER, '1'],
      [MANOR, '2'],
      [PETER, '3'],
    ])
    expect(within(planMap()).getAllByTestId('route-segment')).toHaveLength(2)
    expect(within(planMap()).getAllByTestId('map-label').length).toBeGreaterThan(0)
  })

  test('the map offers no way to reorder or remove items', () => {
    renderPlan([THUNDER, MANOR])
    showMap()
    expect(within(planMap()).queryByRole('button', { name: /Move|Remove|Reorder/ })).toBeNull()
  })

  test('map follows the plan: an item moved up in the timeline carries its new number', () => {
    renderPlan([THUNDER, MANOR, PETER])
    fireEvent.click(screen.getByRole('button', { name: "Move Peter Pan's Flight up" }))
    showMap()
    expect(stopNumbers()).toContainEqual([PETER, '2'])
  })

  test('park change on the plan map: dashed to the entrance marked "to Disney Adventure World"', () => {
    renderPlan([THUNDER, FROZEN])
    showMap()
    expect(parkButton('Disneyland Park')).toHaveAttribute('aria-pressed', 'true')
    expect(within(planMap()).getAllByTestId('route-segment').some((s) => s.getAttribute('data-dashed') === 'true')).toBe(true)
    expect(within(planMap()).getByTestId('route-marker')).toHaveTextContent('to Disney Adventure World')
  })

  test('the fit status stays with the map', () => {
    renderPlan([THUNDER])
    showMap()
    expect(screen.getByTestId('fit-summary')).toHaveTextContent(/Fits|Over by/)
  })
})

describe('park shown on the plan map (park-map spec)', () => {
  test('a day that starts in the second park opens on Disney Adventure World', () => {
    renderPlan([CRUSH, THUNDER])
    showMap()
    expect(parkButton('Disney Adventure World')).toHaveAttribute('aria-pressed', 'true')
    expect(within(planMap()).getAllByTestId('map-marker').map((m) => m.getAttribute('aria-label'))).toEqual(["Crush's Coaster"])
  })

  test('the park switch says which stops are in each park', () => {
    renderPlan([THUNDER, MANOR, PETER, 'dlp.its-a-small-world', CRUSH, FROZEN, 'daw.ratatouille-the-adventure'])
    showMap()
    expect(within(parkButton('Disneyland Park')).getByTestId('park-stops')).toHaveTextContent('stops 1–4')
    expect(within(parkButton('Disney Adventure World')).getByTestId('park-stops')).toHaveTextContent('stops 5–7')
    fireEvent.click(parkButton('Disney Adventure World'))
    expect(stopNumbers().map(([, n]) => n)).toEqual(['5', '6', '7'])
  })

  test('an empty day shows Disneyland Park and "Nothing planned yet"', () => {
    renderPlan([])
    showMap()
    expect(parkButton('Disneyland Park')).toHaveAttribute('aria-pressed', 'true')
    expect(within(planMap()).getByText('Nothing planned yet')).toBeInTheDocument()
    expect(within(planMap()).getByTestId('park-map')).toBeInTheDocument()
  })
})

describe('plan view kept for the session (park-map spec)', () => {
  test('back from the catalog: the plan map is still shown', () => {
    const { store } = renderPlan([THUNDER])
    showMap()
    fireEvent.click(screen.getByRole('button', { name: 'Open Catalog tab' }))
    expect(screen.queryByTestId('plan-map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open Plan tab' }))
    expect(planMap()).toBeInTheDocument()
    expect(store.getState().planView).toBe('map')
  })

  test('another day: the map shows that day, on the park of its first item', () => {
    renderPlan([THUNDER], [CRUSH, MANOR])
    showMap()
    expect(parkButton('Disneyland Park')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /^Day 2/ }))
    expect(parkButton('Disney Adventure World')).toHaveAttribute('aria-pressed', 'true')
    expect(within(planMap()).getAllByTestId('map-marker').map((m) => m.getAttribute('aria-label'))).toEqual(["Crush's Coaster"])
  })
})

describe('stop card on the plan map (park-map spec)', () => {
  const card = () => screen.getByTestId('stop-card')
  afterEach(() => {
    vi.useRealTimers()
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  test('the card shows the same times as the timeline', () => {
    const { day } = renderPlan([THUNDER, MANOR, PETER])
    showMap()
    fireEvent.click(within(planMap()).getByRole('button', { name: "Peter Pan's Flight" }))
    const slot = scheduleDay(day(), real).slots[2] as ScheduledSlot
    const [line] = within(card()).getAllByTestId('stop-times')
    expect(line).toHaveTextContent(`Stop 3`)
    expect(line).toHaveTextContent(`arrive ${formatClock(slot.arrive)}`)
    expect(line).toHaveTextContent(`wait ${slot.wait} min`)
    expect(line).toHaveTextContent(`${formatClock(slot.start)}–${formatClock(slot.end)}`)
    expect(within(card()).getByText('Disneyland Park · Fantasyland')).toBeInTheDocument()
  })

  test('planned twice: the times of both stops', () => {
    renderPlan([MANOR, THUNDER, PETER, MANOR, THUNDER])
    showMap()
    fireEvent.click(within(planMap()).getByRole('button', { name: 'Big Thunder Mountain' }))
    const lines = within(card()).getAllByTestId('stop-times')
    expect(lines.map((l) => l.textContent?.match(/Stop \d+/)?.[0])).toEqual(['Stop 2', 'Stop 5'])
    expect(within(card()).getByRole('button', { name: 'Show stop 5 in timeline' })).toBeInTheDocument()
  })

  test('Show in timeline: the timeline is shown with that item scrolled into view and focused', () => {
    // jsdom has no scrollIntoView.
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    vi.useFakeTimers()
    renderPlan([THUNDER, MANOR, PETER, 'dlp.its-a-small-world', CRUSH, FROZEN, 'daw.ratatouille-the-adventure'])
    showMap()
    fireEvent.click(parkButton('Disney Adventure World'))
    fireEvent.click(within(planMap()).getByRole('button', { name: 'Frozen Ever After' }))
    fireEvent.click(within(card()).getByRole('button', { name: 'Show in timeline' }))

    expect(screen.queryByTestId('plan-map')).toBeNull()
    const sixth = screen.getAllByTestId('timeline-slot')[5]!
    expect(within(sixth).getByTestId('slot-name')).toHaveTextContent('Frozen Ever After')
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(sixth)
    expect(within(sixth).getByTestId('slot-handle')).toHaveFocus()
    expect(sixth.querySelector('[data-highlight="true"]')).not.toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(sixth.querySelector('[data-highlight]')).toBeNull()
  })

  test('closing the card', () => {
    renderPlan([THUNDER])
    showMap()
    fireEvent.click(within(planMap()).getByRole('button', { name: 'Big Thunder Mountain' }))
    act(() => fireEvent.click(within(card()).getByRole('button', { name: 'Close card' })))
    expect(screen.queryByTestId('stop-card')).toBeNull()
  })
})
