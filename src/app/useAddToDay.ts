import { useCallback } from 'react'
import type { CatalogItem } from '../domain/catalog'
import { selectedDay } from '../state/store'
import { useToast } from '../components/Toast'
import { usePlannerStore } from './PlannerContext'

/** Adds an item to the selected day and reports problems in a toast. Returns true when added. */
export function useAddToDay() {
  const store = usePlannerStore()
  const toast = useToast()
  return useCallback(
    (item: CatalogItem, options: { index?: number; showTime?: string } = {}): boolean => {
      const day = selectedDay(store.getState())
      if (!day) {
        toast('Create a trip first, then add items to a day.')
        return false
      }
      const result = store.getState().addItem(day.id, item.id, options)
      if (!result.ok) return false
      toast(`Added ${item.name}`)
      return true
    },
    [store, toast],
  )
}
