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
  // Session Management
  static async login(email: string, password: string): Promise<ApiResponse<{ session: any; sessionToken?: string; user?: any }>> {
    try {
      // 1. Önce mevcut session'ı temizle (eski token'ları geçersiz kıl)
      await supabase.auth.signOut()
      
      // 2. Supabase ile giriş yap
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        return { success: false, error: `Giriş yapılamadı: ${authError.message}` }
      }

      if (!authData.user || !authData.session) {
        return { success: false, error: 'Giriş yapılamadı' }
      }

      // 3. Device bilgilerini topla
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString()
      }

      // 4. Yeni session oluştur (eski session'ları geçersiz kıl)
      const { data: sessionData, error: sessionError } = await supabase.rpc('create_single_user_session', {
        p_user_id: authData.user.id,
        p_device_info: deviceInfo,
        p_ip_address: null, // Client-side'da IP alınamaz
        p_user_agent: navigator.userAgent
      })

      if (sessionError) {
        console.warn('Session oluşturulamadı:', sessionError.message)
        // Session oluşturulamasa bile giriş başarılı sayılır
      }

      // 5. Custom session token'ı localStorage'a kaydet
      if (sessionData) {
        localStorage.setItem('custom_session_token', sessionData)
      }

      return { 
        success: true, 
        data: { 
          session: authData.session, // Supabase session'ını da döndür
          sessionToken: sessionData || null,
          user: authData.user
        } 
      }
    } catch (error) {
      return { success: false, error: `Giriş hatası: ${error}` }
    }
  }

  static async logout(): Promise<ApiResponse<null>> {
    try {
      // 1. Custom session token'ı localStorage'dan al
      const sessionToken = localStorage.getItem('custom_session_token')
      
      if (sessionToken) {
        // 2. Custom session'ı geçersiz kıl
        const { error: sessionError } = await supabase.rpc('invalidate_user_session', {
          p_session_token: sessionToken
        })

        if (sessionError) {
          console.warn('Session geçersiz kılınamadı:', sessionError.message)
        }

        // 3. Custom session token'ı localStorage'dan sil
        localStorage.removeItem('custom_session_token')
      }

      // 4. Supabase'den çıkış yap
      const { error: authError } = await supabase.auth.signOut()

      if (authError) {
        return { success: false, error: `Çıkış yapılamadı: ${authError.message}` }
      }

      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: `Çıkış hatası: ${error}` }
    }
  }

  static async validateSession(): Promise<ApiResponse<{ isValid: boolean, userId?: string }>> {
    try {
      // 1. Custom session token'ı localStorage'dan al
      const sessionToken = localStorage.getItem('custom_session_token')
      
      if (!sessionToken) {
        return { success: true, data: { isValid: false } }
      }

      // 2. Custom session doğrulama
      const { data: validationData, error: validationError } = await supabase.rpc('validate_user_session', {
        p_session_token: sessionToken
      })

      if (validationError) {
        console.warn('Session doğrulanamadı:', validationError.message)
        // Session geçersizse localStorage'dan sil
        localStorage.removeItem('custom_session_token')
        return { success: true, data: { isValid: false } }
      }

      const isValid = validationData?.[0]?.is_valid || false
      const userId = validationData?.[0]?.user_id

      if (!isValid) {
        // Session geçersizse localStorage'dan sil
        localStorage.removeItem('custom_session_token')
      }

      return { success: true, data: { isValid, userId } }
    } catch (error) {
      return { success: false, error: `Session doğrulama hatası: ${error}` }
    }
  }

  // Super Admin İşlemleri
  static async createInstitution(data: CreateInstitutionForm): Promise<ApiResponse<Institution>> {
    try {
      // Mevcut SuperAdmin oturumunu sakla (signUp oturumu değiştirebilir)
      const { data: { session: currentSession } } = await supabase.auth.getSession()

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
          subscription_start_date: data.subscription_start_date,
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

      // 4. Admin kurumun sahibi olarak atanır ama kullanıcı kotasından sayılmaz
      // users_created 0 olarak kalır, sadece 'user' rolündeki kullanıcılar sayılır

      // 5. SuperAdmin oturumunu geri yükle (yeni oluşturulan admin'e geçilmesini engelle)
      if (currentSession) {
        await supabase.auth.setSession(currentSession)
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
      // Önce session'ı kontrol et
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        return { success: false, error: 'Oturum bilgisi alınamadı' }
      }

      if (!session) {
        return { success: false, error: 'Aktif oturum bulunamadı. Lütfen tekrar giriş yapın.' }
      }

      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // Eğer permission denied hatası varsa, RLS politikalarını kontrol et
        if (error.code === '42501') {
          return { success: false, error: 'Kurumlara erişim izni yok. Lütfen sistem yöneticisi ile iletişime geçin.' }
        }
        
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kurumlar getirilemedi' }
    }
  }

  static async updateInstitution(id: string, data: Partial<Institution>): Promise<ApiResponse<Institution>> {
    try {
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
        return { success: false, error: error.message }
      }

      return { success: true, data: updatedInstitution }
    } catch (error) {
      return { success: false, error: 'Kurum güncellenemedi' }
    }
  }

  static async deleteInstitution(id: string): Promise<ApiResponse<void>> {
    try {
      // 1. Önce bu kuruma ait kullanıcıları kontrol et
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('institution_id', id)

      if (usersError) {
        return { success: false, error: `Kullanıcılar kontrol edilemedi: ${usersError.message}` }
      }

      // 2. Kuruma ait dosyaları sil
      const { error: deleteFilesError } = await supabase
        .from('saved_files')
        .delete()
        .eq('institution_id', id)

      if (deleteFilesError) {
        return { success: false, error: `Kurum dosyaları silinemedi: ${deleteFilesError.message}` }
      }

      // 3. Cascade delete: Kullanıcıları sil (trigger otomatik olarak auth.users'dan da silecek)
      if (users && users.length > 0) {
        const { error: deleteUsersError } = await supabase
          .from('profiles')
          .delete()
          .eq('institution_id', id)

        if (deleteUsersError) {
          return { success: false, error: `Kullanıcılar silinemedi: ${deleteUsersError.message}` }
        }
      }

      // 4. Kurumu sil
      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
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
      // 1. Tüm kurumları al
      const { data: institutions, error: institutionsError } = await supabase
        .from('institutions')
        .select('*')

      if (institutionsError) {
        return { success: false, error: `Kurumlar alınamadı: ${institutionsError.message}` }
      }

      const totalInstitutions = institutions?.length || 0

      // 2. Tüm kullanıcıları al
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, institution_id, role')

      if (usersError) {
        return { success: false, error: `Kullanıcılar alınamadı: ${usersError.message}` }
      }

      const totalUsers = users?.length || 0
      const institutionUsers = users?.filter(user => user.institution_id && user.role === 'user').length || 0
      const nonInstitutionUsers = users?.filter(user => !user.institution_id).length || 0

      // 3. Aktif ve süresi dolmuş kurumları hesapla
      const now = new Date()
      let activeInstitutions = 0
      let expiredInstitutions = 0

      if (institutions) {
        institutions.forEach(institution => {
          const subscriptionEndDate = new Date(institution.subscription_end_date)
          if (subscriptionEndDate > now) {
            activeInstitutions++
          } else {
            expiredInstitutions++
          }
        })
      }

      const stats: SuperAdminStats = {
        totalInstitutions,
        totalUsers,
        institutionUsers,
        nonInstitutionUsers,
        activeInstitutions,
        expiredInstitutions
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Super admin stats error:', error)
      return { success: false, error: 'İstatistikler getirilemedi' }
    }
  }

  // Admin İşlemleri
  static async createUser(data: CreateUserForm, institutionId: string): Promise<ApiResponse<Profile>> {
    try {
      // Mevcut admin oturumunu sakla (signUp oturumu değiştirebilir)
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      // 0. Kota kontrolü yap
      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('user_quota, users_created, subscription_end_date')
        .eq('id', institutionId)
        .single()

      if (institutionError) {
        return { success: false, error: `Kurum bilgileri alınamadı: ${institutionError.message}` }
      }

      if (!institution) {
        return { success: false, error: 'Kurum bulunamadı' }
      }

      // Abonelik süresi kontrolü
      const subscriptionEndDate = new Date(institution.subscription_end_date)
      const now = new Date()
      if (subscriptionEndDate <= now) {
        return { success: false, error: 'Aboneliğinizin süresi dolmuş. Yeni kullanıcı oluşturamazsınız.' }
      }

      // Kota kontrolü
      if (institution.users_created >= institution.user_quota) {
        return { success: false, error: 'Kullanıcı kotanız dolmuş. Yeni kullanıcı oluşturamazsınız.' }
      }

      // 1. Auth kullanıcısı oluştur (bu işlem oturumu yeni kullanıcıya çevirebilir)
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

      // 3. Admin oturumunu geri yükle (yeni oluşturulan kullanıcıya geçilmesini engelle)
      if (currentSession) {
        await supabase.auth.setSession(currentSession)
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

  // Super Admin için tüm kullanıcıları getir
  static async getAllUsers(): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          institutions (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kullanıcılar getirilemedi' }
    }
  }

  // Super Admin için belirli bir kurumun sadece user rolündeki kullanıcılarını getir (admin hariç)
  static async getInstitutionUsersForSuperAdmin(institutionId: string): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          institutions (
            id,
            name,
            email
          )
        `)
        .eq('institution_id', institutionId)
        .eq('role', 'user') // Sadece user rolündeki kullanıcıları getir
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kurum kullanıcıları getirilemedi' }
    }
  }

  // Super Admin için kurum olmayan kullanıcıları getir (super_admin hariç)
  static async getNonInstitutionUsers(): Promise<ApiResponse<Profile[]>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('institution_id', null)
        .neq('role', 'super_admin') // super_admin rolündeki kullanıcıları hariç tut
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: 'Kurum olmayan kullanıcılar getirilemedi' }
    }
  }

  // Super Admin için kullanıcı güncelle
  static async updateUser(userId: string, data: { username: string; email: string; expiration_date?: string }): Promise<ApiResponse<Profile>> {
    try {
      const updatePayload: any = {
        username: data.username,
        email: data.email,
        role: 'user',
        updated_at: new Date().toISOString()
      }
      if (data.expiration_date && data.expiration_date.trim() !== '') {
        updatePayload.expiration_date = data.expiration_date
      }

      const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: updatedUser }
    } catch (error) {
      console.error('Update user error:', error)
      return { success: false, error: 'Kullanıcı güncellenemedi' }
    }
  }

  // Super Admin için kullanıcı sil
  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      // 1. Kullanıcının dosyalarını sil (kurumu olmayan kullanıcılar için)
      const { error: deleteFilesError } = await supabase
        .from('saved_files')
        .delete()
        .eq('user_id', userId)
        .is('institution_id', null) // Sadece kurumu olmayan kullanıcıların dosyalarını sil

      if (deleteFilesError) {
        return { success: false, error: `Kullanıcı dosyaları silinemedi: ${deleteFilesError.message}` }
      }

      // 2. Kullanıcıyı profiles tablosundan sil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileError) {
        return { success: false, error: `Kullanıcı profili silinemedi: ${profileError.message}` }
      }

      // 3. Auth kullanıcısını da sil (trigger otomatik olarak silecek)
      return { success: true }
    } catch (error) {
      console.error('Delete user error:', error)
      return { success: false, error: 'Kullanıcı silinemedi' }
    }
  }

  // Super Admin için kurumu olmayan kullanıcı oluştur
  static async createNonInstitutionUser(data: { email: string; password: string; username: string; role: 'user' | 'admin'; expiration_date?: string }): Promise<ApiResponse<Profile>> {
    try {
      // Mevcut SuperAdmin oturumunu kaydet
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      // 1. Auth kullanıcısı oluştur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            role: data.role
          }
        }
      })

      if (authError) {
        console.error('Auth error details:', authError)
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
            role: data.role,
            institution_id: null, // Kurumu olmayan kullanıcı
            expiration_date: data.expiration_date || null,
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
            role: data.role,
            institution_id: null, // Kurumu olmayan kullanıcı
            expiration_date: data.expiration_date || null
          })
          .select()
          .single()
        profileError = error
        profileData = newProfile
      }

      if (profileError) {
        return { success: false, error: `Kullanıcı profili oluşturulamadı: ${profileError.message}` }
      }

      // 3. SuperAdmin oturumunu geri yükle
      if (currentSession) {
        await supabase.auth.setSession(currentSession)
      }

      return {
        success: true,
        data: profileData
      }
    } catch (error) {
      console.error('Create non-institution user error:', error)
      return { success: false, error: 'Kullanıcı oluşturulamadı' }
    }
  }

  static async getAdminStats(institutionId: string): Promise<ApiResponse<AdminStats>> {
    try {
      // Kurum bilgilerini al
      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('user_quota, users_created, subscription_end_date')
        .eq('id', institutionId)
        .single()

      if (institutionError) {
        return { success: false, error: `Kurum bilgileri alınamadı: ${institutionError.message}` }
      }

      if (!institution) {
        return { success: false, error: 'Kurum bulunamadı' }
      }

      // Kullanıcı sayısı artık institutions.users_created üzerinden takip ediliyor
      const usedQuota = institution.users_created || 0
      const totalUsers = usedQuota
      const remainingQuota = Math.max(0, institution.user_quota - usedQuota)

      // Abonelik günlerini hesapla
      const subscriptionEndDate = new Date(institution.subscription_end_date)
      const now = new Date()
      const subscriptionDaysLeft = Math.ceil((subscriptionEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const stats: AdminStats = {
        totalUsers,
        remainingQuota,
        usedQuota,
        subscriptionDaysLeft: Math.max(0, subscriptionDaysLeft)
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Admin stats error:', error)
      return { success: false, error: 'İstatistikler getirilemedi' }
    }
  }
}
