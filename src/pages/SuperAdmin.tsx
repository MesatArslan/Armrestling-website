import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import type { Institution, Profile, CreateInstitutionForm, SuperAdminStats } from '../types/auth'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import {
  SuperAdminLayout,
  StatsDashboard,
  InstitutionsSection,
  NonInstitutionUsersSection,
  CreateInstitutionModal,
  EditInstitutionModal,
  DeleteConfirmationModal,
  CreateUserModal,
  EditUserModal,
  InstitutionUsersModal,
  StorageManagement
} from '../components/admin'
import UserCreationSuccessNotification from '../components/UI/UserCreationSuccessNotification'
import UserEditSuccessNotification from '../components/UI/UserEditSuccessNotification'
import UserDeleteSuccessNotification from '../components/UI/UserDeleteSuccessNotification'

export const SuperAdmin: React.FC = () => {
  const { user, signOut } = useAuth()
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null)
  const [institutionUsers, setInstitutionUsers] = useState<Profile[]>([])
  const [nonInstitutionUsers, setNonInstitutionUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [institutionUsersLoading, setInstitutionUsersLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Auto-dismiss messages
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 5000)
    return () => clearTimeout(timer)
  }, [error])
  
  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showInstitutionUsersModal, setShowInstitutionUsersModal] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showEditSuccessNotification, setShowEditSuccessNotification] = useState(false)
  const [editSuccessMessage, setEditSuccessMessage] = useState('')
  const [showDeleteSuccessNotification, setShowDeleteSuccessNotification] = useState(false)
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('')

  // Active section
  const [activeSection, setActiveSection] = useState<'institutions' | 'nonInstitutionUsers' | 'storageManagement'>('institutions')
  const [inInstitutionDetail, setInInstitutionDetail] = useState(false)
  const [savedInstitution, setSavedInstitution] = useState<Institution | null>(null)

  // Section değiştiğinde institution detail'i sıfırla
  const handleSectionChange = async (section: 'institutions' | 'nonInstitutionUsers' | 'storageManagement') => {
    setActiveSection(section)
    setInInstitutionDetail(false) // Section değiştiğinde detail view'ı sıfırla
    
    // Kullanıcı yönetimi sayfasına geçildiğinde kullanıcı verilerini yükle
    if (section === 'nonInstitutionUsers' && nonInstitutionUsers.length === 0) {
      await loadNonInstitutionUsers()
    }
    
    // LocalStorage'a kaydet
    localStorage.setItem('superAdminActiveSection', section)
    localStorage.setItem('superAdminInDetail', 'false')
  }

  // Sayfa yüklendiğinde localStorage'dan durumu yükle
  useEffect(() => {
    const savedSection = localStorage.getItem('superAdminActiveSection') as 'institutions' | 'nonInstitutionUsers' | null
    const savedInDetail = localStorage.getItem('superAdminInDetail') === 'true'
    const savedInstitution = localStorage.getItem('superAdminSelectedInstitution')
    
    if (savedSection) {
      setActiveSection(savedSection)
      
      // Eğer kullanıcı yönetimi sayfasındaysa ve kullanıcı verileri yüklenmemişse yükle
      if (savedSection === 'nonInstitutionUsers' && nonInstitutionUsers.length === 0) {
        loadNonInstitutionUsers()
      }
    }
    if (savedInDetail && savedInstitution) {
      try {
        const institution = JSON.parse(savedInstitution)
        setInInstitutionDetail(true)
        setSavedInstitution(institution)
      } catch (error) {
        console.error('Saved institution parse error:', error)
        localStorage.removeItem('superAdminSelectedInstitution')
      }
    }
  }, [])

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
      // Sadece institutions'ı çağır
      const institutionsResult = await AuthService.getInstitutions()

      if (institutionsResult.success) {
        const institutionsData = institutionsResult.data || []
        setInstitutions(institutionsData)

        // Stats'i sadece institutions verilerinden hesapla (kullanıcı sayısı için sadece kurum içi kullanıcıları say)
        const stats = await calculateStatsFromInstitutions(institutionsData, 0)
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

  // Kurumu olmayan kullanıcıları yükle
  const loadNonInstitutionUsers = async () => {
    try {
      const nonInstitutionUsersResult = await AuthService.getNonInstitutionUsers()
      if (nonInstitutionUsersResult.success) {
        const list = nonInstitutionUsersResult.data || []
        setNonInstitutionUsers(list)
        
        // Stats'i güncelle
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            totalUsers: prev.totalUsers + list.length,
            nonInstitutionUsers: list.length
          } : null)
        }
      } else {
        console.error('Non-institution users loading error:', nonInstitutionUsersResult.error)
      }
    } catch (error) {
      console.error('Non-institution users loading error:', error)
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

  // Institution handlers
  const handleCreateInstitution = async (formData: CreateInstitutionForm) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createInstitution(formData)
      
      if (result.success) {
        setSuccess('Kurum başarıyla oluşturuldu!')
        setShowCreateForm(false)
        
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

  const handleUpdateInstitution = async (institutionId: string, formData: Partial<Institution>) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.updateInstitution(institutionId, formData)
      
      if (result.success) {
        setSuccess('Kurum başarıyla güncellendi!')
        setShowEditModal(false)
        setEditingInstitution(null)
        
        // Sadece ilgili kurumu güncelle
        setInstitutions(prev => prev.map(institution => 
          institution.id === institutionId 
            ? { ...institution, ...formData }
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

  const handleDeleteInstitution = async () => {
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
      } else {
        setError(result.error || 'Kurum silinirken hata oluştu')
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
    setShowInstitutionUsersModal(true)

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

  const handleEditInstitution = (institution: Institution) => {
    setEditingInstitution(institution)
    setShowEditModal(true)
  }

  const handleDeleteInstitutionClick = (institution: Institution) => {
    setDeletingInstitution(institution)
    setShowDeleteModal(true)
  }

  // User handlers
  const handleCreateUser = async (formData: {
    email: string
    password: string
    username: string
    expiration_date: string
  }) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createNonInstitutionUser({
        ...formData,
        role: 'user' // Varsayılan olarak user rolü
      })
      
      if (result.success) {
        setSuccessMessage('Kullanıcı başarıyla oluşturuldu!')
        setShowSuccessNotification(true)
        setShowCreateUserModal(false)
        
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

  const handleUpdateUser = async (userId: string, formData: {
    username: string
    email: string
    expiration_date?: string
  }) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // expiration_date undefined ise boş string olarak gönder
      const updateData = {
        ...formData,
        expiration_date: formData.expiration_date || ''
      }
      
      const result = await AuthService.updateUser(userId, updateData)
      
      if (result.success) {
        setEditSuccessMessage('Kullanıcı başarıyla güncellendi!')
        setShowEditSuccessNotification(true)
        setShowEditUserModal(false)
        setEditingUser(null)
        
        // Sadece ilgili kullanıcıyı güncelle
        setNonInstitutionUsers(prev => prev.map(user => {
          if (user.id !== userId) return user
          return { ...user, ...formData, role: 'user' }
        }))
      } else {
        setError(result.error || 'Kullanıcı güncellenirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.deleteUser(deletingUser.id)
      
      if (result.success) {
        setDeleteSuccessMessage('Kullanıcı başarıyla silindi!')
        setShowDeleteSuccessNotification(true)
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

  const handleEditUserClick = (user: Profile) => {
    setEditingUser(user)
    setShowEditUserModal(true)
  }

  const handleDeleteUserClick = (user: Profile) => {
    setDeletingUser(user)
    setShowDeleteUserModal(true)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Veriler yükleniyor...</p>
        </div>
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
                onClick={() => window.location.href = '/'}
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
    <SuperAdminLayout
      user={user}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      onSignOut={handleSignOut}
      hideStats={inInstitutionDetail}
    >
        {/* Stats */}
        {!inInstitutionDetail && activeSection !== 'storageManagement' && (
          <StatsDashboard stats={stats} />
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
        {/* Kurumlar Listesi */}
          {activeSection === 'institutions' && (
          <InstitutionsSection
            institutions={institutions}
            onInstitutionClick={handleInstitutionClick}
            onEditInstitution={handleEditInstitution}
            onDeleteInstitution={handleDeleteInstitutionClick}
            onCreateInstitution={() => setShowCreateForm(true)}
            onEditUser={handleEditUserClick}
            onDeleteUser={handleDeleteUserClick}
            onCreateUser={() => setShowCreateUserModal(true)}
            onDetailViewChange={setInInstitutionDetail}
            initialSelectedInstitution={savedInstitution}
          />
        )}

        {/* Kurumu Olmayan Kullanıcılar */}
          {activeSection === 'nonInstitutionUsers' && (
          <NonInstitutionUsersSection
            users={nonInstitutionUsers}
            onEditUser={handleEditUserClick}
            onDeleteUser={handleDeleteUserClick}
            onCreateUser={() => setShowCreateUserModal(true)}
          />
        )}

        {/* Storage Yönetimi */}
          {activeSection === 'storageManagement' && (
            <StorageManagement />
          )}
            </div>
            
      {/* Modals */}
      <CreateInstitutionModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateInstitution}
        isSubmitting={isSubmitting}
      />

      <EditInstitutionModal
        isOpen={showEditModal}
        onClose={() => {
                      setShowEditModal(false)
                      setEditingInstitution(null)
                    }}
        onSubmit={handleUpdateInstitution}
        isSubmitting={isSubmitting}
        institution={editingInstitution}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
                    setShowDeleteModal(false)
                    setDeletingInstitution(null)
                  }}
        onConfirm={handleDeleteInstitution}
        isSubmitting={isSubmitting}
        item={deletingInstitution}
        itemType="institution"
      />

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSubmit={handleCreateUser}
        isSubmitting={isSubmitting}
      />

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
                      setShowEditUserModal(false)
                      setEditingUser(null)
                    }}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
        user={editingUser}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteUserModal}
        onClose={() => {
                    setShowDeleteUserModal(false)
                    setDeletingUser(null)
                  }}
        onConfirm={handleDeleteUser}
        isSubmitting={isSubmitting}
        item={deletingUser}
        itemType="user"
      />

      <InstitutionUsersModal
        isOpen={showInstitutionUsersModal}
        onClose={() => {
          setShowInstitutionUsersModal(false)
          setSelectedInstitution(null)
        }}
        institution={selectedInstitution}
        users={institutionUsers}
        loading={institutionUsersLoading}
      />

      {/* User Creation Success Notification */}
      <UserCreationSuccessNotification
        isOpen={showSuccessNotification}
        onClose={() => setShowSuccessNotification(false)}
        message={successMessage}
        duration={4000}
      />

      {/* User Edit Success Notification */}
      <UserEditSuccessNotification
        isOpen={showEditSuccessNotification}
        onClose={() => setShowEditSuccessNotification(false)}
        message={editSuccessMessage}
        duration={4000}
      />

      {/* User Delete Success Notification */}
      <UserDeleteSuccessNotification
        isOpen={showDeleteSuccessNotification}
        onClose={() => setShowDeleteSuccessNotification(false)}
        message={deleteSuccessMessage}
        duration={4000}
      />
    </SuperAdminLayout>
  )
}
