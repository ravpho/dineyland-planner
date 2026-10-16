import { useId } from 'react'
import { SPARKLE_PATH } from './icons'

/** Small, fast generator so the sky is the same on every load and in every screenshot. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One tile of stars, in px. It repeats across the width, so the sky never stretches. */
const TILE = { width: 480, height: 120 }
const random = mulberry32(20261007)
export const STARS = Array.from({ length: 34 }, () => ({
  x: +(random() * TILE.width).toFixed(1),
  y: +(random() * TILE.height).toFixed(1),
  r: +(0.4 + random() * 0.8).toFixed(2),
  opacity: +(0.3 + random() * 0.6).toFixed(2),
}))

type SparkleSpot = { x: string; y: string; size: number; twinkle?: string }

/**
 * Gold sparkles placed by share of the width and height, sized in px; three twinkle, each with its own delay.
 * They sit in gaps that stay free of text: in the one-row header, in the strips above and below the letters;
 * in the empty Plan band and the day card, top right of the title.
 */
export type SkyVariant = 'row' | 'band'
const SPARKLES: Record<SkyVariant, SparkleSpot[]> = {
  row: [
    { x: '31%', y: '16%', size: 4, twinkle: '0s' },
    { x: '66%', y: '90%', size: 3, twinkle: '2.3s' },
    { x: '75%', y: '18%', size: 3.5 },
    { x: '47%', y: '90%', size: 2.5, twinkle: '4.1s' },
    { x: '98%', y: '50%', size: 2.5 },
  ],
  // Right of the title and below the day card's Edit button, which sits in the top right corner.
  band: [
    { x: '70%', y: '42%', size: 5, twinkle: '0s' },
    { x: '86%', y: '52%', size: 3.5, twinkle: '2.3s' },
    { x: '78%', y: '62%', size: 2.5 },
    { x: '94%', y: '40%', size: 3, twinkle: '4.1s' },
    { x: '61%', y: '36%', size: 2.5 },
  ],
}

/**
 * Night sky drawn behind the header and the empty Plan band (midnight-theme design Decision 4).
 * Decorative: hidden from assistive technology and from pointer events.
 */
export function NightSky({ variant = 'row', className = '' }: { variant?: SkyVariant; className?: string }) {
  const id = useId()
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden bg-linear-to-b from-sky-deep to-sky ${className}`} data-testid="night-sky">
      <svg width="100%" height="100%" className="block">
        <defs>
          <pattern id={`${id}-stars`} width={TILE.width} height={TILE.height} patternUnits="userSpaceOnUse">
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.opacity} className="fill-on-sky" />
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-stars)`} />
        {SPARKLES[variant].map((s, i) => (
          <svg key={i} x={s.x} y={s.y} overflow="visible">
            <path
              d={SPARKLE_PATH}
              transform={`scale(${s.size})`}
              className={`fill-star ${s.twinkle ? 'twinkle' : ''}`}
              style={s.twinkle ? { animationDelay: s.twinkle } : undefined}
              data-testid="sky-sparkle"
            />
          </svg>
        ))}
      </svg>
    </div>
  )
}
