import React, { useState, useMemo } from 'react'
import type { Institution } from '../../types/auth'

interface InstitutionsSectionProps {
  institutions: Institution[]
  onInstitutionClick: (institution: Institution) => void
  onEditInstitution: (institution: Institution) => void
  onDeleteInstitution: (institution: Institution) => void
  onCreateInstitution: () => void
}

export const InstitutionsSection: React.FC<InstitutionsSectionProps> = ({
  institutions,
  onInstitutionClick,
  onEditInstitution,
  onDeleteInstitution,
  onCreateInstitution
}) => {
  const [institutionQuery, setInstitutionQuery] = useState('')
  const [institutionStatusFilter, setInstitutionStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const filteredInstitutions = useMemo(() => {
    const q = institutionQuery.trim().toLowerCase()
    const now = new Date()
    return institutions.filter(inst => {
      const matchesQuery = q.length === 0 ||
        inst.name.toLowerCase().includes(q) ||
        inst.email.toLowerCase().includes(q)
      const isExpired = new Date(inst.subscription_end_date) < now
      const matchesStatus = institutionStatusFilter === 'all' ||
        (institutionStatusFilter === 'active' && !isExpired) ||
        (institutionStatusFilter === 'expired' && isExpired)
      return matchesQuery && matchesStatus
    })
  }, [institutions, institutionQuery, institutionStatusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentInstitutions = filteredInstitutions.slice(startIndex, endIndex)

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table
    const tableElement = document.querySelector('.institutions-table')
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">Kurumlar</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredInstitutions.length} kurum
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <input
                type="text"
                value={institutionQuery}
                onChange={(e) => setInstitutionQuery(e.target.value)}
                placeholder="Kurum adı veya email ara..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-gray-900 placeholder-gray-400"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l3.817 3.817a1 1 0 01-1.414 1.414l-3.817-3.817A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </span>
            </div>
            <div className="inline-flex bg-gray-100 rounded-lg p-1 self-start">
              <button
                type="button"
                onClick={() => setInstitutionStatusFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >Tümü</button>
              <button
                type="button"
                onClick={() => setInstitutionStatusFilter('active')}
                className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >Aktif</button>
              <button
                type="button"
                onClick={() => setInstitutionStatusFilter('expired')}
                className={`px-3 py-1.5 text-xs rounded-md ${institutionStatusFilter === 'expired' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >Süresi Dolmuş</button>
              <button
                type="button"
                onClick={onCreateInstitution}
                className="ml-2 inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >Yeni Kurum Ekle</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto institutions-table overflow-y-auto border-b border-gray-100" style={{ maxHeight: 'calc(100vh - 350px)' }}>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kurum</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kota</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Başlangıç Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bitiş Tarihi</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {currentInstitutions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                  {filteredInstitutions.length === 0 ? 'Aramanıza uygun kurum bulunamadı' : 'Bu sayfada kurum bulunamadı'}
                </td>
              </tr>
            )}
            {currentInstitutions.map((institution) => {
              const isExpired = new Date(institution.subscription_end_date) < new Date()
              const quotaTotal = Math.max(1, institution.user_quota || 1)
              const quotaUsed = Math.max(0, institution.users_created || 0)
              const quotaPct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100))
              return (
                <tr
                  key={institution.id}
                  className="odd:bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => onInstitutionClick(institution)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {institution.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{institution.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {institution.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{quotaUsed}/{quotaTotal}</div>
                    <div className="mt-1 w-40 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full ${quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${quotaPct}%` }} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(institution.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(institution.subscription_end_date)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {calculateRemainingDays(institution.subscription_end_date)} gün kaldı
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isExpired 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired ? 'Süresi Dolmuş' : 'Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditInstitution(institution)
                      }}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteInstitution(institution)
                      }}
                      className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{startIndex + 1}</span>
              {' - '}
              <span className="font-medium">{Math.min(endIndex, filteredInstitutions.length)}</span>
              {' / '}
              <span className="font-medium">{filteredInstitutions.length}</span>
              {' kurum'}
            </div>
            
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sayfa başına:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
