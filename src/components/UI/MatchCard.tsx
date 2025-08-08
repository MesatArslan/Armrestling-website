import React from 'react';
import { useTranslation } from 'react-i18next';
import { ROUND_DESCRIPTIONS } from '../../utils/roundDescriptions';
import { MatchesStorage, type MatchPlayStatus } from '../../utils/matchesStorage';

interface MatchCardProps {
  matchId: string;
  fixtureId?: string;
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
  matchId,
  fixtureId,
  player1Name,
  player2Name,
  winnerId,
  player1Id,
  player2Id,
  bracket,
  isBye,
  currentSelectedWinner,
  onWinnerSelect,
  onWinnerConfirm,
  matchTitle,
}) => {
  const { t } = useTranslation();
  // --- Per-match persisted play status ---
  const [status, setStatus] = React.useState<MatchPlayStatus>(MatchesStorage.getMatchStatus(fixtureId || 'default', matchId));
  const isPlaying = status === 'active';

  React.useEffect(() => {
    // Keep state in sync on mount/update
    setStatus(MatchesStorage.getMatchStatus(fixtureId || 'default', matchId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, fixtureId]);

  const togglePlay = () => {
    const next: MatchPlayStatus = isPlaying ? 'waiting' : 'active';
    setStatus(next);
    MatchesStorage.setMatchStatus(fixtureId || 'default', matchId, next);
  };

  const getLocalizedMatchTitle = (rawTitle?: string): string => {
    if (!rawTitle) return '';

    // Strip any BYE suffix when already showing BYE badge
    let title = isBye ? rawTitle.split(' - Bye')[0] : rawTitle;

    // Extract optional " - Match N" suffix
    const matchSuffix = /^(.*?)(?:\s*-\s*Match\s*(\d+))?$/i.exec(title);
    let base = title;
    let number: string | undefined;
    if (matchSuffix) {
      base = matchSuffix[1].trim();
      number = matchSuffix[2];
    }

    // Try to map base to a known round key
    const roundKey = Object.keys(ROUND_DESCRIPTIONS).find(key => {
      const info = ROUND_DESCRIPTIONS[key];
      return info.description === base || info.displayName === base || info.shortName === base;
    });

    const localizedBase = roundKey ? t(`rounds.${roundKey}`) : t(rawTitle, { defaultValue: rawTitle });
    if (number) {
      return `${localizedBase} - ${t('matches.match')} ${number}`;
    }
    return localizedBase;
  };
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
        <div className="text-center w-full">
          <div className="text-xl font-bold mb-2">{getLocalizedMatchTitle(matchTitle)}</div>
          {/* Maç Durumu Butonu - başlığın altında */}
          <button
            onClick={togglePlay}
            className={`mx-auto px-3 py-2 rounded-lg text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg ${
              isPlaying 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 border border-gray-300'
            }`}
            type="button"
          >
            <div className="flex items-center justify-center gap-1">
              {isPlaying ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>{t('matches.matchInProgress')}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>{t('matches.matchWaiting')}</span>
                </>
              )}
            </div>
          </button>
          {isBye && (
            <div className="text-xs text-blue-100 bg-blue-500/30 px-2 py-1 rounded inline-block mt-2">
              {t('matches.bye')} - {t('matches.advancesToNextRound')}
            </div>
          )}
        </div>
        
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
                    🏆 {t('matches.winner')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-blue-600">🅻</span>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{t('matches.leftTable')}</span>
            </div>
          </div>
          {/* VS */}
          <div className="flex items-center justify-center px-2">
            <div className="text-2xl font-bold text-gray-400">{t('matches.vs')}</div>
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
                    🏆 {t('matches.winner')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-blue-600">🆁</span>
              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{t('matches.rightTable')}</span>
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
                ✅ {t('matches.confirmWinner')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard; 