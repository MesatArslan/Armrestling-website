import React, { useEffect } from 'react'

interface ToastProps {
  type?: 'success' | 'error' | 'info'
  message: string
  onClose?: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ type = 'info', message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!duration) return
    const t = setTimeout(() => onClose && onClose(), duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const colorClasses =
    type === 'success'
      ? 'bg-green-600'
      : type === 'error'
      ? 'bg-red-600'
      : 'bg-gray-800'

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-lg shadow-lg overflow-hidden ring-1 ring-black/10">
      <div className={`p-4 text-white ${colorClasses}`}>
        <div className="flex items-start">
          <div className="flex-1 text-sm font-medium">{message}</div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 inline-flex text-white/90 hover:text-white focus:outline-none"
              aria-label="Kapat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6.225 4.811a1 1 0 011.414 0L12 9.172l4.361-4.361a1 1 0 111.414 1.414L13.414 10.586l4.361 4.361a1 1 0 11-1.414 1.414L12 12l-4.361 4.361a1 1 0 11-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 010-1.414z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toast


