import React from 'react'
import type { Institution, Profile } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'
import { DataTable, type Column } from '../UI/DataTable'

interface InstitutionUsersModalProps {
  isOpen: boolean
  onClose: () => void
  institution: Institution | null
  users: Profile[]
  loading: boolean
}

export const InstitutionUsersModal: React.FC<InstitutionUsersModalProps> = ({
  isOpen,
  onClose,
  institution,
  users,
  loading
}) => {
  if (!isOpen || !institution) return null

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
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-700">
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
      key: 'created_at',
      header: 'Oluşturulma Tarihi',
      render: (user) => (
        <span className="text-sm text-gray-600">
          {new Date(user.created_at).toLocaleDateString('tr-TR')}
        </span>
      )
    }
  ]

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border border-gray-100 w-4/5 max-w-4xl shadow-2xl rounded-xl bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {institution.name} - Kullanıcıları
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <LoadingSpinner />
                <p className="mt-4 text-gray-600">Kullanıcılar yükleniyor...</p>
              </div>
            </div>
          ) : (
            <DataTable
              data={users}
              columns={columns}
              showSearch={false}
              showPagination={true}
              maxHeight="60vh"
              emptyMessage="Bu kurumun henüz kullanıcısı yok"
              noResultsMessage="Bu kurumun henüz kullanıcısı yok"
            />
          )}
        </div>
      </div>
    </div>
  )
}
