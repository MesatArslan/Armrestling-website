import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import type { Profile, AdminStats } from '../types/auth'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { EditUserModal } from '../components/admin/EditUserModal'
import { DeleteConfirmationModal } from '../components/admin/DeleteConfirmationModal'
import { AdminLayout } from '../components/admin/AdminLayout'
import { CreateUserModal } from '../components/admin/CreateUserModal'
import { FileManagement } from '../components/admin/FileManagement'
import Toast from '../components/UI/Toast'
import { DataTable, type Column } from '../components/UI/DataTable'
import { TrashIcon } from '@heroicons/react/24/outline'

export const Admin: React.FC = () => {
  const { user, signOut } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'users' | 'files'>('users')
  // Inline form removed; using modal instead
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)

  // Auto-dismiss messages (align with SuperAdmin UX)
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 5000)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    if (activeSection === 'users') {
      loadData()
    }
  }, [activeSection])

  const loadData = async () => {
    if (!user?.institution_id) return

    setLoading(true)
    try {
      const usersResult = await AuthService.getInstitutionUsersByAdmin(user.institution_id)
      if (usersResult.success) setUsers(usersResult.data || [])

      // Stats'ı context'teki user.institution üzerinden hesapla
      if (user.institution) {
        const usedQuota = user.institution.users_created || 0
        const remainingQuota = Math.max(0, (user.institution.user_quota || 0) - usedQuota)
        const end = new Date(user.institution.subscription_end_date)
        const now = new Date()
        const subscriptionDaysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000*60*60*24)))
        setStats({ totalUsers: usedQuota, usedQuota, remainingQuota, subscriptionDaysLeft })
      }
    } catch (error) {
      console.error('Data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (payload: { email: string; password: string; username: string }) => {
    if (!user?.institution_id) {
      setError('Kurum bilgisi bulunamadı')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createUser({
        email: payload.email,
        password: payload.password,
        username: payload.username
      }, user.institution_id)
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla oluşturuldu!')
        setShowCreateUserModal(false)
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

  // No inline inputs anymore

  const handleSignOut = async () => {
    await signOut()
  }

  const handleEditUserClick = (targetUser: Profile) => {
    setEditingUser(targetUser)
    setShowEditUserModal(true)
  }

  const handleUpdateUser = async (userId: string, formData: {
    username: string
    email: string
  }) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payload = { username: formData.username, email: formData.email }
      const result = await AuthService.updateUser(userId, payload)
      if (result.success) {
        setSuccess('Kullanıcı başarıyla güncellendi!')
        setShowEditUserModal(false)
        setEditingUser(null)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...formData, role: 'user' } : u))
      } else {
        setError(result.error || 'Kullanıcı güncellenirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUserClick = (targetUser: Profile) => {
    setDeletingUser(targetUser)
    setShowDeleteUserModal(true)
  }

  const handleConfirmDeleteUser = async () => {
    if (!user?.institution_id || !deletingUser) return
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.deleteUser(deletingUser.id)
      if (result.success) {
        setSuccess('Kullanıcı başarıyla silindi!')
        setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
        setShowDeleteUserModal(false)
        setDeletingUser(null)
        await loadData()
      } else {
        setError(result.error || 'Kullanıcı silinirken hata oluştu')
      }
    } catch (error) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCreateUser = stats ? stats.remainingQuota > 0 : false
  const subscriptionStatus = stats ? (stats.subscriptionDaysLeft > 0 ? 'Aktif' : 'Süresi Dolmuş') : 'Bilinmiyor'
  const subscriptionColor = stats ? (stats.subscriptionDaysLeft > 7 ? 'text-green-600' : stats.subscriptionDaysLeft > 0 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-600'

  // Table columns definition for users
  const userColumns: Column<Profile>[] = [
    {
      key: 'order',
      header: 'Sıra',
      width: 'w-12 sm:w-16',
      align: 'center',
      render: (_, index) => (
        <span className="text-sm font-medium text-gray-900">
          {index + 1}
        </span>
      )
    },
    {
      key: 'user',
      header: 'Kullanıcı',
      width: 'w-32 sm:w-auto',
      render: (user) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs sm:text-sm font-semibold">
            {(user.username || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.username || 'İsimsiz'}</div>
            <div className="text-xs text-gray-500 hidden sm:block">User</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      width: 'w-24 sm:w-auto',
      render: (user) => (
        <span className="text-xs sm:text-sm text-gray-700 truncate">{user.email}</span>
      )
    },
    {
      key: 'created_at',
      header: 'Oluşturulma',
      width: 'w-20 sm:w-auto',
      render: (user) => (
        <span className="text-xs sm:text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString('tr-TR')}</span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      width: 'w-24 sm:w-auto',
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditUserClick(user)
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            title="Düzenle"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteUserClick(user)
            }}
            disabled={isSubmitting}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sil"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ]

  if (loading && activeSection === 'users' && !users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const renderContent = () => {
    if (activeSection === 'files') {
      return <FileManagement />
    }

    return (
      <div className="w-full max-w-7xl mx-auto relative px-2 md:px-0">
        {/* Stats */}
        {stats && (
          <div className="flex md:grid flex-nowrap md:flex-nowrap md:grid-cols-4 gap-6 mb-8 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2">
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">T</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Toplam Kullanıcı</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">K</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Kalan Kota</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.remainingQuota}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-yellow-500 text-white rounded-lg flex items-center justify-center font-bold">U</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Kullanılan Kota</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.usedQuota}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold ${
                  stats.subscriptionDaysLeft > 7 ? 'bg-green-600' : stats.subscriptionDaysLeft > 0 ? 'bg-yellow-500' : 'bg-red-600'
                }`}>A</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Abonelik</div>
                  <div className={`text-2xl font-semibold ${subscriptionColor}`}>
                    {stats.subscriptionDaysLeft > 0 ? `${stats.subscriptionDaysLeft} gün` : subscriptionStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Inline messages removed; using toasts */}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Kullanıcı Listesi */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100">
              <DataTable
                data={users}
                columns={userColumns}
                searchPlaceholder="Kullanıcı adı veya email ara..."
                searchKeys={['username', 'email']}
                showSearch={true}
                showPagination={true}
                maxHeight="calc(100vh - 400px)"
                emptyMessage="Henüz kullanıcı oluşturmadınız"
                noResultsMessage="Aramanıza uygun kullanıcı bulunamadı"
                filters={
                  canCreateUser && stats && stats.subscriptionDaysLeft > 0 ? (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-medium shadow"
                    >
                      <span className="sm:hidden text-lg leading-none">+</span>
                      <span className="hidden sm:inline">Yeni Kullanıcı Ekle</span>
                    </button>
                  ) : undefined
                }
                headerContent={
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">Oluşturulan Kullanıcılar</h3>
                    <span className="text-xs text-gray-500">Toplam: {users.length}</span>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout 
      user={user} 
      onSignOut={handleSignOut}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderContent()}

      {/* Toasts (sağ üst) */}
      <div className="pointer-events-none fixed top-4 right-4 z-[60] space-y-3">
        {success && (
          <Toast type="success" message={success} onClose={() => setSuccess('')} duration={3000} />
        )}
        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} duration={5000} />
        )}
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => { setShowEditUserModal(false); setEditingUser(null) }}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
        user={editingUser}
        showExpiration={false}
      />

      {/* Delete User Confirmation */}
      <DeleteConfirmationModal
        isOpen={showDeleteUserModal}
        onClose={() => { setShowDeleteUserModal(false); setDeletingUser(null) }}
        onConfirm={handleConfirmDeleteUser}
        isSubmitting={isSubmitting}
        item={deletingUser}
        itemType="user"
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSubmit={handleCreateUser}
        isSubmitting={isSubmitting}
      />
    </AdminLayout>
  )
}

// Edit modal
;(() => {})
