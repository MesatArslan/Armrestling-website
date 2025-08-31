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
      console.log('Getting institutions...')

      // Önce session'ı kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        return { success: false, error: 'Oturum bilgisi alınamadı' }
      }

      if (!session) {
        console.error('No active session')
        return { success: false, error: 'Aktif oturum bulunamadı. Lütfen tekrar giriş yapın.' }
      }

      console.log('Active session found for user:', session.user.id)

      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Institutions error:', error)
        
        // Eğer permission denied hatası varsa, RLS politikalarını kontrol et
        if (error.code === '42501') {
          return { success: false, error: 'Kurumlara erişim izni yok. Lütfen sistem yöneticisi ile iletişime geçin.' }
        }
        
        return { success: false, error: error.message }
      }

      console.log('Institutions data:', data)
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('GetInstitutions error:', error)
      return { success: false, error: 'Kurumlar getirilemedi' }
    }
  }

  static async updateInstitution(id: string, data: Partial<Institution>): Promise<ApiResponse<Institution>> {
    try {
      console.log('Updating institution:', id, data)

      const { data: updatedInstitution, error } = await supabase
        .from('institutions')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Update institution error:', error)
        return { success: false, error: error.message }
      }

      console.log('Updated institution:', updatedInstitution)
      return { success: true, data: updatedInstitution }
    } catch (error) {
      console.error('UpdateInstitution error:', error)
      return { success: false, error: 'Kurum güncellenemedi' }
    }
  }

  static async deleteInstitution(id: string): Promise<ApiResponse<void>> {
    try {
      console.log('Deleting institution:', id)

      // Önce bu kuruma ait kullanıcıları kontrol et
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('institution_id', id)

      if (usersError) {
        console.error('Check users error:', usersError)
        return { success: false, error: `Kullanıcılar kontrol edilemedi: ${usersError.message}` }
      }

      // Cascade delete: Önce kullanıcıları sil, sonra kurumu sil
      if (users && users.length > 0) {
        console.log(`Deleting ${users.length} users from institution`)
        
        // Profiles tablosundan kullanıcıları sil (trigger otomatik olarak auth.users'dan da silecek)
        const { error: deleteUsersError } = await supabase
          .from('profiles')
          .delete()
          .eq('institution_id', id)

        if (deleteUsersError) {
          console.error('Delete users error:', deleteUsersError)
          return { success: false, error: `Kullanıcılar silinemedi: ${deleteUsersError.message}` }
        }

        console.log('Users deleted successfully (profiles + auth.users)')
      }

      // Kurumu sil
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete institution error:', error)
        return { success: false, error: error.message }
      }

      console.log('Institution deleted successfully')
      return { success: true }
    } catch (error) {
      console.error('DeleteInstitution error:', error)
      return { success: false, error: 'Kurum silinemedi' }
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
