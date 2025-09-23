import React from 'react'
import { useTranslation } from 'react-i18next'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: () => void
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  const exampleHeaders = t('players.excelImport.exampleHeaders', { returnObjects: true }) as unknown
  const headersArray = Array.isArray(exampleHeaders) ? (exampleHeaders as string[]) : []

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
                <h2 className="text-lg font-bold text-white">{t('players.excelImport.title')}</h2>
                <p className="text-blue-100 text-xs">{t('players.excelImport.description')}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/90 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="px-4 py-4 bg-gray-50">
          <div className="text-sm text-gray-700 space-y-3">
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('players.excelImport.mapping.name')}</li>
              <li>{t('players.excelImport.mapping.surname')}</li>
              <li>{t('players.excelImport.mapping.weight')}</li>
              <li>{t('players.excelImport.mapping.handPreference')}</li>
              <li>{t('players.excelImport.mapping.gender')}</li>
              <li>{t('players.excelImport.mapping.birthday')}</li>
              <li>{t('players.excelImport.mapping.fullName')}</li>
            </ul>
            <p className="text-gray-600">{t('players.excelImport.note')}</p>
            <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
              <div className="font-semibold text-gray-800 mb-1">{t('players.excelImport.exampleTitle')}</div>
              <div className="overflow-x-auto">
                <div className="inline-grid grid-cols-6 gap-2">
                  {headersArray.map((header: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-gray-50 rounded">{header}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onImport}
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {t('players.importExcel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExcelImportModal


