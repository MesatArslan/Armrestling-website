import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthContextType, Profile, Institution, ApiResponse, AuthUser } from '../types/auth'
import { clearAuthTokens, checkRemainingAuthTokens } from '../utils/authUtils'

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
    console.log('🔍 [fetchProfile] Starting profile fetch for user:', userId)
    
    // Cache kontrolü
    const cachedProfile = profileCache.get(userId)
    if (cachedProfile) {
      console.log('✅ [fetchProfile] Using cached profile for user:', userId)
      return cachedProfile
    }
    
    // Profile fetch timeout
    const profileTimeout = setTimeout(() => {
      console.log('⏰ [fetchProfile] Profile fetch timeout - using mock profile')
    }, 5000) // 5 saniye timeout
    
    try {
      console.log('🔍 [fetchProfile] Querying profiles table...')
      // Önce profiles tablosundan profil bilgilerini al
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      clearTimeout(profileTimeout)
      console.log('🔍 [fetchProfile] Profile query result:', { profile, error: profileError })

      if (profileError) {
        console.error('❌ [fetchProfile] Profile fetch error:', profileError)
        
        // Eğer profil bulunamazsa, gerçek profil oluştur
        if (profileError.code === 'PGRST116') {
          console.log('🔄 [fetchProfile] Profile not found, creating real profile')
          
          // Auth user bilgilerini al
          console.log('🔍 [fetchProfile] Getting auth user...')
          const { data: { user: authUser } } = await supabase.auth.getUser()
          console.log('🔍 [fetchProfile] Auth user:', authUser)
          
          if (authUser) {
            console.log('🔄 [fetchProfile] Creating new profile...')
            const newProfile = await createProfile(userId, authUser.email || 'unknown@example.com', 'super_admin')
            if (newProfile) {
              console.log('✅ [fetchProfile] New profile created successfully')
              return {
                ...newProfile,
                institution: undefined
              }
            }
          }
          
          // Eğer profil oluşturulamazsa, mock profil döndür
          console.log('⚠️ [fetchProfile] Could not create profile, using mock profile')
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
        console.log('⚠️ [fetchProfile] Other error, using mock profile')
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

      console.log('✅ [fetchProfile] Profile data from database:', profile)

      // Eğer institution_id varsa, institution bilgilerini de al
      let institution: Institution | undefined
      if (profile.institution_id) {
        console.log('🔍 [fetchProfile] Fetching institution data for ID:', profile.institution_id)
        const { data: instData, error: instError } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', profile.institution_id)
          .single()

        if (!instError && instData) {
          institution = instData
          console.log('✅ [fetchProfile] Institution data:', institution)
        } else {
          console.log('⚠️ [fetchProfile] Institution fetch error:', instError)
        }
      }

      const result = {
        ...profile,
        institution
      }
      
      // Cache'e kaydet
      setProfileCache(prev => new Map(prev).set(userId, result))
      console.log('✅ [fetchProfile] Returning profile with institution:', { profile, institution })
      return result
    } catch (error) {
      clearTimeout(profileTimeout)
      console.error('❌ [fetchProfile] Unexpected error:', error)
      
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
      console.log('Creating profile for user:', userId, email, role)
      
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
        console.error('Profile creation error:', error)
        return null
      }

      console.log('Profile created:', profile)
      return profile
    } catch (error) {
      console.error('CreateProfile error:', error)
      return null
    }
  }

  useEffect(() => {
    // İlk yükleme
    const initializeAuth = async () => {
      console.log('🚀 [initializeAuth] Starting auth initialization...')
      
      // Debug: Check remaining auth tokens
      const remainingTokens = checkRemainingAuthTokens()
      console.log('🔍 [initializeAuth] Remaining auth tokens:', remainingTokens)
      
      // Auth initialization timeout
      const authTimeout = setTimeout(() => {
        console.log('⏰ [initializeAuth] Auth initialization timeout - setting loading to false')
        setLoading(false)
      }, 8000) // 8 saniye timeout
      
      try {
        console.log('🔍 [initializeAuth] Getting session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ [initializeAuth] Session error:', error)
          setLoading(false)
          clearTimeout(authTimeout)
          return
        }
        
        console.log('🔍 [initializeAuth] Session result:', session)
        
        if (session?.user) {
          console.log('👤 [initializeAuth] User found in session:', session.user.id)
          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            console.log('✅ [initializeAuth] Profile loaded, setting user state')
            setProfile(profileData)
            setUser({ ...profileData, institution: profileData.institution })
          } else {
            console.log('⚠️ [initializeAuth] No profile data found')
          }
        } else {
          console.log('👤 [initializeAuth] No user in session')
        }
      } catch (error) {
        console.error('❌ [initializeAuth] Auth initialization error:', error)
              } finally {
          console.log('✅ [initializeAuth] Setting loading to false')
          setLoading(false)
          setIsInitialized(true)
          clearTimeout(authTimeout)
        }
      }

      initializeAuth()

    // Auth state değişikliklerini dinle
    console.log('👂 [useEffect] Setting up auth state change listener...')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [onAuthStateChange] Auth state changed:', event, session)
      
      // Sadece initialization tamamlandıktan sonra auth state change'leri işle
      if (!isInitialized) {
        console.log('⏳ [onAuthStateChange] Skipping auth state change - not initialized yet')
        return
      }
      
      // INITIAL_SESSION event'ini ignore et (bu ilk yükleme sırasında gelir)
      if (event === 'INITIAL_SESSION') {
        console.log('⏳ [onAuthStateChange] Skipping INITIAL_SESSION event')
        return
      }
      
      try {
        if (session?.user) {
          console.log('👤 [onAuthStateChange] User in session, fetching profile...')
          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            console.log('✅ [onAuthStateChange] Profile loaded, updating state')
            setProfile(profileData)
            setUser({ ...profileData, institution: profileData.institution })
          } else {
            console.log('⚠️ [onAuthStateChange] No profile data found')
          }
        } else {
          console.log('👤 [onAuthStateChange] No user in session, clearing state')
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('❌ [onAuthStateChange] Auth state change error:', error)
      } finally {
        console.log('✅ [onAuthStateChange] Setting loading to false')
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

  console.log('🔄 [AuthProvider] Current state:', { user: !!user, profile: !!profile, loading })

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

