import React, { useState, useEffect } from 'react'
import { DataTable, type Column } from '../UI/DataTable'
import LoadingSpinner from '../UI/LoadingSpinner'
import Toast from '../UI/Toast'
import { FileUploadModal } from './FileUploadModal'
import { SupabaseFileManagerService, type SavedFile } from '../../services/supabaseFileManagerService'

export const FileManagement: React.FC = () => {
  const [files, setFiles] = useState<SavedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userLimits, setUserLimits] = useState<{
    singleFileLimit: number
    totalLimit: number
    usedSpace: number
    remainingSpace: number
    fileCount: number
    percentage: number
  } | null>(null)

  const fileManager = new SupabaseFileManagerService()

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
    loadFiles()
    loadUserLimits()
  }, [])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const savedFiles = await fileManager.getAllFiles()
      setFiles(savedFiles)
    } catch (err) {
      setError('Dosyalar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const loadUserLimits = async () => {
    try {
      const result = await fileManager.getUserLimits()
      if (result.success && result.data) {
        setUserLimits(result.data)
      }
    } catch (err) {
      console.error('Limit bilgileri yüklenirken hata:', err)
    }
  }

  const handleUploadFile = async (fileData: {
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  }) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await fileManager.saveFile(fileData)
      if (result.success) {
        setSuccess('Dosya başarıyla kaydedildi!')
        setShowUploadModal(false)
        loadFiles()
        loadUserLimits() // Limit bilgilerini yenile
      } else {
        setError(result.error || 'Dosya kaydedilirken hata oluştu')
      }
    } catch (err) {
      setError('Beklenmeyen bir hata oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadFile = async (file: SavedFile) => {
    try {
      const result = await fileManager.downloadFile(file.id)
      if (result.success) {
        setSuccess('Dosya indirildi!')
      } else {
        setError(result.error || 'Dosya indirilirken hata oluştu')
      }
    } catch (err) {
      setError('Dosya indirilemedi')
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return

    try {
      const result = await fileManager.deleteFile(fileId)
      if (result.success) {
        setSuccess('Dosya başarıyla silindi!')
        loadFiles()
        loadUserLimits() // Limit bilgilerini yenile
      } else {
        setError(result.error || 'Dosya silinirken hata oluştu')
      }
    } catch (err) {
      setError('Dosya silinemedi')
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'players': return 'Oyuncular'
      case 'tournaments': return 'Turnuvalar'
      case 'fixtures': return 'Fixtürler'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'players': return 'bg-blue-100 text-blue-800'
      case 'tournaments': return 'bg-green-100 text-green-800'
      case 'fixtures': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Table columns definition for files
  const fileColumns: Column<SavedFile>[] = [
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
      header: 'Dosya Adı',
      render: (file) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{file.name}</div>
          {file.description && (
            <div className="text-xs text-gray-500">{file.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Tür',
      render: (file) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(file.type)}`}>
          {getTypeLabel(file.type)}
        </span>
      )
    },
    {
      key: 'size',
      header: 'Boyut',
      render: (file) => (
        <span className="text-sm text-gray-600">{fileManager.formatFileSizeDisplay(file.file_size)}</span>
      )
    },
    {
      key: 'createdAt',
      header: 'Oluşturulma',
      render: (file) => (
        <span className="text-sm text-gray-600">
          {new Date(file.created_at).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (file) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownloadFile(file)
            }}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline mr-3 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            İndir
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteFile(file.id)
            }}
            className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Sil
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 relative">

      {/* Limit Bilgileri */}
      {userLimits && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tek Dosya Limiti */}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Tek Dosya Limiti</h3>
                <p className="text-2xl font-bold text-blue-600">{fileManager.formatLimitDisplay(userLimits.singleFileLimit)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Toplam Limit */}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Toplam Limit</h3>
                <p className="text-2xl font-bold text-green-600">{fileManager.formatLimitDisplay(userLimits.totalLimit)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Kullanım Durumu */}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Kullanım Durumu</h3>
                <p className="text-2xl font-bold text-purple-600">{userLimits.percentage}%</p>
                <p className="text-xs text-gray-500">
                  {fileManager.formatLimitDisplay(userLimits.usedSpace)} / {fileManager.formatLimitDisplay(userLimits.totalLimit)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    userLimits.percentage > 80 ? 'bg-red-500' : 
                    userLimits.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(userLimits.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <DataTable
          data={files}
          columns={fileColumns}
          searchPlaceholder="Dosya adı ara..."
          searchKeys={['name', 'description']}
          showSearch={true}
          showPagination={true}
          maxHeight="calc(100vh - 400px)"
          emptyMessage="Henüz kaydedilmiş dosya bulunmuyor"
          noResultsMessage="Aramanıza uygun dosya bulunamadı"
          filters={
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Yeni Dosya Ekle
            </button>
          }
          headerContent={
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Kaydedilen Dosyalar</h3>
              <span className="text-xs text-gray-500">Toplam: {files.length}</span>
            </div>
          }
        />
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed top-4 right-4 z-[60] space-y-3">
        {success && (
          <Toast type="success" message={success} onClose={() => setSuccess('')} duration={3000} />
        )}
        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} duration={5000} />
        )}
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUploadFile}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
