import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface ToastMessage {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

const ToastContext = createContext<(text: string, action?: ToastMessage['action']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null)
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
      {children}
      {/* Above the fit bar at every width (midnight-theme design Decision 10). */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
        {message && (
          <div key={message.id} role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-sky px-4 py-2 text-sm text-on-sky shadow-lg ring-1 ring-on-sky/10" data-testid="toast">
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
