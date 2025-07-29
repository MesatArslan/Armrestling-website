import React from 'react';
import { MatchesStorage, type Fixture } from '../../utils/matchesStorage';

interface ActiveFixturesNavProps {
  onFixtureSelect: (fixtureId: string) => void;
  activeFixtureId?: string | null;
}

const ActiveFixturesNav: React.FC<ActiveFixturesNavProps> = ({ onFixtureSelect, activeFixtureId }) => {
  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);

  React.useEffect(() => {
    // Load fixtures from matches storage
    const matchesData = MatchesStorage.getMatchesData();
    setFixtures(matchesData.fixtures);
  }, []);

  const handleFixtureClose = (fixtureId: string) => {
    MatchesStorage.deleteFixture(fixtureId);
    setFixtures(prev => prev.filter(f => f.id !== fixtureId));
  };

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No active fixtures</h3>
        <p className="text-gray-600">Start a tournament to create fixtures</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Active Fixtures</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fixtures.map((fixture) => (
          <div
            key={fixture.id}
            className={`bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
              activeFixtureId === fixture.id
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onFixtureSelect(fixture.id)}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{fixture.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFixtureClose(fixture.id);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Tournament:</span>
                  <span className="font-medium">{fixture.tournamentName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight Range:</span>
                  <span className="font-medium">{fixture.weightRangeName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Players:</span>
                  <span className="font-medium">{fixture.playerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-medium ${
                    fixture.status === 'active' ? 'text-green-600' :
                    fixture.status === 'completed' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {fixture.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{new Date(fixture.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium">{new Date(fixture.lastUpdated).toLocaleString()}</span>
                </div>
              </div>
              
              {fixture.results.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {fixture.results.length} match{fixture.results.length !== 1 ? 'es' : ''} completed
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveFixturesNav; 