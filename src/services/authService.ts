import { supabase } from '../lib/supabase'
import type { 
  Institution, 
  Profile, 
  CreateInstitutionForm, 
  CreateUserForm, 
  ApiResponse,
  SuperAdminStats,
  AdminStats 
} from '../types/auth'

export class AuthService {
  // Super Admin İşlemleri
  static async createInstitution(data: CreateInstitutionForm): Promise<ApiResponse<Institution>> {
    try {
      // Bu fonksiyon sadece manuel olarak çalışır
      // Super Admin'in Supabase Dashboard'dan manuel olarak kullanıcı oluşturması gerekiyor
      
      return { 
        success: false, 
        error: 'Kurum oluşturma şu anda manuel yapılmalıdır. Lütfen Supabase Dashboard > Authentication > Users kısmından kullanıcıyı oluşturun ve ardından SQL ile profil ve institution kayıtlarını ekleyin.' 
      }
    } catch (error) {
      return { success: false, error: 'Beklenmeyen bir hata oluştu' }
    }
  }

  static async getInstitutions(): Promise<ApiResponse<Institution[]>> {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kurumlar getirilemedi' }
    }
  }

  static async getInstitutionUsers(institutionId: string): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kullanıcılar getirilemedi' }
    }
  }

  static async getSuperAdminStats(): Promise<ApiResponse<SuperAdminStats>> {
    try {
      // Basit istatistikler - şimdilik hardcoded
      const stats: SuperAdminStats = {
        totalInstitutions: 0,
        totalUsers: 0,
        activeInstitutions: 0,
        expiredInstitutions: 0
      }

      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: 'İstatistikler getirilemedi' }
    }
  }

  // Admin İşlemleri
  static async createUser(data: CreateUserForm, institutionId: string): Promise<ApiResponse<Profile>> {
    try {
      // Bu fonksiyon da manuel yapılmalıdır
      return { 
        success: false, 
        error: 'Kullanıcı oluşturma şu anda manuel yapılmalıdır. Lütfen Supabase Dashboard > Authentication > Users kısmından kullanıcıyı oluşturun ve ardından SQL ile profil kaydını ekleyin.' 
      }
    } catch (error) {
      return { success: false, error: 'Beklenmeyen bir hata oluştu' }
    }
  }

  static async getInstitutionUsersByAdmin(institutionId: string): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kullanıcılar getirilemedi' }
    }
  }

  static async getAdminStats(institutionId: string): Promise<ApiResponse<AdminStats>> {
    try {
      // Basit istatistikler - şimdilik hardcoded
      const stats: AdminStats = {
        totalUsers: 0,
        remainingQuota: 10,
        usedQuota: 0,
        subscriptionDaysLeft: 30
      }

      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: 'İstatistikler getirilemedi' }
    }
  }
}
