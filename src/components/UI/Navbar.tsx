import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { UserIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import { AuthModal } from './AuthModal';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  const toggleMenu = () => setIsOpen(prev => !prev);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close login dropdown when clicking outside
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
      }
      
      // Close mobile menu when clicking outside
      if (isOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        // Check if the click is not on the mobile menu button
        const mobileMenuButton = document.querySelector('[aria-label="Toggle navigation menu"]');
        if (mobileMenuButton && !mobileMenuButton.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);


  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setIsOpen(false);
    setLoginDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent tracking-tight" onClick={() => setIsOpen(false)}>
              ArmWrestle Pro
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/players" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.players')}
            </Link>
            <Link to="/tournaments" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.tournaments')}
            </Link>
            <Link to="/matches" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.matches')}
            </Link>
            <Link to="/scoring" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.scoring')}
            </Link>
            <LanguageSwitcher />
            
            {/* Auth buttons */}
            {user ? (
              <div className="flex items-center space-x-3">
                {user.role === 'admin' ? (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-50"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">{user.email}</span>
                  </Link>
                ) : user.role === 'user' ? (
                  <Link
                    to="/user"
                    className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-50"
                  >
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">{user.email}</span>
                  </Link>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <UserIcon className="h-5 w-5" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-50"
                >
                  <span>{t('auth.login')}</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                
                {/* Login Dropdown */}
                {loginDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      Bireysel Girişi
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      Kurum Girişi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
            aria-expanded={isOpen}
            aria-label="Toggle navigation menu"
            onClick={toggleMenu}
          >
            <svg className={`h-6 w-6 ${isOpen ? 'hidden' : 'block'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg className={`h-6 w-6 ${isOpen ? 'block' : 'hidden'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet menu */}
      <div ref={mobileMenuRef} className={`${isOpen ? 'opacity-100 max-h-[70vh]' : 'opacity-0 max-h-0 pointer-events-none'} md:hidden transition-all duration-300 overflow-hidden absolute left-0 right-0 top-16 z-[70] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t border-gray-100 shadow-lg`}> 
        <div className="px-4 py-3 space-y-2 max-h-[70vh] overflow-auto">
          <Link to="/players" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            {t('navigation.players')}
          </Link>
          <Link to="/tournaments" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            {t('navigation.tournaments')}
          </Link>
          <Link to="/matches" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            {t('navigation.matches')}
          </Link>
          <Link to="/scoring" onClick={() => setIsOpen(false)} className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700">
            {t('navigation.scoring')}
          </Link>
          
          {/* Mobile Auth */}
          {user ? (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {user.email}
                </Link>
              )}
              {user.role === 'user' && (
                <Link
                  to="/user"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  Kullanıcı Paneli
                </Link>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <button
                onClick={() => openAuthModal('signup')}
                className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Bireysel Girişi
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="block w-full text-center px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              >
                Kurum Girişi
              </button>
            </div>
          )}
          
          <div className="pt-2 border-t border-gray-100 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </nav>
  );
};

export default Navbar;


