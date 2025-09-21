import React, { useEffect } from 'react'
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface FileUploadSuccessNotificationProps {
  isOpen: boolean
  onClose: () => void
  message: string
  duration?: number
}

const FileUploadSuccessNotification: React.FC<FileUploadSuccessNotificationProps> = ({
  isOpen,
  onClose,
  message,
  duration = 4000
}) => {
  useEffect(() => {
    if (!isOpen || !duration) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-auto">
      <div 
        className="bg-white rounded-lg shadow-xl border border-green-200 p-3 w-72 max-w-sm transform transition-all duration-300 ease-out animate-in slide-in-from-right-4 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon and Content */}
        <div className="flex items-start gap-2">
          {/* Animated Success Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            {/* Success ring animation */}
            <div className="absolute inset-0 w-8 h-8 border-2 border-green-300 rounded-full animate-ping opacity-75"></div>
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Başarılı!</h4>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all duration-200"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-700 mt-1 leading-relaxed">{message}</p>
            
            {/* Progress bar */}
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-1 rounded-full transition-all duration-100 ease-linear"
                  style={{
                    animation: `progress ${duration}ms linear forwards`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes progress {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

export default FileUploadSuccessNotification
