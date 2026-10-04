import { DndContext } from '@dnd-kit/core'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import catalogJson from '../../data/catalog.json'
import { parseCatalog, type CatalogItem } from '../../domain/catalog'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { ToastProvider } from '../Toast'
import { CatalogList } from '../CatalogList'
import { ItemDetail } from '../ItemDetail'

const item = (id: string) => sampleCatalog.items.find((i) => i.id === id)! as CatalogItem

function renderList() {
  const r = renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <CatalogList />
      </DndContext>
    </ToastProvider>,
  )
  r.store.getState().createTrip('Trip', '2026-08-12', 1)
  return r
}

describe('catalog list (park-catalog spec)', () => {
  test('rows show name, type, rating and duration; attractions add height, thrill and wait range', async () => {
    renderList()
    const rows = await screen.findAllByTestId('catalog-row')
    const thunder = rows.find((r) => r.textContent?.includes('Big Thunder Mountain'))!
    expect(within(thunder).getByText('Attraction')).toBeInTheDocument()
    expect(within(thunder).getByLabelText('Rated 5 out of 5')).toBeInTheDocument()
    expect(within(thunder).getByText('4 min')).toBeInTheDocument()
    expect(within(thunder).getByText('102 cm')).toBeInTheDocument()
    expect(within(thunder).getByText('Thrilling')).toBeInTheDocument()
    expect(within(thunder).getByText(/min wait in Aug/)).toBeInTheDocument()
    const walts = rows.find((r) => r.textContent?.includes("Walt's"))!
    expect(within(walts).getByText('Restaurant')).toBeInTheDocument()
    expect(within(walts).getByText('Table service')).toBeInTheDocument()
    expect(within(walts).queryByText(/wait in/)).toBeNull()
  })

  test('lists both parks with a park and area label on every row', async () => {
    renderList()
    expect(await screen.findByTestId('match-count')).toHaveTextContent(new RegExp(`^${sampleCatalog.items.length} items$`))
    const rows = await screen.findAllByTestId('catalog-row')
    const label = (name: string) => within(rows.find((r) => r.textContent?.includes(name))!).getByTestId('row-place')
    expect(label('Big Thunder Mountain')).toHaveTextContent('Disneyland Park · Frontierland')
    expect(label('Avengers Assemble: Flight Force')).toHaveTextContent('Disney Adventure World · Avengers Campus')
    expect(rows.every((r) => within(r).getByTestId('row-place').textContent!.includes(' · '))).toBe(true)
  })

  test('the sort control above the list reorders it without opening the filters', async () => {
    const { store } = renderList()
    const select = screen.getByLabelText('Sort by')
    fireEvent.change(select, { target: { value: 'duration' } })
    expect(store.getState().filters.sort).toBe('duration')
    const names = (await screen.findAllByTestId('catalog-row')).map((r) => r.textContent)
    expect(names.findIndex((n) => n?.includes('Hyperspace'))).toBeLessThan(names.findIndex((n) => n?.includes("Walt's")))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('item details (park-catalog spec)', () => {
  const open = (id: string) => renderWithPlanner(<ItemDetail item={item(id)} onClose={() => {}} onAdd={() => {}} />)

  test('attraction: description, rating with reason, duration, height, age rule, thrill, scariness, wait, sources', () => {
    open('dlp.alices-curious-labyrinth')
    const d = screen.getByRole('dialog')
    expect(within(d).getByText('Walk-through hedge maze.')).toBeInTheDocument()
    expect(within(d).getByText('Fun for small children.')).toBeInTheDocument()
    expect(within(d).getByText('15 min')).toBeInTheDocument()
    expect(within(d).getByText('No height requirement')).toBeInTheDocument()
    expect(within(d).getByText('Children under 7 must be accompanied by an adult.')).toBeInTheDocument()
    expect(within(d).getByText('Gentle')).toBeInTheDocument()
    expect(within(d).getByText('None')).toBeInTheDocument()
    expect(within(d).getByText(/about 5 min \(estimate\)/)).toBeInTheDocument()
    expect(within(d).getByText(/typical/)).toBeInTheDocument()
    expect(within(d).getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
  })

  test('attraction with a height limit and statistics', () => {
    open('dlp.star-wars-hyperspace-mountain')
    const d = screen.getByRole('dialog')
    expect(within(d).getByText('Min. 120 cm')).toBeInTheDocument()
    expect(within(d).getByText('Intense')).toBeInTheDocument()
    expect(within(d).getByText('Spooky')).toBeInTheDocument()
    expect(within(d).getByText(/\d+–\d+ min/)).toBeInTheDocument()
    expect(within(d).getByText(/2023, 2024, 2025/)).toBeInTheDocument()
    expect(within(d).getByText(/collected on 2026-10-04/)).toBeInTheDocument()
  })

  test('restaurant: service type, description, rating and meal duration', () => {
    open('dlp.walts')
    const d = screen.getByRole('dialog')
    expect(within(d).getByText('Table service')).toBeInTheDocument()
    expect(within(d).getByText('75 min')).toBeInTheDocument()
    expect(within(d).getByText('Table-service restaurant on Main Street.')).toBeInTheDocument()
    expect(within(d).getByLabelText('Rated 4 out of 5')).toBeInTheDocument()
  })

  test('show: start times, duration and early arrival', () => {
    open('dlp.parade')
    const d = screen.getByRole('dialog')
    expect(within(d).getByText('13:30, 17:30')).toBeInTheDocument()
    expect(within(d).getByText('30 min')).toBeInTheDocument()
    expect(within(d).getByText('20 min before')).toBeInTheDocument()
    expect(within(d).getByText('Test fixture')).toBeInTheDocument()
  })
})

describe('official links, maps and height checks (park-catalog spec)', () => {
  const real = parseCatalog(catalogJson)
  const open = (id: string, catalog = sampleCatalog) =>
    renderWithPlanner(<ItemDetail item={catalog.items.find((i) => i.id === id)!} onClose={() => {}} onAdd={() => {}} />, { catalog })

  test('Big Thunder Mountain links to its official page in a new tab', () => {
    open('dlp.big-thunder-mountain')
    const link = within(screen.getByRole('dialog')).getByRole('link', { name: 'Official page' })
    expect(link).toHaveAttribute('href', 'https://www.disneylandparis.com/en-int/attractions/disneyland-park/big-thunder-mountain')
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('an item without a confirmed official page shows no official link', () => {
    open('dlp.phantom-manor')
    expect(within(screen.getByRole('dialog')).queryByRole('link', { name: /Official page/ })).toBeNull()
  })

  test('Open in Maps is centred on Phantom Manor’s coordinates', () => {
    open('dlp.phantom-manor')
    const link = within(screen.getByRole('dialog')).getByRole('link', { name: 'Open in Maps' })
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=48.8716,2.7718')
    expect(link).toHaveAttribute('target', '_blank')
  })

  test('an approximate position says so on the Maps link', () => {
    open('dlp.meet-mickey-mouse', real)
    expect(within(screen.getByRole('dialog')).getByRole('link', { name: 'Open in Maps (approximate)' })).toBeInTheDocument()
  })

  test('Autopia’s height is marked as confirmed by an official source', () => {
    open('dlp.autopia', real)
    const d = screen.getByRole('dialog')
    expect(within(d).getByTestId('height-source')).toHaveTextContent('Confirmed by an official Disneyland Paris source')
    expect(within(d).getByRole('note')).toHaveTextContent('follow the signs posted at the attraction')
  })

  test('an unverified height is marked not yet verified, with the posted-signs advice', () => {
    open('dlp.phantom-manor')
    const d = screen.getByRole('dialog')
    expect(within(d).getByTestId('height-source')).toHaveTextContent('Not yet verified')
    expect(within(d).getByRole('note')).toHaveTextContent('always follow the signs posted at the attraction')
  })
})
