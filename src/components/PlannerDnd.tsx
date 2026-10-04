import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState, type ReactNode } from 'react'
import type { CatalogItem } from '../domain/catalog'
import { selectedDay } from '../state/store'
import { usePlannerStore } from '../app/PlannerContext'
import { useAddToDay } from '../app/useAddToDay'
import { CATALOG_DRAG_PREFIX } from './CatalogList'
import { DAY_DROP_ID } from './DayTimeline'

/** One drag-and-drop context for reordering the day and dragging catalog items into it. */
export function PlannerDnd({ children }: { children: ReactNode }) {
  const store = usePlannerStore()
  const addToDay = useAddToDay()
  const [dragging, setDragging] = useState<CatalogItem | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Long-press on touch screens so normal scrolling keeps working.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = (e: DragStartEvent) => {
    const item = e.active.data.current?.item as CatalogItem | undefined
    setDragging(item ?? null)
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
    const from = day.items.findIndex((i) => i.key === activeId)
    if (from >= 0 && overIndex >= 0 && from !== overIndex) store.getState().moveItem(day.id, from, overIndex)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {children}
      <DragOverlay>{dragging && <div className="rounded-xl border border-indigo-300 bg-white px-3 py-2 font-medium shadow-lg">{dragging.name}</div>}</DragOverlay>
    </DndContext>
  )
}
