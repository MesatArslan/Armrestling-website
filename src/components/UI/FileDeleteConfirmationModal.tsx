import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { SavedFile } from '../../services/supabaseFileManagerService'

interface FileDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  file: SavedFile | null
}

export const FileDeleteConfirmationModal: React.FC<FileDeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  file
}) => {
  if (!isOpen || !file) return null

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'players': return 'Oyuncular'
      case 'tournaments': return 'Turnuvalar'
      case 'fixtures': return 'Fixtürler'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'players': return 'bg-blue-100 text-blue-800'
      case 'tournaments': return 'bg-green-100 text-green-800'
      case 'fixtures': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Dosya Silme Onayı</h2>
                <p className="text-red-100 text-xs">{file.name}</p>
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
            {/* File Info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Dosya Bilgileri</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(file.type)}`}>
                  {getTypeLabel(file.type)}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div><strong>Dosya Adı:</strong> {file.name}</div>
                {file.description && <div><strong>Açıklama:</strong> {file.description}</div>}
                <div><strong>Boyut:</strong> {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : 'Bilinmiyor'}</div>
                <div><strong>Oluşturulma:</strong> {new Date(file.created_at).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>

            {/* Warning Text */}
            <div className="text-center">
              <div className="text-sm text-gray-700 leading-relaxed">
                <strong>{file.name}</strong> dosyasını silmek istediğinizden emin misiniz?
                <br />
                <span className="text-red-600 font-medium">
                  Bu işlem geri alınamaz!
                </span>
                <br />
                <span className="text-orange-600 font-medium">
                  Dosya kalıcı olarak silinecektir!
                </span>
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
