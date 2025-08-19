import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, TrophyIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

interface Opponent {
  playerId: string;
  matchDescription: string;
  result: 'win' | 'loss';
}

interface OpponentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerSurname: string;
  opponents: Opponent[];
  allPlayers: Array<{ id: string; name: string; surname: string }>;
}

const OpponentsModal: React.FC<OpponentsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  playerSurname,
  opponents,
  allPlayers
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const getOpponentName = (playerId: string) => {
    const player = allPlayers.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };

  const getMatchResultColor = (result: 'win' | 'loss') => {
    // Win maçları yeşil, loss maçları kırmızı
    if (result === 'win') {
      return 'bg-green-50 border-green-200 text-green-800';
    } else {
      return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getMatchResultIcon = (result: 'win' | 'loss') => {
    if (result === 'win') {
      return '✅';
    } else {
      return '❌';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Match History</h2>
                <p className="text-blue-100 text-sm">
                  {playerName} {playerSurname}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {opponents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrophyIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Matches Yet</h3>
              <p className="text-gray-500 text-sm">
                This player hasn't played any matches in this tournament yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Total Matches: {opponents.length}
                </h3>
                <div className="text-sm text-gray-500">
                  <CalendarIcon className="w-4 h-4 inline mr-1" />
                  Tournament Progress
                </div>
              </div>

              {opponents.map((opponent, index) => (
                                  <div
                    key={index}
                    className={`border rounded-xl p-4 transition-all duration-200 hover:shadow-md ${getMatchResultColor(opponent.result)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Match Description - Üstte */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">
                            {getMatchResultIcon(opponent.result)}
                          </span>
                        <h4 className="font-semibold text-lg">
                          {opponent.matchDescription}
                        </h4>
                      </div>
                      
                      {/* Opponent Name - Altta */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">vs</span>
                        <span className="font-semibold text-base">
                          {getOpponentName(opponent.playerId)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Match Number - Sağda */}
                    <div className="text-right ml-4">
                      <div className="text-xs opacity-70 uppercase tracking-wide font-medium bg-white/50 px-2 py-1 rounded-full">
                        Match #{index + 1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-blue-600" />
                  Tournament Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-gray-500 font-medium">Total Matches</div>
                    <div className="text-2xl font-bold text-blue-600">{opponents.length}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-gray-500 font-medium">Unique Opponents</div>
                    <div className="text-2xl font-bold text-green-600">
                      {new Set(opponents.map(o => o.playerId)).size}
                    </div>
                  </div>
                </div>
                
                {/* Win/Loss Summary */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <div className="text-green-600 font-medium">Wins</div>
                    <div className="text-2xl font-bold text-green-700">
                      {opponents.filter(o => o.result === 'win').length}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="text-red-600 font-medium">Losses</div>
                    <div className="text-2xl font-bold text-red-700">
                      {opponents.filter(o => o.result === 'loss').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default OpponentsModal;
