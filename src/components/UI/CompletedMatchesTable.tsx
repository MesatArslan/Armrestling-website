import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUND_DESCRIPTIONS } from '../../utils/roundDescriptions';

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
  const { t } = useTranslation();
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

  const getLocalizedBracketLabel = (raw?: string): string => {
    if (!raw) return '';
    // Remove possible BYE/Bye suffix noise
    const withoutBye = raw.replace(/\s*-\s*Bye.*/i, '').trim();
    // Extract optional " - Match N" suffix
    const matchSuffix = /^(.*?)(?:\s*-\s*Match\s*(\d+))?$/i.exec(withoutBye);
    let base = withoutBye;
    let number: string | undefined;
    if (matchSuffix) {
      base = matchSuffix[1].trim();
      number = matchSuffix[2];
    }
    // Try exact map to round keys
    const key = Object.keys(ROUND_DESCRIPTIONS).find(k => {
      const info = ROUND_DESCRIPTIONS[k];
      return info.description === base || info.displayName === base || info.shortName === base;
    });
    const localizedBase = key ? t(`rounds.${key}`) : t(raw, { defaultValue: raw });
    return number ? `${localizedBase} - ${t('matches.match')} ${number}` : localizedBase;
  };

  return (
    <div className="w-full mx-auto mb-6 bg-transparent p-0 sm:bg-gray-50 sm:rounded-2xl sm:p-6">
      {/* Search and Filter Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 px-3 sm:px-0">
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
              placeholder={t('completedMatches.searchPlayersPlaceholder')}
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
            {showByeMatches ? t('completedMatches.hideByeMatches') : t('completedMatches.showByeMatches')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="min-w-[980px]">
          {/* Header (fixed) */}
          <div className="w-full flex flex-row items-center justify-between bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl px-6 py-4 shadow-sm sticky top-0 z-10">
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1">{t('completedMatches.headers.matchNo')}</div>
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1">{t('completedMatches.headers.bracket')}</div>
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-2"><span className='text-2xl font-bold drop-shadow'>🆁</span> {t('matches.rightTable')}</div>
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-2"><span className='text-2xl font-bold drop-shadow'>🅻</span> {t('matches.leftTable')}</div>
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1"><span>🏆</span> {t('matches.winner')}</div>
            <div className="flex-1 font-bold text-gray-900 text-base flex items-center gap-1"><span>❌</span> {t('matches.loser')}</div>
          </div>
          {/* Rows (scrollable vertically) */}
          <div className="max-h-[60vh] overflow-y-auto mt-2 pr-1">
            {filteredMatches.map((m, i) => {
              const winnerId = m.winnerId!;
              const loserId = m.player1Id === winnerId ? m.player2Id : m.player1Id;
              const bracketDisplay = getLocalizedBracketLabel(m.description) || m.id;
              return (
                <div
                  key={m.id}
                  className="flex flex-row items-center justify-between bg-white rounded-lg shadow-md px-6 py-4 transition-all duration-200 gap-2 overflow-hidden mb-1 hover:shadow-lg"
                >
                  <div className="flex-1 font-semibold text-gray-500 text-base flex items-center gap-1">{i + 1}</div>
                  <div className={`flex-1 font-semibold text-base flex items-center gap-1 ${m.bracket === 'loser' ? 'text-red-600' : m.bracket === 'placement' ? 'text-purple-600' : 'text-green-600'}`}>{bracketDisplay}</div>
                  <div className="flex-1 text-gray-800 text-base flex items-center gap-1">{m.isBye ? (getPlayerName(m.player2Id) || t('matches.bye')) : (getPlayerName(m.player2Id) || '—')}</div>
                  <div className="flex-1 text-gray-800 text-base flex items-center gap-1">{m.isBye ? (getPlayerName(m.player1Id) || t('matches.bye')) : (getPlayerName(m.player1Id) || '—')}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-900 font-black rounded-full px-3 py-1 text-base">
                      {m.isBye ? t('matches.bye') : getPlayerName(winnerId)}
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
      </div>
    </div>
  );
};

export default CompletedMatchesTable; 