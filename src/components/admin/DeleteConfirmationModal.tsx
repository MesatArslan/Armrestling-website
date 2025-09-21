import React from 'react'
import type { Institution, Profile } from '../../types/auth'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  item: Institution | Profile | null
  itemType: 'institution' | 'user'
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  item,
  itemType
}) => {
  if (!isOpen || !item) return null

  const getItemName = () => {
    if (itemType === 'institution') {
      return (item as Institution).name
    } else {
      return (item as Profile).username || (item as Profile).email
    }
  }

  const getItemTypeText = () => {
    return itemType === 'institution' ? 'Kurum' : 'Kullanıcı'
  }

  const getWarningText = () => {
    if (itemType === 'institution') {
      return (
        <>
          <strong>{getItemName()}</strong> kurumunu silmek istediğinizden emin misiniz?
          <br />
          <span className="text-red-600 font-medium">
            Bu işlem geri alınamaz!
          </span>
          <br />
          <span className="text-orange-600 font-medium">
            Kuruma ait tüm kullanıcılar ve dosyalar da silinecektir!
          </span>
        </>
      )
    } else {
      return (
        <>
          <strong>{getItemName()}</strong> kullanıcısını silmek istediğinizden emin misiniz?
          <br />
          <span className="text-red-600 font-medium">
            Bu işlem geri alınamaz!
          </span>
          <br />
          <span className="text-orange-600 font-medium">
            Kullanıcıya ait tüm dosyalar da silinecektir!
          </span>
        </>
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{getItemTypeText()} Silme Onayı</h2>
                <p className="text-red-100 text-xs">{getItemName()}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/90 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 py-4 bg-gray-50">
          <div className="space-y-4">
            {/* Warning Icon */}
            <div className="flex justify-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 border-2 border-red-200">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            {/* Warning Text */}
            <div className="text-center">
              <div className="text-sm text-gray-700 leading-relaxed">
                {getWarningText()}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSubmitting}
                  className="inline-flex items-center bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Siliniyor...
                    </>
                  ) : (
                    'Sil'
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}