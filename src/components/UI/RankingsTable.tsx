import React from 'react';

interface Player {
  id: string;
  name: string;
  surname: string;
  weight: number;
}

interface Rankings {
  first?: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
  sixth?: string;
  seventh?: string;
  eighth?: string;
}

interface RankingsTableProps {
  rankings: Rankings;
  players: Player[];
  getPlayerName: (playerId: string) => string;
  playersLength?: number;
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings, getPlayerName, playersLength }) => {
  const placeLabels = [
    { key: 'first', label: '1st Place', icon: '🥇', color: 'yellow', text: 'text-yellow-800', bg: 'bg-yellow-100', border: 'border-yellow-400' },
    { key: 'second', label: '2nd Place', icon: '🥈', color: 'gray', text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-400' },
    { key: 'third', label: '3rd Place', icon: '🥉', color: 'orange', text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-400' },
    { key: 'fourth', label: '4th Place', icon: '🏅', color: 'blue', text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-400' },
    { key: 'fifth', label: '5th Place', icon: '🎖️', color: 'purple', text: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-400' },
    { key: 'sixth', label: '6th Place', icon: '6️⃣', color: 'pink', text: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-400' },
    { key: 'seventh', label: '7th Place', icon: '7️⃣', color: 'green', text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-400' },
    { key: 'eighth', label: '8th Place', icon: '8️⃣', color: 'red', text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-400' },
  ];
  // Filter place labels based on number of players
  const filteredPlaceLabels = playersLength ? placeLabels.slice(0, playersLength) : placeLabels;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-yellow-300 mb-6">
      <h3 className="text-xl font-bold text-center mb-4 text-gray-800">🏆 Tournament Results</h3>
      <div className="space-y-4">
        {filteredPlaceLabels.map((place) => (
          <div key={place.key} className={`flex items-center ${place.bg} border-2 ${place.border} rounded-lg p-4`}>
            <div className="text-3xl mr-4">{place.icon}</div>
            <div>
              <div className={`font-bold text-lg ${place.text}`}>{place.label}</div>
              <div className="text-gray-700">
                {rankings[place.key as keyof Rankings] ? getPlayerName(rankings[place.key as keyof Rankings]!) : '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingsTable; 