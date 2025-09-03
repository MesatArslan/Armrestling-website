import React from 'react'
import type { Profile } from '../../types/auth'

interface SuperAdminLayoutProps {
  user: Profile | null
  activeSection: 'institutions' | 'nonInstitutionUsers'
  onSectionChange: (section: 'institutions' | 'nonInstitutionUsers') => void
  onSignOut: () => void
  children: React.ReactNode
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  user,
  activeSection,
  onSectionChange,
  onSignOut,
  children
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-w-64 max-w-64 bg-gradient-to-b from-gray-900 via-blue-800 to-blue-600 h-screen sticky top-0 shadow-lg">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-2">Super Admin</h2>
              <p className="text-blue-100 text-sm">Hoş geldiniz, {user?.email}</p>
            </div>
            
            <nav>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => onSectionChange('institutions')}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${activeSection === 'institutions' ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Kurum Yönetimi
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onSectionChange('nonInstitutionUsers')}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${activeSection === 'nonInstitutionUsers' ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Kullanıcı Yönetimi
                  </button>
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
