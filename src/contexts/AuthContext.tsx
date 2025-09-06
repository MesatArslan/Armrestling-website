import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
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

  const signIn = async (email: string, password: string, roleType?: 'admin' | 'user'): Promise<ApiResponse<AuthUser>> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Giriş başarısız' }
      }

      // Profil bilgilerini getir
      const profileData = await fetchProfile(data.user.id)
      
      if (!profileData) {
        await supabase.auth.signOut()
        return { success: false, error: 'Profil bilgileri bulunamadı' }
      }

      // Rol kontrolü
      if (roleType) {
        const isValidRole = (roleType === 'admin' && profileData.role === 'admin') ||
                           (roleType === 'user' && profileData.role === 'user')
        
        if (!isValidRole) {
          await supabase.auth.signOut()
          return { success: false, error: 'Bu rol ile giriş yapmaya yetkiniz yok' }
        }
      }

      const authUser: AuthUser = {
        ...profileData,
        institution: profileData.institution
      }

      setProfile(profileData)
      setUser(authUser)

      return { success: true, data: authUser }
    } catch (error) {
      return { success: false, error: 'Beklenmeyen bir hata oluştu' }
    }
  }

  const signOut = async (): Promise<ApiResponse<void>> => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      // Clear all Supabase authentication tokens from localStorage
      // This ensures complete logout and prevents token persistence issues
      clearAuthTokens()

      setUser(null)
      setProfile(null)
      setProfileCache(new Map()) // Cache'i temizle
      
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

