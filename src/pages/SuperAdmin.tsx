import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import type { Institution, Profile, CreateInstitutionForm, SuperAdminStats } from '../types/auth'
import LoadingSpinner from '../components/UI/LoadingSpinner'

export const SuperAdmin: React.FC = () => {
  const { user, signOut } = useAuth()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [institutionUsers, setInstitutionUsers] = useState<Profile[]>([])
  const [nonInstitutionUsers, setNonInstitutionUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<CreateInstitutionForm>({
    email: '',
    password: '',
    name: '',
    user_quota: 10,
    subscription_end_date: ''
  })
  
  // Kurumu olmayan kullanıcı ekleme state'leri
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    username: '',
    role: 'user' as 'user' | 'admin'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    user_quota: 0,
    subscription_end_date: ''
  })

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null)

  useEffect(() => {
    // Kullanıcının super_admin rolünde olup olmadığını kontrol et
    if (!user) {
      setError('Giriş yapmanız gerekiyor. Lütfen önce giriş yapın.')
      return
    }

    if (user.role !== 'super_admin') {
      setError('Bu sayfaya erişim izniniz yok. Sadece Super Admin kullanıcıları bu sayfayı görüntüleyebilir.')
      return
    }

    // Kullanıcı doğruysa verileri yükle
    loadData()
  }, [user])

  const loadData = async () => {
    if (!loading) {
      setLoading(true)
    }
    setError('')
    try {
      // Sadece institutions'ı çağır, stats'i ayrıca çağırmaya gerek yok
      const institutionsResult = await AuthService.getInstitutions()

      if (institutionsResult.success) {
        const institutionsData = institutionsResult.data || []
        setInstitutions(institutionsData)
        
        // Kurumu olmayan kullanıcıları da yükle
        const nonInstitutionUsersResult = await AuthService.getNonInstitutionUsers()
        if (nonInstitutionUsersResult.success) {
          setNonInstitutionUsers(nonInstitutionUsersResult.data || [])
        }
        
        // Stats'i institutions verilerinden hesapla
        const stats = await calculateStatsFromInstitutions(institutionsData)
        setStats(stats)
      } else {
        const errorMessage = institutionsResult.error || 'Bilinmeyen hata'
        setError(`Kurumlar yüklenemedi: ${errorMessage}`)
        console.error('Institutions error:', institutionsResult.error)
        
        if (errorMessage.includes('erişim izni yok')) {
          setError('Kurumlara erişim izni yok. Lütfen sistem yöneticisi ile iletişime geçin veya tekrar giriş yapmayı deneyin.')
        }
      }
    } catch (error) {
      console.error('Data loading error:', error)
      setError('Veri yüklenirken beklenmeyen bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Institutions verilerinden stats hesapla
  const calculateStatsFromInstitutions = async (institutions: Institution[]): Promise<SuperAdminStats> => {
    const totalInstitutions = institutions.length
    const now = new Date()
    
    let activeInstitutions = 0
    let expiredInstitutions = 0
    let totalUsers = 0

    institutions.forEach(institution => {
      const subscriptionEndDate = new Date(institution.subscription_end_date)
      if (subscriptionEndDate > now) {
        activeInstitutions++
      } else {
        expiredInstitutions++
      }
      totalUsers += institution.users_created || 0
    })

    // Kurum dışı kullanıcıları al
    const nonInstitutionUsersResult = await AuthService.getNonInstitutionUsers()
    const nonInstitutionUsers = nonInstitutionUsersResult.success ? (nonInstitutionUsersResult.data?.length || 0) : 0
    const institutionUsers = totalUsers

    return {
      totalInstitutions,
      totalUsers: totalUsers + nonInstitutionUsers,
      institutionUsers,
      nonInstitutionUsers,
      activeInstitutions,
      expiredInstitutions
    }
  }

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createInstitution(formData)
      
      if (result.success) {
        setSuccess('Kurum başarıyla oluşturuldu!')
        setShowCreateForm(false)
        setFormData({
          email: '',
          password: '',
          name: '',
          user_quota: 10,
          subscription_end_date: ''
        })
        await loadData()
      } else {
        setError(result.error || 'Kurum oluşturulurken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createNonInstitutionUser(userFormData)
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla oluşturuldu!')
        setShowCreateUserForm(false)
        setUserFormData({
          email: '',
          password: '',
          username: '',
          role: 'user'
        })
        await loadData()
      } else {
        setError(result.error || 'Kullanıcı oluşturulurken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInstitutionClick = async (institution: Institution) => {
    setSelectedInstitution(institution)
    setLoading(true)

    try {
      const result = await AuthService.getInstitutionUsersForSuperAdmin(institution.id)
      if (result.success) {
        setInstitutionUsers(result.data || [])
      } else {
        console.error('Users loading error:', result.error)
      }
    } catch (error) {
      console.error('Users loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setUserFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution)
    setEditFormData({
      name: institution.name,
      email: institution.email,
      user_quota: institution.user_quota,
      subscription_end_date: institution.subscription_end_date.split('T')[0]
    })
    setShowEditModal(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }))
  }

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingInstitution) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.updateInstitution(editingInstitution.id, {
        name: editFormData.name,
        email: editFormData.email,
        user_quota: editFormData.user_quota,
        subscription_end_date: editFormData.subscription_end_date
      })
      
      if (result.success) {
        setSuccess('Kurum başarıyla güncellendi!')
        setShowEditModal(false)
        setEditingInstitution(null)
        await loadData()
      } else {
        setError(result.error || 'Kurum güncellenirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteInstitution = (institution: Institution) => {
    setDeletingInstitution(institution)
    setShowDeleteModal(true)
  }

  const confirmDeleteInstitution = async () => {
    if (!deletingInstitution) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.deleteInstitution(deletingInstitution.id)
      
      if (result.success) {
        setSuccess('Kurum başarıyla silindi!')
        setShowDeleteModal(false)
        setDeletingInstitution(null)
        await loadData()
      } else {
        setError(result.error || 'Kurum silinirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Super Admin Panel</h1>
                <p className="text-sm text-gray-600">Hoş geldiniz, {user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Loading Spinner */}
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Veriler yükleniyor...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Authentication error state
  if (error && (error.includes('Giriş yapmanız gerekiyor') || error.includes('erişim izni yok') || error.includes('Aktif oturum bulunamadı'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Erişim Hatası</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Giriş Sayfasına Git
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Panel</h1>
              <p className="text-sm text-gray-600">Hoş geldiniz, {user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">K</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Toplam Kurum</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalInstitutions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Toplam Kullanıcı</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">K</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Kurum Kullanıcıları</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.institutionUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">N</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Kurum Dışı Kullanıcılar</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.nonInstitutionUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Aktif Kurum</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.activeInstitutions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">E</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Süresi Dolmuş</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.expiredInstitutions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                {error.includes('erişim izni yok') && (
                  <div className="mt-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Sayfayı Yenile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Ana İçerik */}
        <div className="space-y-6">
          {/* Kurum Oluşturma Bölümü */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Kurum Yönetimi</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {showCreateForm ? 'İptal Et' : 'Yeni Kurum Ekle'}
              </button>
            </div>

            {/* Kurum Oluşturma Formu */}
            {showCreateForm && (
              <form onSubmit={handleCreateInstitution} className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kurum Adı</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Şifre</label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Üyelik Bitiş Tarihi</label>
                    <input
                      type="datetime-local"
                      name="subscription_end_date"
                      required
                      value={formData.subscription_end_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Kurum Oluştur'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Kurumlar Listesi */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Kurumlar ve Kullanıcıları</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kurum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Sayısı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kota</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bitiş Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {institutions.map((institution) => {
                    const isExpired = new Date(institution.subscription_end_date) < new Date()
                    return (
                      <tr
                        key={institution.id}
                        className="hover:bg-gray-50"
                      >
                        <td 
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                          onClick={() => handleInstitutionClick(institution)}
                        >
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">
                                  {institution.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{institution.name}</div>
                              <div className="text-sm text-gray-500">{institution.users_created} kullanıcı</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {institution.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{institution.users_created}</div>
                          <div className="text-sm text-gray-500">
                            Kullanıcı kotasından sayılan kullanıcılar
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="text-sm font-medium">{institution.users_created} / {institution.user_quota}</span>
                            <div className="ml-2 flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min((institution.users_created / institution.user_quota) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(institution.subscription_end_date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isExpired 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? 'Süresi Dolmuş' : 'Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditInstitution(institution)
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteInstitution(institution)
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kurumu Olmayan Kullanıcılar */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Kurumu Olmayan Kullanıcılar</h3>
                  <p className="text-sm text-gray-500 mt-1">Herhangi bir kuruma bağlı olmayan kullanıcılar</p>
                </div>
                <button
                  onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {showCreateUserForm ? 'İptal Et' : 'Yeni Kullanıcı Ekle'}
                </button>
              </div>
            </div>

            {/* Kullanıcı Oluşturma Formu */}
            {showCreateUserForm && (
              <form onSubmit={handleCreateUser} className="space-y-4 border-t pt-4 px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                    <input
                      type="text"
                      name="username"
                      required
                      value={userFormData.username}
                      onChange={handleUserInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={userFormData.email}
                      onChange={handleUserInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Şifre</label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={userFormData.password}
                      onChange={handleUserInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rol</label>
                    <select
                      name="role"
                      value={userFormData.role}
                      onChange={handleUserInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="user">Kullanıcı</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Kullanıcı Oluştur'}
                  </button>
                </div>
              </form>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma Tarihi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {nonInstitutionUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-yellow-700">
                                {(user.username || user.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username || 'İsimsiz'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {nonInstitutionUsers.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-lg font-medium mb-2">Kurumu olmayan kullanıcı bulunmuyor</div>
                <div className="text-sm">Tüm kullanıcılar bir kuruma bağlı</div>
              </div>
            )}
          </div>


        </div>
      </main>

            {/* Seçili Kurum Kullanıcıları Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedInstitution.name} - Kullanıcıları
                </h3>
                <button
                  onClick={() => setSelectedInstitution(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <LoadingSpinner />
                    <p className="mt-4 text-gray-600">Kullanıcılar yükleniyor...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma Tarihi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {institutionUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                      {(user.username || user.email).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.username || 'İsimsiz'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {institutionUsers.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      <div className="text-lg font-medium mb-2">Bu kurumun henüz kullanıcısı yok</div>
                      <div className="text-sm">Kurum admin'i kullanıcı ekleyebilir</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingInstitution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Kurum Düzenle: {editingInstitution.name}
              </h3>
              
              <form onSubmit={handleUpdateInstitution} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kurum Adı</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Kullanıcı Kotası</label>
                  <input
                    type="number"
                    name="user_quota"
                    required
                    min={1}
                    value={editFormData.user_quota}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Üyelik Bitiş Tarihi</label>
                  <input
                    type="date"
                    name="subscription_end_date"
                    required
                    value={editFormData.subscription_end_date}
                    onChange={handleEditInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingInstitution(null)
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <LoadingSpinner /> : 'Güncelle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingInstitution && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
                Kurum Silme Onayı
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                <strong>{deletingInstitution.name}</strong> kurumunu silmek istediğinizden emin misiniz?
                <br />
                <span className="text-red-600 font-medium">
                  Bu işlem geri alınamaz!
                </span>
                <br />
                <span className="text-orange-600 font-medium">
                  Kuruma ait tüm kullanıcılar da silinecektir!
                </span>
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingInstitution(null)
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteInstitution}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <LoadingSpinner /> : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
