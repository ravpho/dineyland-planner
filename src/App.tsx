import { useIsWide } from './app/hooks'
import { usePlanner } from './app/PlannerContext'
import { SparkleIcon } from './components/icons'
import { NightSky } from './components/NightSky'
import { PlannerDnd } from './components/PlannerDnd'
import { ToastProvider } from './components/Toast'
import { UpdatePrompt } from './components/UpdatePrompt'
import { hrefFor, useRoute, type Route } from './routing'
import AboutScreen from './screens/AboutScreen'
import CatalogScreen from './screens/CatalogScreen'
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

function Tab({ route, current, label }: { route: Route; current: Route; label: string }) {
  const active = current.name === route.name
  return (
    <a
      href={hrefFor(route)}
      role="tab"
      aria-selected={active}
      className={`flex min-h-11 flex-1 items-center justify-center border-b-2 text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-on-sky ${active ? 'border-on-sky text-on-sky' : 'border-transparent text-on-sky-muted hover:text-on-sky'}`}
    >
      {label}
    </a>
  )
}

export default function App() {
  const route = useRoute()
  const wide = useIsWide()
  const planning = route.name === 'catalog' || route.name === 'plan'

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-page text-ink">
        {/* Night sky header; on an installed iPhone app it runs under the status bar (midnight-theme Decisions 4 and 9). */}
        <header className="sticky top-0 z-20 overflow-hidden bg-sky pt-[env(safe-area-inset-top)] shadow-md">
          <NightSky />
          <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4">
            <a
              href="#/plan"
              className="flex min-h-12 items-center gap-2 font-display text-xl font-semibold tracking-tight text-on-sky focus-visible:outline-2 focus-visible:outline-focus-on-sky"
            >
              <SparkleIcon width={14} height={14} className="text-star" />
              Disneyland Planner
            </a>
            <a
              href="#/about"
              className="flex min-h-11 min-w-11 items-center justify-center px-2 text-sm font-medium text-on-sky-muted hover:text-on-sky focus-visible:outline-2 focus-visible:outline-focus-on-sky"
            >
              About
            </a>
          </div>
          {planning && !wide && (
            <nav role="tablist" aria-label="Sections" className="relative mx-auto flex max-w-6xl">
              <Tab route={{ name: 'catalog' }} current={route} label="Catalog" />
              <Tab route={{ name: 'plan' }} current={route} label="Plan" />
            </nav>
          )}
        </header>
        <UpdatePrompt />
        <StorageBanner />
        <main className="mx-auto max-w-6xl px-4 py-3">
          {planning && (
            <PlannerDnd>
              {wide ? (
                <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-6">
                  <CatalogScreen />
                  {/* The plan stays in view while the catalog scrolls, so items can be dragged across. */}
                  <div className="sticky top-16 max-h-[calc(100dvh-5rem)] overflow-y-auto pr-1" data-testid="plan-column">
                    <PlanScreen />
                  </div>
                </div>
              ) : route.name === 'catalog' ? (
                <CatalogScreen />
              ) : (
                <PlanScreen />
              )}
            </PlannerDnd>
          )}
          {route.name === 'about' && <AboutScreen />}
          {route.name === 'import' && <ImportScreen data={route.data} />}
        </main>
      </div>
    </ToastProvider>
  )
}
