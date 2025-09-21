import React, { useState, useEffect } from 'react'
import type { Profile } from '../../types/auth'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, formData: {
    username: string
    email: string
    expiration_date?: string
  }) => void
  isSubmitting: boolean
  user: Profile | null
  showExpiration?: boolean
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  user,
  showExpiration = true
}) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    expiration_date: '' as string | undefined
  })

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        username: user.username || '',
        email: user.email,
        expiration_date: user.expiration_date ? user.expiration_date.split('T')[0] + 'T' + user.expiration_date.split('T')[1]?.substring(0, 5) : ''
      })
    }
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    onSubmit(user.id, formData)
  }

  // Tarih yardımcıları
  const toDateTimeLocalString = (date: Date): string => {
    const pad = (n: number) => `${n}`.padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    const hh = pad(date.getHours())
    const mm = pad(date.getMinutes())
    return `${y}-${m}-${d}T${hh}:${mm}`
  }

  const addMonths = (base: Date, months: number): Date => {
    const d = new Date(base)
    const day = d.getDate()
    d.setMonth(d.getMonth() + months)
    // Ay sonu taşmalarını düzelt
    if (d.getDate() < day) {
      d.setDate(0)
    }
    return d
  }

  const setEditUserExpirationInMonths = (months: number) => {
    const base = new Date()
    const newExp = addMonths(base, months)
    setFormData(prev => ({ ...prev, expiration_date: toDateTimeLocalString(newExp) }))
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-2xl w-full max-h-[85vh] sm:max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            {/* Mobile: Title and Close button */}
            <div className="flex sm:hidden items-center justify-between w-full mb-2">
              <div className="flex items-center space-x-2">
                <div className="bg-white/20 rounded-lg p-1.5">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t('admin.modals.editUser.title')}</h2>
                  <p className="text-blue-100 mt-1 text-xs">{user.username || user.email}</p>
                </div>
              </div>
              <button onClick={onClose} className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md hover:bg-white/30 transition-all duration-200 text-[11px] font-semibold flex items-center justify-center text-white mt-1">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            {/* Desktop: Original layout */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t('admin.modals.editUser.title')}</h2>
                <p className="text-blue-100 mt-1 text-sm">{user.username || user.email}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={onClose} className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[calc(85vh-120px)] sm:max-h-[calc(85vh-120px)]">
          <div className="px-4 py-4 sm:p-6 overflow-y-auto bg-gray-50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.modals.editUser.username')}</label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 shadow-sm"
                    placeholder={t('admin.modals.editUser.usernamePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.modals.editUser.email')}</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 shadow-sm"
                    placeholder={t('admin.modals.editUser.emailPlaceholder')}
                  />
                </div>

                {showExpiration && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.modals.editUser.expirationDate')}</label>
                  <input
                    type="datetime-local"
                    name="expiration_date"
                    value={formData.expiration_date || ''}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditUserExpirationInMonths(1)} className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors">{t('admin.modals.editUser.quickAddMonths', { months: 1 })}</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(3)} className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors">{t('admin.modals.editUser.quickAddMonths', { months: 3 })}</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(6)} className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors">{t('admin.modals.editUser.quickAddMonths', { months: 6 })}</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(12)} className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors">{t('admin.modals.editUser.quickAddMonths', { months: 12 })}</button>
                  </div>
                </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  {t('admin.modals.editUser.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('admin.modals.editUser.updating')}
                    </>
                  ) : (
                    t('admin.modals.editUser.update')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
