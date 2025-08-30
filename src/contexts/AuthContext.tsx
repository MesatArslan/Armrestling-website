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

  // Profil bilgilerini getir - Geçici olarak hardcoded
  const fetchProfile = async (userId: string): Promise<(Profile & { institution?: Institution }) | null> => {
    console.log('Fetching profile for user:', userId)
    
    // Geçici olarak hardcoded profil döndür
    const mockProfile: Profile & { institution?: Institution } = {
      id: userId,
      email: 'superadmin@example.com',
      role: 'super_admin',
      username: 'Super Admin',
      institution_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Mock profile data:', mockProfile)
    return mockProfile
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

  useEffect(() => {
    // İlk yükleme
    const initializeAuth = async () => {
      console.log('Initializing auth...')
      const { data: { session } } = await supabase.auth.getSession()
      
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
      
      console.log('Setting loading to false')
      setLoading(false)
    }

    initializeAuth()

    // Auth state değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session)
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
      setLoading(false)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

