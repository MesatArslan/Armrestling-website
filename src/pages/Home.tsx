
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  TrophyIcon, 
  UserIcon, 
  PlayCircleIcon, 
  ArrowRightIcon, 
  CheckBadgeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  CloudIcon,
  HeartIcon,
  FireIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const Hero = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 w-screen flex items-center" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Animated background elements */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-500 opacity-20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-16 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-fuchsia-400 via-pink-400 to-rose-500 opacity-20 blur-3xl animate-pulse delay-1000" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500 opacity-10 blur-2xl animate-pulse delay-500" />
      
      {/* Floating icons */}
      <div className="pointer-events-none absolute top-20 left-10 animate-bounce delay-300">
        <TrophyIcon className="w-8 h-8 text-blue-400 opacity-60" />
      </div>
      <div className="pointer-events-none absolute top-32 right-20 animate-bounce delay-700">
        <UserIcon className="w-8 h-8 text-purple-400 opacity-60" />
      </div>
      <div className="pointer-events-none absolute bottom-40 left-20 animate-bounce delay-1000">
        <PlayCircleIcon className="w-8 h-8 text-emerald-400 opacity-60" />
      </div>
      <div className="pointer-events-none absolute bottom-20 right-10 animate-bounce delay-500">
        <ChartBarIcon className="w-8 h-8 text-pink-400 opacity-60" />
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 mb-8 animate-fade-in">
            <FireIcon className="w-4 h-4 text-blue-300" />
            <span className="text-sm font-semibold text-blue-200">{t('home.badge', { defaultValue: 'Professional Tournament Management' })}</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 animate-fade-in-up">
            <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-100 bg-clip-text text-transparent drop-shadow-sm">
              {t('home.title')}
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-200 max-w-4xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
            {t('home.description')}
          </p>
          
          {/* Enhanced CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-16 animate-fade-in-up delay-300">
            <Link 
              to="/tournaments" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300"
            >
              <TrophyIcon className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              <span>{t('home.createTournament')}</span>
              <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            
            <Link 
              to="/players" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-lg border-2 border-blue-200 shadow-xl hover:shadow-blue-500/25 hover:scale-105 hover:bg-blue-50 transition-all duration-300"
            >
              <UserIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              <span>{t('home.addPlayer')}</span>
            </Link>
            
            <Link 
              to="/matches" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-purple-700 font-bold text-lg border-2 border-purple-200 shadow-xl hover:shadow-purple-500/25 hover:scale-105 hover:bg-purple-50 transition-all duration-300"
            >
              <PlayCircleIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              <span>{t('home.viewMatches')}</span>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-300 animate-fade-in-up delay-500">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">{t('home.trust.secure', { defaultValue: 'Secure & Reliable' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">{t('home.trust.multilingual', { defaultValue: 'Multilingual Support' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">{t('home.trust.responsive', { defaultValue: 'Mobile Optimized' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Features = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: TrophyIcon,
      title: t('home.features.tournamentManagement.title'),
      description: t('home.features.tournamentManagement.description'),
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-blue-500/30'
    },
    {
      icon: UserIcon,
      title: t('home.features.playerProfiles.title'),
      description: t('home.features.playerProfiles.description'),
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-emerald-500/30'
    },
    {
      icon: ChartBarIcon,
      title: t('home.features.statsAnalytics.title'),
      description: t('home.features.statsAnalytics.description'),
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-orange-500/30'
    },
    {
      icon: DocumentTextIcon,
      title: t('home.features.pdfExport.title', { defaultValue: 'PDF Export & Reports' }),
      description: t('home.features.pdfExport.description', { defaultValue: 'Generate professional PDFs with localized content and custom layouts.' }),
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-cyan-500/30'
    },
    {
      icon: CloudIcon,
      title: t('home.features.cloudSync.title', { defaultValue: 'Cloud Synchronization' }),
      description: t('home.features.cloudSync.description', { defaultValue: 'Access your tournaments from anywhere with real-time cloud synchronization.' }),
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-indigo-500/30'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: t('home.features.mobileApp.title', { defaultValue: 'Mobile Optimized' }),
      description: t('home.features.mobileApp.description', { defaultValue: 'Fully responsive design that works perfectly on all devices - phones, tablets, and desktops.' }),
      color: 'from-pink-500 to-rose-600',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-pink-500/30'
    }
  ];

  return (
    <section className="w-screen py-20 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 mb-6">
              <LightBulbIcon className="w-4 h-4 text-blue-300" />
              <span className="text-sm font-semibold text-blue-200">{t('home.features.badge', { defaultValue: 'Platform Features' })}</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {t('home.featuresTitle')}
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('home.featuresSubtitle')}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`group relative rounded-3xl p-8 ${feature.bgColor} border ${feature.borderColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-gray-100 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                {/* Hover effect overlay */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};




const Steps = () => {
  const { t } = useTranslation();
  const steps = [
    { 
      Icon: TrophyIcon, 
      title: t('home.steps.s1.title'), 
      desc: t('home.steps.s1.desc'),
      details: t('home.steps.s1.details', { defaultValue: 'Create tournaments with custom weight ranges, age groups, and gender filters. Set up multiple divisions for different categories.' }),
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-gray-700/50',
      borderColor: 'border-blue-500/30'
    },
    { 
      Icon: UserIcon, 
      title: t('home.steps.s2.title'), 
      desc: t('home.steps.s2.desc'),
      details: t('home.steps.s2.details', { defaultValue: 'Add players manually or import from Excel. Manage player profiles with detailed information including weight, age, hand preference, and contact details.' }),
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-gray-700/50',
      borderColor: 'border-emerald-500/30'
    },
    { 
      Icon: PlayCircleIcon, 
      title: t('home.steps.s3.title'), 
      desc: t('home.steps.s3.desc'),
      details: t('home.steps.s3.details', { defaultValue: 'Start tournaments and run matches. Confirm winners, track progress through brackets, and view real-time rankings and statistics.' }),
      color: 'from-purple-500 to-fuchsia-600',
      bgColor: 'bg-gray-700/50',
      borderColor: 'border-purple-500/30'
    },
    { 
      Icon: CheckBadgeIcon, 
      title: t('home.steps.s4.title'), 
      desc: t('home.steps.s4.desc'),
      details: t('home.steps.s4.details', { defaultValue: 'Generate professional PDF reports with tournament results, player rankings, and match history. Export data in multiple formats for easy sharing.' }),
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-gray-700/50',
      borderColor: 'border-orange-500/30'
    },
  ];
  
  return (
    <section className="w-screen py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 mb-6">
              <CheckBadgeIcon className="w-4 h-4 text-green-300" />
              <span className="text-sm font-semibold text-green-200">{t('home.steps.badge', { defaultValue: 'Simple Process' })}</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {t('home.steps.title')}
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              {t('home.steps.subtitle', { defaultValue: 'Get started with our platform in just 4 simple steps. From tournament creation to final results, everything is streamlined for your success.' })}
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {steps.map(({ Icon, title, desc, details, color, bgColor, borderColor }, idx) => (
              <div 
                key={idx}
                className={`group relative rounded-3xl p-8 ${bgColor} border ${borderColor} hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
              >
                {/* Step Number */}
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {idx + 1}
                </div>
                
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-gray-100 transition-colors">
                      {title}
                    </h3>
                    <p className="text-lg text-gray-200 mb-4 font-medium">
                      {desc}
                    </p>
                    <p className="text-gray-300 leading-relaxed">
                      {details}
                    </p>
                  </div>
                </div>
                
                {/* Connection Line */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-gray-500 to-transparent"></div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <TrophyIcon className="w-6 h-6" />
              <span>{t('home.steps.cta', { defaultValue: 'Start Your First Tournament' })}</span>
              <ArrowRightIcon className="w-5 h-5" />
            </div>
            <p className="mt-4 text-gray-300">
              {t('home.steps.ctaSubtitle', { defaultValue: 'Join thousands of organizers who trust our platform' })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const BottomCTA = () => {
  const { t } = useTranslation();
  return (
    <section className="w-screen py-16 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t('home.bottomCta.title')}</h3>
          <p className="mt-3 text-lg text-white/90">{t('home.bottomCta.description')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/tournaments" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:shadow-lg hover:bg-blue-700 transition">
              <TrophyIcon className="w-5 h-5" />
              <span>{t('home.bottomCta.primary')}</span>
            </Link>
            <Link to="/players" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 ring-1 ring-white/40 text-white font-semibold backdrop-blur hover:bg-white/20 transition">
              <UserIcon className="w-5 h-5" />
              <span>{t('home.bottomCta.secondary')}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="w-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <TrophyIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  ArmWrestle Pro
                </h3>
              </div>
              <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
                {t('home.footer.description', { defaultValue: 'Professional arm wrestling tournament management platform. Organize tournaments, manage players, and track matches with ease.' })}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                  <span>{t('home.footer.secure', { defaultValue: 'Secure Platform' })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <GlobeAltIcon className="w-4 h-4 text-blue-400" />
                  <span>{t('home.footer.multilingual', { defaultValue: 'Multilingual' })}</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('home.footer.quickLinks', { defaultValue: 'Quick Links' })}</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/tournaments" className="text-gray-300 hover:text-blue-400 transition-colors">
                    {t('navigation.tournaments')}
                  </Link>
                </li>
                <li>
                  <Link to="/players" className="text-gray-300 hover:text-blue-400 transition-colors">
                    {t('navigation.players')}
                  </Link>
                </li>
                <li>
                  <Link to="/matches" className="text-gray-300 hover:text-blue-400 transition-colors">
                    {t('navigation.matches')}
                  </Link>
                </li>
                <li>
                  <Link to="/scoring" className="text-gray-300 hover:text-blue-400 transition-colors">
                    {t('navigation.scoring')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('home.footer.features', { defaultValue: 'Features' })}</h4>
              <ul className="space-y-3 text-sm text-gray-300">
                <li>{t('home.footer.tournamentManagement', { defaultValue: 'Tournament Management' })}</li>
                <li>{t('home.footer.playerProfiles', { defaultValue: 'Player Profiles' })}</li>
                <li>{t('home.footer.matchTracking', { defaultValue: 'Match Tracking' })}</li>
                <li>{t('home.footer.pdfExport', { defaultValue: 'PDF Export' })}</li>
                <li>{t('home.footer.cloudSync', { defaultValue: 'Cloud Sync' })}</li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400 text-sm">
                © 2024 ArmWrestle Pro. {t('home.footer.rights', { defaultValue: 'All rights reserved.' })}
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>{t('home.footer.version', { defaultValue: 'Version 1.0' })}</span>
                <span>•</span>
                <span>{t('home.footer.madeWith', { defaultValue: 'Made with' })}</span>
                <HeartIcon className="w-4 h-4 text-red-400" />
                <span>{t('home.footer.forCommunity', { defaultValue: 'for the community' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Home = () => {
  return (
    <div className="w-screen">
      <Hero />
      <Features />
      <Steps />
      <BottomCTA />
      <Footer />
    </div>
  );
};

export default Home; 