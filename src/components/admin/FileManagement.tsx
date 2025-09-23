import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column } from '../UI/DataTable'
import LoadingSpinner from '../UI/LoadingSpinner'
import Toast from '../UI/Toast'
import FileUploadSuccessNotification from '../UI/FileUploadSuccessModal'
import FileDeleteSuccessNotification from '../UI/FileDeleteSuccessNotification'
import { FileDeleteConfirmationModal } from '../UI/FileDeleteConfirmationModal'
import { FileUploadModal } from './FileUploadModal'
import { SupabaseFileManagerService, type SavedFile } from '../../services/supabaseFileManagerService'
import { PlayersStorage } from '../../utils/playersStorage'
import { TournamentsStorage } from '../../utils/tournamentsStorage'
import { MatchesStorage } from '../../utils/matchesStorage'

export const FileManagement: React.FC = () => {
  const { t } = useTranslation()
  const [files, setFiles] = useState<SavedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [pdfProgress, setPdfProgress] = useState(0)
  const hideProgressTimer = React.useRef<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<SavedFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false)
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('')
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
    loadUserLimits()
  }, [])


  const loadUserLimits = async () => {
    setLoading(true)
    try {
      const result = await fileManager.getUserLimits()
      if (result.success && result.data) {
        setUserLimits(result.data)
        setFiles(result.data.files) // Dosya listesini de set et
      } else {
        console.error('FileManagement: Limit yüklenemedi:', result.error)
        setError(t('fileManagement.messages.loadingError'))
      }
    } catch (err) {
      console.error('Limit bilgileri yüklenirken hata:', err)
      setError(t('fileManagement.messages.loadingError'))
    } finally {
      setLoading(false)
    }
  }

  const handleUploadFile = async (fileData: {
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  } | Array<{
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  }>) => {
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const payloads = Array.isArray(fileData) ? fileData : [fileData]
      let successCount = 0
      let lastError = ''
      for (const payload of payloads) {
        const result = await fileManager.saveFile(payload)
        if (result.success) {
          successCount++
        } else {
          lastError = result.error || t('fileManagement.messages.fileSaveError')
        }
      }
      if (successCount > 0) {
        const message = successCount > 1 ? t('fileManagement.messages.filesSavedSuccess', { count: successCount }) : t('fileManagement.messages.fileSavedSuccess')
        setSuccessMessage(message)
        setShowSuccessModal(true)
        // Modal açık kalsın - setShowUploadModal(false) kaldırıldı
        loadUserLimits()
      }
      if (payloads.length > successCount) {
        setError(lastError || t('fileManagement.messages.fileSaveError'))
      }
    } catch (err) {
      setError(t('fileManagement.messages.fileSaveError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDownloadFile = async (file: SavedFile) => {
    try {
      setIsExporting(true)
      setPdfProgress(0)
      
      // Simulate progress for file download
      const progressInterval = setInterval(() => {
        setPdfProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 200)

      const result = await fileManager.downloadFile(file.id)
      
      clearInterval(progressInterval)
      setPdfProgress(100)
      
      if (!result.success) {
        setError(result.error || t('fileManagement.messages.fileDownloadError'))
      }
    } catch (err) {
      setError(t('fileManagement.messages.fileDownloadError'))
    } finally {
      // Hold 100% for a brief moment to give a nice finish
      if (pdfProgress < 100) {
        setPdfProgress(100)
      }
      if (hideProgressTimer.current) {
        window.clearTimeout(hideProgressTimer.current)
      }
      hideProgressTimer.current = window.setTimeout(() => {
        setIsExporting(false)
        setPdfProgress(0)
      }, 800)
    }
  }

  const handleDeleteFile = async (file: SavedFile) => {
    setFileToDelete(file)
    setShowDeleteModal(true)
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return

    setIsDeleting(true)
    try {
      const result = await fileManager.deleteFile(fileToDelete.id)
      if (result.success) {
        const message = t('fileManagement.messages.fileDeletedSuccess')
        setDeleteSuccessMessage(message)
        setShowDeleteSuccessModal(true)
        loadUserLimits() // Limit bilgilerini ve dosya listesini yenile
        setShowDeleteModal(false)
        setFileToDelete(null)
      } else {
        setError(result.error || t('fileManagement.messages.fileDeleteError'))
      }
    } catch (err) {
      setError(t('fileManagement.messages.fileDeleteError'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleImportFile = async (file: SavedFile) => {
    try {
      setError('')
      setSuccess('')
      // Normalize file data (handle legacy/empty/string cases)
      let raw: any = file.file_data
      if (raw == null) {
        try {
          const fresh = await fileManager.getFile(file.id)
          raw = fresh?.file_data ?? null
        } catch {}
      }
      if (typeof raw === 'string') {
        try { raw = JSON.parse(raw) } catch {}
      }
      // Some records may wrap payload under `data`
      let data: any = raw && raw.data != null ? raw.data : raw
      if (data == null) {
        setError(t('fileManagement.messages.emptyFileData'))
        return
      }

      // Helpers
      const ensureTournament = (entry: any) => {
        try {
          const tournaments = TournamentsStorage.getTournaments()
          const tId = entry?.tournament?.id || entry?.fixture?.tournamentId
          const tName = entry?.tournament?.name || entry?.fixture?.tournamentName || 'Turnuva'
          const wrId = entry?.weightRange?.id || entry?.fixture?.weightRangeId
          const wrName = entry?.weightRange?.name || entry?.fixture?.weightRangeName || ''
          const wrMin = entry?.weightRange?.min ?? entry?.fixture?.weightRange?.min ?? 0
          const wrMax = entry?.weightRange?.max ?? entry?.fixture?.weightRange?.max ?? 0
          const birthYearMin = entry?.tournament?.birthYearMin ?? null
          const birthYearMax = entry?.tournament?.birthYearMax ?? null
          const genderFilter = entry?.tournament?.genderFilter ?? null
          const handPreferenceFilter = entry?.tournament?.handPreferenceFilter ?? null
          if (!tId || !wrId) return
          let t = tournaments.find((x: any) => x.id === tId)
          if (!t) {
            t = {
              id: tId,
              name: tName,
              weightRanges: [{ id: wrId, name: wrName, min: wrMin, max: wrMax, excludedPlayerIds: [] }],
              birthYearMin, birthYearMax, genderFilter, handPreferenceFilter,
              isExpanded: false,
            }
            TournamentsStorage.saveTournaments([...tournaments, t] as any)
          } else {
            let changed = false
            if (!t.weightRanges.some((wr: any) => wr.id === wrId)) {
              t.weightRanges.push({ id: wrId, name: wrName, min: wrMin, max: wrMax, excludedPlayerIds: [] })
              changed = true
            }
            if (birthYearMin !== null) { t.birthYearMin = birthYearMin; changed = true }
            if (birthYearMax !== null) { t.birthYearMax = birthYearMax; changed = true }
            if (genderFilter !== null) { t.genderFilter = genderFilter; changed = true }
            if (handPreferenceFilter !== null) { t.handPreferenceFilter = handPreferenceFilter; changed = true }
            if (changed) {
              TournamentsStorage.saveTournaments(tournaments.map((x: any) => x.id === t!.id ? t! : x) as any)
            }
          }
        } catch {}
      }

      const addOrMergePlayers = (players: any[]) => {
        try {
          const existing = PlayersStorage.getPlayers()
          const existingIds = new Set(existing.map((p: any) => p.id))
          const toAdd: any[] = []
          let changedExisting = false
          for (const p of players || []) {
            if (!existingIds.has(p.id)) {
              const np: any = { id: p.id }
              // Save ALL provided fields for players (not just visible columns)
              Object.keys(p).forEach((key) => {
                np[key] = p[key]
              })
              toAdd.push(np)
            } else {
              // Merge new fields into existing player (custom columns and birthday)
              const idx = existing.findIndex((x: any) => x.id === p.id)
              if (idx !== -1) {
                const merged = { ...existing[idx] }
                Object.keys(p).forEach((key) => {
                  if (key === 'id') return
                  if (p[key] !== undefined && p[key] !== null && merged[key] !== p[key]) {
                    merged[key] = p[key]
                  }
                })
                existing[idx] = merged
                changedExisting = true
              }
            }
          }
          if (toAdd.length > 0 || changedExisting) {
            PlayersStorage.savePlayers([...existing, ...toAdd])
          }
        } catch {}
      }

      const ensureColumnsForPlayers = (players: any[]) => {
        try {
          if (!Array.isArray(players) || players.length === 0) return
          const existingColumns = PlayersStorage.getColumns()
          const existingIds = new Set(existingColumns.map((c: any) => c.id))
          const skip = new Set(['id', 'opponents', 'fullName', 'fullname'])
          const toAdd: any[] = []
          players.forEach((p: any) => {
            Object.keys(p).forEach((key) => {
              if (skip.has(key)) return
              if (!existingIds.has(key)) {
                existingIds.add(key)
                toAdd.push({ id: key, name: key, visible: true })
              }
            })
          })
          if (toAdd.length > 0) {
            PlayersStorage.saveColumns([...existingColumns, ...toAdd])
          }
        } catch {}
      }

      if (file.type === 'players') {
        // data is an array of players
        addOrMergePlayers(Array.isArray(data) ? data : [])
        setSuccess(t('fileManagement.messages.importSuccess'))
        return
      }

      if (file.type === 'tournaments') {
        // Expect tournament package: { tournament, players, fixtures }
        // Restore/merge columns (names and visibility) first if provided
        if (Array.isArray(data.columns)) {
          try {
            const existing = PlayersStorage.getColumns()
            const map = new Map(existing.map((c: any) => [c.id, c]))
            let changed = false
            ;(data.columns as any[])
              .filter((c: any) => c && typeof c.id === 'string' && c.id.toLowerCase() !== 'fullname')
              .forEach((c: any) => {
              if (!map.has(c.id)) { map.set(c.id, { id: c.id, name: c.name || c.id, visible: !!c.visible }); changed = true }
              else {
                const cur = map.get(c.id)!
                const next = { ...cur }
                if (c.name && cur.name !== c.name) { next.name = c.name; changed = true }
                if (typeof c.visible === 'boolean' && cur.visible !== c.visible) { next.visible = c.visible; changed = true }
                if (changed) map.set(c.id, next)
              }
            })
            if (changed) PlayersStorage.saveColumns(Array.from(map.values()) as any)
          } catch {}
        }
        if (Array.isArray(data.players)) {
          ensureColumnsForPlayers(data.players)
          addOrMergePlayers(data.players)
        }
        if (data.tournament) {
          const tournaments = TournamentsStorage.getTournaments()
          const exists = tournaments.find((t: any) => t.id === data.tournament.id)
          if (!exists) {
            const tNew = {
              id: data.tournament.id,
              name: data.tournament.name,
              weightRanges: (data.tournament.weightRanges || []).map((wr: any) => ({ id: wr.id, name: wr.name, min: wr.min, max: wr.max, excludedPlayerIds: [] })),
              genderFilter: data.tournament.genderFilter ?? null,
              handPreferenceFilter: data.tournament.handPreferenceFilter ?? null,
              birthYearMin: data.tournament.birthYearMin ?? null,
              birthYearMax: data.tournament.birthYearMax ?? null,
              isExpanded: false,
            }
            TournamentsStorage.saveTournaments([...tournaments, tNew] as any)
          } else {
            let changed = false
            const wrIds = new Set(exists.weightRanges.map((wr: any) => wr.id))
            for (const wr of (data.tournament.weightRanges || [])) {
              if (!wrIds.has(wr.id)) { exists.weightRanges.push({ ...wr, excludedPlayerIds: [] }); changed = true }
            }
            const fields = ['genderFilter','handPreferenceFilter','birthYearMin','birthYearMax'] as const
            for (const f of fields) { if (data.tournament[f] != null && exists[f] !== data.tournament[f]) { (exists as any)[f] = data.tournament[f]; changed = true } }
            if (changed) TournamentsStorage.saveTournaments(tournaments.map((t: any) => t.id === exists.id ? exists : t) as any)
          }
        }
        if (Array.isArray(data.fixtures)) {
          for (const fx of data.fixtures) {
            const entry = { fixture: fx, tournament: data.tournament, weightRange: { id: fx.weightRangeId, name: fx.weightRangeName, min: fx.weightRange?.min, max: fx.weightRange?.max } }
            ensureTournament(entry)
            // Add all fixtures (active, paused, completed) into Matches storage if not exist
            const existing = MatchesStorage.getFixtureById(fx.id)
            if (!existing) MatchesStorage.addFixture({ ...fx } as any)
            // Restore double-elimination state if provided
            try {
              if ((fx as any).doubleEliminationData) {
                const deData = (fx as any).doubleEliminationData
                Object.keys(deData).forEach((key) => {
                  if (key !== 'repositoryData') {
                    localStorage.setItem(key, JSON.stringify(deData[key]))
                  }
                })
                if (deData.repositoryData) {
                  try {
                    const { DoubleEliminationRepository } = await import('../../storage/DoubleEliminationRepository')
                    const deRepo = new DoubleEliminationRepository()
                    deRepo.saveState(fx.id, deData.repositoryData)
                  } catch {}
                }
              }
            } catch {}
          }
        }
        setSuccess(t('fileManagement.messages.importSuccess'))
        return
      }

      if (file.type === 'fixtures') {
        // fixtures can be bundle or single
        const entries: any[] = []
        if (data && data.bundle && Array.isArray(data.fixtures)) {
          for (const raw of data.fixtures) {
            if (raw && raw.fixture) entries.push(raw)
            else if (raw && raw.id && raw.name && raw.players) entries.push({ fixture: raw })
            else if (raw && raw.version && raw.fixture) entries.push(raw)
          }
        } else if (data && data.fixture) {
          entries.push(data)
        } else if (data && data.id && data.name && data.players) {
          entries.push({ fixture: data })
        } else {
          entries.push(data)
        }

        // Add or merge players from fixtures (use full provided fields)
        try {
          // If bundle entries have columns, merge them first to preserve names
          for (const e of entries) {
            if (Array.isArray(e.columns)) {
              try {
                const existing = PlayersStorage.getColumns()
                const map = new Map(existing.map((c: any) => [c.id, c]))
                let changed = false
                ;(e.columns as any[])
                  .filter((c: any) => c && typeof c.id === 'string' && c.id.toLowerCase() !== 'fullname')
                  .forEach((c: any) => {
                  if (!map.has(c.id)) { map.set(c.id, { id: c.id, name: c.name || c.id, visible: !!c.visible }); changed = true }
                  else {
                    const cur = map.get(c.id)!
                    const next = { ...cur }
                    if (c.name && cur.name !== c.name) { next.name = c.name; changed = true }
                    if (typeof c.visible === 'boolean' && cur.visible !== c.visible) { next.visible = c.visible; changed = true }
                    if (changed) map.set(c.id, next)
                  }
                })
                if (changed) PlayersStorage.saveColumns(Array.from(map.values()) as any)
              } catch {}
            }
          }
          const allPlayers: any[] = []
          for (const e of entries) { (e.fixture?.players || []).forEach((p: any) => allPlayers.push(p)) }
          ensureColumnsForPlayers(allPlayers)
          addOrMergePlayers(allPlayers)
        } catch {}

        for (const entry of entries) {
          ensureTournament(entry)
          const isPending = entry.isPending && entry.fixture && entry.readyToStart
          if (!isPending) {
            const fx = entry.fixture
            if (!MatchesStorage.getFixtureById(fx.id)) {
              MatchesStorage.addFixture({ ...fx } as any)
            }
            // Restore double-elimination state if present on entry
            try {
              if (entry.doubleEliminationData) {
                const deData = entry.doubleEliminationData
                Object.keys(deData).forEach((key: string) => {
                  if (key !== 'repositoryData') {
                    localStorage.setItem(key, JSON.stringify(deData[key]))
                  }
                })
                if (deData.repositoryData) {
                  try {
                    const { DoubleEliminationRepository } = await import('../../storage/DoubleEliminationRepository')
                    const deRepo = new DoubleEliminationRepository()
                    deRepo.saveState(fx.id, deData.repositoryData)
                  } catch {}
                }
              }
            } catch {}
          }
        }
        setSuccess(t('fileManagement.messages.importSuccess'))
        return
      }

      setError(t('fileManagement.messages.unknownFileType'))
    } catch (e: any) {
      setError(e?.message || t('fileManagement.messages.importError'))
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'players': return t('fileManagement.types.players')
      case 'tournaments': return t('fileManagement.types.tournaments')
      case 'fixtures': return t('fileManagement.types.fixtures')
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
      header: t('fileManagement.columns.order'),
      width: 'w-12 sm:w-16',
      align: 'center',
      render: (_, index) => (
        <span className="text-sm font-medium text-gray-900">
          {index + 1}
        </span>
      )
    },
    {
      key: 'name',
      header: t('fileManagement.columns.fileName'),
      width: 'w-32 sm:w-auto',
      render: (file) => (
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{file.name}</div>
          {file.description && (
            <div className="text-xs text-gray-500 truncate">{file.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      header: t('fileManagement.columns.type'),
      width: 'w-20 sm:w-auto',
      render: (file) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(file.type)}`}>
          <span className="hidden sm:inline">{getTypeLabel(file.type)}</span>
          <span className="sm:hidden">{getTypeLabel(file.type).charAt(0)}</span>
        </span>
      )
    },
    {
      key: 'size',
      header: t('fileManagement.columns.size'),
      width: 'w-16 sm:w-auto',
      render: (file) => (
        <span className="text-xs sm:text-sm text-gray-600">{fileManager.formatFileSizeDisplay(file.file_size)}</span>
      )
    },
    {
      key: 'createdAt',
      header: t('fileManagement.columns.createdAt'),
      width: 'w-20 sm:w-auto',
      render: (file) => (
        <span className="text-xs sm:text-sm text-gray-600">
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
      header: t('fileManagement.columns.actions'),
      width: 'w-20 sm:w-auto',
      render: (file) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleImportFile(file)
            }}
            className="inline-flex items-center text-green-600 hover:text-green-700 hover:underline text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-300 rounded"
            title={t('fileManagement.actions.import')}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span className="hidden sm:inline">{t('fileManagement.actions.import')}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownloadFile(file)
            }}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
            title={t('fileManagement.actions.download')}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">{t('fileManagement.actions.download')}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteFile(file)
            }}
            className="inline-flex items-center text-red-600 hover:text-red-700 hover:underline text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
            title={t('fileManagement.actions.delete')}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="hidden sm:inline">{t('fileManagement.actions.delete')}</span>
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
    <div className="w-full px-2 md:px-0 relative">

      {/* Limit Bilgileri */}
      {userLimits && (
        <>
          {/* Mobile: Horizontal scrollable KPI cards */}
          <div className="mb-6 -mx-2 px-2 sm:hidden">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 scroll-smooth pb-2">
              {/* Kullanım Durumu */}
              <div className="min-w-[85%] snap-start bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.usageStatus')}</h3>
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

              {/* Toplam Limit */}
              <div className="min-w-[85%] snap-start bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.totalLimit')}</h3>
                    <p className="text-2xl font-bold text-green-600">{fileManager.formatLimitDisplay(userLimits.totalLimit)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tek Dosya Limiti */}
              <div className="min-w-[85%] snap-start bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.singleFileLimit')}</h3>
                    <p className="text-2xl font-bold text-blue-600">{fileManager.formatLimitDisplay(userLimits.singleFileLimit)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet/Desktop: Grid KPI cards */}
          <div className="hidden sm:grid mb-6 grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Kullanım Durumu */}
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.usageStatus')}</h3>
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

            {/* Toplam Limit */}
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.totalLimit')}</h3>
                  <p className="text-2xl font-bold text-green-600">{fileManager.formatLimitDisplay(userLimits.totalLimit)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tek Dosya Limiti */}
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t('fileManagement.limits.singleFileLimit')}</h3>
                  <p className="text-2xl font-bold text-blue-600">{fileManager.formatLimitDisplay(userLimits.singleFileLimit)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <DataTable
          data={files}
          columns={fileColumns}
          searchPlaceholder={t('fileManagement.searchPlaceholder')}
          searchKeys={['name', 'description']}
          showSearch={true}
          showPagination={true}
          maxHeight="calc(100vh - 400px)"
          emptyMessage={t('fileManagement.noFiles')}
          noResultsMessage={t('fileManagement.noFilesFound')}
          filters={
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
            >
              <span className="sm:hidden text-lg leading-none">+</span>
              <svg className="hidden sm:inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">{t('fileManagement.addNewFile')}</span>
            </button>
          }
          headerContent={
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('fileManagement.savedFiles')}</h3>
              <span className="text-xs text-gray-500">{t('fileManagement.totalFiles', { count: files.length })}</span>
            </div>
          }
        />
      </div>

      {/* PDF Export Progress Indicator */}
      {isExporting && (
        <div className="fixed top-6 right-6 z-[10000] transition-all duration-500 ease-out animate-in slide-in-from-top-2 fade-in">
          <div className="bg-gradient-to-br from-white to-gray-50/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[240px] transform hover:scale-105 transition-transform duration-200">
            {/* Animated download icon */}
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="animate-bounce h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {/* Progress ring */}
              <div className="absolute -inset-0.5 rounded-lg">
                <div className="w-9 h-9 border-2 border-blue-200 rounded-lg animate-spin" style={{ animationDuration: '3s' }}>
                  <div className="w-full h-full border-t-2 border-blue-500 rounded-lg"></div>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-gray-800">{t('fileManagement.progress.downloading')}</div>
                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{Math.round(pdfProgress)}%</div>
              </div>
              
              {/* Enhanced progress bar */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-lg" 
                  style={{ width: `${pdfProgress}%` }}
                >
                  <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
              
              {/* Status text */}
              <div className="mt-1.5 text-xs text-gray-500 font-medium">
                {pdfProgress < 100 ? t('fileManagement.progress.preparing') : t('fileManagement.progress.downloadingStatus')}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Success Notification */}
      <FileUploadSuccessNotification
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
        duration={4000}
      />

      {/* Delete Success Notification */}
      <FileDeleteSuccessNotification
        isOpen={showDeleteSuccessModal}
        onClose={() => setShowDeleteSuccessModal(false)}
        message={deleteSuccessMessage}
        duration={4000}
      />

      {/* Delete Confirmation Modal */}
      <FileDeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setFileToDelete(null)
        }}
        onConfirm={confirmDeleteFile}
        isSubmitting={isDeleting}
        file={fileToDelete}
      />
    </div>
  )
}
