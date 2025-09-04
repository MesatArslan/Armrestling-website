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

  // Create user button filter
  const createUserFilter = (
    <button
      onClick={onCreateUser}
      className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-300"
    >
      Yeni Kullanıcı Ekle
    </button>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="İsim veya email ara..."
        searchKeys={['username', 'email']}
        showSearch={true}
        showPagination={true}
        maxHeight="calc(100vh - 350px)"
        emptyMessage="Bu sayfada kullanıcı bulunamadı"
        noResultsMessage="Aramanıza uygun kullanıcı bulunamadı"
        filters={createUserFilter}
        headerContent={
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">Bireysel Kullanıcılar</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {users.length} kullanıcı
            </span>
          </div>
        }
      />
    </div>
  )
}
