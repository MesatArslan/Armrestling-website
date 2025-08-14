import * as React from 'react';
import type { DoubleEliminationProps } from '../../types';

const DoubleElimination1: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete}) => {
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
  }, [winner.id, onMatchResult, onTournamentComplete, hasAutoCompleted]);

  // Persist rankings for 1-player case immediately
  React.useEffect(() => {
    try {
      // No fixtureId prop in this component; persistence handled by parent Matches flow if needed
    } catch {}
  }, []);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-500">
        Single Player Tournament
      </h2>
      
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-300">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">CHAMPION</h3>
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-800">
                {winner.name} {winner.surname}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Weight: {winner.weight} kg
              </div>
              <div className="text-sm text-gray-600">
                {winner.gender === 'male' ? 'Male' : 'Female'} • {winner.handPreference} hand
              </div>
              {winner.birthday && (
                <div className="text-sm text-gray-600">
                  Born: {new Date(winner.birthday).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Automatic winner by default
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubleElimination1; 