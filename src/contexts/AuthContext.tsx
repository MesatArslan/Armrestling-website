import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthService } from '../services/authService'
import type { AuthContextType, Profile, Institution, ApiResponse, AuthUser } from '../types/auth'
import { clearAuthTokens } from '../utils/authUtils'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [profileCache, setProfileCache] = useState<Map<string, Profile & { institution?: Institution }>>(new Map())
  const [sessionCheckInterval, setSessionCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const [sessionExpiryTime, setSessionExpiryTime] = useState<Date | null>(null)

  // Session kontrol fonksiyonu
  const checkSessionValidity = async () => {
    try {
      const sessionToken = localStorage.getItem('custom_session_token')
      
      if (!sessionToken) {
        // Custom session token yoksa Supabase session'ını da temizle
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Custom session token yok, Supabase session temizleniyor')
          await supabase.auth.signOut()
          // localStorage'daki tüm Supabase token'larını da temizle
          clearAuthTokens()
          setUser(null)
          setProfile(null)
          setSessionExpiryTime(null)
        }
        return
      }

      // Custom session token varsa doğrula
      const validationResult = await AuthService.validateSession()
      
      if (!validationResult.success || !validationResult.data?.isValid) {
        console.log('Custom session geçersiz, tüm session\'lar temizleniyor')
        localStorage.removeItem('custom_session_token')
        await supabase.auth.signOut()
        // localStorage'daki tüm Supabase token'larını da temizle
        clearAuthTokens()
        setUser(null)
        setProfile(null)
        setSessionExpiryTime(null)
      } else {
        // Abonelik süresi kontrolü
        const { subscriptionExpired, userExpired } = validationResult.data
        if (subscriptionExpired || userExpired) {
          console.log('Abonelik süresi doldu, otomatik çıkış yapılıyor')
          localStorage.removeItem('custom_session_token')
          await supabase.auth.signOut()
          clearAuthTokens()
          setUser(null)
          setProfile(null)
          setSessionExpiryTime(null)
          return
        }

        // Session geçerli, süresini kontrol et
        const now = new Date()
        if (sessionExpiryTime && now >= sessionExpiryTime) {
          console.log('Session süresi doldu, otomatik çıkış yapılıyor')
          localStorage.removeItem('custom_session_token')
          await supabase.auth.signOut()
          clearAuthTokens()
          setUser(null)
          setProfile(null)
          setSessionExpiryTime(null)
        }
      }
    } catch (error) {
      console.warn('Session kontrol hatası:', error)
    }
  }

  // Profil bilgilerini getir
  const fetchProfile = async (userId: string): Promise<(Profile & { institution?: Institution }) | null> => {
    // Cache kontrolü
    const cachedProfile = profileCache.get(userId)
    if (cachedProfile) {
      return cachedProfile
    }
    
    // Profile fetch timeout
    const profileTimeout = setTimeout(() => {
      // Timeout durumunda hiçbir şey yapma
    }, 5000) // 5 saniye timeout
    
    try {
      // Tek çağrıda profil + kurum bilgilerini al
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          institutions!institution_id (*)
        `)
        .eq('id', userId)
        .single()

      clearTimeout(profileTimeout)

      if (profileError) {
        // Eğer profil bulunamazsa, gerçek profil oluştur
        if (profileError.code === 'PGRST116') {
          // Auth user bilgilerini al
          const { data: { user: authUser } } = await supabase.auth.getUser()
          
          if (authUser) {
            const newProfile = await createProfile(userId, authUser.email || 'unknown@example.com', 'super_admin')
            if (newProfile) {
              return {
                ...newProfile,
                institution: undefined
              }
            }
          }
          
          // Eğer profil oluşturulamazsa, mock profil döndür
          const mockProfile: Profile & { institution?: Institution } = {
            id: userId,
            email: 'superadmin@example.com',
            role: 'super_admin',
            username: 'Super Admin',
            institution_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          // Cache'e kaydet
          setProfileCache(prev => new Map(prev).set(userId, mockProfile))
          return mockProfile
        }
        
        // Diğer hatalar için mock profil döndür
        const mockProfile: Profile & { institution?: Institution } = {
          id: userId,
          email: 'superadmin@example.com',
          role: 'super_admin',
          username: 'Super Admin',
          institution_id: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Cache'e kaydet
        setProfileCache(prev => new Map(prev).set(userId, mockProfile))
        return mockProfile
      }

      // Kurum bilgilerini al (join ile geldi)
      const institution = (profile.institutions as any) || undefined

      const result = {
        ...profile,
        institution
      }
      
      // Cache'e kaydet
      setProfileCache(prev => new Map(prev).set(userId, result))
      return result
    } catch (error) {
      clearTimeout(profileTimeout)
      
      // Hata durumunda mock profil döndür
      const mockProfile: Profile & { institution?: Institution } = {
        id: userId,
        email: 'superadmin@example.com',
        role: 'super_admin',
        username: 'Super Admin',
        institution_id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Cache'e kaydet
      setProfileCache(prev => new Map(prev).set(userId, mockProfile))
      return mockProfile
    }
  }

  // Profil yenileme fonksiyonu
  const refreshProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const profileData = await fetchProfile(authUser.id)
      if (profileData) {
        setProfile(profileData)
        setUser({ ...profileData, institution: profileData.institution })
      }
    }
  }

  // Profil oluşturma fonksiyonu
  const createProfile = async (userId: string, email: string, role: string = 'super_admin'): Promise<Profile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          role: role,
          username: email.split('@')[0] // Email'in @ öncesini username olarak kullan
        })
        .select()
        .single()

      if (error) {
        return null
      }

      return profile
    } catch (error) {
      return null
    }
  }

  useEffect(() => {
        // İlk yükleme
    const initializeAuth = async () => {
      // Auth initialization timeout
      const authTimeout = setTimeout(() => {
        setLoading(false)
      }, 8000) // 8 saniye timeout
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setLoading(false)
          clearTimeout(authTimeout)
          return
        }
        
        if (session?.user) {
          // Custom session token kontrolü
          const sessionToken = localStorage.getItem('custom_session_token')
          if (sessionToken) {
            const validationResult = await AuthService.validateSession()
            
            if (!validationResult.success || !validationResult.data?.isValid) {
              // Custom session geçersizse localStorage'dan sil ve Supabase session'ını da temizle
              localStorage.removeItem('custom_session_token')
              await supabase.auth.signOut()
              clearAuthTokens()
              setUser(null)
              setProfile(null)
              return
            }
          } else {
            // Custom session token yoksa Supabase session'ını da temizle
            console.log('Initialization: Custom session token yok, Supabase session temizleniyor')
            await supabase.auth.signOut()
            clearAuthTokens()
            setUser(null)
            setProfile(null)
            return
          }

          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            setProfile(profileData)
            setUser({ ...profileData, institution: profileData.institution })
          }
        }
      } catch (error) {
        // Hata durumunda hiçbir şey yapma
      } finally {
        setLoading(false)
        setIsInitialized(true)
        clearTimeout(authTimeout)
      }
    }

    initializeAuth()

    // Auth state değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Sadece initialization tamamlandıktan sonra auth state change'leri işle
      if (!isInitialized) {
        return
      }
      
      // INITIAL_SESSION event'ini ignore et (bu ilk yükleme sırasında gelir)
      if (event === 'INITIAL_SESSION') {
        return
      }
      
      try {
        if (session?.user) {
          // Custom session token kontrolü
          const sessionToken = localStorage.getItem('custom_session_token')
          if (sessionToken) {
            const validationResult = await AuthService.validateSession()
            
            if (!validationResult.success || !validationResult.data?.isValid) {
              // Custom session geçersizse localStorage'dan sil ve Supabase session'ını da temizle
              localStorage.removeItem('custom_session_token')
              await supabase.auth.signOut()
              clearAuthTokens()
              setUser(null)
              setProfile(null)
              return
            }

            // Abonelik süresi kontrolü
            const { subscriptionExpired, userExpired } = validationResult.data
            if (subscriptionExpired || userExpired) {
              console.log('Auth state change: Abonelik süresi doldu, session temizleniyor')
              localStorage.removeItem('custom_session_token')
              await supabase.auth.signOut()
              clearAuthTokens()
              setUser(null)
              setProfile(null)
              return
            }
          } else {
            // Custom session token yoksa Supabase session'ını da temizle
            console.log('Auth state change: Custom session token yok, Supabase session temizleniyor')
            await supabase.auth.signOut()
            clearAuthTokens()
            setUser(null)
            setProfile(null)
            return
          }

          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            setProfile(profileData)
            setUser({ ...profileData, institution: profileData.institution })
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        // Hata durumunda hiçbir şey yapma
      } finally {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 10 saniyede bir session kontrolü (test için)
  useEffect(() => {
    if (isInitialized) {
      // İlk kontrol
      checkSessionValidity()
      
      // 10 saniyede bir kontrol et (10000 ms = 10 saniye)
      const interval = setInterval(checkSessionValidity, 10000)
      setSessionCheckInterval(interval)
      
      return () => {
        if (interval) {
          clearInterval(interval)
        }
      }
    }
  }, [isInitialized])

  const signIn = async (email: string, password: string, roleType?: 'admin' | 'user'): Promise<ApiResponse<AuthUser>> => {
    try {
      // AuthService ile giriş yap (session management ile)
      const loginResult = await AuthService.login(email, password)
      
      if (!loginResult.success || !loginResult.data?.session) {
        return { success: false, error: loginResult.error || 'Giriş yapılamadı' }
      }

      const { sessionToken, user } = loginResult.data as { session: any; sessionToken: string; user: any }

      // Custom session token'ı localStorage'a kaydet
      if (sessionToken) {
        localStorage.setItem('custom_session_token', sessionToken)
      }

      // Profil bilgilerini getir
      const profileData = await fetchProfile(user.id)
      
      if (!profileData) {
        await AuthService.logout()
        return { success: false, error: 'Profil bilgileri bulunamadı' }
      }

      // Rol kontrolü
      if (roleType) {
        const isValidRole = (roleType === 'admin' && (profileData.role === 'admin' || profileData.role === 'super_admin')) ||
                           (roleType === 'user' && profileData.role === 'user')
        
        if (!isValidRole) {
          await AuthService.logout()
          return { success: false, error: 'Bu rol ile giriş yapmaya yetkiniz yok' }
        }
      }

      const authUser: AuthUser = {
        ...profileData,
        institution: profileData.institution
      }

      setProfile(profileData)
      setUser(authUser)

      // Session süresini ayarla (20 saniye - test için)
      const expiryTime = new Date()
      expiryTime.setSeconds(expiryTime.getSeconds() + 20)
      setSessionExpiryTime(expiryTime)

      // Session kontrol interval'ını başlat
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval)
      }
      const interval = setInterval(checkSessionValidity, 10000) // 10 saniyede bir kontrol
      setSessionCheckInterval(interval)

      return { success: true, data: authUser }
    } catch (error) {
      return { success: false, error: 'Beklenmeyen bir hata oluştu' }
    }
  }

  const signOut = async (): Promise<ApiResponse<void>> => {
    try {
      // AuthService ile çıkış yap (session management ile)
      const logoutResult = await AuthService.logout()
      
      if (!logoutResult.success) {
        return { success: false, error: logoutResult.error || 'Çıkış yapılamadı' }
      }

      // Clear all Supabase authentication tokens from localStorage
      // This ensures complete logout and prevents token persistence issues
      clearAuthTokens()

      setUser(null)
      setProfile(null)
      setProfileCache(new Map()) // Cache'i temizle
      setSessionExpiryTime(null) // Session süresini temizle
      
      // Session kontrol interval'ını temizle
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval)
        setSessionCheckInterval(null)
      }
      
      return { success: true }
    } catch (error) {
      return { success: false, error: 'Çıkış yapılırken hata oluştu' }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    refreshProfile,
    createProfile,
    sessionExpiryTime,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

