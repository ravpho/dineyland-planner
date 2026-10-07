import { useEffect } from 'react'
import { SparkleIcon } from './icons'

/** Where each star of the burst starts, around the element it covers, with its size in px and delay. */
const BURST = [
  { left: '8%', top: '-30%', size: 12, delay: '0ms' },
  { left: '86%', top: '-24%', size: 14, delay: '60ms' },
  { left: '50%', top: '-46%', size: 10, delay: '120ms' },
  { left: '-6%', top: '62%', size: 9, delay: '90ms' },
  { left: '96%', top: '70%', size: 10, delay: '150ms' },
]

/**
 * A small burst of gold stars over its parent, played once (midnight-theme design Decision 6). Decorative and
 * hidden from assistive technology. It reports `onDone` when its last star finishes, or after 1 s at most.
 * Callers don't render it when the device asks for reduced motion.
 */
export function Sparkle({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const fallback = setTimeout(onDone, 1000)
    return () => clearTimeout(fallback)
  }, [onDone])
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0" data-testid="sparkle">
      {BURST.map((b, i) => (
        <SparkleIcon
          key={i}
          width={b.size}
          height={b.size}
          className="sparkle-burst absolute text-star drop-shadow-[0_0_1px_var(--color-star-ink)]"
          style={{ left: b.left, top: b.top, animationDelay: b.delay }}
          onAnimationEnd={i === BURST.length - 1 ? onDone : undefined}
        />
      ))}
    </span>
  )
}
