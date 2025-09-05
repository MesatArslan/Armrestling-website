import React, { useState } from 'react'
import { PlayersRepository } from '../../storage/PlayersRepository'
import { TournamentsRepository } from '../../storage/TournamentsRepository'
import { MatchesRepository } from '../../storage/MatchesRepository'

interface FileUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (fileData: {
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  }) => void
  isSubmitting: boolean
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const [selectedType, setSelectedType] = useState<'players' | 'tournaments' | 'fixtures'>('players')
  const [fileName, setFileName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedData, setSelectedData] = useState<any>(null)
  const [availableData, setAvailableData] = useState<any[]>([])

  const playersRepo = new PlayersRepository()
  const tournamentsRepo = new TournamentsRepository()
  const matchesRepo = new MatchesRepository()

  React.useEffect(() => {
    if (!isOpen) return
    loadAvailableData()
  }, [isOpen, selectedType])

  const loadAvailableData = async () => {
    try {
      switch (selectedType) {
        case 'players':
          const players = playersRepo.getAll()
          // Oyuncular için tüm listeyi tek JSON olarak göster
          if (players.length > 0) {
            setAvailableData([{ 
              id: 'all_players', 
              name: 'Tüm Oyuncular', 
              data: players,
              count: players.length 
            }])
          } else {
            setAvailableData([])
          }
          break
        case 'tournaments':
          const tournaments = tournamentsRepo.getAll()
          setAvailableData(tournaments)
          break
        case 'fixtures':
          const fixtureIds = matchesRepo.getIndex()
          const fixtures = fixtureIds.map(id => matchesRepo.getFixture(id)).filter(Boolean)
          setAvailableData(fixtures)
          break
      }
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
      setAvailableData([])
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

  const getDataPreview = (data: any) => {
    if (!data) return 'Veri seçilmedi'
    
    switch (selectedType) {
      case 'players':
        // Oyuncular için özel preview
        if (data.id === 'all_players') {
          return `Tüm Oyuncular - ${data.count} oyuncu`
        }
        return `${data.name || data.firstName + ' ' + data.lastName || 'İsimsiz Oyuncu'} - ${data.weight || 'Bilinmeyen'}kg`
      case 'tournaments':
        return `${data.name || 'İsimsiz Turnuva'} - ${data.weightRanges?.length || 0} kategori`
      case 'fixtures':
        return `${data.name || 'İsimsiz Fixtür'} - ${data.matches?.length || 0} maç`
      default:
        return JSON.stringify(data).substring(0, 100) + '...'
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName.trim() || !selectedData) return

    // Oyuncular için özel data hazırlama
    let dataToSave = selectedData
    if (selectedType === 'players' && selectedData.id === 'all_players') {
      dataToSave = selectedData.data // Tüm oyuncu listesini al
    }

    const fileData = {
      name: fileName.trim(),
      type: selectedType,
      description: description.trim() || undefined,
      data: dataToSave
    }

    onSubmit(fileData)
  }

  const handleClose = () => {
    setFileName('')
    setDescription('')
    setSelectedData(null)
    setSelectedType('players')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Yeni Dosya Ekle</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dosya Türü Seçimi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Dosya Türü
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['players', 'tournaments', 'fixtures'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type)
                      setSelectedData(null)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedType === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-medium">{getTypeLabel(type)}</div>
                      <div className="text-xs mt-1">
                        {type === 'players' && (availableData.length > 0 ? `${availableData[0]?.count || 0} oyuncu` : '0 oyuncu')}
                        {type === 'tournaments' && `${availableData.length} turnuva`}
                        {type === 'fixtures' && `${availableData.length} fixtür`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Veri Seçimi */}
            {availableData.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getTypeLabel(selectedType)} Seç
                </label>
                <select
                  value={selectedData ? JSON.stringify(selectedData) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedData(JSON.parse(e.target.value))
                    } else {
                      setSelectedData(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seçiniz...</option>
                  {availableData.map((item, index) => (
                    <option key={index} value={JSON.stringify(item)}>
                      {getDataPreview(item)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-yellow-800">
                    Bu türde henüz veri bulunmuyor. Önce uygulamada {getTypeLabel(selectedType).toLowerCase()} oluşturun.
                  </span>
                </div>
              </div>
            )}

            {/* Dosya Adı */}
            <div>
              <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-2">
                Dosya Adı *
              </label>
              <input
                type="text"
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Şampiyonluk Turnuvası Oyuncuları"
                required
              />
            </div>

            {/* Açıklama */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama (İsteğe bağlı)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bu dosya hakkında kısa bir açıklama..."
              />
            </div>

            {/* Önizleme */}
            {selectedData && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seçilen Veri Önizlemesi
                </label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-sm text-gray-600">
                    {selectedType === 'players' && selectedData.id === 'all_players' ? (
                      <div>
                        <div className="font-medium">Tüm Oyuncular ({selectedData.count} oyuncu)</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Tüm oyuncu listesi JSON formatında kaydedilecek
                        </div>
                      </div>
                    ) : (
                      getDataPreview(selectedData)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Butonlar */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !fileName.trim() || !selectedData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Kaydediliyor...
                  </>
                ) : (
                  'Dosyayı Kaydet'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
