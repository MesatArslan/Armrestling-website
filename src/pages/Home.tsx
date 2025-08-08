
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TrophyIcon, UserIcon, PlayCircleIcon, ArrowRightIcon, SparklesIcon, BoltIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const Hero = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative isolate overflow-hidden bg-gradient-to-b from-gray-50 to-white w-screen">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-500 opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-24 h-72 w-72 rounded-full bg-gradient-to-tr from-fuchsia-400 via-pink-400 to-rose-500 opacity-20 blur-3xl" />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-20 relative">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              {t('home.title')}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            {t('home.description')}
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/tournaments" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl hover:brightness-110 transition-all duration-200">
              <TrophyIcon className="w-5 h-5" />
              <span>{t('home.createTournament')}</span>
            </Link>
            <Link to="/players" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-white text-blue-700 font-semibold border border-blue-200 shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200">
              <UserIcon className="w-5 h-5" />
              <span>{t('home.addPlayer')}</span>
            </Link>
            <Link to="/matches" className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-white text-purple-700 font-semibold border border-purple-200 shadow-lg hover:shadow-xl hover:bg-purple-50 transition-all duration-200">
              <PlayCircleIcon className="w-5 h-5" />
              <span>{t('home.viewMatches')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// Features section removed per user request

const QuickActions = () => {
  const { t } = useTranslation();
  const actions = [
    { to: '/tournaments', label: t('home.createTournament'), Icon: TrophyIcon, color: 'from-blue-500 to-indigo-600' },
    { to: '/players', label: t('home.addPlayer'), Icon: UserIcon, color: 'from-emerald-500 to-green-600' },
    { to: '/matches', label: t('home.viewMatches'), Icon: PlayCircleIcon, color: 'from-purple-500 to-fuchsia-600' },
  ];
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white py-12 w-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            {t('home.quickActions')}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map(({ to, label, Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-gray-200/80 via-gray-100/80 to-gray-200/80 hover:from-blue-200/80 hover:via-indigo-100/80 hover:to-purple-200/80 transition-all duration-300"
            >
              <div className="relative flex items-center gap-4 p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm hover:shadow-md">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900 group-hover:text-gray-950">{label}</div>
                  <div className="text-sm text-gray-500">{t('home.clickToProceed', { defaultValue: 'Click to proceed' })}</div>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const Intro = () => {
  const { t } = useTranslation();
  const highlights = [
    { Icon: SparklesIcon, text: t('home.intro.highlights.reliableBrackets') },
    { Icon: BoltIcon, text: t('home.intro.highlights.localizedPDF') },
    { Icon: CheckBadgeIcon, text: t('home.intro.highlights.flexibleFilters') },
  ];
  return (
    <section className="relative w-screen py-14 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {t('home.intro.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            {t('home.intro.description')}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {highlights.map(({ Icon, text }, idx) => (
            <div key={idx} className="flex items-center gap-3 rounded-xl border border-gray-200/70 bg-white/80 backdrop-blur p-4 shadow-sm">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Icon className="w-5 h-5 text-white" />
              </span>
              <span className="text-sm font-semibold text-gray-800">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Steps = () => {
  const { t } = useTranslation();
  const steps = [
    { Icon: TrophyIcon, title: t('home.steps.s1.title'), desc: t('home.steps.s1.desc') },
    { Icon: UserIcon, title: t('home.steps.s2.title'), desc: t('home.steps.s2.desc') },
    { Icon: PlayCircleIcon, title: t('home.steps.s3.title'), desc: t('home.steps.s3.desc') },
    { Icon: CheckBadgeIcon, title: t('home.steps.s4.title'), desc: t('home.steps.s4.desc') },
  ];
  return (
    <section className="w-screen py-14 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-gray-900">
          {t('home.steps.title')}
        </h3>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map(({ Icon, title, desc }, idx) => (
            <div key={idx} className="rounded-2xl p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="font-bold text-gray-900 mb-1">{title}</div>
              <div className="text-sm text-gray-600">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BottomCTA = () => {
  const { t } = useTranslation();
  return (
    <section className="w-screen py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t('home.bottomCta.title')}</h3>
          <p className="mt-3 text-lg text-white/90">{t('home.bottomCta.description')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/tournaments" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 font-semibold shadow hover:shadow-lg transition">
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

const Home = () => {
  return (
    <div className="w-screen">
      <Hero />
      <QuickActions />
      <Intro />
      <Steps />
      <BottomCTA />
    </div>
  );
};

export default Home; 