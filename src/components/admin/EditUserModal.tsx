import React, { useState, useEffect } from 'react'
import type { Profile } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, formData: {
    username: string
    email: string
    role: 'user' | 'admin'
    expiration_date: string
  }) => void
  isSubmitting: boolean
  user: Profile | null
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  user
}) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user' as 'user' | 'admin',
    expiration_date: ''
  })

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        username: user.username || '',
        email: user.email,
        role: user.role as 'user' | 'admin',
        expiration_date: user.expiration_date ? user.expiration_date.split('T')[0] + 'T' + user.expiration_date.split('T')[1]?.substring(0, 5) : ''
      })
    }
  }, [user, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Kullanıcı Düzenle: {user.username || user.email}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Son Kullanma Tarihi</label>
              <input
                type="datetime-local"
                name="expiration_date"
                value={formData.expiration_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
              />
                              <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditUserExpirationInMonths(1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">1 ay</button>
                  <button type="button" onClick={() => setEditUserExpirationInMonths(3)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">3 ay</button>
                  <button type="button" onClick={() => setEditUserExpirationInMonths(6)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">6 ay</button>
                  <button type="button" onClick={() => setEditUserExpirationInMonths(12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium">12 ay</button>
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
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
