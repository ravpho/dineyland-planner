import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/** Offers a newer version of the app or its data. Saved trips live in device storage and are kept. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 bg-accent-soft px-4 py-2 text-sm text-ink">
      <span>A new version with updated data is available. Your trips are kept.</span>
      <span className="flex gap-2">
        <Button variant="primary" onClick={() => updateServiceWorker(true)}>
          Update
        </Button>
        <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
          Later
        </Button>
      </span>
    </div>
  )
}
