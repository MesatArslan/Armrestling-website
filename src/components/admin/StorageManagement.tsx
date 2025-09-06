import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import LoadingSpinner from '../UI/LoadingSpinner'
import Toast from '../UI/Toast'
import { DataTable, type Column } from '../UI/DataTable'

interface InstitutionStorageStats {
  id: string
  name: string
  email: string
  storage_limit: number
  file_count: number
  used_space: number
  unique_users: number
  last_upload: string | null
  usage_percentage: number
}

interface UserStorageStats {
  id: string
  email: string
  storage_limit: number
  file_count: number
  used_space: number
  last_upload: string | null
  usage_percentage: number
}

export const StorageManagement: React.FC = () => {
  const [institutionStats, setInstitutionStats] = useState<InstitutionStorageStats[]>([])
  const [userStats, setUserStats] = useState<UserStorageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [editingItem, setEditingItem] = useState<InstitutionStorageStats | UserStorageStats | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [activeTab, setActiveTab] = useState<'institutions' | 'users'>('institutions')

  // Auto-dismiss messages
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
    loadStorageStats()
  }, [])

  const loadStorageStats = async () => {
    setLoading(true)
    try {
      // Kurum istatistiklerini yükle
      const { data: institutionData, error: institutionError } = await supabase
        .from('institution_storage_stats')
        .select('*')
        .order('used_space', { ascending: false })

      if (institutionError) {
        console.error('Kurum storage istatistikleri yüklenirken hata:', institutionError)
        setError('Kurum storage istatistikleri yüklenirken hata oluştu')
        return
      }

      // Bireysel kullanıcı istatistiklerini yükle
      const { data: userData, error: userError } = await supabase
        .from('user_storage_stats')
        .select('*')
        .order('used_space', { ascending: false })

      if (userError) {
        console.error('Kullanıcı storage istatistikleri yüklenirken hata:', userError)
        setError('Kullanıcı storage istatistikleri yüklenirken hata oluştu')
        return
      }

      setInstitutionStats(institutionData || [])
      setUserStats(userData || [])
    } catch (error) {
      console.error('Storage istatistikleri yüklenirken hata:', error)
      setError('Bilinmeyen hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLimit = async () => {
    if (!editingItem || !newLimit) return

    const limitMB = parseInt(newLimit)
    
    // Kurum için limit kontrolü
    if ('name' in editingItem) {
      if (isNaN(limitMB) || limitMB < 1 || limitMB > 10240) {
        setError('Kurum storage limiti 1 MB ile 10 GB arasında olmalıdır')
        return
      }
    } else {
      // Bireysel kullanıcı için limit kontrolü
      if (isNaN(limitMB) || limitMB < 1 || limitMB > 1024) {
        setError('Bireysel storage limiti 1 MB ile 1 GB arasında olmalıdır')
        return
      }
    }

    setIsUpdating(true)
    try {
      let error
      
      if ('name' in editingItem) {
        // Kurum limiti güncelle
        const result = await supabase
          .rpc('update_institution_storage_limit', {
            institution_uuid: editingItem.id,
            new_limit_mb: limitMB
          })
        error = result.error
        
        if (!error) {
          setSuccess(`${editingItem.name} kurumunun storage limiti ${limitMB} MB olarak güncellendi`)
        }
      } else {
        // Bireysel kullanıcı limiti güncelle
        const result = await supabase
          .rpc('update_user_storage_limit', {
            user_uuid: editingItem.id,
            new_limit_mb: limitMB
          })
        error = result.error
        
        if (!error) {
          setSuccess(`${editingItem.email} kullanıcısının storage limiti ${limitMB} MB olarak güncellendi`)
        }
      }

      if (error) {
        console.error('Storage limiti güncellenirken hata:', error)
        setError(error.message)
        return
      }

      setEditingItem(null)
      setNewLimit('')
      loadStorageStats()
    } catch (error) {
      console.error('Storage limiti güncellenirken hata:', error)
      setError('Bilinmeyen hata oluştu')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatMB = (bytes: number): string => {
    return `${Math.round(bytes / (1024 * 1024))} MB`
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const institutionColumns: Column<InstitutionStorageStats>[] = [
    {
      key: 'name',
      header: 'Kurum Adı',
      render: (institution) => (
        <div>
          <div className="font-medium text-gray-900">{institution.name}</div>
          <div className="text-sm text-gray-500">{institution.email}</div>
        </div>
      )
    },
    {
      key: 'file_count',
      header: 'Dosya Sayısı',
      render: (institution) => (
        <span className="text-gray-900">{institution.file_count}</span>
      )
    },
    {
      key: 'used_space',
      header: 'Kullanılan Alan',
      render: (institution) => (
        <div>
          <div className="text-gray-900">{formatBytes(institution.used_space)}</div>
          <div className={`text-xs px-2 py-1 rounded-full ${getUsageColor(institution.usage_percentage)}`}>
            %{institution.usage_percentage}
          </div>
        </div>
      )
    },
    {
      key: 'storage_limit',
      header: 'Toplam Limit',
      render: (institution) => (
        <span className="text-gray-900">{formatMB(institution.storage_limit)}</span>
      )
    },
    {
      key: 'unique_users',
      header: 'Kullanıcı Sayısı',
      render: (institution) => (
        <span className="text-gray-900">{institution.unique_users}</span>
      )
    },
    {
      key: 'last_upload',
      header: 'Son Yükleme',
      render: (institution) => (
        <span className="text-gray-500">
          {institution.last_upload 
            ? new Date(institution.last_upload).toLocaleDateString('tr-TR')
            : 'Hiç yok'
          }
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (institution) => (
        <button
          onClick={() => {
            setEditingItem(institution)
            setNewLimit(Math.round(institution.storage_limit / (1024 * 1024)).toString())
          }}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Limit Güncelle
        </button>
      )
    }
  ]

  const userColumns: Column<UserStorageStats>[] = [
    {
      key: 'name',
      header: 'Kullanıcı Email',
      render: (user) => (
        <div>
          <div className="font-medium text-gray-900">{user.email}</div>
        </div>
      )
    },
    {
      key: 'file_count',
      header: 'Dosya Sayısı',
      render: (user) => (
        <span className="text-gray-900">{user.file_count}</span>
      )
    },
    {
      key: 'used_space',
      header: 'Kullanılan Alan',
      render: (user) => (
        <div>
          <div className="text-gray-900">{formatBytes(user.used_space)}</div>
          <div className={`text-xs px-2 py-1 rounded-full ${getUsageColor(user.usage_percentage)}`}>
            %{user.usage_percentage}
          </div>
        </div>
      )
    },
    {
      key: 'storage_limit',
      header: 'Toplam Limit',
      render: (user) => (
        <span className="text-gray-900">{formatMB(user.storage_limit)}</span>
      )
    },
    {
      key: 'last_upload',
      header: 'Son Yükleme',
      render: (user) => (
        <span className="text-gray-500">
          {user.last_upload 
            ? new Date(user.last_upload).toLocaleDateString('tr-TR')
            : 'Hiç yok'
          }
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (user) => (
        <button
          onClick={() => {
            setEditingItem(user)
            setNewLimit(Math.round(user.storage_limit / (1024 * 1024)).toString())
          }}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Limit Güncelle
        </button>
      )
    }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Storage Yönetimi</h2>
            <p className="text-gray-600 mt-1">Kurumların ve bireysel kullanıcıların depolama limitlerini yönetin</p>
          </div>
          <button
            onClick={loadStorageStats}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Toast type="error" message={error} onClose={() => setError('')} />
      )}
      {success && (
        <Toast type="success" message={success} onClose={() => setSuccess('')} />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('institutions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'institutions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kurumlar ({institutionStats.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bireysel Kullanıcılar ({userStats.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'institutions' && (
            <DataTable
              data={institutionStats}
              columns={institutionColumns}
              emptyMessage="Henüz hiç kurum bulunmuyor"
            />
          )}
          {activeTab === 'users' && (
            <DataTable
              data={userStats}
              columns={userColumns}
              emptyMessage="Henüz hiç bireysel kullanıcı bulunmuyor"
            />
          )}
        </div>
      </div>

      {/* Update Limit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Storage Limiti Güncelle
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{'name' in editingItem ? 'Kurum:' : 'Kullanıcı:'}</strong> {'name' in editingItem ? editingItem.name : editingItem.email}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Mevcut Limit:</strong> {formatMB(editingItem.storage_limit)}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                <strong>Kullanılan:</strong> {formatBytes(editingItem.used_space)} (%{editingItem.usage_percentage})
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Limit (MB)
              </label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                min="1"
                max={'name' in editingItem ? "10240" : "1024"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={'name' in editingItem ? "Örn: 500" : "Örn: 50"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {'name' in editingItem 
                  ? "1 MB - 10 GB arasında bir değer girin"
                  : "1 MB - 1 GB arasında bir değer girin"
                }
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditingItem(null)
                  setNewLimit('')
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                İptal
              </button>
              <button
                onClick={handleUpdateLimit}
                disabled={isUpdating || !newLimit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
