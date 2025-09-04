import React from 'react'
import type { Profile, Institution } from '../../types/auth'

interface AdminLayoutProps {
  user: (Profile & { institution?: Institution }) | null
  onSignOut: () => void
  children: React.ReactNode
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onSignOut, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-w-64 max-w-64 bg-gradient-to-b from-gray-900 via-blue-800 to-blue-600 h-screen sticky top-0 shadow-lg">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-1">Kurum Admin</h2>
              <p className="text-blue-100 text-sm truncate">{user?.institution?.name || 'Kurum'}</p>
              <p className="text-blue-200 text-xs truncate">{user?.email}</p>
            </div>

            <nav>
              <ul className="space-y-2">
                <li>
                  <span className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 bg-white/20 text-white shadow-lg backdrop-blur">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Kullanıcı Yönetimi
                  </span>
                </li>
              </ul>
            </nav>
          </div>

          {/* Çıkış Butonu */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={onSignOut}
              className="w-full inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur border border-white/20 hover:border-white/30"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Çıkış Yap
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-gray-50 min-h-screen">
          <div className="p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}


