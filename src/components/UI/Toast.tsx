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

  const styles = {
    container:
      'pointer-events-auto w-full max-w-sm rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/10 backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-2 fade-in',
    base:
      'p-4 text-white relative',
    gradient:
      type === 'success'
        ? 'bg-gradient-to-r from-emerald-500 to-green-600'
        : type === 'error'
        ? 'bg-gradient-to-r from-rose-500 to-red-600'
        : 'bg-gradient-to-r from-gray-700 to-gray-900',
    badgeBg:
      type === 'success'
        ? 'bg-emerald-400/20'
        : type === 'error'
        ? 'bg-rose-400/20'
        : 'bg-white/10',
    progress:
      type === 'success'
        ? 'from-white/60 via-white/40 to-transparent'
        : type === 'error'
        ? 'from-white/60 via-white/40 to-transparent'
        : 'from-white/60 via-white/40 to-transparent'
  }

  return (
    <div className={styles.container} role="status" aria-live="polite">
      <div className={`${styles.base} ${styles.gradient}`}>
        <div className="flex items-start">
          <div className="mr-3 mt-0.5 rounded-lg p-1.5 bg-white/10">
            {type === 'success' && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {type === 'error' && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {type === 'info' && (
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold tracking-tight">{message}</div>
            <div className={`mt-2 h-1 w-full rounded-full bg-white/20 overflow-hidden`}>
              <div className={`h-full bg-gradient-to-r ${styles.progress} animate-progress`}></div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 inline-flex text-white/90 hover:text-white focus:outline-none rounded-md p-1 bg-white/10 hover:bg-white/20 transition"
              aria-label="Kapat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6.225 4.811a1 1 0 011.414 0L12 9.172l4.361-4.361a1 1 0 111.414 1.414L13.414 10.586l4.361 4.361a1 1 0 11-1.414 1.414L12 12l-4.361 4.361a1 1 0 11-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 010-1.414z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {/* Tailwind keyframes via utility (fallback class) */}
      <style>{`
        @keyframes progressBar { from { transform: translateX(-100%); } to { transform: translateX(0%); } }
        .animate-progress { animation: progressBar ${Math.max(0, duration)}ms linear forwards; transform: translateX(-100%); }
      `}</style>
    </div>
  )
}

export default Toast


