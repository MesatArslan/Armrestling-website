import * as React from 'react';
import type { DoubleEliminationProps } from '../../types';
import MatchCounter from '../UI/MatchCounter';
import { MatchesStorage } from '../../utils/matchesStorage';

const DoubleElimination1: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
  if (players.length !== 1) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for exactly 1 player only.
      </div>
    );
  }

  const winner = players[0];

  const [hasAutoCompleted, setHasAutoCompleted] = React.useState(false);

  React.useEffect(() => {
    if (!hasAutoCompleted) {
      // Automatically declare the single player as winner
      onMatchResult('auto-win', winner.id);
      
      // Complete tournament with rankings
      if (onTournamentComplete) {
        onTournamentComplete({
          first: winner.id
        });
      }
      
      setHasAutoCompleted(true);
    }
  }, []); // Empty dependency array - runs only once on mount

  // Persist rankings for 1-player case immediately
  React.useEffect(() => {
    try {
      // Persistence handled by parent Matches flow
    } catch {}
  }, []);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
      
      {/* Match Counter */}
      <div className="max-w-4xl mx-auto mb-6">
        <MatchCounter 
          playerCount={players.length}
          completedMatches={0}
          hasGrandFinal={false}
        />
      </div>
      
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-yellow-50 rounded-2xl shadow-2xl border-4 border-yellow-400">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative p-8">
            <div className="text-center">
              {/* Sports medal icon */}
              <div className="text-8xl mb-6">🏅</div>
              
              {/* Champion title */}
              <div className="mb-6">
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-800 mb-2">
                  ŞAMPİYON
                </h3>
                <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto rounded-full"></div>
              </div>
              
              {/* Winner card */}
              <div className="bg-gradient-to-br from-white to-yellow-50 rounded-xl p-6 shadow-lg border-2 border-yellow-200">
                <div className="text-2xl font-bold text-gray-800 mb-2">
                  {winner.name} {winner.surname}
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold">Ağırlık:</span>
                    <span className="bg-yellow-100 px-2 py-1 rounded-full">{winner.weight} kg</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold">Cinsiyet:</span>
                    <span className="bg-blue-100 px-2 py-1 rounded-full">
                      {winner.gender === 'male' ? 'Erkek' : 'Kadın'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold">El Tercihi:</span>
                    <span className="bg-green-100 px-2 py-1 rounded-full">
                      {winner.handPreference === 'left' ? 'Sol' : winner.handPreference === 'right' ? 'Sağ' : 'Her İki El'}
                    </span>
                  </div>
                  
                  {winner.birthday && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-semibold">Doğum:</span>
                      <span className="bg-purple-100 px-2 py-1 rounded-full">
                        {new Date(winner.birthday).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubleElimination1; 