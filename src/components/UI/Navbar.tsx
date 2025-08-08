import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Navbar = () => {
  const { t } = useTranslation();
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent tracking-tight">
              WrestleMania Pro
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/players" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.players')}
            </Link>
            <Link to="/tournaments" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.tournaments')}
            </Link>
            <Link to="/matches" className="text-gray-600 hover:text-blue-600 transition-colors duration-200">
              {t('navigation.matches')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


