import { useCallback } from 'react'
import type { CatalogItem } from '../domain/catalog'
import { selectedDay } from '../state/store'
import { useToast } from '../components/Toast'
import { useCatalog, usePlannerStore } from './PlannerContext'

/** Adds an item to the selected day and reports problems in a toast. Returns true when added. */
export function useAddToDay() {
  const store = usePlannerStore()
  const catalog = useCatalog()
  const toast = useToast()
  return useCallback(
    (item: CatalogItem, options: { index?: number; showTime?: string } = {}): boolean => {
      const day = selectedDay(store.getState())
      if (!day) {
        toast('Create a trip first, then add items to a day.')
        return false
      }
      const result = store.getState().addItem(day.id, item.id, options)
      if (!result.ok) {
        if (result.reason === 'other-park') {
          const dayPark = catalog.parks.find((p) => p.id === day.parkId)?.name
          const itemPark = catalog.parks.find((p) => p.id === item.parkId)?.name
          toast(`${item.name} is in ${itemPark}. This day is set to ${dayPark}.`)
        }
        return false
      }
      toast(`Added ${item.name}`)
      return true
    },
    [store, catalog, toast],
  )
}
