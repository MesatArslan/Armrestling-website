import React from 'react'

interface DashboardLayoutProps {
  sidebarHeader?: React.ReactNode
  sidebarNav?: React.ReactNode
  sidebarFooter?: React.ReactNode
  children: React.ReactNode
  contentPaddingClassName?: string
  className?: string
  sidebarClassName?: string
}

/**
 * Shared 2-column app layout with a fixed-width sidebar on the left and scrollable content on the right.
 * Sidebar parts (header, nav, footer) are provided via props so different roles can supply different content.
 */
export function DashboardLayout({
  sidebarHeader,
  sidebarNav,
  sidebarFooter,
  children,
  contentPaddingClassName = 'p-8',
  className = '',
  sidebarClassName = '',
}: DashboardLayoutProps) {
  return (
    <div className={`h-full bg-gray-50 flex overflow-hidden ${className}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 bg-gradient-to-b from-gray-900 via-blue-800 to-blue-600 shadow-lg flex-col h-full ${sidebarClassName}`}>
        <div className="p-6 flex-1 overflow-y-auto">
          {sidebarHeader}
          {sidebarNav}
        </div>
        {sidebarFooter ? (
          <div className="p-6 border-t border-white/10 flex-shrink-0">
            {sidebarFooter}
          </div>
        ) : null}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 bg-gray-50 h-full overflow-y-auto">
        <div className={contentPaddingClassName}>{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout


