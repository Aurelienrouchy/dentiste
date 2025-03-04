// Inspiré de shadcn/ui toast
import { useState, useEffect, createContext, useContext } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prevToasts) => [...prevToasts, { id, ...toast }])
  }

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  
  const toast = (props: Omit<Toast, "id">) => {
    context.addToast(props)
  }

  return {
    toast,
    toasts: context.toasts,
    dismiss: context.removeToast,
  }
}

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext) || {}

  if (!toasts || !removeToast) return null

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ 
  toast, 
  onRemove 
}: { 
  toast: Toast, 
  onRemove: (id: string) => void 
}) {
  const { id, title, description, variant = 'default', duration = 5000 } = toast

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onRemove])

  const baseClasses = "p-4 rounded-md shadow-lg transform transition-all duration-300 ease-in-out opacity-100 translate-y-0 max-w-md"
  const variantClasses = variant === 'destructive' 
    ? "bg-red-50 text-red-800 border border-red-200" 
    : "bg-white text-gray-800 border"

  return (
    <div className={`${baseClasses} ${variantClasses}`} role="alert">
      <div className="flex justify-between">
        {title && <div className="font-medium">{title}</div>}
        <button 
          onClick={() => onRemove(id)} 
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      {description && <div className="text-sm mt-1">{description}</div>}
    </div>
  )
} 