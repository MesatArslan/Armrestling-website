import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AuthService } from '../services/authService'
import type { Profile, CreateUserForm, AdminStats } from '../types/auth'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { EditUserModal } from '../components/admin/EditUserModal'

export const Admin: React.FC = () => {
  const { user, signOut } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<CreateUserForm>({
    username: '',
    email: '',
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    if (!user?.institution_id) return

    setLoading(true)
    try {
      const [usersResult, statsResult] = await Promise.all([
        AuthService.getInstitutionUsersByAdmin(user.institution_id),
        AuthService.getAdminStats(user.institution_id)
      ])

      if (usersResult.success) {
        setUsers(usersResult.data || [])
      }

      if (statsResult.success) {
        setStats(statsResult.data || null)
      }
    } catch (error) {
      console.error('Data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.institution_id) {
      setError('Kurum bilgisi bulunamadı')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.createUser(formData, user.institution_id)
      
      if (result.success) {
        setSuccess('Kullanıcı başarıyla oluşturuldu!')
        setShowCreateForm(false)
        setFormData({
          username: '',
          email: '',
          password: ''
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

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

  const handleDeleteUser = async (targetUser: Profile) => {
    if (!user?.institution_id) return
    if (!confirm(`${targetUser.username || targetUser.email} kullanıcısını silmek istediğinize emin misiniz?`)) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await AuthService.deleteUser(targetUser.id)
      if (result.success) {
        setSuccess('Kullanıcı başarıyla silindi!')
        // Listeden kaldır ve istatistikleri tazele
        setUsers(prev => prev.filter(u => u.id !== targetUser.id))
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kurum Admin Panel</h1>
              <p className="text-sm text-gray-600">
                Hoş geldiniz, {user?.username || user?.email}
              </p>
              {user?.institution && (
                <p className="text-sm text-gray-500">
                  {user.institution.name}
                </p>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">T</span>
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
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">K</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Kalan Kota</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.remainingQuota}</dd>
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
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Kullanılan Kota</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.usedQuota}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stats.subscriptionDaysLeft > 7 ? 'bg-green-500' : 
                      stats.subscriptionDaysLeft > 0 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-sm font-bold">A</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Abonelik</dt>
                      <dd className={`text-lg font-medium ${subscriptionColor}`}>
                        {stats.subscriptionDaysLeft > 0 ? `${stats.subscriptionDaysLeft} gün` : subscriptionStatus}
                      </dd>
                    </dl>
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

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel - Kullanıcı Oluşturma */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Kullanıcı Yönetimi</h2>
              </div>

              {canCreateUser && stats && stats.subscriptionDaysLeft > 0 ? (
                <div>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium mb-4"
                  >
                    {showCreateForm ? 'İptal Et' : 'Yeni Kullanıcı Ekle'}
                  </button>

                  {/* Kullanıcı Oluşturma Formu */}
                  {showCreateForm && (
                    <form onSubmit={handleCreateUser} className="space-y-4 border-t pt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                        <input
                          type="text"
                          name="username"
                          required
                          value={formData.username}
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

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? <LoadingSpinner /> : 'Kullanıcı Oluştur'}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {stats && stats.subscriptionDaysLeft <= 0 
                    ? 'Aboneliğinizin süresi dolduğu için yeni kullanıcı oluşturamazsınız.'
                    : 'Kullanıcı kotanız dolmuş. Yeni kullanıcı oluşturamazsınız.'
                  }
                </div>
              )}

              {/* Kota Bilgisi */}
              {stats && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Kullanılan Kota</span>
                    <span>{stats.usedQuota} / {stats.usedQuota + stats.remainingQuota}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(stats.usedQuota / (stats.usedQuota + stats.remainingQuota)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sağ Panel - Kullanıcı Listesi */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Oluşturulan Kullanıcılar</h3>
              </div>
              
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma Tarihi</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                            <button
                              onClick={() => handleEditUserClick(user)}
                              className="inline-flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isSubmitting}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="text-lg font-medium mb-2">Henüz kullanıcı oluşturmadınız</div>
                  <div className="text-sm">Yeni kullanıcı eklemek için sol paneldeki formu kullanın</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => { setShowEditUserModal(false); setEditingUser(null) }}
        onSubmit={handleUpdateUser}
        isSubmitting={isSubmitting}
        user={editingUser}
        showExpiration={false}
      />
    </div>
  )
}

// Edit modal
;(() => {})
