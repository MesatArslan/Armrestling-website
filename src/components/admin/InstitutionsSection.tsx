import React, { useState, useMemo, useEffect } from 'react'
import type { Institution, Profile } from '../../types/auth'
import { DataTable, type Column } from '../UI/DataTable'
import { AuthService } from '../../services/authService'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface InstitutionsSectionProps {
  institutions: Institution[]
  onInstitutionClick: (institution: Institution) => void
  onEditInstitution: (institution: Institution) => void
  onDeleteInstitution: (institution: Institution) => void
  onCreateInstitution: () => void
  onEditUser: (user: Profile) => void
  onDeleteUser: (user: Profile) => void
  onCreateUser: () => void
  onDetailViewChange?: (inDetailView: boolean) => void
  initialSelectedInstitution?: Institution | null
}

export const InstitutionsSection: React.FC<InstitutionsSectionProps> = ({
  institutions,
  onEditInstitution,
  onDeleteInstitution,
  onCreateInstitution,
  onEditUser,
  onDeleteUser,
  onCreateUser,
  onDetailViewChange,
  initialSelectedInstitution
}) => {
  const [institutionStatusFilter, setInstitutionStatusFilter] = useState<'all' | 'active' | 'expired'>('all')
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(initialSelectedInstitution || null)
  const [activeTab, setActiveTab] = useState<'users' | 'payment' | 'info'>('users')
  const [institutionUsers, setInstitutionUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Initial selected institution varsa kullanıcıları yükle
  useEffect(() => {
    if (initialSelectedInstitution) {
      handleInstitutionSelect(initialSelectedInstitution)
    }
  }, [initialSelectedInstitution])

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

  // Kurum seçme fonksiyonu
  const handleInstitutionSelect = async (institution: Institution) => {
    setSelectedInstitution(institution)
    setActiveTab('users')
    setLoadingUsers(true)
    onDetailViewChange?.(true)
    
    // LocalStorage'a kaydet
    localStorage.setItem('superAdminInDetail', 'true')
    localStorage.setItem('superAdminSelectedInstitution', JSON.stringify(institution))
    
    try {
      const result = await AuthService.getInstitutionUsersForSuperAdmin(institution.id)
      if (result.success) {
        setInstitutionUsers(result.data || [])
      } else {
        console.error('Users loading error:', result.error)
        setInstitutionUsers([])
      }
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error)
      setInstitutionUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Kurum seçimini temizleme
  const handleBackToInstitutions = () => {
    setSelectedInstitution(null)
    setInstitutionUsers([])
    onDetailViewChange?.(false)
    
    // LocalStorage'dan temizle
    localStorage.setItem('superAdminInDetail', 'false')
    localStorage.removeItem('superAdminSelectedInstitution')
  }

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
        <div 
          className="flex items-center cursor-pointer hover:text-blue-600"
          onClick={() => handleInstitutionSelect(institution)}
        >
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

  // Kullanıcı tablosu için column tanımları
  const userColumns: Column<Profile>[] = [
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
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditUser(user)
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            title="Düzenle"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteUser(user)
            }}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
            title="Sil"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
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

  // Kurum detay sayfası
  if (selectedInstitution) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToInstitutions}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedInstitution.name}</h3>
                <p className="text-sm text-gray-500">{selectedInstitution.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kullanıcılar
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ödeme Planı
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Kurum Bilgisi
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'users' && (
            loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Kullanıcılar yükleniyor...</p>
                </div>
              </div>
            ) : (
              <DataTable
                data={institutionUsers}
                columns={userColumns}
                searchPlaceholder="Kullanıcı adı veya email ara..."
                searchKeys={['username', 'email']}
                showSearch={true}
                showPagination={true}
                maxHeight="calc(100vh - 400px)"
                emptyMessage="Bu kurumun henüz kullanıcısı yok"
                noResultsMessage="Aramanıza uygun kullanıcı bulunamadı"
                filters={
                  <button
                    onClick={onCreateUser}
                    className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-green-300"
                  >
                    Yeni Kullanıcı Ekle
                  </button>
                }
                headerContent={
                  <div className="flex items-center gap-4">
                    <h4 className="text-lg font-medium text-gray-900">Kullanıcılar</h4>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {institutionUsers.length} kullanıcı
                    </span>
                  </div>
                }
              />
            )
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Ödeme Planı</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Başlangıç Tarihi</p>
                    <p className="text-lg font-medium text-gray-900">{formatDate(selectedInstitution.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bitiş Tarihi</p>
                    <p className="text-lg font-medium text-gray-900">{formatDate(selectedInstitution.subscription_end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kalan Gün</p>
                    <p className="text-lg font-medium text-gray-900">{calculateRemainingDays(selectedInstitution.subscription_end_date)} gün</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Durum</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      new Date(selectedInstitution.subscription_end_date) < new Date()
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {new Date(selectedInstitution.subscription_end_date) < new Date() ? 'Süresi Dolmuş' : 'Aktif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Kurum Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Kurum Adı</p>
                    <p className="text-lg font-medium text-gray-900">{selectedInstitution.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-medium text-gray-900">{selectedInstitution.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kullanıcı Kotası</p>
                    <p className="text-lg font-medium text-gray-900">{selectedInstitution.user_quota || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Oluşturulan Kullanıcı</p>
                    <p className="text-lg font-medium text-gray-900">{selectedInstitution.users_created || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Ana kurumlar tablosu
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <DataTable
        data={filteredInstitutions}
        columns={columns}
        searchPlaceholder="Kurum adı veya email ara..."
        searchKeys={['name', 'email']}
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
