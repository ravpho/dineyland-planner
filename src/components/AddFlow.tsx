import { useState, type ReactNode } from 'react'
import type { CatalogItem, Restaurant, Show } from '../domain/catalog'
import { useAddToDay } from '../app/useAddToDay'
import { ItemDetail } from './ItemDetail'
import { MealTimePicker } from './MealTimePicker'
import { ShowTimePicker } from './ShowTimePicker'

/**
 * Adding from Explore or from the map: a show asks for its time, a restaurant for its meal time, an attraction
 * is added at once; details open in a sheet with their own Add (trip-itinerary spec: Add items to a day, Meal
 * time). Render `sheets` once in the screen that uses it.
 */
export function useAddFlow(): { add: (item: CatalogItem) => void; openDetails: (item: CatalogItem) => void; sheets: ReactNode } {
  const addToDay = useAddToDay()
  const [open, setOpen] = useState<CatalogItem | null>(null)
  const [picking, setPicking] = useState<Show | null>(null)
  const [pickingMeal, setPickingMeal] = useState<Restaurant | null>(null)

  const add = (item: CatalogItem) => {
    if (item.type === 'show') setPicking(item)
    else if (item.type === 'restaurant') setPickingMeal(item)
    else addToDay(item)
  }

  const sheets = (
    <>
      {open && (
        <ItemDetail
          item={open}
          onClose={() => setOpen(null)}
          onAdd={() => {
            const item = open
            setOpen(null)
            add(item)
          }}
        />
      )}
      {picking && (
        <ShowTimePicker
          show={picking}
          onClose={() => setPicking(null)}
          onPick={(time) => {
            addToDay(picking, { showTime: time })
            setPicking(null)
          }}
        />
      )}
      {pickingMeal && (
        <MealTimePicker
          restaurant={pickingMeal}
          onClose={() => setPickingMeal(null)}
          onPick={(time) => {
            addToDay(pickingMeal, time ? { mealTime: time } : {})
            setPickingMeal(null)
          }}
        />
      )}
    </>
  )
  return { add, openDetails: setOpen, sheets }
}
