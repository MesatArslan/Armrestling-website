import React from 'react'
import { useTranslation } from 'react-i18next'
import type { Column } from '../../utils/playersStorage'

interface ManageColumnsModalProps {
  isOpen: boolean
  onClose: () => void
  columns: Column[]
  defaultColumns: Column[]
  newColumnName: string
  onChangeNewColumnName: (value: string) => void
  onAddColumn: () => void
  onToggleColumnVisibility: (columnId: string) => void
  onDeleteColumn: (columnId: string) => void
}

export const ManageColumnsModal: React.FC<ManageColumnsModalProps> = ({
  isOpen,
  onClose,
  columns,
  defaultColumns,
  newColumnName,
  onChangeNewColumnName,
  onAddColumn,
  onToggleColumnVisibility,
  onDeleteColumn
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('players.manageColumns')}</h2>
                <p className="text-blue-100 text-xs">{t('players.manageColumnsDescription')}</p>
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
          {/* Add column */}
          <div className="mb-4 flex gap-2 items-center">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => onChangeNewColumnName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onAddColumn(); }}
              placeholder={t('players.columnName')}
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={onAddColumn}
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {t('players.addNewColumn')}
            </button>
          </div>

          {/* Columns list */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {columns
              .filter((col) => !defaultColumns.some((d) => d.id === col.id))
              .map((col) => (
                <div
                  key={col.id}
                  onClick={() => onToggleColumnVisibility(col.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    col.visible
                      ? 'border-blue-200 bg-blue-50/60 hover:bg-blue-100'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-gray-900 truncate">{col.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      className="inline-flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => onToggleColumnVisibility(col.id)}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${col.visible ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${col.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </label>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteColumn(col.id);
                      }}
                      className="text-red-600 hover:text-red-700 px-2 py-1 text-sm"
                      title={t('players.delete')}
                    >
                      {t('players.delete')}
                    </button>
                  </div>
                </div>
              ))}
            {columns.filter((col) => !defaultColumns.some((d) => d.id === col.id)).length === 0 && (
              <div className="text-sm text-gray-500 p-2">{t('players.noCustomColumns') || 'Özel sütun yok.'}</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManageColumnsModal


