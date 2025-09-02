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

  console.log('RouteGuard: loading=', loading, 'user=', user, 'allowedRoles=', allowedRoles)

  if (loading) {
    console.log('RouteGuard: Showing loading spinner')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    console.log('RouteGuard: No user, redirecting to:', redirectTo)
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    console.log('RouteGuard: User role not allowed, redirecting based on role:', user.role)
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

  console.log('RouteGuard: User authorized, rendering children')
  return <>{children}</>
}
