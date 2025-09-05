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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'Kullanıcı oturumu bulunamadı' }
      }

      // Kullanıcının kurum bilgisini al
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

      const fileSize = this.formatFileSize(fileData.data)


      const { data, error } = await supabase
        .from('saved_files')
        .insert({
          user_id: user.id,
          institution_id: profile?.institution_id || null,
          name: fileData.name,
          type: fileData.type,
          description: fileData.description,
          file_data: fileData.data,
          file_size: fileSize
        })
        .select('id')
        .single()

      if (error) {
        console.error('Dosya kaydedilirken hata:', error)
        return { success: false, error: error.message }
      }

      return { success: true, fileId: data.id }
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
        updateData.file_size = this.formatFileSize(updates.file_data)
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


  // Kurum bazında limit bilgilerini getir (tüm kullanıcılar aynı storage'ı kullanır)
  async getUserLimits(): Promise<{
    success: boolean
    data?: {
      singleFileLimit: number
      totalLimit: number
      usedSpace: number
      remainingSpace: number
      fileCount: number
      percentage: number
    }
    error?: string
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'Kullanıcı bulunamadı' }
      }

      console.log('=== KURUM LİMİT DEBUG ===')
      console.log('Kullanıcı ID:', user.id)
      console.log('Kullanıcı Email:', user.email)

      // Önce kullanıcının kurum bilgisini al
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single()

      console.log('Profil sorgusu sonucu:', { profile, profileError })

      if (profileError || !profile?.institution_id) {
        console.error('Kurum bilgisi bulunamadı:', profileError)
        return { success: false, error: 'Kurum bilgisi bulunamadı' }
      }

      // Kurumun tüm kullanıcılarının dosyalarını hesapla
      const { data: files, error } = await supabase
        .from('saved_files')
        .select('file_size, name, type, user_id')
        .eq('institution_id', profile.institution_id)

      console.log('Kurum dosya sorgusu sonucu:', { files, error })

      if (error) {
        console.error('Limit bilgileri alınırken hata:', error)
        return { success: false, error: error.message }
      }

      const usedSpace = files?.reduce((total, file) => total + (file.file_size || 0), 0) || 0
      const fileCount = files?.length || 0
      const singleFileLimit = 10485760 // 10MB
      const totalLimit = 104857600 // 100MB
      const remainingSpace = Math.max(0, totalLimit - usedSpace)
      const percentage = Math.round((usedSpace / totalLimit) * 100)

      console.log('Hesaplanan kurum limitleri:', {
        institutionId: profile.institution_id,
        usedSpace,
        fileCount,
        singleFileLimit,
        totalLimit,
        remainingSpace,
        percentage
      })
      console.log('========================')

      return {
        success: true,
        data: {
          singleFileLimit,
          totalLimit,
          usedSpace,
          remainingSpace,
          fileCount,
          percentage
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
