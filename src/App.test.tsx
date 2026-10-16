import { act, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import App from './App'
import { WIDE_QUERY } from './app/hooks'
import { parseHash } from './routing'
import { createPlannerStore } from './state/store'
import { renderWithPlanner } from './test/render'
import { sampleCatalog } from './test/sampleCatalog'

afterEach(() => {
  window.location.hash = ''
  vi.unstubAllGlobals()
})

const withTrip = () => {
  const store = createPlannerStore(sampleCatalog)
  store.getState().createTrip('Summer trip', '2026-08-12', 2)
  return store
}
const wideScreen = () => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === WIDE_QUERY, media: query, addEventListener() {}, removeEventListener() {} }))

describe('routing', () => {
  test.each([
    ['#/catalog', 'Explore'],
    ['#/plan', 'My day'],
    ['#/map', 'Map'],
    ['#/about', 'About'],
    ['#/import/abc', 'Import'],
    ['', 'My day'],
  ])('%s renders the %s screen', (hash, heading) => {
    window.location.hash = hash
    renderWithPlanner(<App />)
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  test('follows hash changes', async () => {
    renderWithPlanner(<App />)
    await act(async () => {
      window.location.hash = '#/about'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  test('keeps import data', () => {
    expect(parseHash('#/import/N4Ig-xyz')).toEqual({ name: 'import', data: 'N4Ig-xyz' })
  })
})

describe('header (app-shell spec: Night-sky theme, Trip actions in the More menu)', () => {
  test('before the first trip: the app’s name, and More', () => {
    renderWithPlanner(<App />)
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Disneyland Planner' })).toBeInTheDocument()
    expect(within(header).queryByRole('combobox', { name: 'Trip' })).toBeNull()
    expect(within(header).getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'About' })).toBeNull()
  })

  test('with a trip on a phone: the trip’s name, Share and More in one row', () => {
    renderWithPlanner(<App />, { store: withTrip() })
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('combobox', { name: 'Trip' })).toHaveDisplayValue('Summer trip')
    expect(within(header).getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'More' })).toBeInTheDocument()
    expect(within(header).queryByRole('link', { name: 'Disneyland Planner' })).toBeNull()
  })

  test('with a trip on a wide screen: the app’s name on the left and the trip controls', () => {
    wideScreen()
    renderWithPlanner(<App />, { store: withTrip() })
    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Disneyland Planner' })).toBeInTheDocument()
    expect(within(header).getByRole('combobox', { name: 'Trip' })).toBeInTheDocument()
  })
})

describe('bottom bar on phones (app-shell spec: Phone layout, Always-visible fit status)', () => {
  const bar = () => screen.getByRole('navigation', { name: 'Sections' })

  test.each([
    ['#/catalog', 'Explore'],
    ['#/plan', 'My day'],
    ['#/map', 'Map'],
  ])('%s marks %s as the current tab', (hash, label) => {
    window.location.hash = hash
    renderWithPlanner(<App />, { store: withTrip() })
    const links = within(bar()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Explore', 'My day', 'Map'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#/catalog', '#/plan', '#/map'])
    expect(within(bar()).getByRole('link', { current: 'page' })).toHaveTextContent(label)
  })

  test.each(['#/catalog', '#/plan', '#/map'])('the fit status sits above the bar on %s', (hash) => {
    window.location.hash = hash
    renderWithPlanner(<App />, { store: withTrip() })
    const dock = screen.getByTestId('dock')
    expect(within(dock).getByTestId('fit-summary')).toHaveTextContent(/Fits|Over by/)
    expect(screen.getAllByTestId('fit-summary')).toHaveLength(1)
  })

  test('before the first trip: the bar without a fit status', () => {
    renderWithPlanner(<App />)
    expect(bar()).toBeInTheDocument()
    expect(screen.queryByTestId('fit-summary')).toBeNull()
  })

  test('on the About page the bar stays, with no tab marked', () => {
    window.location.hash = '#/about'
    renderWithPlanner(<App />, { store: withTrip() })
    expect(within(bar()).queryByRole('link', { current: 'page' })).toBeNull()
  })
})

describe('wide screens (app-shell spec: Wide-screen layout)', () => {
  test('Explore and My day side by side, with no bottom bar', () => {
    wideScreen()
    window.location.hash = '#/plan'
    renderWithPlanner(<App />, { store: withTrip() })
    expect(screen.getByRole('heading', { name: 'Explore' })).toBeInTheDocument()
    expect(within(screen.getByTestId('plan-column')).getByRole('heading', { name: 'My day' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull()
    expect(within(screen.getByTestId('plan-column')).getByTestId('fit-summary')).toBeInTheDocument()
  })

  test('"Map" above the left column shows the Map there, and the day stays on the right', () => {
    wideScreen()
    window.location.hash = '#/map'
    renderWithPlanner(<App />, { store: withTrip() })
    const left = screen.getByRole('navigation', { name: 'Left column' })
    expect(within(left).getByRole('link', { current: 'page' })).toHaveTextContent('Map')
    expect(within(left).getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '#/catalog')
    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Explore' })).toBeNull()
    expect(within(screen.getByTestId('plan-column')).getByRole('heading', { name: 'My day' })).toBeInTheDocument()
  })
})
