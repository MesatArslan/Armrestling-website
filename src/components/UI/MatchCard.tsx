import React from 'react';
import { useTranslation } from 'react-i18next';
import { ROUND_DESCRIPTIONS } from '../../utils/roundDescriptions';
import { MatchesStorage, type MatchPlayStatus } from '../../utils/matchesStorage';
import PlayerInfoModal from './PlayerInfoModal';
import type { Player } from '../../types';

interface MatchCardProps {
  matchId: string;
  fixtureId?: string;
  player1Name: string;
  player2Name: string;
  winnerId?: string;
  player1Id: string;
  player2Id: string;
  player1?: Player;
  player2?: Player;
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
  player1,
  player2,
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
  
  // Player info modal state
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);

  const openPlayerInfo = (player: Player, element: HTMLElement) => {
    setSelectedPlayer(player);
    setTriggerElement(element);
    setIsModalOpen(true);
  };

  const closePlayerInfo = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
    setTriggerElement(null);
  };

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

  // Split full name into first part(s) and last token (surname)
  const splitName = (fullName: string): { first: string; last: string } => {
    const tokens = (fullName || '').trim().split(/\s+/).filter(Boolean);
    if (tokens.length <= 1) {
      return { first: fullName || '', last: '' };
    }
    const last = tokens[tokens.length - 1];
    const first = tokens.slice(0, -1).join(' ');
    return { first, last };
  };

  // Size for first name(s): more forgiving thresholds
  const getFirstNameSizeClass = (first: string): string => {
    const len = first?.length || 0;
    if (len <= 18) return 'text-base lg:text-lg';
    if (len <= 26) return 'text-sm lg:text-base';
    if (len <= 34) return 'text-xs lg:text-sm';
    if (len <= 44) return 'text-[11px] lg:text-xs';
    return 'text-[10px] lg:text-[11px]';
  };

  // Size for surname: stricter thresholds to prevent overflow (even ~10 chars)
  const getLastNameSizeClass = (last: string): string => {
    const len = last?.length || 0;
    if (len <= 8) return 'text-base lg:text-lg';
    if (len <= 10) return 'text-sm lg:text-base';
    if (len <= 12) return 'text-xs lg:text-sm';
    if (len <= 14) return 'text-[11px] lg:text-xs';
    return 'text-[10px] lg:text-[11px]';
  };

  // Auto-fit a single-line text to its container by shrinking font size classes
  const AutoFitText: React.FC<{
    text: string;
    baseClasses?: string;
    sizeClasses?: string[];
  }> = ({ text, baseClasses = '', sizeClasses = ['text-base', 'text-sm', 'text-xs', 'text-[11px]', 'text-[10px]'] }) => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [sizeIndex, setSizeIndex] = React.useState<number>(0);

    const fit = React.useCallback(() => {
      const el = containerRef.current;
      if (!el) return;

      // Try shrinking until it fits (or we reach the smallest size)
      let nextIndex = 0;
      for (let i = 0; i < sizeClasses.length; i++) {
        nextIndex = i;
        el.className = `${baseClasses} ${sizeClasses[i]}`.trim();
        if (el.scrollWidth <= el.clientWidth) break;
      }
      setSizeIndex(nextIndex);
    }, [baseClasses, sizeClasses]);

    React.useEffect(() => {
      fit();
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => fit());
      ro.observe(el);
      const onResize = () => fit();
      window.addEventListener('resize', onResize);
      return () => {
        ro.disconnect();
        window.removeEventListener('resize', onResize);
      };
    }, [fit]);

    return (
      <div ref={containerRef} className={`${baseClasses} ${sizeClasses[sizeIndex]}`.trim()}>
        {text}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden md:hover:shadow-2xl transition-all duration-300 w-full max-w-md mx-auto md:max-w-md lg:max-w-full flex flex-col h-full">
      {/* Header */}
      <div className={`text-white p-3 md:p-3 lg:p-4 ${
        bracket === 'loser' 
          ? 'bg-gradient-to-r from-red-500 to-pink-500' 
          : bracket === 'placement'
          ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
          : 'bg-gradient-to-r from-green-500 to-emerald-500'
      }`}>
        <div className="text-center w-full">
          <div className="text-lg md:text-xl font-bold mb-1 md:mb-2">{getLocalizedMatchTitle(matchTitle)}</div>
          {/* Maç Durumu Butonu - başlığın altında */}
          <button
            onClick={togglePlay}
            className={`mx-auto px-2 py-1 md:px-2 md:py-1.5 lg:md:px-3 lg:md:py-2 rounded-lg text-xs font-bold transition-all duration-300 shadow-md md:hover:shadow-lg ${
              isPlaying 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 md:hover:from-gray-200 md:hover:to-gray-300 border border-gray-300'
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
            <div className="text-xs text-blue-100 bg-blue-500/30 px-2 py-1 rounded inline-block mt-1 md:mt-2">
              {t('matches.bye')} - {t('matches.advancesToNextRound')}
            </div>
          )}
        </div>
      </div>
      
      {/* Players Section */}
      <div className="p-3 md:p-4 lg:p-6 flex-1 flex flex-col">
        <div className="flex flex-col lg:flex-row items-stretch justify-between mb-4 md:mb-4 lg:mb-6 gap-2 md:gap-3 lg:md:gap-4 min-w-0">
          {/* Left Player (Sol Masa) */}
          <div 
            className={`flex-1 min-w-0 text-center p-3 md:p-3 lg:p-4 rounded-xl transition-all duration-200 cursor-pointer min-h-[100px] md:min-h-[120px] lg:min-h-[140px] flex flex-col relative ${
              winnerId === player1Id 
                ? 'bg-green-100 border-2 border-green-400 shadow-lg ring-2 ring-green-300' 
                : currentSelectedWinner === player1Id 
                ? 'bg-green-50 border-2 border-green-300 shadow-md ring-2 ring-green-200' 
                : 'bg-white border-2 border-gray-200 md:hover:border-green-300 md:hover:bg-green-50 md:hover:shadow-sm'
            }`}
            onClick={() => onWinnerSelect(player1Id)}
          >
            {/* Information Button */}
            {player1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPlayerInfo(player1, e.currentTarget);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-blue-500 md:hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 shadow-md md:hover:shadow-lg z-10"
                title={t('players.viewPlayerInfo')}
              >
                i
              </button>
            )}
            
            <div className="flex-1 flex flex-col justify-center">
              {(() => {
                const { first: p1First, last: p1Last } = splitName(player1Name);
                return (
                  <div className="font-bold text-gray-800 mb-1 leading-tight">
                    <div className={`text-center ${getFirstNameSizeClass(p1First)} whitespace-normal break-normal`}>{p1First}</div>
                    {p1Last && (
                      <AutoFitText
                        text={p1Last}
                        baseClasses="text-center whitespace-nowrap"
                        sizeClasses={[getLastNameSizeClass(p1Last), 'text-sm lg:text-base', 'text-xs lg:text-sm', 'text-[11px] lg:text-xs', 'text-[10px] lg:text-[11px]']}
                      />
                    )}
                  </div>
                );
              })()}
              {winnerId === player1Id && (
                <div className="mt-1 md:mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                    🏆 {t('matches.winner')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="text-base md:text-lg font-bold text-blue-600">🅻</span>
              <span className="text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">{t('matches.leftTable')}</span>
            </div>
          </div>
          
          {/* VS - Only shown in horizontal layout */}
          <div className="hidden lg:flex items-center justify-center px-0 md:px-0">
            <div className="text-sm md:text-base font-bold text-gray-400">{t('matches.vs')}</div>
          </div>
          
          {/* VS - Only shown in vertical layout */}
          <div className="lg:hidden flex items-center justify-center py-1">
            <div className="text-sm font-bold text-gray-400">{t('matches.vs')}</div>
          </div>
          
          {/* Right Player (Sağ Masa) */}
          <div 
            className={`flex-1 min-w-0 text-center p-3 md:p-3 lg:p-4 rounded-xl transition-all duration-200 cursor-pointer min-h-[100px] md:min-h-[120px] lg:min-h-[140px] flex flex-col relative ${
              winnerId === player2Id 
                ? 'bg-green-100 border-2 border-green-400 shadow-lg ring-2 ring-green-300' 
                : currentSelectedWinner === player2Id 
                ? 'bg-green-50 border-2 border-green-300 shadow-md ring-2 ring-green-200' 
                : 'bg-white border-2 border-gray-200 md:hover:border-green-300 md:hover:bg-green-50 md:hover:shadow-sm'
            }`}
            onClick={() => onWinnerSelect(player2Id)}
          >
            {/* Information Button */}
            {player2 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openPlayerInfo(player2, e.currentTarget);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-blue-500 md:hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 shadow-md md:hover:shadow-lg z-10"
                title={t('players.viewPlayerInfo')}
              >
                i
              </button>
            )}
            
            <div className="flex-1 flex flex-col justify-center">
              {(() => {
                const { first: p2First, last: p2Last } = splitName(player2Name);
                return (
                  <div className="font-bold text-gray-800 mb-1 leading-tight">
                    <div className={`text-center ${getFirstNameSizeClass(p2First)} whitespace-normal break-normal`}>{p2First}</div>
                    {p2Last && (
                      <AutoFitText
                        text={p2Last}
                        baseClasses="text-center whitespace-nowrap"
                        sizeClasses={[getLastNameSizeClass(p2Last), 'text-sm lg:text-base', 'text-xs lg:text-sm', 'text-[11px] lg:text-xs', 'text-[10px] lg:text-[11px]']}
                      />
                    )}
                  </div>
                );
              })()}
              {winnerId === player2Id && (
                <div className="mt-1 md:mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                    🏆 {t('matches.winner')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-1 md:gap-2">
              <span className="text-base md:text-lg font-bold text-blue-600">🆁</span>
              <span className="text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">{t('matches.rightTable')}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        {!winnerId && player2Id && (
          <div className="mt-auto pt-3 md:pt-4 border-t border-gray-200">
            <div className="text-center">
              {/** Confirm handler clears persisted match status after confirmation */}
              {(() => {
                const handleConfirmClick = () => {
                  if (!currentSelectedWinner) return;
                  onWinnerConfirm();
                  if (fixtureId) {
                    try { MatchesStorage.clearMatchStatus(fixtureId, matchId); } catch {}
                  }
                };
                return (
              <button
                onClick={currentSelectedWinner ? handleConfirmClick : undefined}
                disabled={!currentSelectedWinner}
                className={`py-2 px-4 md:py-2 md:px-5 lg:md:py-3 lg:md:px-6 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 shadow-lg transform ${
                  currentSelectedWinner 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white md:hover:from-green-600 md:hover:to-green-700 md:hover:shadow-xl md:hover:scale-105 cursor-pointer' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ✅ {t('matches.confirmWinner')}
              </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      
      {/* Player Info Modal */}
      <PlayerInfoModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={closePlayerInfo}
        triggerElement={triggerElement}
      />
    </div>
  );
};

export default MatchCard;