import { useCallback } from 'react'
import { stopNumbers } from '../domain/stops'
import { selectedDay } from '../state/store'
import { useToast } from '../components/Toast'
import { useCatalog, usePlannerStore } from './PlannerContext'
import { useOrderUndo } from './useOrderUndo'

/**
 * Moves one entry of the selected day and reports it, such as "Moved Big Thunder Mountain to stop 4", with
 * Undo. Shared by dragging, the stop sheet's buttons and the keyboard (trip-itinerary spec: Reorder and remove
 * items; refresh-plan-layout design Decision 7). Returns whether the order changed.
 */
export function useMoveStop() {
  const store = usePlannerStore()
  const catalog = useCatalog()
  const toast = useToast()
  const undoFor = useOrderUndo()
  return useCallback(
    (from: number, to: number): boolean => {
      const before = selectedDay(store.getState())
      if (!before) return false
      const change = store.getState().lastOrderChange
      store.getState().moveItem(before.id, from, to)
      if (store.getState().lastOrderChange === change) return false
      const day = selectedDay(store.getState())!
      const entry = before.items[from]!
      const item = catalog.items.find((i) => i.id === entry.itemId)
      const stop = stopNumbers(day, catalog).get(entry.key)
      toast(`Moved ${item?.name ?? 'No longer available'}${stop ? ` to stop ${stop}` : ''}`, { label: 'Undo', run: undoFor() })
      return true
    },
    [store, catalog, toast, undoFor],
  )
}
