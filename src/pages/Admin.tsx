import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import type { Profile, AdminStats } from '../types/auth'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { EditUserModal } from '../components/admin/EditUserModal'
import { DeleteConfirmationModal } from '../components/admin/DeleteConfirmationModal'
import { AdminLayout } from '../components/admin/AdminLayout'
import { CreateUserModal } from '../components/admin/CreateUserModal'
import Toast from '../components/UI/Toast'

export const Admin: React.FC = () => {
  const { user, signOut } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
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
    loadData()
  }, [])

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

  const handleCreateUser = async (payload: { email: string; password: string; username: string; expiration_date: string }) => {
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

  if (loading && !users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <AdminLayout user={user} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto relative">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">T</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Toplam Kullanıcı</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">K</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Kalan Kota</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.remainingQuota}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-yellow-500 text-white rounded-lg flex items-center justify-center font-bold">U</div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Kullanılan Kota</div>
                  <div className="text-2xl font-semibold text-gray-900">{stats.usedQuota}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
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

        {/* Abonelik Uyarısı */}
        {stats && stats.subscriptionDaysLeft <= 7 && stats.subscriptionDaysLeft > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            ⚠️ Aboneliğinizin süresi {stats.subscriptionDaysLeft} gün içinde dolacak!
          </div>
        )}

        {stats && stats.subscriptionDaysLeft <= 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ❌ Aboneliğinizin süresi dolmuş! Yeni kullanıcı oluşturamazsınız.
          </div>
        )}

        {/* Inline messages removed; using toasts */}

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* Kullanıcı Listesi */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Oluşturulan Kullanıcılar</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Toplam: {users.length}</span>
                  {canCreateUser && stats && stats.subscriptionDaysLeft > 0 && (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-medium shadow"
                    >
                      Yeni Kullanıcı Ekle
                    </button>
                  )}
                </div>
              </div>

              {users.length > 0 ? (
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/60 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Kullanıcı</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Oluşturulma</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                                {(user.username || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.username || 'İsimsiz'}</div>
                                <div className="text-xs text-gray-500">User</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString('tr-TR')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditUserClick(user)}
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteUserClick(user)}
                                disabled={isSubmitting}
                                className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-lg font-medium mb-2">Henüz kullanıcı oluşturmadınız</div>
                  <div className="text-sm">Yeni kullanıcı eklemek için "Yeni Kullanıcı Ekle" butonunu kullanın</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
