import type { Restaurant } from '../domain/catalog'
import { MEAL_WINDOW_MIN } from '../domain/schedule'
import { Button, Sheet } from './ui'

/** Offered when adding a restaurant (trip-itinerary spec, "Meal time"). */
export const LUNCH_TIMES = ['11:30', '12:00', '12:30', '13:00', '13:30']
export const DINNER_TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00']

/** Asks when the user will eat; `undefined` means "Any time". */
export function MealTimePicker({ restaurant, onPick, onClose }: { restaurant: Restaurant; onPick: (time: string | undefined) => void; onClose: () => void }) {
  return (
    <Sheet title={`When will you eat at ${restaurant.name}?`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">The plan keeps the meal within {MEAL_WINDOW_MIN} minutes of this time. You can change it later in your plan.</p>
      {[
        ['Lunch', LUNCH_TIMES],
        ['Dinner', DINNER_TIMES],
      ].map(([label, times]) => (
        <section key={label as string} className="mb-3">
          <h3 className="mb-1 text-sm font-semibold text-slate-800">{label}</h3>
          <div className="grid grid-cols-3 gap-2">
            {(times as string[]).map((t) => (
              <Button key={t} onClick={() => onPick(t)}>
                {t}
              </Button>
            ))}
          </div>
        </section>
      ))}
      <Button className="w-full" onClick={() => onPick(undefined)}>
        Any time
      </Button>
    </Sheet>
  )
}
