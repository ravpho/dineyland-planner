import { useMemo } from 'react'
import { decodeTrip } from '../domain/shareLink'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { navigate } from '../routing'
import { Button } from '../components/ui'

export default function ImportScreen({ data }: { data: string }) {
  const catalog = useCatalog()
  const importTrip = usePlanner((s) => s.importTrip)
  const trip = useMemo(() => decodeTrip(data, catalog.items), [data, catalog])

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="mb-2 text-xl font-semibold text-slate-900">Import</h2>
      {trip ? (
        <>
          <p className="text-slate-800">
            Import <strong>{trip.name}</strong> with {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'} and{' '}
            {trip.days.reduce((n, d) => n + d.items.length, 0)} planned items? It is added as a new trip; your existing trips are not changed.
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant="primary"
              onClick={() => {
                importTrip(trip)
                navigate({ name: 'plan' })
              }}
            >
              Import trip
            </Button>
            <Button onClick={() => navigate({ name: 'plan' })}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-slate-800" role="alert">
            This share link cannot be read. It may be incomplete or damaged. Nothing was imported.
          </p>
          <Button className="mt-4" onClick={() => navigate({ name: 'plan' })}>
            Go to my plan
          </Button>
        </>
      )}
    </section>
  )
}
