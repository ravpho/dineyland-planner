import type { ItemType } from '../domain/catalog'
import { FoodIcon, RideIcon, ShowIcon } from './icons'
import { TYPE_LABELS } from './labels'

/** Each type in the color its map marker uses (refresh-plan-layout design Decision 11). */
const TILES: Record<ItemType, { icon: typeof RideIcon; className: string }> = {
  attraction: { icon: RideIcon, className: 'bg-map-attraction/10 text-map-attraction' },
  restaurant: { icon: FoodIcon, className: 'bg-map-restaurant/15 text-map-restaurant' },
  show: { icon: ShowIcon, className: 'bg-map-show/12 text-map-show' },
}

/** A 40 px tile with the type's icon. The type's name is there for screen readers. */
export function TypeTile({ type, muted = false }: { type: ItemType; muted?: boolean }) {
  const { icon: Icon, className } = TILES[type]
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${muted ? 'bg-surface-muted text-ink-faint' : className}`} data-testid="type-tile" data-type={type}>
      <Icon />
      <span className="sr-only">{TYPE_LABELS[type]}</span>
    </span>
  )
}
