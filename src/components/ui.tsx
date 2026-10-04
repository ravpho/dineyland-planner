import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { CloseIcon } from './icons'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-700 text-white hover:bg-indigo-800 disabled:bg-indigo-300',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
}

export function Button({ variant = 'secondary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${VARIANTS[variant]} ${className}`}
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
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-30 ${className}`}
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
      className={`min-h-11 rounded-full border px-3 text-sm ${selected ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  )
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'amber' | 'red' | 'green' | 'indigo'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-900',
    red: 'bg-red-100 text-red-800',
    green: 'bg-emerald-100 text-emerald-800',
    indigo: 'bg-indigo-100 text-indigo-800',
  }
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="whitespace-nowrap text-amber-500" aria-label={`Rated ${rating} out of 5`} title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-slate-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/** Modal sheet: bottom sheet on phones, centred dialog on wide screens. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl outline-none sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-2">
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}

export const inputClass =
  'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200'
