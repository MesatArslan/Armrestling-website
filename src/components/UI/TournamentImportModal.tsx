import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface TournamentImportModalProps {
  isOpen: boolean
  onClose: () => void
  importFile: File | null
  onFileChange: (file: File | null) => void
  importMessage: { type: 'success' | 'error'; text: string } | null
  isImporting: boolean
  onImport: () => void
  onReset: () => void
}

export const TournamentImportModal: React.FC<TournamentImportModalProps> = ({
  isOpen,
  onClose,
  importFile,
  onFileChange,
  importMessage,
  isImporting,
  onImport,
  onReset,
}) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('tournaments.importTournamentPackage')}</h2>
                <p className="text-blue-100 text-xs">{t('tournaments.selectPackageFile')}</p>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('tournaments.importTournamentPackage')} (.json)</label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg"
              />
            </div>
            {importFile && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800"><span className="font-semibold">{t('tournaments.selectedFile')}:</span> {importFile.name}</p>
                <p className="text-xs text-blue-600 mt-1">{t('tournaments.fileSize')}: {(importFile.size / 1024).toFixed(2)} KB</p>
              </div>
            )}
            {importMessage && (
              <div className={`p-3 rounded-lg border ${importMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <p className="text-sm">{importMessage.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button onClick={onReset} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium" disabled={isImporting}>{t('common.cancel')}</button>
          <button onClick={onImport} disabled={!importFile || isImporting} className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-300 disabled:cursor-not-allowed gap-2">{isImporting ? t('tournaments.importing') : t('tournaments.importTournament')}</button>
        </div>
      </div>
    </div>
  )
}

export default TournamentImportModal


