import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/UI/LoadingSpinner'

const getDefaultRoute = (role: string) => {
  switch (role) {
    case 'super_admin': return '/superadmin'
    case 'admin': return '/admin'
    case 'user': return '/'
    default: return '/'
  }
}

export const Login: React.FC = () => {
  const { user, loading, signIn } = useAuth()
  const location = useLocation()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    roleType: '' as 'admin' | 'user' | ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showRoleSelection, setShowRoleSelection] = useState(false)

  // Eğer kullanıcı zaten giriş yapmışsa yönlendir
  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ margin: 0, padding: 0 }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (user) {
    const from = location.state?.from?.pathname || getDefaultRoute(user.role)
    return <Navigate to={from} replace />
  }

  const handleRoleSelect = (role: 'admin' | 'user') => {
    setFormData({ ...formData, roleType: role })
    setShowRoleSelection(false)
    setError('')
  }

  const handleBackToRoleSelection = () => {
    setShowRoleSelection(true)
    setFormData({ email: '', password: '', roleType: '' })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const result = await signIn(formData.email, formData.password, formData.roleType as 'admin' | 'user')
      
      if (!result.success) {
        setError(result.error || 'Giriş yapılırken hata oluştu')
        return
      }

      // Başarılı giriş - yönlendirme otomatik olacak
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Super Admin giriş formu (gizli - sadece /login?super=true ile erişilebilir)
  const urlParams = new URLSearchParams(location.search)
  const isSuperAdminLogin = urlParams.get('super') === 'true'

  if (isSuperAdminLogin) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50" style={{ margin: 0, padding: 0 }}>
        <div className="w-full max-w-md mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Super Admin Girişi
              </h2>
              <p className="text-gray-600">Yönetici paneli erişimi</p>
            </div>
            
            <form className="space-y-6" onSubmit={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)
              setError('')

              try {
                const result = await signIn(formData.email, formData.password)
                
                if (!result.success) {
                  setError(result.error || 'Giriş yapılırken hata oluştu')
                  return
                }

                if (result.data?.role !== 'super_admin') {
                  setError('Super Admin yetkisine sahip değilsiniz')
                  return
                }
              } catch (error) {
                setError('Beklenmeyen bir hata oluştu')
              } finally {
                setIsSubmitting(false)
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Adresi
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    placeholder="admin@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Şifre
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-red-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Giriş yapılıyor...</span>
                  </div>
                ) : (
                  'Super Admin Girişi'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Rol seçimi ekranı
  if (showRoleSelection || !formData.roleType) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ margin: 0, padding: 0 }}>
        <div className="w-full max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Hoş Geldiniz
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Armrestling turnuva yönetim sistemine giriş yapmak için hesap türünüzü seçin
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Kurum Girişi</h3>
                <p className="text-gray-600 mb-6">
                  Turnuva yönetimi, oyuncu kayıtları ve skor takibi için admin hesabı ile giriş yapın
                </p>
                <button
                  onClick={() => handleRoleSelect('admin')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                >
                  Admin Girişi
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Kullanıcı Girişi</h3>
                <p className="text-gray-600 mb-6">
                  Turnuva sonuçlarını görüntüleme ve kişisel bilgilerinizi yönetme için kullanıcı hesabı ile giriş yapın
                </p>
                <button
                  onClick={() => handleRoleSelect('user')}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                >
                  Kullanıcı Girişi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Giriş formu
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ margin: 0, padding: 0 }}>
      <div className="w-full max-w-md mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <button
              onClick={handleBackToRoleSelection}
              className="mb-6 text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Geri Dön
            </button>
            
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              formData.roleType === 'admin' 
                ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                : 'bg-gradient-to-br from-green-500 to-green-600'
            }`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {formData.roleType === 'admin' ? 'Kurum Girişi' : 'Kullanıcı Girişi'}
            </h2>
            <p className="text-gray-600">
              {formData.roleType === 'admin' 
                ? 'Admin hesabınız ile giriş yapın' 
                : 'Kullanıcı hesabınız ile giriş yapın'
              }
            </p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Adresi
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{
                    '--tw-ring-color': formData.roleType === 'admin' ? '#3b82f6' : '#10b981'
                  } as React.CSSProperties}
                  placeholder="ornek@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{
                    '--tw-ring-color': formData.roleType === 'admin' ? '#3b82f6' : '#10b981'
                  } as React.CSSProperties}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                formData.roleType === 'admin' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner />
                  <span className="ml-2">Giriş yapılıyor...</span>
                </div>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
