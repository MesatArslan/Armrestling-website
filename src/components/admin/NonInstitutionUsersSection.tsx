import React, { useState, useMemo } from 'react'
import type { Profile } from '../../types/auth'
import { DataTable, type Column } from '../UI/DataTable'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
      header: t('admin.users.order'),
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
      header: t('admin.users.user'),
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
              {user.username || t('admin.users.noName')}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: t('admin.users.email'),
      render: (user) => (
        <span className="text-sm text-gray-600">
          {user.email}
        </span>
      )
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      render: (user) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.role === 'admin' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {user.role === 'admin' ? t('admin.users.admin') : t('admin.users.userRole')}
        </span>
      )
    },
    {
      key: 'expiration_date',
      header: t('admin.users.expirationDate'),
      render: (user) => (
        user.expiration_date ? (
          <>
            <div className="text-sm font-medium text-gray-900">
              {formatDate(user.expiration_date)}
            </div>
            <div className="text-xs text-gray-500">
              {calculateRemainingDays(user.expiration_date)} {t('admin.users.daysLeft')}
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
      )
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      render: (user) => {
        const isExpired = user.expiration_date ? new Date(user.expiration_date) < new Date() : false
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            isExpired 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {isExpired ? t('admin.users.expired') : t('admin.users.active')}
          </span>
        )
      }
    },
    {
      key: 'created_at',
      header: t('admin.users.createdAt'),
      render: (user) => (
        <span className="text-sm text-gray-600">
          {new Date(user.created_at).toLocaleDateString('tr-TR')}
        </span>
      )
    },
    {
      key: 'actions',
      header: t('admin.users.actions'),
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditUser(user)
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            title={t('admin.users.edit')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteUser(user)
            }}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
            title={t('admin.users.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
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
      >{t('admin.users.all')}</button>
      <button
        type="button"
        onClick={() => setStatusFilter('active')}
        className={`px-3 py-1.5 text-xs rounded-md ${statusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
      >{t('admin.users.active')}</button>
      <button
        type="button"
        onClick={() => setStatusFilter('expired')}
        className={`px-3 py-1.5 text-xs rounded-md ${statusFilter === 'expired' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
      >{t('admin.users.expired')}</button>
      <button
        type="button"
        onClick={onCreateUser}
        className="ml-2 inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700"
      >{t('admin.users.addNewUser')}</button>
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
        emptyMessage={t('admin.users.noUsersFound')}
        noResultsMessage={t('admin.users.noUsersMatch')}
        filters={statusFilters}
        headerContent={
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">{t('admin.users.title')}</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {t('admin.users.usersCount', { count: filteredUsers.length })}
            </span>
          </div>
        }
      />
    </div>
  )
}
