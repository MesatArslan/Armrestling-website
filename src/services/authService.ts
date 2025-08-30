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
      // 1. Auth kullanıcısı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: 'admin'
          }
        }
      })

      if (authError) {
        return { success: false, error: `Auth kullanıcısı oluşturulamadı: ${authError.message}` }
      }

      if (!authData.user) {
        return { success: false, error: 'Auth kullanıcısı oluşturulamadı' }
      }

      // 2. Kurum kaydı oluştur
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .insert({
          email: data.email,
          name: data.name,
          user_quota: data.user_quota,
          users_created: 0, // Başlangıçta 0 olacak, admin eklendikten sonra güncellenecek
          subscription_end_date: data.subscription_end_date,
          created_by: authData.user.id
        })
        .select()
        .single()

      if (institutionError) {
        return { success: false, error: `Kurum kaydı oluşturulamadı: ${institutionError.message}` }
      }

      // 3. Admin profili oluştur veya güncelle (trigger nedeniyle zaten oluşturulmuş olabilir)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      let profileError
      if (existingProfile) {
        // Profil zaten var, güncelle
        const { error } = await supabase
          .from('profiles')
          .update({
            username: data.name,
            role: 'admin',
            institution_id: institutionData.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id)
        profileError = error
      } else {
        // Profil yok, oluştur
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            username: data.name,
            role: 'admin',
            institution_id: institutionData.id
          })
        profileError = error
      }

      if (profileError) {
        // Kurum oluşturuldu ama profil oluşturulamadı, rollback yap
        await supabase.from('institutions').delete().eq('id', institutionData.id)
        return { success: false, error: `Admin profili oluşturulamadı: ${profileError.message}` }
      }

      // 4. Kurumun users_created counter'ını güncelle (admin eklendiği için)
      const { error: updateError } = await supabase
        .from('institutions')
        .update({
          users_created: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', institutionData.id)

      if (updateError) {
        console.warn('Kurum sayacı güncellenemedi:', updateError)
      }

      return {
        success: true,
        data: institutionData
      }
    } catch (error) {
      console.error('Kurum oluşturma hatası:', error)
      return { success: false, error: 'Kurum oluşturulurken beklenmeyen bir hata oluştu' }
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
      // 1. Auth kullanıcısı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            role: 'user'
          }
        }
      })

      if (authError) {
        return { success: false, error: `Auth kullanıcısı oluşturulamadı: ${authError.message}` }
      }

      if (!authData.user) {
        return { success: false, error: 'Auth kullanıcısı oluşturulamadı' }
      }

      // 2. Kullanıcı profili oluştur veya güncelle (trigger nedeniyle zaten oluşturulmuş olabilir)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      let profileError
      let profileData

      if (existingProfile) {
        // Profil zaten var, güncelle
        const { data: updatedProfile, error } = await supabase
          .from('profiles')
          .update({
            username: data.username,
            role: 'user',
            institution_id: institutionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', authData.user.id)
          .select()
          .single()
        profileError = error
        profileData = updatedProfile
      } else {
        // Profil yok, oluştur
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            username: data.username,
            role: 'user',
            institution_id: institutionId
          })
          .select()
          .single()
        profileError = error
        profileData = newProfile
      }

      if (profileError) {
        return { success: false, error: `Kullanıcı profili oluşturulamadı: ${profileError.message}` }
      }

      return {
        success: true,
        data: profileData
      }
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error)
      return { success: false, error: 'Kullanıcı oluşturulurken beklenmeyen bir hata oluştu' }
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

  static async getAdminStats(_institutionId: string): Promise<ApiResponse<AdminStats>> {
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
