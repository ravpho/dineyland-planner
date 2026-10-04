import { SERVICE_LABELS, scareLabel, thrillLabel, type CatalogItem } from '../domain/catalog'
import { waitRange, mealMinutes, RESTAURANT_WAITS } from '../domain/waits'
import { MONTH_NAMES, usePlanningMonth } from '../app/hooks'
import { useCatalog, usePlanner } from '../app/PlannerContext'
import { unsuitableReason } from '../domain/suitability'
import { ExternalIcon } from './icons'
import { areaName, HEIGHT_SOURCE_LABELS, heightLabel, mapsUrl, TYPE_LABELS } from './labels'
import { Badge, Button, Sheet, Stars } from './ui'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  )
}

export function WaitExplanation() {
  const catalog = useCatalog()
  return (
    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
      Waits are <strong>typical</strong> values, not live ones: the ride&apos;s average queue time in {catalog.statsYears.join(', ')} from
      Queue-Times, scaled by how busy the month usually is and by the time of day. Statistics collected on {catalog.collectedAt}.
    </p>
  )
}

export function ItemDetail({ item, onClose, onAdd }: { item: CatalogItem; onClose: () => void; onAdd: () => void }) {
  const catalog = useCatalog()
  const month = usePlanningMonth()
  const profile = usePlanner((s) => s.profile)
  const park = catalog.parks.find((p) => p.id === item.parkId)!
  const area = areaName(item, catalog)
  const reason = unsuitableReason(item, profile)

  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone="indigo">{TYPE_LABELS[item.type]}</Badge>
        <span className="text-sm text-slate-600">
          {park.name} · {area}
        </span>
      </div>
      {reason && (
        <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-sm text-amber-900" role="note">
          Not suitable for your group: {reason}
        </p>
      )}
      <p className="text-slate-800">{item.description}</p>
      <p className="mt-2 text-sm text-slate-600">
        <Stars rating={item.rating} /> <span className="ml-1">{item.ratingReason}</span>
      </p>
      {(item.officialUrl || item.location) && (
        <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
          {item.officialUrl && (
            <a href={item.officialUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-indigo-700 underline">
              Official page <ExternalIcon />
            </a>
          )}
          {item.location && (
            <a href={mapsUrl(item.location)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-medium text-indigo-700 underline">
              {item.locationApproximate ? 'Open in Maps (approximate)' : 'Open in Maps'} <ExternalIcon />
            </a>
          )}
        </p>
      )}
      <dl className="mt-3">
        {item.type === 'attraction' && (
          <>
            <Row label="Duration">{item.durationMin} min</Row>
            <Row label="Height">{heightLabel(item.minHeightCm)}</Row>
            <Row label="Height check">
              <span data-testid="height-source" data-source={item.heightSource}>
                {HEIGHT_SOURCE_LABELS[item.heightSource]}
              </span>
            </Row>
            {item.ageRule && <Row label="Age rule">{item.ageRule}</Row>}
            <Row label="Thrill level">{thrillLabel(item.thrill)}</Row>
            <Row label="Scariness">{scareLabel(item.scare)}</Row>
            <Row label={`Typical wait in ${MONTH_NAMES[month - 1]}`}>
              {(() => {
                const [lo, hi] = waitRange(item, park, month)
                return item.waitStats ? `${lo}–${hi} min` : `about ${lo} min (estimate)`
              })()}
            </Row>
          </>
        )}
        {item.type === 'restaurant' && (
          <>
            <Row label="Service">{SERVICE_LABELS[item.service]}</Row>
            <Row label="Typical meal">{mealMinutes(item)} min</Row>
            <Row label="Typical wait (estimate)">
              {RESTAURANT_WAITS[item.service][1]}–{RESTAURANT_WAITS[item.service][0]} min
            </Row>
          </>
        )}
        {item.type === 'show' && (
          <>
            <Row label="Typical start times">{item.times.join(', ')}</Row>
            <Row label="Duration">{item.durationMin} min</Row>
            <Row label="Arrive early">{item.arriveEarlyMin} min before</Row>
          </>
        )}
      </dl>
      {item.type === 'attraction' && (
        <p className="mt-2 text-xs text-slate-600" role="note">
          Height and age rules can change: always follow the signs posted at the attraction.
        </p>
      )}
      {item.type !== 'show' && <WaitExplanation />}
      <section className="mt-3">
        <h3 className="text-sm font-semibold text-slate-900">Sources</h3>
        <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
          {item.sources.map((s) => (
            <li key={s.label}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      </section>
      <Button variant="primary" className="mt-4 w-full" onClick={onAdd}>
        Add to day
      </Button>
    </Sheet>
  )
}
