import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent shadow-sm hover:bg-accent-hover disabled:bg-accent/40',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-muted',
  ghost: 'text-ink-soft hover:bg-surface-muted',
  danger: 'bg-surface text-over border border-over/40 hover:bg-over-soft',
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

/** Square 44x44 icon button; `label` is required for screen readers. */
export function IconButton({ label, className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-30 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 text-sm ${selected ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink hover:bg-surface-muted'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
    >
      {children}
    </button>
  )
}

/** Tones name a meaning, not a color (midnight-theme design Decision 10). */
export type BadgeTone = 'neutral' | 'warn' | 'over' | 'fits' | 'planned'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-soft',
  warn: 'bg-warn-soft text-warn',
  over: 'bg-over-soft text-over',
  fits: 'bg-fits-soft text-fits',
  planned: 'bg-accent text-on-accent',
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="whitespace-nowrap text-star-ink" aria-label={`Rated ${rating} out of 5`} title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-line-strong">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/**
 * Modal sheet: bottom sheet on phones, centred dialog on wide screens. Rendered into document.body, so a
 * sticky ancestor (such as the wide-screen plan column) can't trap it under other sticky content.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="sheet-scrim fixed inset-0 z-40 flex items-end justify-center bg-sky-deep/50 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-panel max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl outline-none sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-2">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-ink-soft">
      {label}
      {children}
    </label>
  )
}

export const inputClass =
  'min-h-11 rounded-lg border border-field bg-surface px-3 text-base text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25'
