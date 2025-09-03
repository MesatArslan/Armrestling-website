import React, { useState, useEffect, useMemo } from 'react'
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
  const [institutionUsersLoading, setInstitutionUsersLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [formData, setFormData] = useState<CreateInstitutionForm>({
    email: '',
    password: '',
    name: '',
    user_quota: 10,
    subscription_start_date: '',
    subscription_end_date: ''
  })
  
  // Kurumu olmayan kullanıcı ekleme state'leri
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false)
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    username: '',
    expiration_date: ''
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
    subscription_start_date: '',
    subscription_end_date: ''
  })

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null)

  // User edit/delete modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editUserFormData, setEditUserFormData] = useState({
    username: '',
    email: '',
    role: 'user' as 'user' | 'admin',
    expiration_date: ''
  })
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  
  // Create Institution Modal visibility uses showCreateForm
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)

  // Sekmeler: institutions | nonInstitutionUsers
  const [activeSection, setActiveSection] = useState<'institutions' | 'nonInstitutionUsers'>('institutions')
  // Institutions arama filtresi
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionStatusFilter, setInstitutionStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  // Non-institution users arama filtresi
  const [nonInstitutionQuery, setNonInstitutionQuery] = useState('')
  
  // Create institution form helpers
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

  const filteredInstitutions = useMemo(() => {
    const q = institutionQuery.trim().toLowerCase()
    const now = new Date()
    return institutions.filter(inst => {
      const matchesQuery = q.length === 0 ||
        inst.name.toLowerCase().includes(q) ||
        inst.email.toLowerCase().includes(q)
      const isExpired = new Date(inst.subscription_end_date) < now
      const matchesStatus = institutionStatusFilter === 'all' ||
        (institutionStatusFilter === 'active' && !isExpired) ||
        (institutionStatusFilter === 'expired' && isExpired)
      return matchesQuery && matchesStatus
    })
  }, [institutions, institutionQuery, institutionStatusFilter])

  const filteredNonInstitutionUsers = useMemo(() => {
    const q = nonInstitutionQuery.trim().toLowerCase()
    if (q.length === 0) return nonInstitutionUsers
    return nonInstitutionUsers.filter(u => {
      const name = (u.username || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [nonInstitutionUsers, nonInstitutionQuery])

  // Yeni kurum formu açıldığında varsayılan tarihleri ayarla
  useEffect(() => {
    if (showCreateForm) {
      if (!formData.subscription_start_date) {
        const now = new Date()
        setFormData(prev => ({ ...prev, subscription_start_date: toDateTimeLocalString(now) }))
      }
      if (!formData.subscription_end_date) {
        setCreateInstitutionEndInMonths(1)
      }
    }
  }, [showCreateForm])

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

        // Kurumu olmayan kullanıcıları da yükle (tek sefer)
        let nonInstitutionUsersCount = 0
        const nonInstitutionUsersResult = await AuthService.getNonInstitutionUsers()
        if (nonInstitutionUsersResult.success) {
          const list = nonInstitutionUsersResult.data || []
          setNonInstitutionUsers(list)
          nonInstitutionUsersCount = list.length
        }

        // Stats'i institutions verilerinden hesapla (tekrar fetch etmeden)
        const stats = await calculateStatsFromInstitutions(institutionsData, nonInstitutionUsersCount)
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

  // Institutions verilerinden stats hesapla (kurum dışı kullanıcı sayısı dışarıdan verilir)
  const calculateStatsFromInstitutions = async (institutions: Institution[], nonInstitutionUsers: number): Promise<SuperAdminStats> => {
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
          subscription_start_date: '',
          subscription_end_date: ''
        })
        
        // Yeni kurumu listeye ekle
        if (result.data) {
          setInstitutions(prev => [result.data!, ...prev])
          
          // Stats'i de güncelle
          if (stats) {
            setStats(prev => prev ? {
              ...prev,
              totalInstitutions: prev.totalInstitutions + 1,
              activeInstitutions: prev.activeInstitutions + 1
            } : null)
          }
        }
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
      const result = await AuthService.createNonInstitutionUser({
        ...userFormData,
        role: 'user' // Varsayılan olarak user rolü
      })
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla oluşturuldu!')
        setShowCreateUserForm(false)
        setUserFormData({
          email: '',
          password: '',
          username: '',
          expiration_date: ''
        })
        
        // Yeni kullanıcıyı listeye ekle
        if (result.data) {
          setNonInstitutionUsers(prev => [result.data!, ...prev])
          
          // Stats'i de güncelle
          if (stats) {
            setStats(prev => prev ? {
              ...prev,
              totalUsers: prev.totalUsers + 1,
              nonInstitutionUsers: prev.nonInstitutionUsers + 1
            } : null)
          }
        }
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
    setInstitutionUsersLoading(true)

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
      setInstitutionUsersLoading(false)
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

  // Non-institution user modal defaults
  useEffect(() => {
    if (showCreateUserForm) {
      if (!userFormData.expiration_date) {
        setCreateUserExpirationInMonths(1)
      }
    }
  }, [showCreateUserForm])

  const handleEditUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditUserFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditUser = (user: Profile) => {
    setEditingUser(user)
    setEditUserFormData({
      username: user.username || '',
      email: user.email,
      role: user.role as 'user' | 'admin',
      expiration_date: user.expiration_date ? user.expiration_date.split('T')[0] + 'T' + user.expiration_date.split('T')[1]?.substring(0, 5) : ''
    })
    setShowEditUserModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.updateUser(editingUser.id, {
        username: editUserFormData.username,
        email: editUserFormData.email,
        role: editUserFormData.role,
        expiration_date: editUserFormData.expiration_date
      })
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla güncellendi!')
        setShowEditUserModal(false)
        setEditingUser(null)
        
        // Sadece ilgili kullanıcıyı güncelle
        setNonInstitutionUsers(prev => prev.map(user => 
          user.id === editingUser.id 
            ? { ...user, ...editUserFormData }
            : user
        ))
      } else {
        setError(result.error || 'Kullanıcı güncellenirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = (user: Profile) => {
    setDeletingUser(user)
    setShowDeleteUserModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!deletingUser) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.deleteUser(deletingUser.id)
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla silindi!')
        setShowDeleteUserModal(false)
        setDeletingUser(null)
        
        // Sadece ilgili kullanıcıyı listeden kaldır
        setNonInstitutionUsers(prev => prev.filter(user => user.id !== deletingUser.id))
        
        // Stats'i de güncelle
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            totalUsers: prev.totalUsers - 1,
            nonInstitutionUsers: prev.nonInstitutionUsers - 1
          } : null)
        }
      } else {
        setError(result.error || 'Kullanıcı silinirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution)
    setEditFormData({
      name: institution.name,
      email: institution.email,
      user_quota: institution.user_quota,
      subscription_start_date: institution.created_at.split('T')[0],
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
        
        // Sadece ilgili kurumu güncelle
        setInstitutions(prev => prev.map(institution => 
          institution.id === editingInstitution?.id 
            ? { ...institution, ...editFormData }
            : institution
        ))
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
        
        // Sadece ilgili kurumu listeden kaldır
        if (deletingInstitution) {
          setInstitutions(prev => prev.filter(institution => institution.id !== deletingInstitution.id))
          
          // Stats'i de güncelle
          if (stats) {
            const isExpired = new Date(deletingInstitution.subscription_end_date) < new Date()
            setStats(prev => prev ? {
              ...prev,
              totalInstitutions: prev.totalInstitutions - 1,
              activeInstitutions: isExpired ? prev.activeInstitutions : prev.activeInstitutions - 1,
              expiredInstitutions: isExpired ? prev.expiredInstitutions - 1 : prev.expiredInstitutions
            } : null)
          }
        }
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

  // Preset butonları için handler'lar
  const setCreateInstitutionEndInMonths = (months: number) => {
    const base = formData.subscription_start_date
      ? new Date(formData.subscription_start_date)
      : new Date()
    const newEnd = addMonths(base, months)
    setFormData(prev => ({ ...prev, subscription_end_date: toDateTimeLocalString(newEnd) }))
  }

  const setEditInstitutionEndInMonths = (months: number) => {
    const baseStr = editFormData.subscription_start_date
    const base = baseStr ? new Date(baseStr) : new Date()
    const newEnd = addMonths(base, months)
    setEditFormData(prev => ({ ...prev, subscription_end_date: toDateString(newEnd) }))
  }

  const setCreateUserExpirationInMonths = (months: number) => {
    const base = new Date()
    const newExp = addMonths(base, months)
    setUserFormData(prev => ({ ...prev, expiration_date: toDateTimeLocalString(newExp) }))
  }

  const setEditUserExpirationInMonths = (months: number) => {
    const base = new Date()
    const newExp = addMonths(base, months)
    setEditUserFormData(prev => ({ ...prev, expiration_date: toDateTimeLocalString(newExp) }))
  }

  // Kalan günleri hesapla
  const calculateRemainingDays = (endDate: string): number => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Tarih formatını düzenle
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Header */}
        <header className="bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Super Admin Panel</h1>
                <p className="text-sm text-blue-100">Hoş geldiniz, {user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="bg-white/90 backdrop-blur p-8 rounded-xl shadow-2xl max-w-md w-full">
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
                className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full inline-flex items-center justify-center bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-gray-300"
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
      <header className="bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Super Admin Panel</h1>
              <p className="text-sm text-blue-100">Hoş geldiniz, {user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Section Switcher */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveSection('institutions')}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border transition-colors ${activeSection === 'institutions' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Kurum Yönetimi
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('nonInstitutionUsers')}
            className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border transition-colors ${activeSection === 'nonInstitutionUsers' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            Kurumu Olmayan Kullanıcılar
          </button>
        </div>
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
                      <span className="text-sm font-semibold">K</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Toplam Kurum</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.totalInstitutions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-md flex items-center justify-center">
                      <span className="text-sm font-semibold">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Toplam Kullanıcı</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-md flex items-center justify-center">
                      <span className="text-sm font-semibold">K</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Kurum Kullanıcıları</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.institutionUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-md flex items-center justify-center">
                      <span className="text-sm font-semibold">N</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Kurum Dışı Kullanıcılar</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.nonInstitutionUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-emerald-600/10 text-emerald-700 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Aktif Kurum</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.activeInstitutions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-rose-600/10 text-rose-700 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold">E</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Süresi Dolmuş</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{stats.expiredInstitutions}</dd>
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
          {/* Kurum Oluşturma Bölümü kaldırıldı; form modal olarak açılacak */}

          {/* Kurumlar Listesi (Institutions section only) */}
          {activeSection === 'institutions' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-medium text-gray-900">Kurumlar ve Kullanıcıları</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={institutionQuery}
                      onChange={(e) => setInstitutionQuery(e.target.value)}
                      placeholder="Kurum adı veya email ara..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <div className="inline-flex bg-gray-100 rounded-lg p-1 self-start">
                    <button
                      type="button"
                      onClick={() => setInstitutionStatusFilter('all')}
                      className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                    >Tümü</button>
                    <button
                      type="button"
                      onClick={() => setInstitutionStatusFilter('active')}
                      className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                    >Aktif</button>
                    <button
                      type="button"
                      onClick={() => setInstitutionStatusFilter('expired')}
                      className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'expired' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                    >Süresi Dolmuş</button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="ml-2 inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >Yeni Kurum Ekle</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-b-xl">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kurum</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kota</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Başlangıç Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bitiş Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredInstitutions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                        Aramanıza uygun kurum bulunamadı
                      </td>
                    </tr>
                  )}
                  {filteredInstitutions.map((institution) => {
                    const isExpired = new Date(institution.subscription_end_date) < new Date()
                    const quotaTotal = Math.max(1, institution.user_quota || 1)
                    const quotaUsed = Math.max(0, institution.users_created || 0)
                    const quotaPct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100))
                    return (
                      <tr
                        key={institution.id}
                        className="odd:bg-gray-50/50 hover:bg-gray-50 transition-colors"
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {institution.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{quotaUsed}/{quotaTotal}</div>
                          <div className="mt-1 w-40 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className={`h-2 rounded-full ${quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${quotaPct}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(institution.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(institution.subscription_end_date)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculateRemainingDays(institution.subscription_end_date)} gün kaldı
                          </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              title="Düzenle"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditInstitution(institution)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-600 hover:text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.9 9.9a1 1 0 01-.293.195l-3 1a1 1 0 01-1.272-1.272l1-3a1 1 0 01.195-.293l9.9-9.9z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Sil"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteInstitution(institution)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M6 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                <path fillRule="evenodd" d="M4 6a1 1 0 011-1h10a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1V6zm3-2a2 2 0 012-2h2a2 2 0 012 2h-6z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Kurumu Olmayan Kullanıcılar (Non-institution section only) */}
          {activeSection === 'nonInstitutionUsers' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Kurumu Olmayan Kullanıcılar</h3>
                  <p className="text-sm text-gray-500 mt-1">Herhangi bir kuruma bağlı olmayan kullanıcılar</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={nonInstitutionQuery}
                      onChange={(e) => setNonInstitutionQuery(e.target.value)}
                      placeholder="İsim veya email ara..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-900 placeholder-gray-400"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCreateUserForm(true)}
                    className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    Yeni Kullanıcı Ekle
                  </button>
                </div>
              </div>
            </div>

            {/* Kullanıcı oluşturma formu modal'a taşındı */}
            <div className="overflow-x-auto rounded-b-xl">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kullanıcı</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Son Kullanma Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Oluşturulma Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredNonInstitutionUsers.map((user) => (
                    <tr key={user.id} className="odd:bg-gray-50/50 hover:bg-gray-50 transition-colors">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.expiration_date ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(user.expiration_date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {calculateRemainingDays(user.expiration_date)} gün kaldı
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredNonInstitutionUsers.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                <div className="text-lg font-medium mb-2">Kurumu olmayan kullanıcı bulunmuyor</div>
                <div className="text-sm">Tüm kullanıcılar bir kuruma bağlı</div>
              </div>
            )}
          </div>
          )}


        </div>
      </main>

      {/* Create Institution Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border border-gray-100 w-11/12 max-w-3xl shadow-2xl rounded-xl bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Yeni Kurum Ekle</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateInstitution} className="space-y-5">
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
                      type={showCreatePassword ? 'text' : 'password'}
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
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-gray-600"
                      aria-label="Şifreyi göster/gizle"
                    >
                      {showCreatePassword ? (
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
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(1)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+1 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(3)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+3 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(6)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+6 ay</button>
                      <button type="button" onClick={() => setCreateInstitutionEndInMonths(12)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+12 ay</button>
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
                  onClick={() => setShowCreateForm(false)}
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
      )}

            {/* Seçili Kurum Kullanıcıları Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border border-gray-100 w-4/5 max-w-4xl shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedInstitution.name} - Kullanıcıları
                </h3>
                <button
                  onClick={() => setSelectedInstitution(null)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {institutionUsersLoading ? (
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
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
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
                  <label className="block text-sm font-medium text-gray-700">Üyelik Başlangıç Tarihi</label>
                  <input
                    type="date"
                    name="subscription_start_date"
                    required
                    value={editFormData.subscription_start_date}
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">1 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(3)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">3 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(6)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">6 ay</button>
                    <button type="button" onClick={() => setEditInstitutionEndInMonths(12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">12 ay</button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingInstitution(null)
                    }}
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
      )}

      {/* Create Non-institution User Modal */}
      {showCreateUserForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border border-gray-100 w-11/12 max-w-3xl shadow-2xl rounded-xl bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Yeni Kullanıcı Ekle</h3>
              <button onClick={() => setShowCreateUserForm(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={userFormData.username}
                    onChange={handleUserInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
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
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Şifre</label>
                  <div className="mt-1 relative">
                    <input
                      type={showCreateUserPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={6}
                      value={userFormData.password}
                      onChange={handleUserInputChange}
                      className="block w-full pr-10 pl-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-900 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreateUserPassword(!showCreateUserPassword)}
                      className="absolute right-2 top-1.5 p-1 text-gray-400 hover:text-gray-600"
                      aria-label="Şifreyi göster/gizle"
                    >
                      {showCreateUserPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 3C5 3 1.73 7.11.46 9.05a1 1 0 000 .9C1.73 11.89 5 16 10 16s8.27-4.11 9.54-6.05a1 1 0 000-.9C18.27 7.11 15 3 10 3zm0 11c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/><path d="M10 7a3 3 0 100 6 3 3 0 000-6z"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M1.53 1.53a.75.75 0 011.06 0l3.4 3.4A11.26 11.26 0 0112 3.75c5.24 0 9.2 3.41 11.24 6.05.33.42.33 1 0 1.42a16.62 16.62 0 01-5.02 4.3l3.25 3.25a.75.75 0 11-1.06 1.06l-3.53-3.53a11.09 11.09 0 01-4.88 1.41c-5.24 0-9.2-3.41-11.24-6.05a1 1 0 010-1.42A16.62 16.62 0 015.2 7.22L1.53 3.59a.75.75 0 010-1.06zM7.4 9.46l1.36 1.36a3 3 0 003.42 3.42l1.36 1.36a4.5 4.5 0 01-6.14-6.14z"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700">Son Kullanma Tarihi</label>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setCreateUserExpirationInMonths(1)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+1 ay</button>
                      <button type="button" onClick={() => setCreateUserExpirationInMonths(3)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+3 ay</button>
                      <button type="button" onClick={() => setCreateUserExpirationInMonths(6)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+6 ay</button>
                      <button type="button" onClick={() => setCreateUserExpirationInMonths(12)} className="px-3 py-1.5 text-xs rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-50">+12 ay</button>
                    </div>
                    <div className="mt-3 text-sm">
                      <div className="text-gray-500">Seçilen son kullanma tarihi</div>
                      <div className="mt-0.5 font-medium text-gray-900">
                        {userFormData.expiration_date ? formatDate(userFormData.expiration_date) : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserForm(false)}
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingInstitution && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
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
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteInstitution}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <LoadingSpinner /> : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Kullanıcı Düzenle: {editingUser.username || editingUser.email}
              </h3>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={editUserFormData.username}
                    onChange={handleEditUserInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={editUserFormData.email}
                    onChange={handleEditUserInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Rol</label>
                  <select
                    name="role"
                    value={editUserFormData.role}
                    onChange={handleEditUserInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
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
                    value={editUserFormData.expiration_date}
                    onChange={handleEditUserInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditUserExpirationInMonths(1)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">1 ay</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(3)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">3 ay</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(6)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">6 ay</button>
                    <button type="button" onClick={() => setEditUserExpirationInMonths(12)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">12 ay</button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false)
                      setEditingUser(null)
                    }}
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
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserModal && deletingUser && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border border-gray-100 w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
                Kullanıcı Silme Onayı
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                <strong>{deletingUser.username || deletingUser.email}</strong> kullanıcısını silmek istediğinizden emin misiniz?
                <br />
                <span className="text-red-600 font-medium">
                  Bu işlem geri alınamaz!
                </span>
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteUserModal(false)
                    setDeletingUser(null)
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  İptal
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
