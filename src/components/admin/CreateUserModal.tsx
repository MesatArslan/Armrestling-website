import React, { useState, useEffect } from 'react'
import LoadingSpinner from '../UI/LoadingSpinner'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: {
    email: string
    password: string
    username: string
  }) => void
  isSubmitting: boolean
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  // Modal açıldığında formu sıfırla
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        password: '',
        username: ''
      })
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border border-gray-100 w-11/12 max-w-3xl shadow-2xl rounded-xl bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Yeni Kullanıcı Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
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
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Şifre</label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pr-10 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-900 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Şifreyi göster/gizle"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3C5 3 1.73 7.11.46 9.05a1 1 0 000 .9C1.73 11.89 5 16 10 16s8.27-4.11 9.54-6.05a1 1 0 000-.9C18.27 7.11 15 3 10 3zm0 11c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/><path d="M10 7a3 3 0 100 6 3 3 0 000-6z"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M1.53 1.53a.75.75 0 011.06 0l3.4 3.4A11.26 11.26 0 0112 3.75c5.24 0 9.2 3.41 11.24 6.05.33.42.33 1 0 1.42a16.62 16.62 0 01-5.02 4.3l3.25 3.25a.75.75 0 11-1.06 1.06l-3.53-3.53a11.09 11.09 0 01-4.88 1.41c-5.24 0-9.2-3.41-11.24-6.05a1 1 0 010-1.42A16.62 16.62 0 015.2 7.22L1.53 3.59a.75.75 0 010-1.06zM7.4 9.46l1.36 1.36a3 3 0 003.42 3.42l1.36 1.36a4.5 4.5 0 01-6.14-6.14z"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="mt-1 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <div className="font-medium">Kurum Aboneliği</div>
                    <div className="text-blue-600">Bu kullanıcının son kullanma tarihi kurumunuzun abonelik süresi ile belirlenir.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Kullanıcı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
