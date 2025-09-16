import React from 'react'

export type AppRole = 'admin' | 'user'

interface RoleThemeProviderProps {
  role: AppRole
  children: React.ReactNode
}

export function RoleThemeProvider({ role, children }: RoleThemeProviderProps) {
  return <div data-role={role}>{children}</div>
}

export default RoleThemeProvider


