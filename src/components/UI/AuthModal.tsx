import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { XMarkIcon, EyeIcon, EyeSlashIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'login' | 'signup'
  onModeChange: (mode: 'login' | 'signup') => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
}) => {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Prevent body scroll when modal is open and reset form state
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Modal açıldığında state'leri sıfırla
      setLoading(false)
      setError('')
      setEmail('')
      setPassword('')
      setShowPassword(false)
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const validateForm = () => {
    setError('')
    
    if (!email.trim()) {
      setError(t('auth.emailRequired'))
      return false
    }
    
    if (!email.includes('@')) {
      setError(t('auth.invalidEmail'))
      return false
    }
    
    if (!password.trim()) {
      setError(t('auth.passwordRequired'))
      return false
    }
    
    if (password.length < 6) {
      setError(t('auth.passwordMinLength'))
      return false
    }
    
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')
    
    try {
      const roleType = mode === 'login' ? 'admin' : 'user'
      const { error, data } = await signIn(email, password, roleType)
      if (error) {
        setError(error || t('auth.signInError'))
        setLoading(false)
      } else {
        // Başarılı giriş - modal'ı hemen kapat
        onClose()
        
        // Rol bazlı yönlendirme
        if (data?.role === 'super_admin') {
          navigate('/superadmin')
        } else if (data?.role === 'admin') {
          navigate('/admin')
        } else if (data?.role === 'user') {
          navigate('/')
        }
      }
    } catch (err) {
      setError(t('auth.signInError'))
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center min-h-screen px-4 py-6 bg-black bg-opacity-75"
      onClick={handleBackdropClick}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div 
        className="relative w-full max-w-md mx-auto bg-white rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="absolute right-4 top-4 z-10">
          <button
            type="button"
            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 p-1"
            onClick={handleClose}
          >
            <span className="sr-only">{t('auth.close')}</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        
        {/* Modal content */}
        <div className="px-6 py-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
            {mode === 'login' ? t('auth.modalTitle.institution') : t('auth.modalTitle.individual')}
          </h3>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
                placeholder={t('auth.enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-200 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white"
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>


            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    {t('auth.loading')}
                  </>
                ) : (
                  mode === 'login' ? t('auth.modalButton.institution') : t('auth.modalButton.individual')
                )}
              </button>

              <div className="text-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {mode === 'login' ? t('auth.modalSwitch.institutionQuestion') : t('auth.modalSwitch.individualQuestion')}{' '}
                  <button
                    type="button"
                    onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {mode === 'login' ? t('auth.modalSwitch.individualLink') : t('auth.modalSwitch.institutionLink')}
                  </button>
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}