import { StorageEngine } from '../storage/StorageEngine'

export interface SavedFile {
  id: string
  name: string
  type: 'players' | 'tournaments' | 'fixtures'
  description?: string
  data: any
  size: string
  createdAt: string
  lastModified: string
}

export class FileManagerService {
  private storage = new StorageEngine('file_manager', 'v1')
  private readonly FILES_INDEX_KEY = 'files_index'
  private readonly FILE_PREFIX = 'file_'

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private formatFileSize(data: any): string {
    const jsonString = JSON.stringify(data)
    const bytes = new Blob([jsonString]).size
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  private getFileIndex(): string[] {
    return this.storage.get<string[]>(this.FILES_INDEX_KEY, [])
  }

  private setFileIndex(index: string[]): void {
    this.storage.set(this.FILES_INDEX_KEY, index)
  }

  saveFile(fileData: {
    name: string
    type: 'players' | 'tournaments' | 'fixtures'
    description?: string
    data: any
  }): { success: boolean; error?: string; fileId?: string } {
    try {
      const fileId = this.generateId()
      const now = new Date().toISOString()
      
      const savedFile: SavedFile = {
        id: fileId,
        name: fileData.name,
        type: fileData.type,
        description: fileData.description,
        data: fileData.data,
        size: this.formatFileSize(fileData.data),
        createdAt: now,
        lastModified: now
      }

      // Dosyayı kaydet
      this.storage.set(`${this.FILE_PREFIX}${fileId}`, savedFile)
      
      // Index'e ekle
      const index = this.getFileIndex()
      index.push(fileId)
      this.setFileIndex(index)

      return { success: true, fileId }
    } catch (error) {
      console.error('Dosya kaydedilirken hata:', error)
      return { success: false, error: 'Dosya kaydedilemedi' }
    }
  }

  getAllFiles(): SavedFile[] {
    try {
      const index = this.getFileIndex()
      const files: SavedFile[] = []

      for (const fileId of index) {
        const file = this.storage.get<SavedFile | null>(`${this.FILE_PREFIX}${fileId}`, null)
        if (file) {
          files.push(file)
        }
      }

      // Tarihe göre sırala (en yeni önce)
      return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      console.error('Dosyalar yüklenirken hata:', error)
      return []
    }
  }

  getFile(fileId: string): SavedFile | null {
    try {
      return this.storage.get<SavedFile | null>(`${this.FILE_PREFIX}${fileId}`, null)
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error)
      return null
    }
  }

  deleteFile(fileId: string): { success: boolean; error?: string } {
    try {
      // Dosyayı sil
      this.storage.remove(`${this.FILE_PREFIX}${fileId}`)
      
      // Index'ten çıkar
      const index = this.getFileIndex()
      const newIndex = index.filter(id => id !== fileId)
      this.setFileIndex(newIndex)

      return { success: true }
    } catch (error) {
      console.error('Dosya silinirken hata:', error)
      return { success: false, error: 'Dosya silinemedi' }
    }
  }

  downloadFile(fileId: string): { success: boolean; error?: string } {
    try {
      const file = this.getFile(fileId)
      if (!file) {
        return { success: false, error: 'Dosya bulunamadı' }
      }

      // JSON olarak indir
      const dataStr = JSON.stringify(file.data, null, 2)
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

  updateFile(fileId: string, updates: Partial<Pick<SavedFile, 'name' | 'description' | 'data'>>): { success: boolean; error?: string } {
    try {
      const file = this.getFile(fileId)
      if (!file) {
        return { success: false, error: 'Dosya bulunamadı' }
      }

      const updatedFile: SavedFile = {
        ...file,
        ...updates,
        size: updates.data ? this.formatFileSize(updates.data) : file.size,
        lastModified: new Date().toISOString()
      }

      this.storage.set(`${this.FILE_PREFIX}${fileId}`, updatedFile)
      return { success: true }
    } catch (error) {
      console.error('Dosya güncellenirken hata:', error)
      return { success: false, error: 'Dosya güncellenemedi' }
    }
  }

  getFilesByType(type: 'players' | 'tournaments' | 'fixtures'): SavedFile[] {
    return this.getAllFiles().filter(file => file.type === type)
  }

  clearAllFiles(): { success: boolean; error?: string } {
    try {
      const index = this.getFileIndex()
      
      // Tüm dosyaları sil
      for (const fileId of index) {
        this.storage.remove(`${this.FILE_PREFIX}${fileId}`)
      }
      
      // Index'i temizle
      this.setFileIndex([])
      
      return { success: true }
    } catch (error) {
      console.error('Dosyalar temizlenirken hata:', error)
      return { success: false, error: 'Dosyalar temizlenemedi' }
    }
  }
}
