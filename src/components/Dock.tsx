import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useSelectedSchedule } from '../app/hooks'
import { hrefFor, type Route } from '../routing'
import { FitBar } from './FitSummary'
import { CompassIcon, DayIcon, MapIcon } from './icons'

const TABS: { route: Route; label: string; icon: ReactNode }[] = [
  { route: { name: 'catalog' }, label: 'Explore', icon: <CompassIcon width={22} height={22} /> },
  { route: { name: 'plan' }, label: 'My day', icon: <DayIcon width={22} height={22} /> },
  { route: { name: 'map' }, label: 'Map', icon: <MapIcon width={22} height={22} /> },
]

/**
 * Phones: the fit status above the Explore, My day and Map bar, fixed to the bottom of the screen within
 * thumb reach (refresh-plan-layout design Decision 2). Its height is published as --dock-h so the page and
 * messages can keep clear of it.
 */
export function Dock({ current }: { current: Route }) {
  const schedule = useSelectedSchedule()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const publish = () => root.style.setProperty('--dock-h', `${el.offsetHeight}px`)
    publish()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : undefined
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      root.style.removeProperty('--dock-h')
    }
  }, [])

  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-30 bg-sky pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(6_11_31/0.25)]" data-testid="dock">
      {schedule && <FitBar schedule={schedule} placement="dock" />}
      <nav aria-label="Sections" className="mx-auto grid max-w-md grid-cols-3 px-2 pb-1.5 pt-1">
        {TABS.map((t) => {
          const active = current.name === t.route.name
          return (
            <a
              key={t.label}
              href={hrefFor(t.route)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-on-sky ${active ? 'text-star' : 'text-on-sky-muted hover:text-on-sky'}`}
            >
              <span className={`flex h-7 w-14 items-center justify-center rounded-full ${active ? 'bg-star/15' : ''}`}>{t.icon}</span>
              {t.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
