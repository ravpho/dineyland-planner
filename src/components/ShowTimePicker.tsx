import type { Show } from '../domain/catalog'
import { Button, Sheet } from './ui'

export function ShowTimePicker({ show, onPick, onClose }: { show: Show; onPick: (time: string) => void; onClose: () => void }) {
  return (
    <Sheet title={`When will you watch ${show.name}?`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">Typical start times. You can change the time later in your plan.</p>
      <div className="grid grid-cols-3 gap-2">
        {show.times.map((t) => (
          <Button key={t} onClick={() => onPick(t)}>
            {t}
          </Button>
        ))}
      </div>
    </Sheet>
  )
}
