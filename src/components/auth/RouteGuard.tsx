import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { RouteGuardProps } from '../../types/auth'
import LoadingSpinner from '../UI/LoadingSpinner'

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedRoles, 
  redirectTo = '/login' 
}) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
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
        return <Navigate to="/login" replace />
    }
  }

  return <>{children}</>
}
