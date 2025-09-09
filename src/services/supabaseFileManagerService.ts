import { supabase } from '../lib/supabase'

export interface SavedFile {
  id: string
  user_id: string
  institution_id?: string
  name: string
  type: 'players' | 'tournaments' | 'fixtures'
  description?: string
  file_data: any
  file_size: number
  created_at: string
  updated_at: string
}

export interface FileStats {
  total_files: number
  total_size: number
  files_by_type: Record<string, number>
  last_upload: string | null
}

export class SupabaseFileManagerService {
  private formatFileSize(data: any): number {
    try {
      // Use the same formatting as downloadFile to ensure consistent size calculation
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      return blob.size
    } catch (error) {
      // Fallback: TextEncoder
      const jsonString = JSON.stringify(data, null, 2)
      return new TextEncoder().encode(jsonString).length
    }
  }

  async saveFile(fileData: {
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  }): Promise<{ success: boolean; error?: string; fileId?: string }> {
    try {
      // Önce abonelik durumunu kontrol et
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' }
      }

      // Kullanıcı profilini al ve Super Admin kontrolü yap
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        return { success: false, error: 'Kullanıcı profili alınamadı' }
      }

      // Super Admin için abonelik kontrolü yapma
      if (profileData?.role === 'super_admin') {
        // Super Admin için direkt devam et
      } else {
        // Diğer kullanıcılar için abonelik durumunu kontrol et
        const { data: statusData, error: statusError } = await supabase.rpc('check_user_subscription_status', {
          p_user_id: user.id
        })

        if (statusError) {
          return { success: false, error: 'Abonelik durumu kontrol edilemedi' }
        }

        const isActive = statusData?.[0]?.is_active || false
        if (!isActive) {
          return { success: false, error: 'Aboneliğinizin süresi dolmuş. Dosya kaydedemezsiniz.' }
        }
      }

      // Calculate file size on client side to ensure consistency with download size
      const calculatedFileSize = this.formatFileSize(fileData.data)
      
      // Check file size limit before sending to database
      if (calculatedFileSize > 10485760) { // 10MB
        return { success: false, error: 'Dosya boyutu 10MB limitini aşıyor' }
      }

      // Tek RPC çağrısı ile tüm işlemleri yap (3 istek yerine 1 istek)
      const { data, error } = await supabase.rpc('save_file_optimized', {
        p_name: fileData.name,
        p_type: fileData.type,
        p_file_data: fileData.data,
        p_description: fileData.description || null,
        p_file_size: calculatedFileSize
      })

      if (error) {
        console.error('Dosya kaydedilirken hata:', error)
        return { success: false, error: error.message }
      }

      // RPC fonksiyonu JSONB döndürüyor
      const result = data as { success: boolean; error?: string; fileId?: string }
      
      if (!result.success) {
        return { success: false, error: result.error || 'Dosya kaydedilemedi' }
      }

      return { success: true, fileId: result.fileId }
    } catch (error) {
      console.error('Dosya kaydedilirken hata:', error)
      return { success: false, error: 'Dosya kaydedilemedi' }
    }
  }

  async getAllFiles(): Promise<SavedFile[]> {
    try {
      const { data, error } = await supabase
        .from('saved_files')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Dosyalar yüklenirken hata:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error)
      return []
    }
  }

  async getFile(fileId: string): Promise<SavedFile | null> {
    try {
      const { data, error } = await supabase
        .from('saved_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error) {
        console.error('Dosya yüklenirken hata:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error)
      return null
    }
  }

  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_files')
        .delete()
        .eq('id', fileId)

      if (error) {
        console.error('Dosya silinirken hata:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Dosya silinirken hata:', error)
      return { success: false, error: 'Dosya silinemedi' }
    }
  }

  async downloadFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const file = await this.getFile(fileId)
      if (!file) {
        return { success: false, error: 'Dosya bulunamadı' }
      }

      // Download log'u kaydet
      await this.logDownload(fileId)

      // JSON olarak indir
      const dataStr = JSON.stringify(file.file_data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })

      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${file.name}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      console.error('Dosya indirilirken hata:', error)
      return { success: false, error: 'Dosya indirilemedi' }
    }
  }

  async updateFile(fileId: string, updates: Partial<Pick<SavedFile, 'name' | 'description' | 'file_data'>>): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = { ...updates }

      if (updates.file_data) {
        // Use consistent file size calculation
        const calculatedFileSize = this.formatFileSize(updates.file_data)
        
        // Check file size limit
        if (calculatedFileSize > 10485760) { // 10MB
          return { success: false, error: 'Dosya boyutu 10MB limitini aşıyor' }
        }
        
        updateData.file_size = calculatedFileSize
      }

      const { error } = await supabase
        .from('saved_files')
        .update(updateData)
        .eq('id', fileId)

      if (error) {
        console.error('Dosya güncellenirken hata:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Dosya güncellenirken hata:', error)
      return { success: false, error: 'Dosya güncellenemedi' }
    }
  }

  async getFilesByType(type: 'players' | 'tournaments' | 'fixtures'): Promise<SavedFile[]> {
    try {
      const { data, error } = await supabase
        .from('saved_files')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Dosyalar yüklenirken hata:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error)
      return []
    }
  }

  async searchFiles(searchTerm: string, fileType?: string): Promise<SavedFile[]> {
    try {
      let query = supabase
        .from('saved_files')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      if (fileType) {
        query = query.eq('type', fileType)
      }

      const { data, error } = await query

      if (error) {
        console.error('Dosya arama hatası:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Dosya arama hatası:', error)
      return []
    }
  }

  async getUserFileStats(): Promise<FileStats | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_file_stats')

      if (error) {
        console.error('Dosya istatistikleri yüklenirken hata:', error)
        return null
      }

      return data?.[0] || null
    } catch (error) {
      console.error('Dosya istatistikleri yüklenirken hata:', error)
      return null
    }
  }

  async getInstitutionFileStats(institutionId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_institution_file_stats', { institution_uuid: institutionId })

      if (error) {
        console.error('Kurum dosya istatistikleri yüklenirken hata:', error)
        return null
      }

      return data?.[0] || null
    } catch (error) {
      console.error('Kurum dosya istatistikleri yüklenirken hata:', error)
      return null
    }
  }

  private async logDownload(fileId: string): Promise<void> {
    try {
      await supabase
        .rpc('log_file_download', {
          file_uuid: fileId,
          client_ip: null, // IP adresi alınamıyor
          agent: navigator.userAgent
        })
    } catch (error) {
      console.error('Download log kaydedilemedi:', error)
      // Hata olsa da devam et
    }
  }

  async clearAllFiles(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('saved_files')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Tüm kayıtları sil

      if (error) {
        console.error('Dosyalar temizlenirken hata:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Dosyalar temizlenirken hata:', error)
      return { success: false, error: 'Dosyalar temizlenemedi' }
    }
  }

  // Dosya boyutu formatı için yardımcı fonksiyon
  formatFileSizeDisplay(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }


  // Kurum bazında limit bilgilerini ve dosya listesini getir (tek çağrıda tüm bilgiler)
  async getUserLimits(): Promise<{
    success: boolean
    data?: {
      singleFileLimit: number
      totalLimit: number
      usedSpace: number
      remainingSpace: number
      fileCount: number
      percentage: number
      files: SavedFile[]
    }
    error?: string
  }> {
    try {
      // Tek çağrıda tüm bilgileri al: profil + kurum + dosya bilgileri + dosya listesi
      const { data, error } = await supabase.rpc('get_user_storage_info')
      
      if (error) {
        console.error('Storage bilgileri alınırken hata:', error)
        return { success: false, error: error.message }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Veri bulunamadı' }
      }

      const result = data[0]
      const {
        institution_id,
        storage_limit,
        institution_storage_limit,
        used_space,
        file_count,
        files
      } = result

      const singleFileLimit = 10485760 // 10MB
      const totalLimit = institution_id 
        ? (institution_storage_limit || 104857600) // Kurum limiti
        : (storage_limit || 10485760) // Bireysel limit
      
      const usedSpace = used_space || 0
      const fileCount = file_count || 0
      const remainingSpace = Math.max(0, totalLimit - usedSpace)
      const percentage = Math.round((usedSpace / totalLimit) * 100)

      // Dosya listesini SavedFile formatına çevir
      const filesList: SavedFile[] = files || []

      return {
        success: true,
        data: {
          singleFileLimit,
          totalLimit,
          usedSpace,
          remainingSpace,
          fileCount,
          percentage,
          files: filesList
        }
      }
    } catch (error) {
      console.error('Limit bilgileri alınırken hata:', error)
      return { success: false, error: 'Bilinmeyen hata' }
    }
  }

  // Limit bilgilerini formatla
  formatLimitDisplay(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Dosya türü etiketleri için yardımcı fonksiyon
  getTypeLabel(type: string): string {
    switch (type) {
      case 'players': return 'Oyuncular'
      case 'tournaments': return 'Turnuvalar'
      case 'fixtures': return 'Fixtürler'
      default: return type
    }
  }

  // Dosya türü renkleri için yardımcı fonksiyon
  getTypeColor(type: string): string {
    switch (type) {
      case 'players': return 'bg-blue-100 text-blue-800'
      case 'tournaments': return 'bg-green-100 text-green-800'
      case 'fixtures': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
}
