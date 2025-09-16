import React, { useState } from 'react'
import type { Profile } from '../../types/auth'
import { DashboardLayout } from '../UI/DashboardLayout'

interface SuperAdminLayoutProps {
  user: Profile | null
  activeSection: 'institutions' | 'nonInstitutionUsers' | 'storageManagement'
  onSectionChange: (section: 'institutions' | 'nonInstitutionUsers' | 'storageManagement') => void
  onSignOut: () => void
  hideStats?: boolean
  children: React.ReactNode
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  user,
  activeSection,
  onSectionChange,
  onSignOut,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed)

  const sidebarHeader = (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-2">Super Admin</h2>
      <p className="text-blue-100 text-sm">Hoş geldiniz, {user?.email}</p>
    </div>
  )

  const sidebarNav = (
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
        <li>
          <button
            type="button"
            onClick={() => onSectionChange('storageManagement')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${activeSection === 'storageManagement' ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Storage Yönetimi
          </button>
        </li>
      </ul>
    </nav>
  )

  const sidebarFooter = (
    <button
      onClick={onSignOut}
      className="w-full inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur border border-white/20 hover:border-white/30"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Çıkış Yap
    </button>
  )

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Desktop Sidebar via shared layout */}
      <div className="hidden md:flex flex-1 min-w-0">
        <DashboardLayout
          sidebarHeader={sidebarHeader}
          sidebarNav={sidebarNav}
          sidebarFooter={sidebarFooter}
          className="w-full"
        >
          {children}
        </DashboardLayout>
      </div>

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
                    <h2 className="text-xl font-bold text-white mb-2">Super Admin</h2>
                    <p className="text-blue-100 text-sm">Hoş geldiniz, {user?.email}</p>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md hover:bg-white/30 transition-all duration-200 text-white transform -translate-y-4"
                    title="Kapat"
                    aria-label="Kapat"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <nav>
                <ul className="space-y-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => { onSectionChange('institutions'); toggleSidebar() }}
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
                      onClick={() => { onSectionChange('nonInstitutionUsers'); toggleSidebar() }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${activeSection === 'nonInstitutionUsers' ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Kullanıcı Yönetimi
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => { onSectionChange('storageManagement'); toggleSidebar() }}
                      className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-3 transition-all duration-200 ${activeSection === 'storageManagement' ? 'bg-white/20 text-white shadow-lg backdrop-blur' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                      Storage Yönetimi
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            {/* Çıkış Butonu */}
            <div className="p-6 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => { onSignOut(); toggleSidebar() }}
                className="w-full inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur border border-white/20 hover:border-white/30"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Çıkış Yap
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Content (mobile only area when sidebar overlay is visible) */}
      <div className="flex-1 min-w-0 bg-gray-50 h-full overflow-y-auto relative md:hidden">
        {/* Mobile Toggle Button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="md:hidden fixed top-20 left-4 z-50 bg-white/90 text-gray-800 px-2.5 py-2 rounded-lg shadow-lg transition-all duration-200 border border-gray-200 hover:shadow-xl hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/50"
            title="Sidebar'ı Aç"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
