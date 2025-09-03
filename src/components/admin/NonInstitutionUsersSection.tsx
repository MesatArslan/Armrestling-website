import React, { useState, useMemo } from 'react'
import type { Profile } from '../../types/auth'

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
  const [nonInstitutionQuery, setNonInstitutionQuery] = useState('')

  const filteredNonInstitutionUsers = useMemo(() => {
    const q = nonInstitutionQuery.trim().toLowerCase()
    if (q.length === 0) return users
    return users.filter(u => {
      const name = (u.username || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [users, nonInstitutionQuery])

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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Bireysel Kullanıcılar</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <input
                type="text"
                value={nonInstitutionQuery}
                onChange={(e) => setNonInstitutionQuery(e.target.value)}
                placeholder="İsim veya email ara..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 bg-white text-gray-900 placeholder-gray-400"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <button
              onClick={onCreateUser}
              className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-300"
            >
              Yeni Kullanıcı Ekle
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-b-xl">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kullanıcı</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Son Kullanma Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Oluşturulma Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {filteredNonInstitutionUsers.map((user) => (
              <tr key={user.id} className="odd:bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-yellow-700">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.expiration_date ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(user.expiration_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {calculateRemainingDays(user.expiration_date)} gün kaldı
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <button
                    onClick={() => onEditUser(user)}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => onDeleteUser(user)}
                    className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredNonInstitutionUsers.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg font-medium mb-2">Kurumu olmayan kullanıcı bulunmuyor</div>
          <div className="text-sm">Tüm kullanıcılar bir kuruma bağlı</div>
        </div>
      )}
    </div>
  )
}
