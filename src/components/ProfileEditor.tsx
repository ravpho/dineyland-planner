import { useState } from 'react'
import { SCARE_LEVELS, THRILL_LEVELS, type ScareLevel, type ThrillLevel } from '../domain/catalog'
import { usePlanner } from '../app/PlannerContext'
import { Button, Field, inputClass } from './ui'

/** Edits and saves the group profile: shortest member's height, maximum thrill and scariness. */
export function ProfileEditor() {
  const profile = usePlanner((s) => s.profile)
  const setProfile = usePlanner((s) => s.setProfile)
  const [height, setHeight] = useState(profile?.heightCm?.toString() ?? '')
  const [thrill, setThrill] = useState(profile?.maxThrill?.toString() ?? '')
  const [scare, setScare] = useState(profile?.maxScare?.toString() ?? '')

  const save = () =>
    setProfile({
      heightCm: height ? Number(height) : undefined,
      maxThrill: thrill ? (Number(thrill) as ThrillLevel) : undefined,
      maxScare: scare !== '' ? (Number(scare) as ScareLevel) : undefined,
    })
  const clear = () => {
    setHeight('')
    setThrill('')
    setScare('')
    setProfile(undefined)
  }

  return (
    <fieldset className="rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold text-ink">Group profile</legend>
      <p className="mb-2 text-xs text-ink-muted">Saved on this device and applied to the list automatically.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Shortest height (cm)">
          <input className={inputClass} type="number" inputMode="numeric" min={70} max={220} value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 110" />
        </Field>
        <Field label="Max thrill">
          <select className={inputClass} value={thrill} onChange={(e) => setThrill(e.target.value)}>
            <option value="">Any</option>
            {THRILL_LEVELS.map((l, i) => (
              <option key={l} value={i + 1}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Max scariness">
          <select className={inputClass} value={scare} onChange={(e) => setScare(e.target.value)}>
            <option value="">Any</option>
            {SCARE_LEVELS.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" onClick={save}>
          Save profile
        </Button>
        <Button variant="ghost" onClick={clear} disabled={!profile && !height && !thrill && !scare}>
          Clear profile
        </Button>
      </div>
    </fieldset>
  )
}
