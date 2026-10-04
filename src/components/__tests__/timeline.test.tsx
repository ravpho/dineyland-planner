import { DndContext } from '@dnd-kit/core'
import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { scheduleDay } from '../../domain/schedule'
import type { Day } from '../../domain/trip'
import { renderWithPlanner } from '../../test/render'
import { sampleCatalog } from '../../test/sampleCatalog'
import { DayTimeline } from '../DayTimeline'
import { Breakdown, FitBar, TicketReminder } from '../FitSummary'
import { ToastProvider } from '../Toast'

function renderDay(day: Day, profile?: { heightCm?: number }) {
  const schedule = scheduleDay(day, sampleCatalog, profile)
  renderWithPlanner(
    <ToastProvider>
      <DndContext>
        <TicketReminder schedule={schedule} />
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
