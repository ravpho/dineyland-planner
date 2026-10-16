import { useCallback } from 'react'
import { usePlannerStore } from './PlannerContext'

/**
 * Call right after a move or reorder: returns an Undo for that change, which does nothing once a newer change
 * has replaced it (refresh-plan-layout design Decision 7).
 */
export function useOrderUndo() {
  const store = usePlannerStore()
  return useCallback(() => {
    const change = store.getState().lastOrderChange
    return () => store.getState().undoOrderChange(change)
  }, [store])
}
