import React, { useState, useMemo } from 'react'
import type { Profile } from '../../types/auth'
import { DataTable, type Column } from '../UI/DataTable'

interface NonInstitutionUsersSectionProps {
  users: Profile[]
  onEditUser: (user: Profile) => void
  onDeleteUser: (user: Profile) => void
  onCreateUser: () => void
}

export const NonInstitutionUsersSection: React.FC<NonInstitutionUsersSectionProps> = ({
  users,
  onEditUser,
  onDeleteUser,
  onCreateUser
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  // Kullanıcıları duruma göre filtrele
  const filteredUsers = useMemo(() => {
    const now = new Date()
    return users.filter(user => {
      const isExpired = user.expiration_date ? new Date(user.expiration_date) < now : false
      
      switch (statusFilter) {
        case 'active':
          return !isExpired
        case 'expired':
          return isExpired
        default:
          return true
      }
    })
  }, [users, statusFilter])
  // Tarih yardımcıları
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateRemainingDays = (endDate: string): number => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // Table columns definition
  const columns: Column<Profile>[] = [
    {
      key: 'order',
      header: 'Sıra',
      width: 'w-12',
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
      render: (user) => (
        <div className="flex items-center">
          <div className="h-8 w-8 flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-xs font-medium text-yellow-700">
                {(user.username || user.email).charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {user.username || 'İsimsiz'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <span className="text-sm text-gray-600">
          {user.email}
        </span>
      )
    },
    {
      key: 'role',
      header: 'Rol',
      render: (user) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
        </span>
      )
    },
    {
      key: 'expiration_date',
      header: 'Son Kullanma Tarihi',
      render: (user) => (
        user.expiration_date ? (
          <>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(user.expiration_date)}
            </div>
            <div className="text-xs text-gray-500">
              {calculateRemainingDays(user.expiration_date)} gün kaldı
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      )
    },
    {
      key: 'status',
      header: 'Durum',
      render: (user) => {
        const isExpired = user.expiration_date ? new Date(user.expiration_date) < new Date() : false
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            isExpired 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {isExpired ? 'Süresi Dolmuş' : 'Aktif'}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      header: 'Oluşturulma Tarihi',
      render: (user) => (
        <span className="text-sm text-gray-600">
          {new Date(user.created_at).toLocaleDateString('tr-TR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (user) => (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditUser(user)
            }}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
          >
            Düzenle
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteUser(user)
            }}
            className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
          >
            Sil
          </button>
        </>
      )
    }
  ]

  // Status filter component (kurum kısmındaki gibi)
  const statusFilters = (
    <div className="inline-flex bg-gray-100 rounded-lg p-1 self-start">
      <button
        type="button"
        onClick={() => setStatusFilter('all')}
        className={`px-3 py-1.5 text-xs rounded-md ${statusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
      >Tümü</button>
      <button
        type="button"
        onClick={() => setStatusFilter('active')}
        className={`px-3 py-1.5 text-xs rounded-md ${statusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
      >Aktif</button>
      <button
        type="button"
        onClick={() => setStatusFilter('expired')}
        className={`px-3 py-1.5 text-xs rounded-md ${statusFilter === 'expired' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
      >Süresi Dolmuş</button>
      <button
        type="button"
        onClick={onCreateUser}
        className="ml-2 inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
      >Yeni Kullanıcı Ekle</button>
    </div>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <DataTable
        data={filteredUsers}
        columns={columns}
        searchPlaceholder="İsim veya email ara..."
        searchKeys={['username', 'email']}
        showSearch={true}
        showPagination={true}
        maxHeight="calc(100vh - 350px)"
        emptyMessage="Bu sayfada kullanıcı bulunamadı"
        noResultsMessage="Aramanıza uygun kullanıcı bulunamadı"
        filters={statusFilters}
        headerContent={
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">Bireysel Kullanıcılar</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredUsers.length} kullanıcı
            </span>
          </div>
        }
      />
    </div>
  )
}
