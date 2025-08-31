import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export const AuthDebug: React.FC = () => {
  const { user, loading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setError(error.message)
        } else {
          setSessionInfo(data)
        }
      } catch (err) {
        setError('Session kontrol edilirken hata oluştu')
      }
    }

    checkSession()
  }, [])

  const handleRefreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        setError(error.message)
      } else {
        setSessionInfo(data)
        setError('')
      }
    } catch (err) {
      setError('Session yenilenirken hata oluştu')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      setSessionInfo(null)
      setError('')
    } catch (err) {
      setError('Çıkış yapılırken hata oluştu')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Auth Context State */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Auth Context State</h2>
            <div className="space-y-4">
              <div>
                <strong>Loading:</strong> {loading ? 'true' : 'false'}
              </div>
              <div>
                <strong>User:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
                  {user ? JSON.stringify(user, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Session Info</h2>
            <div className="space-y-4">
              <div>
                <strong>Session:</strong>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
                  {sessionInfo ? JSON.stringify(sessionInfo, null, 2) : 'null'}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={handleRefreshSession}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Session'ı Yenile
          </button>
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Çıkış Yap
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Sayfayı Yenile
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <h3 className="font-semibold mb-2">Debug Talimatları:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Loading true ise, authentication henüz tamamlanmamış</li>
            <li>User null ise, kullanıcı giriş yapmamış</li>
            <li>Session null ise, aktif oturum yok</li>
            <li>Session varsa ama user null ise, profil bilgisi eksik</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
