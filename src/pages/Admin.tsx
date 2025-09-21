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
import UserCreationSuccessNotification from '../components/UI/UserCreationSuccessNotification'
import UserEditSuccessNotification from '../components/UI/UserEditSuccessNotification'
import UserDeleteSuccessNotification from '../components/UI/UserDeleteSuccessNotification'
import { DataTable, type Column } from '../components/UI/DataTable'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export const Admin: React.FC = () => {
  const { t } = useTranslation()
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
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showEditSuccessNotification, setShowEditSuccessNotification] = useState(false)
  const [editSuccessMessage, setEditSuccessMessage] = useState('')
  const [showDeleteSuccessNotification, setShowDeleteSuccessNotification] = useState(false)
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('')

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
        setSuccessMessage(t('adminPage.messages.userCreatedSuccess'))
        setShowSuccessNotification(true)
        setShowCreateUserModal(false)
        await loadData()
      } else {
        setError(result.error || t('adminPage.messages.userCreateError'))
      }
    } catch (error) {
      setError(t('adminPage.messages.unexpectedError'))
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
        setEditSuccessMessage(t('adminPage.messages.userUpdatedSuccess'))
        setShowEditSuccessNotification(true)
        setShowEditUserModal(false)
        setEditingUser(null)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...formData, role: 'user' } : u))
      } else {
        setError(result.error || t('adminPage.messages.userUpdateError'))
      }
    } catch (error) {
      setError(t('adminPage.messages.unexpectedError'))
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
        setDeleteSuccessMessage(t('adminPage.messages.userDeletedSuccess'))
        setShowDeleteSuccessNotification(true)
        setUsers(prev => prev.filter(u => u.id !== deletingUser.id))
        setShowDeleteUserModal(false)
        setDeletingUser(null)
        await loadData()
      } else {
        setError(result.error || t('adminPage.messages.userDeleteError'))
      }
    } catch (error) {
      setError(t('adminPage.messages.unexpectedError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canCreateUser = stats ? stats.remainingQuota > 0 : false
  const subscriptionStatus = stats ? (stats.subscriptionDaysLeft > 0 ? t('admin.institutions.active') : t('admin.institutions.expired')) : t('admin.institutions.noName')
  const subscriptionColor = stats ? (stats.subscriptionDaysLeft > 7 ? 'text-green-600' : stats.subscriptionDaysLeft > 0 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-600'

  // Table columns definition for users
  const userColumns: Column<Profile>[] = [
    {
      key: 'order',
      header: t('admin.users.order'),
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
      header: t('admin.users.user'),
      width: 'w-32 sm:w-auto',
      render: (user) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs sm:text-sm font-semibold">
            {(user.username || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user.username || t('admin.users.noName')}</div>
            <div className="text-xs text-gray-500 hidden sm:block">{t('admin.users.userRole')}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: t('admin.users.email'),
      width: 'w-24 sm:w-auto',
      render: (user) => (
        <span className="text-xs sm:text-sm text-gray-700 truncate">{user.email}</span>
      )
    },
    {
      key: 'created_at',
      header: t('admin.users.createdAt'),
      width: 'w-20 sm:w-auto',
      render: (user) => (
        <span className="text-xs sm:text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</span>
      )
    },
    {
      key: 'actions',
      header: t('admin.users.actions'),
      width: 'w-24 sm:w-auto',
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleEditUserClick(user)
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            title={t('admin.users.edit')}
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
            title={t('admin.users.delete')}
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
                  <div className="text-xs uppercase tracking-wide text-gray-500">{t('adminPage.stats.totalUsers')}</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">K</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{t('adminPage.stats.institutionUsers')}</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.remainingQuota}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow min-w-[240px] md:min-w-0 flex-shrink-0 md:flex-shrink">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-yellow-500 text-white rounded-lg flex items-center justify-center font-bold">U</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">{t('adminPage.stats.individualUsers')}</div>
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
                  <div className="text-xs uppercase tracking-wide text-gray-500">{t('admin.institutions.remainingDays')}</div>
                  <div className={`text-2xl font-semibold ${subscriptionColor}`}>
                    {stats.subscriptionDaysLeft > 0 ? `${stats.subscriptionDaysLeft} ${t('admin.institutions.daysLeft')}` : subscriptionStatus}
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
                searchPlaceholder={t('admin.users.searchPlaceholder')}
                searchKeys={['username', 'email']}
                showSearch={true}
                showPagination={true}
                maxHeight="calc(100vh - 400px)"
                emptyMessage={t('admin.users.noUsersFound')}
                noResultsMessage={t('admin.users.noUsersMatch')}
                filters={
                  canCreateUser && stats && stats.subscriptionDaysLeft > 0 ? (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-medium shadow"
                    >
                      <span className="sm:hidden text-lg leading-none">+</span>
                      <span className="hidden sm:inline">{t('admin.users.addNewUser')}</span>
                    </button>
                  ) : undefined
                }
                headerContent={
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t('adminPage.stats.institutionUsers')}</h3>
                    <span className="text-xs text-gray-500">{t('adminPage.stats.totalUsers')}: {users.length}</span>
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
    </AdminLayout>
  )
}

// Edit modal
;(() => {})
