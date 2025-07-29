import React, { useState, useMemo } from 'react';

interface Player {
  id: string;
  name: string;
  surname: string;
  weight: number;
}

interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  bracket: 'winner' | 'loser' | 'placement';
  round: number;
  matchNumber: number;
  isBye: boolean;
  description?: string; // Added for new logic
}

interface CompletedMatchesTableProps {
  matches: Match[];
  players: Player[];
  getPlayerName: (playerId: string) => string;
}

const CompletedMatchesTable: React.FC<CompletedMatchesTableProps> = ({ matches,getPlayerName }) => {
  const [searchText, setSearchText] = useState('');
  const [showByeMatches, setShowByeMatches] = useState(true);

  // Filter matches based on search and bye visibility
  const filteredMatches = useMemo(() => {
    let completedMatches = matches.filter(m => m.winnerId);
    
    // Filter by bye matches visibility
    if (!showByeMatches) {
      completedMatches = completedMatches.filter(m => !m.isBye);
    }
    
    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      completedMatches = completedMatches.filter(match => {
        const player1Name = getPlayerName(match.player1Id).toLowerCase();
        const player2Name = getPlayerName(match.player2Id).toLowerCase();
        return player1Name.includes(searchLower) || player2Name.includes(searchLower);
      });
    }
    
    return completedMatches;
  }, [matches, searchText, showByeMatches, getPlayerName]);

  return (
    <div className="w-full mx-auto mb-6 bg-gray-50 rounded-2xl p-6">
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Oyuncu adı ara..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Bye Matches Toggle */}
        <div className="flex items-center">
          <button
            onClick={() => setShowByeMatches(!showByeMatches)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
              showByeMatches 
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showByeMatches ? 'Bye Maçlarını Gizle' : 'Bye Maçlarını Göster'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {/* Header */}
        <div className="w-full flex flex-row items-center justify-between bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl px-6 py-4 mb-4 shadow-sm">
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1">Maç No</div>
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1">Bracket</div>
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-2"><span className='text-2xl font-bold drop-shadow'>🆁</span> Sağ Masa</div>
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-2"><span className='text-2xl font-bold drop-shadow'>🅻</span> Sol Masa</div>
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1"><span>🏆</span> Kazanan</div>
          <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1"><span>❌</span> Kaybeden</div>
        </div>
        {/* Rows */}
        {filteredMatches.map((m, i) => {
          const winnerId = m.winnerId!;
          const loserId = m.player1Id === winnerId ? m.player2Id : m.player1Id;
          // Net başlık: description varsa onu, yoksa id'yi göster
          const bracketDisplay = m.description || m.id;
          return (
            <div
              key={m.id}
              className="flex flex-row items-center justify-between bg-white rounded-lg shadow-md px-6 py-4 transition-all duration-200 gap-2 overflow-hidden mb-1 hover:shadow-lg"
            >
              <div className="flex-1 font-semibold text-gray-500 text-base flex items-center gap-1">{i + 1}</div>
              <div className={`flex-1 font-semibold text-base flex items-center gap-1 ${m.bracket === 'loser' ? 'text-red-600' : m.bracket === 'placement' ? 'text-purple-600' : 'text-green-600'}`}>{bracketDisplay}</div>
              <div className="flex-1 text-gray-800 text-base flex items-center gap-1">{m.isBye ? (getPlayerName(m.player2Id) || 'BYE') : (getPlayerName(m.player2Id) || '—')}</div>
              <div className="flex-1 text-gray-800 text-base flex items-center gap-1">{m.isBye ? (getPlayerName(m.player1Id) || 'BYE') : (getPlayerName(m.player1Id) || '—')}</div>
              <div className="flex-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-900 font-black rounded-full px-3 py-1 text-base">
                  {m.isBye ? 'BYE' : getPlayerName(winnerId)}
                </span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-900 font-black rounded-full px-3 py-1 text-base">
                  {m.isBye ? '—' : getPlayerName(loserId)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompletedMatchesTable; 