import { DndContext } from '@dnd-kit/core'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import { scheduleDay } from '../../domain/schedule'
import type { PlanItem } from '../../domain/trip'
import PlanScreen from '../../screens/PlanScreen'
import { createPlannerStore, selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { CatalogList } from '../CatalogList'
import { DayTimeline } from '../DayTimeline'
import { ToastProvider } from '../Toast'

const real = parseCatalog(catalogJson)

function renderList() {
  const r = renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <CatalogList />
      </DndContext>
    </ToastProvider>,
    { catalog: real },
  )
  r.store.getState().createTrip('Trip', '2026-08-12', 1)
  return { ...r, items: () => selectedDay(r.store.getState())!.items }
}

function renderPlan(entries: Omit<PlanItem, 'key'>[]) {
  const store = createPlannerStore(sampleCatalog)
  store.getState().createTrip('Trip', '2026-08-12')
  const dayId = store.getState().trips[0]!.days[0]!.id
  for (const e of entries) {
    const added = store.getState().addItem(dayId, e.itemId, e)
    if (e.timeLocked && added.ok) store.getState().setShowLock(dayId, added.key, true)
  }
  renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <PlanScreen />
      </DndContext>
    </ToastProvider>,
    { store },
  )
  return { store, items: () => selectedDay(store.getState())!.items }
}

describe('meal time when adding a restaurant (trip-itinerary spec)', () => {
  const addWithPicker = (name: string, choice: string) => {
    fireEvent.click(screen.getByRole('button', { name: `Add ${name} to day` }))
    const sheet = screen.getByRole('dialog', { name: `When will you eat at ${name}?` })
    fireEvent.click(within(sheet).getByRole('button', { name: choice }))
    expect(screen.queryByRole('dialog')).toBeNull()
  }

  test('lunch at 12:00', () => {
    const { items } = renderList()
    addWithPicker('Au Chalet de la Marionnette', '12:00')
    expect(items()).toMatchObject([{ itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' }])
  })

  test('dinner at 18:00', () => {
    const { items } = renderList()
    addWithPicker('Bistrot Chez Rémy', '18:00')
    expect(items()).toMatchObject([{ itemId: 'daw.bistrot-chez-remy', mealTime: '18:00' }])
  })

  test('a snack at any time has no meal time', () => {
    const { items } = renderList()
    const snack = real.items.find((i) => i.type === 'restaurant' && i.service === 'snack')!
    addWithPicker(snack.name, 'Any time')
    expect(items()).toHaveLength(1)
    expect(items()[0]!.mealTime).toBeUndefined()
  })

  test('the picker offers lunch 11:30–13:30, dinner 18:00–20:00 and Any time', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: 'Add Au Chalet de la Marionnette to day' }))
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button').map((b) => b.textContent).filter((t) => t !== '')
    expect(buttons).toEqual(['11:30', '12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30', '20:00', 'Any time'])
  })

  test('attractions are added without asking', () => {
    const { items } = renderList()
    fireEvent.click(screen.getByRole('button', { name: 'Add Big Thunder Mountain to day' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(items()).toHaveLength(1)
  })
})

describe('meal time and show lock on the timeline', () => {
  test('change it in the plan: the meal time can be changed and cleared', () => {
    const { items } = renderPlan([{ itemId: 'dlp.cafe-hyperion', mealTime: '12:00' }])
    const select = screen.getByRole('combobox', { name: 'Meal time for Café Hyperion' })
    expect(select).toHaveValue('12:00')
    fireEvent.change(select, { target: { value: '12:30' } })
    expect(items()[0]!.mealTime).toBe('12:30')
    fireEvent.change(select, { target: { value: '' } })
    expect(items()[0]!.mealTime).toBeUndefined()
    expect(select).toHaveValue('')
  })

  test('the meal time select spans the day window in half hours and keeps an odd current value', () => {
    renderPlan([{ itemId: 'dlp.cafe-hyperion', mealTime: '12:15' }])
    const options = within(screen.getByRole('combobox', { name: 'Meal time for Café Hyperion' })).getAllByRole('option').map((o) => o.textContent)
    expect(options[0]).toBe('Any time')
    expect(options).toContain('09:30')
    expect(options).toContain('12:15')
    expect(options.at(-1)).toBe('23:00')
  })

  test('lock a show time: the toggle shows the locked state', () => {
    const { items } = renderPlan([{ itemId: 'dlp.parade', showTime: '17:30' }])
    const lock = screen.getByRole('button', { name: 'Keep Disney Stars on Parade at 17:30 when optimizing' })
    expect(lock).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(lock)
    expect(items()[0]!.timeLocked).toBe(true)
    expect(lock).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Time kept when optimizing')).toBeInTheDocument()
    fireEvent.click(lock)
    expect(items()[0]!.timeLocked).toBeUndefined()
  })

  test('a late meal shows the "N min late" badge', () => {
    const day = {
      id: 'd', date: '2026-08-12', start: '09:30', end: '22:00',
      items: [{ key: 'a', itemId: 'dlp.walts' }, { key: 'b', itemId: 'dlp.walts' }, { key: 'c', itemId: 'dlp.cafe-hyperion', mealTime: '11:00' }],
    }
    const schedule = scheduleDay(day, sampleCatalog)
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <DayTimeline day={day} schedule={schedule} />
        </DndContext>
      </ToastProvider>,
    )
    const slot = screen.getAllByTestId('timeline-slot')[2]!
    expect(within(slot).getByText(/^\d+ min late$/)).toBeInTheDocument()
  })
})

describe('restaurant suggestions on the timeline (route-optimization spec)', () => {
  function renderReal(entries: Omit<PlanItem, 'key'>[]) {
    const store = createPlannerStore(real)
    store.getState().createTrip('Trip', '2026-08-12')
    const dayId = store.getState().trips[0]!.days[0]!.id
    for (const e of entries) store.getState().addItem(dayId, e.itemId, e)
    renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <PlanScreen />
        </DndContext>
      </ToastProvider>,
      { store, catalog: real },
    )
    return { items: () => selectedDay(store.getState())!.items }
  }
  const dawDay = (lunch: Omit<PlanItem, 'key'>) => [
    { itemId: 'daw.crushs-coaster' }, { itemId: 'daw.frozen-ever-after' }, { itemId: 'daw.twilight-zone-tower-of-terror' }, lunch, { itemId: 'daw.spider-man-web-adventure' },
  ]
  const slotOf = (name: string) => screen.getAllByTestId('timeline-slot').find((s) => within(s).queryByTestId('slot-name')?.textContent === name)!

  test('swap and undo: a suggestion replaces the restaurant at its meal time, and Undo restores it', () => {
    const { items } = renderReal(dawDay({ itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' }))
    const box = within(slotOf('Au Chalet de la Marionnette')).getByTestId('restaurant-suggestions')
    const buttons = within(box).getAllByRole('button')
    expect(buttons).toHaveLength(3)
    for (const b of buttons) expect(b).toHaveTextContent(/ · saves \d+ min$/)
    const stark = within(box).getByRole('button', { name: /^Stark Factory · saves \d+ min$/ })
    fireEvent.click(stark)
    expect(items()[3]).toMatchObject({ itemId: 'daw.stark-factory', mealTime: '12:00' })
    expect(screen.getByRole('combobox', { name: 'Meal time for Stark Factory' })).toHaveValue('12:00')
    const toast = screen.getByText('Swapped to Stark Factory').closest('[role="status"]') as HTMLElement
    fireEvent.click(within(toast).getByRole('button', { name: 'Undo' }))
    expect(items()[3]).toMatchObject({ itemId: 'dlp.au-chalet-de-la-marionnette', mealTime: '12:00' })
  })

  test('a restaurant that fits shows no suggestions', () => {
    renderReal(dawDay({ itemId: 'daw.stark-factory', mealTime: '12:00' }))
    expect(within(slotOf('Stark Factory')).queryByTestId('restaurant-suggestions')).toBeNull()
  })

  test('table-service suggestions say a booking is usually needed', () => {
    renderReal(dawDay({ itemId: 'dlp.auberge-de-cendrillon', mealTime: '12:30' }))
    const buttons = within(within(slotOf('Auberge de Cendrillon')).getByTestId('restaurant-suggestions')).getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) expect(b).toHaveTextContent(/ · booking usually needed$/)
  })
})
