import React, { useState } from 'react'
import type { Profile, Institution } from '../../types/auth'

interface AdminLayoutProps {
  user: (Profile & { institution?: Institution }) | null
  onSignOut: () => void
  children: React.ReactNode
  activeSection?: 'users' | 'files'
  onSectionChange?: (section: 'users' | 'files') => void
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onSignOut, children, activeSection, onSectionChange }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }
  return (
    <div className="h-full bg-gray-50 flex overflow-hidden">
      {/* Desktop Sidebar - Always Visible */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-gray-900 via-blue-800 to-blue-600 shadow-lg flex-col h-full">
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-1">Kurum Admin</h2>
            <p className="text-blue-100 text-sm truncate">{user?.institution?.name || 'Kurum'}</p>
            <p className="text-blue-200 text-xs truncate">{user?.email}</p>
          </div>

          <nav>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onSectionChange?.('users')}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'users'
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Kullanıcı Yönetimi</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSectionChange?.('files')}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                    activeSection === 'files'
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Dosya Yönetimi</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>

        {/* Çıkış Butonu */}
        <div className="p-6 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur border border-white/20 hover:border-white/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="ml-2">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay - Collapsible */}
      {!isSidebarCollapsed && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed top-16 inset-x-0 bottom-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={toggleSidebar}
          />
          
          {/* Sidebar */}
          <aside className="md:hidden fixed top-16 left-0 bottom-0 w-64 bg-gradient-to-b from-gray-900 via-blue-800 to-blue-600 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Kurum Admin</h2>
                    <p className="text-blue-100 text-sm truncate">{user?.institution?.name || 'Kurum'}</p>
                    <p className="text-blue-200 text-xs truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
                    title="Sidebar'ı Kapat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <nav>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => {
                        onSectionChange?.('users')
                        toggleSidebar()
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                        activeSection === 'users'
                          ? 'bg-white/20 text-white shadow-lg backdrop-blur'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Kullanıcı Yönetimi</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onSectionChange?.('files')
                        toggleSidebar()
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                        activeSection === 'files'
                          ? 'bg-white/20 text-white shadow-lg backdrop-blur'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span>Dosya Yönetimi</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Çıkış Butonu */}
            <div className="p-6 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => {
                  onSignOut()
                  toggleSidebar()
                }}
                className="w-full inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur border border-white/20 hover:border-white/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="ml-2">Çıkış Yap</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 bg-gray-50 h-full overflow-y-auto relative">
        {/* Mobile Toggle Button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="md:hidden fixed top-20 left-4 z-50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105 border border-blue-500/20"
            title="Sidebar'ı Aç"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}


