import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createPlannerStore } from '../../state/store'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { ToastProvider } from '../Toast'
import { TripHeader } from '../TripBar'

afterEach(() => {
  vi.restoreAllMocks()
  window.location.hash = ''
})

function renderHeader(days = 2, withTrip = true) {
  const store = createPlannerStore(sampleCatalog)
  if (withTrip) store.getState().createTrip('Summer trip', '2026-08-12', days)
  const view = renderWithPlanner(
    <ToastProvider>
      <TripHeader />
    </ToastProvider>,
    { store },
  )
  return { ...view, store }
}
const more = () => screen.getByRole('dialog', { name: 'More' })
const openMore = () => fireEvent.click(screen.getByRole('button', { name: 'More' }))

describe('the header (app-shell spec: Trip actions in the More menu)', () => {
  test('shows the trip as a title that switches trips, with Share and More', () => {
    const { store } = renderHeader()
    let other = ''
    act(() => {
      other = store.getState().createTrip('Winter trip', '2026-12-20')
    })
    expect(screen.getByRole('combobox', { name: 'Trip' })).toHaveValue(other)
    fireEvent.change(screen.getByRole('combobox', { name: 'Trip' }), { target: { value: store.getState().trips[0]!.id } })
    expect(store.getState().selectedTripId).toBe(store.getState().trips[0]!.id)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  test('without a trip: no trip controls, and More still offers About', () => {
    renderHeader(1, false)
    expect(screen.queryByRole('combobox', { name: 'Trip' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
    openMore()
    expect(within(more()).queryByRole('button', { name: /Rename/ })).toBeNull()
    expect(within(more()).getByRole('button', { name: /About and data sources/ })).toBeInTheDocument()
  })

  test('open the menu: New trip, Rename, Number of days, Delete trip, and About and data sources', () => {
    renderHeader()
    expect(screen.queryByRole('button', { name: /Rename/ })).toBeNull()
    openMore()
    expect(within(more()).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
      '',
      'New trip',
      'Rename',
      'Number of days',
      'Delete trip',
      'About and data sources',
    ])
  })

  test('share in one tap: the share sheet opens from the header', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(screen.getByRole('dialog', { name: 'Share this trip' })).toBeInTheDocument()
  })

  test('delete from the menu: the menu closes, then the app asks to confirm', () => {
    const { store } = renderHeader()
    let sheetOpenWhenAsked: boolean | undefined
    const confirm = vi.spyOn(window, 'confirm').mockImplementation(() => {
      sheetOpenWhenAsked = screen.queryByRole('dialog', { name: 'More' }) !== null
      return false
    })
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /Delete trip/ }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(sheetOpenWhenAsked).toBe(false)
    expect(store.getState().trips).toHaveLength(1)

    confirm.mockReturnValue(true)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /Delete trip/ }))
    expect(store.getState().trips).toHaveLength(0)
  })

  test('rename from the menu', () => {
    const { store } = renderHeader()
    vi.spyOn(window, 'prompt').mockReturnValue('Winter trip')
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /Rename/ }))
    expect(store.getState().trips[0]!.name).toBe('Winter trip')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('new trip from the menu opens the new-trip form', () => {
    renderHeader()
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /New trip/ }))
    expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'New trip' })).toBeInTheDocument()
  })

  test('number of days: fewer days asks first, and keeps the trip when declined', () => {
    const { store } = renderHeader(3)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /Number of days/ }))
    const sheet = screen.getByRole('dialog', { name: 'Number of days' })
    fireEvent.change(within(sheet).getByLabelText('Number of days'), { target: { value: '2' } })
    expect(confirm).toHaveBeenCalledWith('Remove the last day?')
    expect(store.getState().trips[0]!.days).toHaveLength(3)
    confirm.mockReturnValue(true)
    fireEvent.change(within(sheet).getByLabelText('Number of days'), { target: { value: '2' } })
    expect(store.getState().trips[0]!.days).toHaveLength(2)
    fireEvent.change(within(sheet).getByLabelText('Number of days'), { target: { value: '4' } })
    expect(store.getState().trips[0]!.days).toHaveLength(4)
  })

  test('About and data sources opens the About page', () => {
    renderHeader()
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: /About and data sources/ }))
    expect(window.location.hash).toBe('#/about')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('close without choosing: the trip is unchanged', () => {
    const { store } = renderHeader()
    const before = store.getState().trips
    openMore()
    fireEvent.click(within(more()).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(store.getState().trips).toBe(before)
  })
})
