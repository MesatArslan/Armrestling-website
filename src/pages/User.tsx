import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/UI/LoadingSpinner'
import { UserLayout } from '../components/admin/UserLayout'
import { FileManagement } from '../components/admin/FileManagement'
import Toast from '../components/UI/Toast'

export const User: React.FC = () => {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'files'>('files')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auto-dismiss messages
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 3000)
    return () => clearTimeout(t)
  }, [success])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 5000)
    return () => clearTimeout(t)
  }, [error])

  useEffect(() => {
    // Kullanıcı paneli için gerekli veri yükleme
    setLoading(false)
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const renderContent = () => {
    if (activeSection === 'files') {
      return <FileManagement />
    }

    return null
  }

  return (
    <UserLayout 
      user={user} 
      onSignOut={handleSignOut}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderContent()}

      {/* Toasts (sağ üst) */}
      <div className="pointer-events-none fixed top-4 right-4 z-[60] space-y-3">
        {success && (
          <Toast type="success" message={success} onClose={() => setSuccess('')} duration={3000} />
        )}
        {error && (
          <Toast type="error" message={error} onClose={() => setError('')} duration={5000} />
        )}
      </div>
    </UserLayout>
  )
}
