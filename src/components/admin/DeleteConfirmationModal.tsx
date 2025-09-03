import React from 'react'
import type { Institution, Profile } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

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
            Kuruma ait tüm kullanıcılar da silinecektir!
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
        </>
      )
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
        <div className="mt-3">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
            {getItemTypeText()} Silme Onayı
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            {getWarningText()}
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Sil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
