import React, { useState, useEffect } from 'react'
import type { Institution } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

interface EditInstitutionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (institutionId: string, formData: Partial<Institution>) => void
  isSubmitting: boolean
  institution: Institution | null
}

export const EditInstitutionModal: React.FC<EditInstitutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  institution
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    user_quota: 0,
    subscription_start_date: '',
    subscription_end_date: ''
  })

  useEffect(() => {
    if (institution && isOpen) {
      setFormData({
        name: institution.name,
        email: institution.email,
        user_quota: institution.user_quota,
        subscription_start_date: institution.created_at.split('T')[0],
        subscription_end_date: institution.subscription_end_date.split('T')[0]
      })
    }
  }, [institution, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!institution) return
    onSubmit(institution.id, formData)
  }

  // Tarih yardımcıları
  const toDateString = (date: Date): string => {
    const pad = (n: number) => `${n}`.padStart(2, '0')
    const y = date.getFullYear()
    const m = pad(date.getMonth() + 1)
    const d = pad(date.getDate())
    return `${y}-${m}-${d}`
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

  const setEditInstitutionEndInMonths = (months: number) => {
    const baseStr = formData.subscription_start_date
    const base = baseStr ? new Date(baseStr) : new Date()
    const newEnd = addMonths(base, months)
    setFormData(prev => ({ ...prev, subscription_end_date: toDateString(newEnd) }))
  }

  if (!isOpen || !institution) return null

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Kurum Düzenle: {institution.name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kurum Adı</label>
                                <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Kotası</label>
                                <input
                    type="number"
                    name="user_quota"
                    required
                    min={1}
                    value={formData.user_quota}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Üyelik Başlangıç Tarihi</label>
                                <input
                    type="date"
                    name="subscription_start_date"
                    required
                    value={formData.subscription_start_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Üyelik Bitiş Tarihi</label>
                                <input
                    type="date"
                    name="subscription_end_date"
                    required
                    value={formData.subscription_end_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                                <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">1 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(3)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">3 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(6)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">6 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">12 ay</button>
                  </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <LoadingSpinner /> : 'Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
