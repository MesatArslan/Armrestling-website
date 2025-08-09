import React from 'react';
import { MatchesStorage, type Fixture } from '../../utils/matchesStorage';

interface ActiveFixturesNavProps {
  onFixtureSelect: (fixtureId: string) => void;
  onFixtureClose: (fixtureId: string, fixtureName: string) => void;
  activeFixtureId?: string | null;
}

const ActiveFixturesNav: React.FC<ActiveFixturesNavProps> = ({ onFixtureSelect, onFixtureClose, activeFixtureId }) => {
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);

  React.useEffect(() => {
    // Load fixtures from matches storage
    const matchesData = MatchesStorage.getMatchesData();
    setFixtures(matchesData.fixtures);
  }, []);

  const handleFixtureClose = (fixtureId: string) => {
    const fixture = fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      onFixtureClose(fixtureId, fixture.name);
      setFixtures(prev => prev.filter(f => f.id !== fixtureId));
    }
  };

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-white/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-2xl"></div>
            <svg className="w-10 h-10 text-blue-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">No active fixtures</h3>
        <p className="text-gray-600 text-sm">Start a tournament to create fixtures</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">{fixtures.length}</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent leading-tight">
            Active Fixtures
          </h2>
          <p className="text-sm text-gray-500 font-medium">{fixtures.length} active tournament{fixtures.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Modern Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {fixtures.map((fixture) => {
          const isActive = activeFixtureId === fixture.id;
          const statusConfig = {
            completed: { bg: 'from-green-400 to-emerald-500', text: 'text-green-800', dot: 'bg-green-500', border: 'border-green-200' },
            active: { bg: 'from-amber-400 to-orange-500', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
            pending: { bg: 'from-blue-400 to-indigo-500', text: 'text-blue-800', dot: 'bg-blue-500', border: 'border-blue-200' }
          };
          const status = statusConfig[fixture.status as keyof typeof statusConfig] || statusConfig.pending;
          
          return (
            <div
              key={fixture.id}
              onClick={() => onFixtureSelect(fixture.id)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-500 ${
                isActive
                  ? 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-400 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-200/60 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 hover:scale-[1.01]'
              }`}
            >
              {/* Background gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${status.bg} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              {/* Card content */}
              <div className="relative p-5">
                {/* Top Row: Name + Status + Close */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-700 transition-colors duration-300 line-clamp-2">
                      {fixture.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${status.bg} text-white shadow-md`}>
                      <span className={`w-2 h-2 rounded-full bg-white/80`}></span>
                      {fixture.status === 'completed' ? 'Completed' : 
                       fixture.status === 'active' ? 'In Progress' : 'Ready'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFixtureClose(fixture.id);
                      }}
                      className="p-2 rounded-xl border border-gray-200/60 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all duration-300 shadow-sm hover:shadow-md"
                      title="Delete fixture"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Chips Row - Only Player Count */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 shadow-sm border border-blue-200/50">
                    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                    {fixture.playerCount} players
                  </span>
                </div>

                {/* Footer meta - Only Update Date */}
                <div className="flex items-center justify-end text-xs text-gray-500 border-t border-gray-100/60 pt-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                    <span className="font-medium">Updated {new Date(fixture.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveFixturesNav; 