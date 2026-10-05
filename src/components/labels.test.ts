import { describe, expect, test } from 'vitest'
import { formatStops, plannedLabel } from './labels'

describe('planned label (park-catalog spec)', () => {
  test('one stop and several stops in the selected day', () => {
    expect(plannedLabel({ stops: [4], otherDays: [] }, 1)).toEqual({ strong: 'In Day 1 · stop 4' })
    expect(plannedLabel({ stops: [4, 9], otherDays: [] }, 1)).toEqual({ strong: 'In Day 1 · stops 4, 9' })
  })

  test('other days, with and without the selected day', () => {
    expect(plannedLabel({ stops: [2], otherDays: [3] }, 1)).toEqual({ strong: 'In Day 1 · stop 2', muted: 'Also in Day 3' })
    expect(plannedLabel({ stops: [], otherDays: [3] }, 1)).toEqual({ muted: 'In Day 3' })
    expect(plannedLabel({ stops: [], otherDays: [2, 3] }, 1)).toEqual({ muted: 'In Days 2, 3' })
    expect(plannedLabel({ stops: [], otherDays: [] }, 1)).toEqual({})
  })
})

describe('stops on the plan map park switch (park-map spec)', () => {
  test('single stops, pairs, ranges and none', () => {
    expect(formatStops([3])).toBe('stop 3')
    expect(formatStops([1, 2])).toBe('stops 1, 2')
    expect(formatStops([1, 2, 3, 4])).toBe('stops 1–4')
    expect(formatStops([1, 2, 5])).toBe('stops 1, 2, 5')
    expect(formatStops([5, 6, 7, 1])).toBe('stops 1, 5–7')
    expect(formatStops([])).toBe('no stops')
  })
})
