import React, { useState, useMemo } from 'react'
import type { Institution } from '../../types/auth'
import { DataTable, type Column } from '../UI/DataTable'

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
  const [institutionStatusFilter, setInstitutionStatusFilter] = useState<'all' | 'active' | 'expired'>('all')

  const filteredInstitutions = useMemo(() => {
    const now = new Date()
    return institutions.filter(inst => {
      const isExpired = new Date(inst.subscription_end_date) < now
      const matchesStatus = institutionStatusFilter === 'all' ||
        (institutionStatusFilter === 'active' && !isExpired) ||
        (institutionStatusFilter === 'expired' && isExpired)
      return matchesStatus
    })
  }, [institutions, institutionStatusFilter])

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
  const columns: Column<Institution>[] = [
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
      key: 'name',
      header: 'Kurum',
      render: (institution) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                {institution.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{institution.name}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (institution) => (
        <span className="text-sm text-gray-600">
          {institution.email}
        </span>
      )
    },
    {
      key: 'quota',
      header: 'Kota',
      render: (institution) => {
        const quotaTotal = Math.max(1, institution.user_quota || 1)
        const quotaUsed = Math.max(0, institution.users_created || 0)
        const quotaPct = Math.min(100, Math.round((quotaUsed / quotaTotal) * 100))
        
        return (
          <>
            <div className="text-sm font-medium text-gray-900">{quotaUsed}/{quotaTotal}</div>
            <div className="mt-1 w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full ${quotaPct > 90 ? 'bg-red-500' : quotaPct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${quotaPct}%` }} />
            </div>
          </>
        )
      }
    },
    {
      key: 'created_at',
      header: 'Başlangıç Tarihi',
      render: (institution) => (
        <span className="text-sm text-gray-600">
          {formatDate(institution.created_at)}
        </span>
      )
    },
    {
      key: 'subscription_end_date',
      header: 'Bitiş Tarihi',
      render: (institution) => (
        <>
          <div className="text-sm font-medium text-gray-900">
            {formatDate(institution.subscription_end_date)}
          </div>
          <div className="text-xs text-gray-500">
            {calculateRemainingDays(institution.subscription_end_date)} gün kaldı
          </div>
        </>
      )
    },
    {
      key: 'status',
      header: 'Durum',
      render: (institution) => {
        const isExpired = new Date(institution.subscription_end_date) < new Date()
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
      key: 'actions',
      header: 'İşlemler',
      render: (institution) => (
        <>
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
        </>
      )
    }
  ]

  // Status filter component
  const statusFilters = (
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
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <DataTable
        data={filteredInstitutions}
        columns={columns}
        searchPlaceholder="Kurum adı veya email ara..."
        searchKeys={['name', 'email']}
        onRowClick={onInstitutionClick}
        showSearch={true}
        showPagination={true}
        maxHeight="calc(100vh - 350px)"
        emptyMessage="Bu sayfada kurum bulunamadı"
        noResultsMessage="Aramanıza uygun kurum bulunamadı"
        filters={statusFilters}
        headerContent={
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900">Kurumlar</h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredInstitutions.length} kurum
            </span>
          </div>
        }
      />
    </div>
  )
}
