import { useMemo, useState } from 'react'
import { shareUrl } from '../domain/shareLink'
import type { Trip } from '../domain/trip'
import { Button, inputClass, Sheet } from './ui'

export function ShareSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const url = useMemo(() => shareUrl(trip, window.location.href), [trip])
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Sheet title="Share this trip" onClose={onClose}>
      <p className="mb-2 text-sm text-ink-muted">
        Open this link on another device to import a copy of <strong>{trip.name}</strong>. It is also a handy backup.
      </p>
      <input aria-label="Share link" readOnly className={`${inputClass} w-full text-sm`} value={url} onFocus={(e) => e.currentTarget.select()} />
      <Button variant="primary" className="mt-3 w-full" onClick={copy}>
        {copied ? 'Link copied' : 'Copy share link'}
      </Button>
    </Sheet>
  )
}
