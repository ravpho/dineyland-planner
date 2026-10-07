import { useCatalog } from '../app/PlannerContext'

export default function AboutScreen() {
  const catalog = useCatalog()
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-4 shadow-card text-ink">
      <h2 className="mb-2 font-display text-2xl font-semibold text-ink">About</h2>
      <p>
        Disneyland Planner helps you plan days at Disneyland Park and Disney Adventure World: pick attractions, meals and shows, and see
        whether your plan fits the time you have.
      </p>
      <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn" data-testid="unofficial">
        This is an unofficial app. It is not affiliated with, endorsed by or connected to Disney or Disneyland Paris. Heights, ages and
        other rules may be out of date: always follow the signs posted at each attraction.
      </p>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">Data</h3>
      <p className="mt-1 text-sm" data-testid="data-date">
        Catalog and wait statistics collected on <strong>{catalog.collectedAt}</strong>, using queue statistics from {catalog.statsYears.join(', ')}. Waits are typical values, not live.
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm">
        <li>
          <a href="https://queue-times.com/en-US" target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-2 hover:decoration-2">
            Powered by Queue-Times.com
          </a>{' '}
          – average queue times and crowd levels.
        </li>
        <li>
          <a href="https://themeparks.wiki" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:decoration-2">
            ThemeParks.wiki
          </a>{' '}
          – attraction, restaurant and show lists, locations, show times and opening hours.
        </li>
        <li>
          <a href="https://en.wikipedia.org" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:decoration-2">
            Wikipedia
          </a>{' '}
          – ride facts such as durations and some height limits.
        </li>
      </ul>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">Keep your plans safe</h3>
      <p className="mt-1 text-sm" data-testid="install-tip">
        Your trips are saved only on this device. Add the app to your home screen (Share → Add to Home Screen on iPhone, or Install app on
        Android) so your browser keeps them, and use <strong>Share</strong> to copy a backup link.
      </p>
    </section>
  )
}
