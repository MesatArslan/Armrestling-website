import React from 'react';

interface MatchCardProps {
  matchId: string;
  player1Name: string;
  player2Name: string;
  winnerId?: string;
  player1Id: string;
  player2Id: string;
  bracket: 'winner' | 'loser' | 'placement';
  round: number;
  matchNumber: number;
  isBye: boolean;
  currentSelectedWinner?: string | null;
  onWinnerSelect: (winnerId: string) => void;
  onWinnerConfirm: () => void;
  onSelectionCancel: () => void;
  playersLength: number;
  matchTitle?: string;
}

const MatchCard: React.FC<MatchCardProps> = ({
  player1Name,
  player2Name,
  winnerId,
  player1Id,
  player2Id,
  bracket,
  round,
  matchNumber,
  isBye,
  currentSelectedWinner,
  onWinnerSelect,
  onWinnerConfirm,
  matchTitle,
}) => {
  // --- Maç Oynanıyor local state ---
  const [isPlaying, setIsPlaying] = React.useState(false);
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className={`text-white p-4 ${
        bracket === 'loser' 
          ? 'bg-gradient-to-r from-red-500 to-pink-500' 
          : bracket === 'placement'
          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
          : 'bg-gradient-to-r from-green-500 to-emerald-500'
      }`}>
        <div className="flex justify-between items-center">
          <div className="text-center w-full">
            <div className="text-xl font-bold mb-1">{matchTitle}</div>
            <div className="text-sm opacity-90">Round {round} - Match {matchNumber}</div>
            {isBye && (
              <div className="text-xs text-blue-100 bg-blue-500/30 px-2 py-1 rounded inline-block mt-2">
                BYE - Advances to next round
              </div>
            )}
          </div>
          {/* Maç Oynanıyor Butonu */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            className={`ml-2 px-3 py-1 rounded-lg text-xs font-bold transition-colors duration-200 shadow ${
              isPlaying ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-yellow-400'
            }`}
            type="button"
          >
            {isPlaying ? 'Maç Oynanıyor' : 'Maç Oynanıyor Değil'}
          </button>
        </div>
        {/* Eğer maç oynanıyor ise üstte bir etiket göster */}
        {isPlaying && (
          <div className="mt-2 text-center">
            <span className="inline-block bg-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
              Maç Şu An Sahada
            </span>
          </div>
        )}
      </div>
      {/* Players Section */}
      <div className="p-6">
        <div className="flex items-stretch justify-between mb-6 gap-4">
          {/* Left Player (Sol Masa) */}
          <div 
            className={`flex-1 text-center p-4 rounded-xl transition-all duration-200 cursor-pointer min-h-[140px] flex flex-col ${winnerId === player1Id ? 'bg-green-100 border-2 border-green-400 shadow-lg scale-105' : currentSelectedWinner === player1Id ? 'bg-green-100 border-2 border-green-400 shadow-lg scale-105' : 'bg-white border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:shadow-sm'}`}
            onClick={() => onWinnerSelect(player1Id)}
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="font-bold text-lg text-gray-800 mb-1 break-words">{player1Name}</div>
              {winnerId === player1Id && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                    🏆 WINNER
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-blue-600">🅻</span>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Sol Masa</span>
            </div>
          </div>
          {/* VS */}
          <div className="flex items-center justify-center px-2">
            <div className="text-2xl font-bold text-gray-400">VS</div>
          </div>
          {/* Right Player (Sağ Masa) */}
          <div 
            className={`flex-1 text-center p-4 rounded-xl transition-all duration-200 cursor-pointer min-h-[140px] flex flex-col ${winnerId === player2Id ? 'bg-green-100 border-2 border-green-400 shadow-lg scale-105' : currentSelectedWinner === player2Id ? 'bg-green-100 border-2 border-green-400 shadow-lg scale-105' : 'bg-white border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:shadow-sm'}`}
            onClick={() => onWinnerSelect(player2Id)}
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="font-bold text-lg text-gray-800 mb-1 break-words">{player2Name}</div>
              {winnerId === player2Id && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                    🏆 WINNER
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-blue-600">🆁</span>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Sağ Masa</span>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        {!winnerId && player2Id && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-center">
              <button
                onClick={currentSelectedWinner ? onWinnerConfirm : undefined}
                disabled={!currentSelectedWinner}
                className={`py-3 px-6 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg transform ${
                  currentSelectedWinner 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:scale-105 cursor-pointer' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ✅ Kazananı Onayla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard; 