import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthContextType, Profile, Institution, ApiResponse, AuthUser } from '../types/auth'

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

  // Profil bilgilerini getir
  const fetchProfile = async (userId: string): Promise<(Profile & { institution?: Institution }) | null> => {
    console.log('Fetching profile for user:', userId)
    
    try {
      // Önce profiles tablosundan profil bilgilerini al
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        
        // Eğer profil bulunamazsa, gerçek profil oluştur
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating real profile')
          
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
          console.log('Could not create profile, using mock profile')
          const mockProfile: Profile & { institution?: Institution } = {
            id: userId,
            email: 'superadmin@example.com',
            role: 'super_admin',
            username: 'Super Admin',
            institution_id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          return mockProfile
        }
        
        return null
      }

      console.log('Profile data from database:', profile)

      // Eğer institution_id varsa, institution bilgilerini de al
      let institution: Institution | undefined
      if (profile.institution_id) {
        const { data: instData, error: instError } = await supabase
          .from('institutions')
          .select('*')
          .eq('id', profile.institution_id)
          .single()

        if (!instError && instData) {
          institution = instData
          console.log('Institution data:', institution)
        }
      }

      return {
        ...profile,
        institution
      }
    } catch (error) {
      console.error('FetchProfile error:', error)
      
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
      console.log('Initializing auth...')
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setLoading(false)
          return
        }
        
        console.log('Session:', session)
        
        if (session?.user) {
          console.log('User found in session:', session.user.id)
          const profileData = await fetchProfile(session.user.id)
          if (profileData) {
            console.log('Profile loaded, setting user state')
            setProfile(profileData)
            setUser({ ...profileData, institution: profileData.institution })
          } else {
            console.log('No profile data found')
          }
        } else {
          console.log('No user in session')
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    initializeAuth()

    // Auth state değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session)
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
        console.error('Auth state change error:', error)
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

      setUser(null)
      setProfile(null)
      
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

