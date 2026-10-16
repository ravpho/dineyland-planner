import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState, type ReactNode } from 'react'
import type { CatalogItem } from '../domain/catalog'
import { selectedDay } from '../state/store'
import { useMediaQuery } from '../app/hooks'
import { usePlannerStore } from '../app/PlannerContext'
import { useAddToDay } from '../app/useAddToDay'
import { useMoveStop } from '../app/useMoveStop'
import { CATALOG_DRAG_PREFIX } from './CatalogList'
import { DAY_DROP_ID, StopOverlay, type DraggedStop } from './DayTimeline'

/**
 * A drag starts as soon as the grip moves a few pixels, with no long press: the grips are `touch-action: none`,
 * so scrolling starts anywhere else on a row (refresh-plan-layout design Decision 7).
 */
export const SENSOR_OPTIONS = {
  mouse: { activationConstraint: { distance: 5 } },
  touch: { activationConstraint: { distance: 4 } },
} as const

/**
 * Closest drop target to the dragged item. The whole-day target only exists so catalog items can be
 * dropped into an empty day: a reorder ignores it, or a drop near the list's centre would land on it
 * and move nothing.
 */
export const plannerCollision: CollisionDetection = (args) =>
  String(args.active.id).startsWith(CATALOG_DRAG_PREFIX)
    ? closestCenter(args)
    : closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.id !== DAY_DROP_ID) })

/** One drag-and-drop context for reordering the day and dragging catalog items into it. */
export function PlannerDnd({ children }: { children: ReactNode }) {
  const store = usePlannerStore()
  const addToDay = useAddToDay()
  const move = useMoveStop()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [dragging, setDragging] = useState<{ item?: CatalogItem; stop?: DraggedStop } | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, SENSOR_OPTIONS.mouse),
    useSensor(TouchSensor, SENSOR_OPTIONS.touch),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current
    setDragging({ item: data?.item as CatalogItem | undefined, stop: data?.stop as DraggedStop | undefined })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const day = selectedDay(store.getState())
    if (!day || !over) return
    const activeId = String(active.id)
    const overIndex = day.items.findIndex((i) => i.key === over.id)
    if (activeId.startsWith(CATALOG_DRAG_PREFIX)) {
      const item = active.data.current?.item as CatalogItem
      const index = overIndex >= 0 ? overIndex : over.id === DAY_DROP_ID ? day.items.length : -1
      if (index < 0) return
      addToDay(item, { index, ...(item.type === 'show' ? { showTime: item.times[0] } : {}) })
      return
    }
    // A drop says where the stop went, with Undo, like the stop sheet's moves.
    const from = day.items.findIndex((i) => i.key === activeId)
    if (from >= 0 && overIndex >= 0 && from !== overIndex) move(from, overIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={plannerCollision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {children}
      {/* With reduced motion the lifted card drops into place at once. */}
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {dragging?.stop && <StopOverlay stop={dragging.stop} />}
        {dragging?.item && <div className="rounded-xl border border-accent/30 bg-surface px-3 py-2 font-medium text-ink shadow-lg">{dragging.item.name}</div>}
      </DragOverlay>
    </DndContext>
  )
}
