import { useIsWide } from './app/hooks'
import { usePlanner } from './app/PlannerContext'
import { selectedTrip } from './state/store'
import { Dock } from './components/Dock'
import { TripHeader } from './components/TripBar'
import { SparkleIcon } from './components/icons'
import { NightSky } from './components/NightSky'
import { PlannerDnd } from './components/PlannerDnd'
import { ToastProvider } from './components/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { hrefFor, useRoute, type Route } from './routing'
import AboutScreen from './screens/AboutScreen'
import CatalogScreen from './screens/CatalogScreen'
import MapScreen from './screens/MapScreen'
import ImportScreen from './screens/ImportScreen'
import PlanScreen from './screens/PlanScreen'

function StorageBanner() {
  const storage = usePlanner((s) => s.storage)
  if (storage === 'ok') return null
  const text =
    storage === 'newer'
      ? 'Your saved trips were created by a newer version of this app. Reload to update; changes made here will not be saved.'
      : storage === 'corrupt'
        ? 'Saved trips could not be read. Changes made now will not be saved, to avoid overwriting them.'
        : 'This browser is not letting the app save data, so your changes will not be kept after you close it.'
  return (
    <p role="alert" className="bg-warn-soft px-4 py-2 text-sm text-warn">
      {text}
    </p>
  )
}

/** Wide screens: the left column shows Explore or the Map (refresh-plan-layout design Decision 8). */
function LeftColumnSwitch({ current }: { current: Route }) {
  const links: { route: Route; label: string }[] = [
    { route: { name: 'catalog' }, label: 'Explore' },
    { route: { name: 'map' }, label: 'Map' },
  ]
  return (
    <nav aria-label="Left column" className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
      {links.map((l) => {
        const active = current.name === l.route.name || (l.route.name === 'catalog' && current.name === 'plan')
        return (
          <a
            key={l.label}
            href={hrefFor(l.route)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${active ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink'}`}
          >
            {l.label}
          </a>
        )
      })}
    </nav>
  )
}

export default function App() {
  const route = useRoute()
  const wide = useIsWide()
  const trip = usePlanner(selectedTrip)
  const planning = route.name === 'catalog' || route.name === 'plan' || route.name === 'map'

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-page text-ink">
        {/* One night-sky row; on an installed iPhone app it runs under the status bar (midnight-theme Decisions 4 and 9, refresh-plan-layout Decision 3). */}
        <header className="sticky top-0 z-20 overflow-hidden bg-sky pt-[env(safe-area-inset-top)] shadow-md">
          <NightSky variant="row" />
          <div className="relative mx-auto flex min-h-14 max-w-6xl items-center gap-2 px-4 lg:justify-between">
            {(wide || !trip) && (
              <a
                href="#/plan"
                className="flex min-h-11 shrink-0 items-center gap-2 font-display text-xl font-semibold tracking-tight text-on-sky focus-visible:outline-2 focus-visible:outline-focus-on-sky"
              >
                <SparkleIcon width={14} height={14} className="text-star" />
                Disneyland Planner
              </a>
            )}
            <TripHeader />
          </div>
        </header>
        <UpdatePrompt />
        <StorageBanner />
        {/* Clear of the phone dock (refresh-plan-layout design Decision 2). */}
        <main className="mx-auto max-w-6xl px-4 pb-[calc(var(--dock-h,0px)+0.75rem)] pt-3">
          {planning && (
            <PlannerDnd>
              {wide ? (
                <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-6">
                  <div className="min-w-0">
                    <LeftColumnSwitch current={route} />
                    {route.name === 'map' ? <MapScreen /> : <CatalogScreen />}
                  </div>
                  {/* My day stays in view while the left column scrolls, so items can be dragged across. */}
                  <div className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] overflow-y-auto pr-1" data-testid="plan-column">
                    <PlanScreen />
                  </div>
                </div>
              ) : route.name === 'catalog' ? (
                <CatalogScreen />
              ) : route.name === 'map' ? (
                <MapScreen />
              ) : (
                <PlanScreen />
              )}
            </PlannerDnd>
          )}
          {route.name === 'about' && <AboutScreen />}
          {route.name === 'import' && <ImportScreen data={route.data} />}
        </main>
        {!wide && <Dock current={route} />}
      </div>
    </ToastProvider>
  )
}
