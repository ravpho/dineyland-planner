import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastMessage {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

const ToastContext = createContext<(text: string, action?: ToastMessage['action']) => void>(() => {})

/** Open sheets register here, so messages move out of their way (app-shell spec: Messages never cover a sheet). */
const SheetRegistry = createContext<() => () => void>(() => () => {})

/** Call from a sheet: counts it as open while it is mounted. */
export function useRegisterSheet() {
  const register = useContext(SheetRegistry)
  useEffect(() => register(), [register])
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const [openSheets, setOpenSheets] = useState(0)
  const registerSheet = useCallback(() => {
    setOpenSheets((n) => n + 1)
    return () => setOpenSheets((n) => n - 1)
  }, [])
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((text: string, action?: ToastMessage['action']) => {
    setMessage({ id: Date.now(), text, action })
  }, [])
  useEffect(() => {
    clearTimeout(timer.current)
    if (message) timer.current = setTimeout(() => setMessage(null), message.action ? 7000 : 4000)
    return () => clearTimeout(timer.current)
  }, [message])
  return (
    <ToastContext.Provider value={show}>
      <SheetRegistry.Provider value={registerSheet}>{children}</SheetRegistry.Provider>
      {/*
        With a sheet open, at the top of the screen, which sheets leave free; otherwise above the dock on phones
        and above the plan column's fit bar on wide screens (refresh-plan-layout design Decision 10).
      */}
      <div
        aria-live="polite"
        data-testid="toast-region"
        data-placement={openSheets > 0 ? 'top' : 'bottom'}
        className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${openSheets > 0 ? 'top-[calc(env(safe-area-inset-top)+0.5rem)]' : 'bottom-[calc(var(--dock-h,0px)+0.5rem)] lg:bottom-24'}`}
      >
        {message && (
          <div key={message.id} role="status" className="toast-enter pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-sky px-4 py-2 text-sm text-on-sky shadow-lg ring-1 ring-on-sky/10" data-testid="toast">
            <span>{message.text}</span>
            {message.action && (
              <button
                type="button"
                className="min-h-11 rounded px-2 font-semibold text-star underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus-on-sky"
                onClick={() => {
                  message.action!.run()
                  setMessage(null)
                }}
              >
                {message.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
