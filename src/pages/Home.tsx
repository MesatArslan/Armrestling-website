
import { useTranslation } from 'react-i18next';

const Hero = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 w-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('home.description')}
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              {t('home.createTournament')}
            </button>
            <button className="px-8 py-3 bg-white text-blue-600 rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              {t('home.viewMatches')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      title: "Tournament Management",
      description: "Organize and participate in professional arm wrestling tournaments with our advanced management system.",
      icon: "🏆"
    },
    {
      title: "Player Profiles",
      description: "Create detailed profiles, track your progress, and showcase your achievements in the arm wrestling community.",
      icon: "👤"
    },
    {
      title: "Live Matches",
      description: "Watch live matches, follow your favorite players, and stay updated with real-time results.",
      icon: "🎥"
    },
    {
      title: "Statistics & Analytics",
      description: "Access comprehensive statistics and analytics to improve your performance and track your growth.",
      icon: "📊"
    }
  ];

  return (
    <div className="bg-white py-20 w-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose WrestleMania Pro?
          </h2>
          <p className="text-xl text-gray-600">
            The ultimate platform for arm wrestling enthusiasts
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Home = () => {
  return (
    <div className="w-screen">
      <Hero />
      <Features />
    </div>
  );
};

export default Home; 