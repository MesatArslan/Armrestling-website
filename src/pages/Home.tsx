
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
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
  FireIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const Hero = () => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const starsRef = useRef<Array<{ x: number; y: number; size: number; speed: number }>>([]);
  const shootersRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement as HTMLElement | null;
    if (!parent) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${Math.floor(width)}px`;
      canvas.style.height = `${Math.floor(height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Recreate stars based on size
      const density = 0.08; // stars per px^2 (scaled down)
      const count = Math.min(600, Math.max(120, Math.floor(width * height * density * 0.001)));
      const stars: Array<{ x: number; y: number; size: number; speed: number }> = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.2 + 0.3,
          speed: Math.random() * 0.3 + 0.05,
        });
      }
      starsRef.current = stars;
    };

    resize();
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // clear
      ctx.clearRect(0, 0, width, height);

      // twinkling background slight vignette
      const grd = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.1, width / 2, height / 2, Math.max(width, height));
      grd.addColorStop(0, 'rgba(255,255,255,0.02)');
      grd.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      // stars
      ctx.fillStyle = '#ffffff';
      for (const star of starsRef.current) {
        star.x -= star.speed * (dt * 0.06); // slow parallax drift to the left
        if (star.x < -2) star.x = width + Math.random() * 4;

        const twinkle = 0.6 + Math.sin((now * 0.002) + star.y) * 0.2;
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // spawn shooting stars
      if (Math.random() < 0.01 && shootersRef.current.length < 3) {
        const startY = Math.random() * height * 0.6;
        const speed = Math.random() * 4 + 6; // px per frame at ~60fps
        const angle = (-Math.PI / 4) + (Math.random() * Math.PI * 0.08); // roughly top-right to bottom-left
        shootersRef.current.push({
          x: width + 50,
          y: startY,
          vx: -Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.3,
          life: 800 + Math.random() * 600,
        });
      }

      // draw shooting stars
      for (let i = shootersRef.current.length - 1; i >= 0; i--) {
        const s = shootersRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= dt;

        // trail
        const trailLength = 80;
        const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * (trailLength * 0.02), s.y - s.vy * (trailLength * 0.02));
        ctx.stroke();

        // head
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (s.life <= 0 || s.x < -100 || s.y > height + 100) {
          shootersRef.current.splice(i, 1);
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  
  return (
    <div className="relative isolate overflow-hidden bg-gray-900 w-screen flex items-center" style={{ height: 'calc(100vh - 64px)' }}>

      {/* Starfield Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-80 pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <FireIcon className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-200">{t('home.badge', { defaultValue: 'Professional Tournament Management' })}</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8">
            <span className="text-white drop-shadow-sm">
              {t('home.title')}
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-200 max-w-4xl mx-auto mb-12 leading-relaxed animate-fade-in-up delay-200">
            {t('home.description')}
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-16">
            <Link 
              to="/tournaments" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-500 transition-colors"
            >
              <TrophyIcon className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
              <span>{t('home.createTournament')}</span>
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            
            <Link 
              to="/players" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg ring-1 ring-white/20 hover:bg-white/10 transition-colors"
            >
              <UserIcon className="w-6 h-6" />
              <span>{t('home.addPlayer')}</span>
            </Link>
            
            <Link 
              to="/matches" 
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg ring-1 ring-white/20 hover:bg-white/10 transition-colors"
            >
              <PlayCircleIcon className="w-6 h-6" />
              <span>{t('home.viewMatches')}</span>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-300">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">{t('home.trust.secure', { defaultValue: 'Secure & Reliable' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobeAltIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium">{t('home.trust.multilingual', { defaultValue: 'Multilingual Support' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="w-5 h-5 text-gray-400" />
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
                © ArmWrestle Pro. {t('home.footer.rights', { defaultValue: 'All rights reserved.' })}
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span>{t('home.footer.version', { defaultValue: 'Version 1.0' })}</span>
                <span>•</span>
                <span>{t('home.footer.madeWith', { defaultValue: 'Made with' })}</span>
                <span className="font-bold bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent animate-pulse">
                  M.E.A.
                </span>
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