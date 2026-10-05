import { DndContext } from '@dnd-kit/core'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog } from '../../domain/catalog'
import { scheduleDay, type ScheduledSlot } from '../../domain/schedule'
import { selectedDay } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { CatalogList } from '../CatalogList'
import { ToastProvider } from '../Toast'

const catalog = parseCatalog(catalogJson)

function renderMap({ trip = true, items = [] as string[] } = {}) {
  const r = renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <CatalogList />
      </DndContext>
    </ToastProvider>,
    { catalog },
  )
  act(() => {
    const s = r.store.getState()
    if (trip) {
      s.createTrip('Trip', '2026-08-12', 1)
      for (const id of items) r.store.getState().addItem(selectedDay(r.store.getState())!.id, id)
    }
  })
  fireEvent.click(screen.getByRole('button', { name: 'Map' }))
  return r
}

const map = () => screen.getByTestId('park-map')
const marker = (name: string) => within(map()).getByRole('button', { name })
const markers = () => within(map()).getAllByTestId('map-marker')
const card = () => screen.getByTestId('map-card')

describe('catalog map view (park-map spec)', () => {
  test('switching to Map shows the map and keeps the current filters', () => {
    const r = renderWithPlanner(
      <ToastProvider>
        <DndContext>
          <CatalogList />
        </DndContext>
      </ToastProvider>,
      { catalog },
    )
    act(() => r.store.getState().setFilters({ types: ['attraction'], hideUnsuitable: true }))
    expect(screen.queryByTestId('park-map')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(map()).toBeInTheDocument()
    expect(screen.queryAllByTestId('catalog-row')).toHaveLength(0)
    expect(r.store.getState().filters).toMatchObject({ types: ['attraction'], hideUnsuitable: true })
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getAllByTestId('catalog-row').length).toBeGreaterThan(0)
    expect(r.store.getState().filters.types).toEqual(['attraction'])
  })

  test('each park is drawn with its five labelled area zones', () => {
    renderMap()
    expect(within(map()).getAllByTestId('map-zone')).toHaveLength(5)
    for (const name of ['MAIN STREET, U.S.A.', 'FRONTIERLAND', 'ADVENTURELAND', 'FANTASYLAND', 'DISCOVERYLAND']) {
      expect(within(map()).getByText(name)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Disney Adventure World' }))
    expect(within(map()).getAllByTestId('map-zone')).toHaveLength(5)
    expect(within(map()).getByText('WORLD OF FROZEN')).toBeInTheDocument()
    expect(within(map()).getByRole('button', { name: 'Frozen Ever After' })).toBeInTheDocument()
    expect(screen.getByTestId('match-count')).toHaveTextContent('in Disney Adventure World')
  })

  test('the map shows one park at a time, with every item of it', () => {
    renderMap()
    expect(markers()).toHaveLength(catalog.items.filter((i) => i.parkId === 'dlp').length)
    expect(within(map()).queryByRole('button', { name: 'Frozen Ever After' })).toBeNull()
  })

  test('an attraction filter hides restaurants and shows', () => {
    const r = renderMap()
    expect(markers().some((m) => m.dataset.type === 'restaurant')).toBe(true)
    act(() => r.store.getState().setFilters({ types: ['attraction'] }))
    expect(markers().length).toBeGreaterThan(0)
    expect(markers().every((m) => m.dataset.type === 'attraction')).toBe(true)
  })

  test('a 120 cm ride is greyed out for a 110 cm profile', () => {
    const r = renderMap()
    act(() => r.store.getState().setProfile({ heightCm: 110 }))
    expect(marker('Star Wars Hyperspace Mountain')).toHaveAttribute('data-unsuitable', 'true')
    expect(marker('Phantom Manor')).not.toHaveAttribute('data-unsuitable')
  })

  test('approximate positions are marked, on the marker and on the card', () => {
    renderMap()
    expect(marker('Meet Mickey Mouse')).toHaveAttribute('data-approximate', 'true')
    fireEvent.click(marker('Meet Mickey Mouse'))
    expect(within(card()).getByRole('note')).toHaveTextContent('approximate')
  })

  test('zoom buttons enlarge the map up to 4×', () => {
    renderMap()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(Number(map().dataset.zoom)).toBeCloseTo(2.25)
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
    expect(map().getAttribute('viewBox')!.split(' ').map(Number)[2]).toBeLessThan(400)
  })

  test('the official map link opens the park’s official map in a new tab', () => {
    renderMap()
    const dlp = catalog.parks.find((p) => p.id === 'dlp')!
    const link = screen.getByRole('link', { name: new RegExp(dlp.officialMapLabel.replace(/[()]/g, '\\$&')) })
    expect(link).toHaveAttribute('href', dlp.officialMapUrl)
    expect(link).toHaveAttribute('target', '_blank')
  })
})

describe('item card on the map (park-map spec)', () => {
  test('no day yet: walks to each area but no walk from a last stop', () => {
    renderMap({ trip: false })
    fireEvent.click(marker('Phantom Manor'))
    expect(within(card()).getByRole('heading', { name: 'Phantom Manor' })).toBeInTheDocument()
    expect(within(card()).getByText('Disneyland Park · Frontierland')).toBeInTheDocument()
    expect(within(card()).queryByTestId('walk-from-last')).toBeNull()
    expect(within(card()).getByTestId('no-last-stop')).toBeInTheDocument()
    expect(within(within(card()).getByTestId('area-walks')).getAllByRole('listitem')).toHaveLength(5)
  })

  test('the walk from the last stop is the one the timeline shows after adding the item', () => {
    renderMap({ items: ['dlp.big-thunder-mountain'] })
    fireEvent.click(marker('Phantom Manor'))
    const day = { id: 'd', date: '2026-08-12', start: '09:30', end: '23:00', items: ['dlp.big-thunder-mountain', 'dlp.phantom-manor'].map((itemId, i) => ({ key: `${i}`, itemId })) }
    const walk = (scheduleDay(day, catalog).slots.at(-1) as ScheduledSlot).walk
    expect(within(card()).getByTestId('walk-from-last')).toHaveTextContent(`${walk} min walk from Big Thunder Mountain, your last stop`)
  })

  test('from the other park the walk includes the park change', () => {
    renderMap({ items: ['daw.frozen-ever-after'] })
    fireEvent.click(screen.getByRole('button', { name: 'Disneyland Park' }))
    fireEvent.click(marker('Phantom Manor'))
    expect(within(card()).getByTestId('walk-from-last')).toHaveTextContent('from Frozen Ever After, your last stop (includes changing park)')
  })

  test('Add to day on the card adds the item to the end of the selected day', () => {
    const r = renderMap({ items: ['dlp.big-thunder-mountain'] })
    fireEvent.click(marker('Phantom Manor'))
    fireEvent.click(within(card()).getByRole('button', { name: 'Add to day' }))
    expect(selectedDay(r.store.getState())!.items.map((e) => e.itemId)).toEqual(['dlp.big-thunder-mountain', 'dlp.phantom-manor'])
  })

  test('details and map card: a planned item shows its day and stop (park-catalog spec)', () => {
    renderMap({ items: ['dlp.big-thunder-mountain', 'dlp.phantom-manor'] })
    fireEvent.click(marker('Phantom Manor'))
    expect(within(card()).getByTestId('planned-label')).toHaveTextContent('In Day 1 · stop 2')
    fireEvent.click(within(card()).getByRole('button', { name: 'Details' }))
    expect(within(screen.getByRole('dialog', { name: 'Phantom Manor' })).getByTestId('planned-label')).toHaveTextContent('In Day 1 · stop 2')
  })

  test('Details opens the item details', () => {
    renderMap()
    fireEvent.click(marker('Phantom Manor'))
    fireEvent.click(within(card()).getByRole('button', { name: 'Details' }))
    expect(screen.getByRole('dialog', { name: 'Phantom Manor' })).toBeInTheDocument()
  })

  test('a marker can be selected with the keyboard', () => {
    renderMap()
    fireEvent.keyDown(marker('Big Thunder Mountain'), { key: 'Enter' })
    expect(within(card()).getByRole('heading', { name: 'Big Thunder Mountain' })).toBeInTheDocument()
  })

  test('the area walking times table lists every pair of Disneyland Park areas', () => {
    renderMap()
    fireEvent.click(screen.getByRole('button', { name: 'Area walking times' }))
    const dialog = screen.getByRole('dialog', { name: 'Walking times in Disneyland Park' })
    const rows = within(within(dialog).getByTestId('area-table')).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['1Main Street, U.S.A.', '2Frontierland', '3Adventureland', '4Fantasyland', '5Discoveryland'])
    rows.forEach((row, i) => {
      const cells = within(row).getAllByRole('cell').map((c) => c.textContent)
      expect(cells).toHaveLength(5)
      expect(cells[i]).toBe('–')
      expect(cells.filter((c) => /^\d+$/.test(c ?? ''))).toHaveLength(4)
    })
  })
})

describe('the day’s route on the map (park-map spec)', () => {
  test('stops are numbered across the whole day and a park change is drawn to the entrance', () => {
    renderMap({ items: ['dlp.big-thunder-mountain', 'daw.frozen-ever-after', 'dlp.phantom-manor'] })
    expect(screen.getByRole('button', { name: 'Disneyland Park' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(map()).getAllByTestId('route-stop').map((s) => s.textContent)).toEqual(['1', '3'])
    expect(within(map()).getAllByTestId('route-marker').map((m) => m.textContent)).toEqual(['to Disney Adventure World', 'from Disney Adventure World'])
    expect(within(map()).getAllByTestId('route-segment').every((s) => s.dataset.dashed === 'true')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Disney Adventure World' }))
    expect(within(map()).getAllByTestId('route-stop').map((s) => s.textContent)).toEqual(['2'])
  })

  test('stops in one park are joined by solid lines', () => {
    renderMap({ items: ['dlp.big-thunder-mountain', 'dlp.phantom-manor', 'dlp.peter-pans-flight'] })
    expect(within(map()).getAllByTestId('route-stop').map((s) => s.textContent)).toEqual(['1', '2', '3'])
    const segments = within(map()).getAllByTestId('route-segment')
    expect(segments).toHaveLength(2)
    expect(segments.some((s) => s.dataset.dashed)).toBe(false)
    expect(within(map()).queryAllByTestId('route-marker')).toHaveLength(0)
  })
})
