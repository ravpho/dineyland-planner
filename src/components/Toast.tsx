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
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6">
        {message && (
          <div key={message.id} role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            <span>{message.text}</span>
            {message.action && (
              <button
                type="button"
                className="min-h-11 rounded px-2 font-semibold text-amber-300 underline-offset-2 hover:underline"
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
