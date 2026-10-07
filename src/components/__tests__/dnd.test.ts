import type { ClientRect, Collision, DroppableContainer } from '@dnd-kit/core'
import { describe, expect, test } from 'vitest'
import { CATALOG_DRAG_PREFIX } from '../CatalogList'
import { DAY_DROP_ID } from '../DayTimeline'
import { plannerCollision } from '../PlannerDnd'

const rect = (top: number, height: number): ClientRect => ({ top, height, bottom: top + height, left: 0, width: 300, right: 300 })

/** A day list from 0 to 400 px holding three items, with the dragged item's centre at 205 px: nearer the list's centre (200) than item b's (190). */
function collide(activeId: string): Collision[] {
  const ids = [DAY_DROP_ID, 'a', 'b', 'c']
  const rects = new Map<string, ClientRect>([
    [DAY_DROP_ID, rect(0, 400)],
    ['a', rect(0, 120)],
    ['b', rect(130, 120)],
    ['c', rect(260, 120)],
  ])
  const droppableContainers = ids.map((id) => ({ id, rect: { current: rects.get(id)! } }) as unknown as DroppableContainer)
  return plannerCollision({
    active: { id: activeId } as never,
    collisionRect: rect(145, 120),
    droppableRects: rects as never,
    droppableContainers,
    pointerCoordinates: null,
  })
}

describe('drop target while dragging', () => {
  test('a reorder lands on the nearest item, never on the whole-day target', () => {
    const hits = collide('c')
    expect(hits[0]!.id).toBe('b')
    expect(hits.map((h) => h.id)).not.toContain(DAY_DROP_ID)
  })

  test('a catalog item can still land on the whole-day target', () => {
    expect(collide(`${CATALOG_DRAG_PREFIX}x`).map((h) => h.id)).toContain(DAY_DROP_ID)
  })
})
