import React, { useState, useEffect, useMemo } from 'react'
import type { CreateInstitutionForm } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

interface CreateInstitutionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: CreateInstitutionForm) => void
  isSubmitting: boolean
}

export const CreateInstitutionModal: React.FC<CreateInstitutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<CreateInstitutionForm>({
    email: '',
    password: '',
    name: '',
    user_quota: 10,
    subscription_start_date: '',
    subscription_end_date: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const passwordStrength = useMemo(() => {
    const pwd = formData.password || ''
    let score = 0
    if (pwd.length >= 6) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    const percent = Math.min(100, Math.round((score / 4) * 100))
    let label = 'Zayıf'
    if (percent >= 75) label = 'Güçlü'
    else if (percent >= 50) label = 'Orta'
    return { percent, label }
  }, [formData.password])

  // Modal her açıldığında formu sıfırla ve varsayılan tarihleri ayarla
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const start = toDateTimeLocalString(now)
      const end = toDateTimeLocalString(addMonths(now, 1))
      setFormData({
        email: '',
        password: '',
        name: '',
        user_quota: 10,
        subscription_start_date: start,
        subscription_end_date: end
      })
      setShowPassword(false)
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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

  const setCreateInstitutionEndInMonths = (months: number) => {
    const base = formData.subscription_start_date
      ? new Date(formData.subscription_start_date)
      : new Date()
    const newEnd = addMonths(base, months)
    setFormData(prev => ({ ...prev, subscription_end_date: toDateTimeLocalString(newEnd) }))
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border border-gray-100 w-11/12 max-w-3xl shadow-2xl rounded-xl bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Yeni Kurum Ekle</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
            <h4 className="text-sm font-medium text-gray-900">Yeni Kurum Bilgileri</h4>
            <p className="text-xs text-gray-500 mt-1">Yönetici email ve şifre ile kurum hesabı oluşturulur. Üyelik tarihlerini hızlı seçimlerle belirleyebilirsiniz.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kurum Adı</label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 3a7 7 0 00-4.95 11.95l-1.768 1.768a1 1 0 101.414 1.414l1.768-1.768A7 7 0 1010 3z"/></svg>
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Örn: İstanbul Kulübü"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Kurumun görünen adı</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.94 6.94A2 2 0 014.343 6h11.314a2 2 0 011.404.94L10 11 2.94 6.94z"/><path d="M18 8.118l-8 4.8-8-4.8V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="kurum@ornek.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Yönetici hesabı için giriş emaili</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Şifre</label>
              <div className="mt-1 relative">
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 8a5 5 0 1110 0v1h1a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7a1 1 0 011-1h1V8zm2 0V7a3 3 0 116 0v1H7z" clipRule="evenodd"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  placeholder="Güçlü bir şifre girin"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
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
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`${passwordStrength.percent >= 75 ? 'bg-green-500' : passwordStrength.percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'} h-1.5 rounded-full`}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">Şifre gücü: {passwordStrength.label}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Kullanıcı Kotası</label>
              <div className="mt-1 relative">
                <input
                  type="number"
                  name="user_quota"
                  required
                  min={1}
                  placeholder="Örn: 100"
                  value={formData.user_quota}
                  onChange={handleInputChange}
                  className="block w-full pr-12 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-500">kullanıcı</span>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Üyelik Başlangıç Tarihi</label>
              <input
                type="datetime-local"
                name="subscription_start_date"
                required
                value={formData.subscription_start_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700">Üyelik Bitiş Tarihi</label>
              <div className="mt-1">
                                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(1)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">+1 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(3)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">+3 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(6)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">+6 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(12)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 font-medium">+12 ay</button>
                    </div>
                <div className="mt-3 text-sm">
                  <div className="text-gray-500">Seçilen bitiş tarihi</div>
                  <div className="mt-0.5 font-medium text-gray-900">
                    {formData.subscription_end_date ? formatDate(formData.subscription_end_date) : '-'}
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
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <LoadingSpinner /> : 'Kurum Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
