import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AuthService } from '../../services/authService'
import type { RouteGuardProps } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/' 
}) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)
  const [subscriptionValid, setSubscriptionValid] = useState(true)

  // Abonelik durumunu kontrol et (Super Admin hariç)
  useEffect(() => {
    const checkSubscription = async () => {
      if (user && !subscriptionChecked) {
        // Super Admin için abonelik kontrolü yapma
        if (user.role === 'super_admin') {
          setSubscriptionValid(true)
          setSubscriptionChecked(true)
          return
        }

        try {
          const result = await AuthService.checkUserSubscriptionStatus(user.id)
          if (result.success) {
            setSubscriptionValid(result.data.isActive)
          } else {
            setSubscriptionValid(false)
          }
        } catch (error) {
          console.warn('Abonelik kontrolü hatası:', error)
          setSubscriptionValid(false)
        } finally {
          setSubscriptionChecked(true)
        }
      }
    }

    checkSubscription()
  }, [user, subscriptionChecked])

  if (loading || (user && !subscriptionChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Kullanıcı yoksa korumalı sayfalar için login'e; public sayfalar için engelleme yok
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Abonelik süresi dolmuşsa çıkış yap
  if (!subscriptionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Abonelik Süresi Doldu</h3>
            <p className="mt-2 text-sm text-gray-500">
              Hesabınızın abonelik süresi dolmuş. Lütfen sistem yöneticisi ile iletişime geçin.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    // Rol bazlı yönlendirme
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/superadmin" replace />
      case 'admin':
        return <Navigate to="/admin" replace />
      case 'user':
        return <Navigate to="/" replace />
      default:
        return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
