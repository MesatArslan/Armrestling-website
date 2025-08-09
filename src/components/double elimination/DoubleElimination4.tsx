import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState, useEffect } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

const ROUND_ORDER = [
  'WB_QuarterFinal',
  'LB_Final1',
  'WB_SemiFinal',
  'LB_Final',
  'Final',
  'GrandFinal',
] as const;
type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination4: React.FC<DoubleEliminationProps> = ({ players, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{ first?: string; second?: string; third?: string; fourth?: string }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(TabManager.getInitialTab(fixtureId));
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB_QuarterFinal');
  const [isUndoing, setIsUndoing] = useState(false);

  // Save/load/clear state helpers
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      matchHistory: matchHistory,
      timestamp: new Date().toISOString(),
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(4, playerIds, state, fixtureId);
  };
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(4, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB_QuarterFinal');
        setMatchHistory(state.matchHistory || []);
        return true;
      }
    } catch {}
    return false;
  };
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(4, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    if (players.length !== 4) return;
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const newMatches: Match[] = [
      // WB Quarterfinals - Random pairing
      {
        id: 'wbqf-1',
        player1Id: shuffledPlayers[0].id,
        player2Id: shuffledPlayers[1].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB_QuarterFinal'),
      },
      {
        id: 'wbqf-2',
        player1Id: shuffledPlayers[2].id,
        player2Id: shuffledPlayers[3].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB_QuarterFinal'),
      },
    ];
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB_QuarterFinal');
    saveTournamentState(newMatches, {}, false, 'WB_QuarterFinal');
  };

  useEffect(() => {
    if (players.length === 4) {
      if (!loadTournamentState()) {
        initializeTournament();
      }
    }
    // eslint-disable-next-line
  }, [players]);

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wbqf')) return 'WB_QuarterFinal';
    if (match.id === 'lbfinal1') return 'LB_Final1';
    if (match.id === 'wbsemi') return 'WB_SemiFinal';
    if (match.id === 'lbfinal') return 'LB_Final';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
    return 'WB_QuarterFinal';
  }

  // --- Round Completion Helper ---
  function isRoundComplete(roundKey: RoundKey, matchList: Match[]): boolean {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    return roundMatches.length > 0 && roundMatches.every(m => m.winnerId);
  }

  // --- Next Round Creation ---
  useEffect(() => {
    if (matches.length === 0) return;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    if (currentIdx === -1 || currentIdx === ROUND_ORDER.length - 1) return;
    if (!isRoundComplete(currentRoundKey, matches)) return;
    const nextRoundKey = ROUND_ORDER[currentIdx + 1];
    const newMatches = createNextRound(nextRoundKey, matches);
    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
    // eslint-disable-next-line
  }, [matches, currentRoundKey]);

  // --- Next Round Match Creation Logic ---
  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'LB_Final1': {
        // WB Quarterfinal kaybedenleri
        const wbqf1 = matchList.find(m => m.id === 'wbqf-1');
        const wbqf2 = matchList.find(m => m.id === 'wbqf-2');
        if (wbqf1?.winnerId && wbqf2?.winnerId) {
          return [{
            id: 'lbfinal1',
            player1Id: wbqf1.player1Id === wbqf1.winnerId ? wbqf1.player2Id : wbqf1.player1Id,
            player2Id: wbqf2.player1Id === wbqf2.winnerId ? wbqf2.player2Id : wbqf2.player1Id,
            bracket: 'loser',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB1'),
          }];
        }
        return [];
      }
      case 'WB_SemiFinal': {
        // WB Quarterfinal kazananları
        const wbqf1 = matchList.find(m => m.id === 'wbqf-1');
        const wbqf2 = matchList.find(m => m.id === 'wbqf-2');
        if (wbqf1?.winnerId && wbqf2?.winnerId) {
          return [{
            id: 'wbsemi',
            player1Id: wbqf1.winnerId,
            player2Id: wbqf2.winnerId,
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal'),
          }];
        }
        return [];
      }
      case 'LB_Final': {
        // LB Final 1 kazananı vs WB Semifinal kaybedeni
        const lbfinal1 = matchList.find(m => m.id === 'lbfinal1');
        const wbsemi = matchList.find(m => m.id === 'wbsemi');
        if (lbfinal1?.winnerId && wbsemi?.winnerId) {
          const wbsemiLoser = wbsemi.player1Id === wbsemi.winnerId ? wbsemi.player2Id : wbsemi.player1Id;
          return [{
            id: 'lbfinal',
            player1Id: lbfinal1.winnerId,
            player2Id: wbsemiLoser,
            bracket: 'loser',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final'),
          }];
        }
        return [];
      }
      case 'Final': {
        // WB Semifinal kazananı vs LB Final 1 kazananı veya LB Final kazananı
        const wbsemi = matchList.find(m => m.id === 'wbsemi');
        const lbfinal1 = matchList.find(m => m.id === 'lbfinal1');
        const lbfinal = matchList.find(m => m.id === 'lbfinal');
        if (wbsemi?.winnerId && lbfinal1?.winnerId) {
          // Eğer LB Final oynandıysa, LB Final kazananı ile oynanır, yoksa LB Final 1 kazananı ile
          const lbFinalPlayer = lbfinal?.winnerId || lbfinal1.winnerId;
          return [{
            id: 'final',
            player1Id: wbsemi.winnerId,
            player2Id: lbFinalPlayer,
            bracket: 'winner',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final'),
          }];
        }
        return [];
      }
      case 'GrandFinal': {
        // Final oynandıysa ve LB'den gelen kazandıysa Grand Final oynanır
        const finalMatch = matchList.find(m => m.id === 'final');
        const wbsemi = matchList.find(m => m.id === 'wbsemi');
        if (finalMatch?.winnerId && wbsemi?.winnerId && finalMatch.winnerId !== wbsemi.winnerId) {
          return [{
            id: 'grandfinal',
            player1Id: wbsemi.winnerId,
            player2Id: finalMatch.winnerId,
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal'),
          }];
        }
        return [];
      }
      default:
        return [];
    }
  }

  // --- Sıralama Hesaplama ---
  useEffect(() => {
    // Turnuva tamamlandıysa sıralamayı hesapla
    if (!tournamentComplete) {
      const finalMatch = matches.find(m => m.id === 'final' && m.winnerId);
      const grandFinalMatch = matches.find(m => m.id === 'grandfinal' && m.winnerId);
      const lbfinal1 = matches.find(m => m.id === 'lbfinal1' && m.winnerId);
      const lbfinal = matches.find(m => m.id === 'lbfinal' && m.winnerId);
      
      let first = '', second = '', third = '', fourth = '';
      
      // 4. sıra: LB Final 1 kaybedeni (LB Final 1'den sonra belirlenir)
      if (lbfinal1) {
        fourth = lbfinal1.player1Id === lbfinal1.winnerId ? lbfinal1.player2Id! : lbfinal1.player1Id!;
      }
      
      // 3. sıra: LB Final kaybedeni (LB Final'dan sonra belirlenir)
      if (lbfinal) {
        third = lbfinal.player1Id === lbfinal.winnerId ? lbfinal.player2Id! : lbfinal.player1Id!;
      }
      
      // 1. ve 2. sıra: Sadece turnuva tamamlandığında belirlenir
      if (grandFinalMatch) {
        // Grand Final oynandı - final ranking belirlenir
        first = grandFinalMatch.winnerId!;
        second = grandFinalMatch.player1Id === grandFinalMatch.winnerId ? grandFinalMatch.player2Id! : grandFinalMatch.player1Id!;
        setRankings({ first, second, third, fourth });
        setTournamentComplete(true);
        saveTournamentState(matches, { first, second, third, fourth }, true, currentRoundKey);
        if (onTournamentComplete) {
          onTournamentComplete({ first, second, third, fourth });
        }
      } else if (finalMatch) {
        // Final oynandı ama Grand Final oynanmadı - WB kazananı kazandı
        const wbsemi = matches.find(m => m.id === 'wbsemi' && m.winnerId);
        if (finalMatch.winnerId === wbsemi?.winnerId) {
          // WB kazananı Final'i kazandı - turnuva biter
          first = finalMatch.winnerId!;
          second = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id! : finalMatch.player1Id!;
          setRankings({ first, second, third, fourth });
          setTournamentComplete(true);
          saveTournamentState(matches, { first, second, third, fourth }, true, currentRoundKey);
          if (onTournamentComplete) {
            onTournamentComplete({ first, second, third, fourth });
          }
        }
        // Eğer LB kazananı Final'i kazandıysa, Grand Final oynanacak, ranking henüz belirlenmez
      }
    }
    // eslint-disable-next-line
  }, [matches, tournamentComplete]);

  // --- UI ---
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
  };
  const undoLastMatch = () => {
    if (matchHistory.length > 0) {
      setIsUndoing(true);
      const previousMatches = matchHistory[matchHistory.length - 1];
      const currentState = matches;
      // Find which match was undone by comparing current and previous states
      const undoneMatch = currentState.find(match =>
        match.winnerId && !previousMatches.find(pm => pm.id === match.id)?.winnerId
      );
      setMatches(previousMatches);
      setMatchHistory(prev => prev.slice(0, -1));
      // Reset tournament completion if we're going back
      if (tournamentComplete) {
        setTournamentComplete(false);
      }
      // Remove rankings that were affected by the undone match
      let updatedRankings = { ...rankings };
      if (undoneMatch) {
        const matchId = undoneMatch.id;
        if (matchId === 'final') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        } else if (matchId === 'grandfinal') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        } else if (matchId === 'lb-final' || matchId === 'lb-final1') {
          delete updatedRankings.third;
          delete updatedRankings.fourth;
        }
      }
      setRankings(updatedRankings);
      // Update current round key based on the last match
      const lastMatch = previousMatches[previousMatches.length - 1];
      if (lastMatch) {
        const matchRoundKey = getMatchRoundKey(lastMatch);
        setCurrentRoundKey(matchRoundKey);
      }
      // Clear any selected winners for matches that no longer exist
      const previousMatchIds = previousMatches.map(m => m.id);
      setSelectedWinner(prev => {
        const newSelected = { ...prev };
        Object.keys(newSelected).forEach(matchId => {
          if (!previousMatchIds.includes(matchId)) {
            delete newSelected[matchId];
          }
        });
        return newSelected;
      });
      // Save the reverted state with updated match history
      const updatedMatchHistory = matchHistory.slice(0, -1);
      const state = {
        matches: previousMatches,
        rankings: updatedRankings,
        tournamentComplete: false,
        currentRoundKey: getMatchRoundKey(previousMatches[previousMatches.length - 1] || previousMatches[0]),
        matchHistory: updatedMatchHistory,
        timestamp: new Date().toISOString()
      };
      const playerIds = players.map(p => p.id).sort().join('-');
      DoubleEliminationStorage.saveDoubleEliminationState(4, playerIds, state, fixtureId);
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
    }
  };
  const renderMatch = (match: Match) => {
    // Grand Final maçında oyuncuları ters göster (final'daki pozisyonların tersi)
    if (match.id === 'grandfinal') {
      const player1Name = getPlayerName(match.player2Id);
      const player2Name = match.player1Id ? getPlayerName(match.player1Id) : 'TBD';
      const currentSelectedWinner = selectedWinner[match.id] || null;
      return (
        <MatchCard
          matchId={match.id}
          fixtureId={fixtureId}
          player1Name={player1Name}
          player2Name={player2Name}
          winnerId={match.winnerId}
          player1Id={match.player2Id || ''}
          player2Id={match.player1Id || ''}
          bracket={match.bracket as 'winner' | 'loser' | 'placement'}
          round={match.round}
          matchNumber={match.matchNumber}
          isBye={match.isBye}
          matchTitle={match.description}
          currentSelectedWinner={currentSelectedWinner}
          onWinnerSelect={winnerId => {
            if (!match.winnerId) {
              setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }));
            }
          }}
          onWinnerConfirm={() => {
            if (currentSelectedWinner) {
              if (!isUndoing) {
                setMatchHistory(prev => [...prev, [...matches]]);
              }
              setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
              setMatches(matches.map(m => m.id === match.id ? { ...m, winnerId: currentSelectedWinner } : m));
            }
          }}
          onSelectionCancel={() => {
            setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
          }}
          playersLength={players.length}
        />
      );
    }
    // Diğer maçlar için mevcut haliyle devam
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'TBD';
    const currentSelectedWinner = selectedWinner[match.id] || null;
    const handleWinnerSelect = (winnerId: string) => {
      if (!match.winnerId) {
        setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }));
      }
    };
    const handleWinnerConfirm = () => {
      if (currentSelectedWinner) {
        if (!isUndoing) {
          setMatchHistory(prev => [...prev, [...matches]]);
        }
        setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
        setMatches(matches.map(m => m.id === match.id ? { ...m, winnerId: currentSelectedWinner } : m));
      }
    };
    const handleSelectionCancel = () => {
      setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
    };
    return (
      <MatchCard
        matchId={match.id}
        fixtureId={fixtureId}
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id}
        player2Id={match.player2Id}
        bracket={match.bracket as 'winner' | 'loser'}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
        playersLength={players.length}
        matchTitle={match.description}
      />
    );
  };

  if (players.length !== 4) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Hata</h2>
        <p className="text-gray-600">4 kişilik turnuva için tam olarak 4 oyuncu gerekli.</p>
        <p className="text-gray-600">Mevcut oyuncu sayısı: {players.length}</p>
      </div>
    );
  }

  const activeMatches = matches.filter(m => !m.winnerId);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      {activeTab === 'active' && (
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => {
              if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                clearTournamentState();
                initializeTournament();
                setSelectedWinner({});
                setMatchHistory([]);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Turnuvayı Sıfırla
          </button>
          {matchHistory.length > 0 && (
            <button
              onClick={undoLastMatch}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Bir Önceki Maç
            </button>
          )}
        </div>
      )}
      {activeTab === 'active' && (
        <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
          {activeMatches.length === 0 ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center shadow-lg">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-green-800 mb-2">🏆 Turnuva Tamamlandı!</h2>
                  <p className="text-green-700 text-lg mb-2">
                    {(() => {
                      const completedCount = matches.filter(m => m.winnerId).length;
                      let totalMatches = matches.length;
                      return `${completedCount} / ${totalMatches} maç başarıyla tamamlandı.`;
                    })()}
                  </p>
                  <p className="text-green-700 text-lg mb-6">
                    Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
                  </p>
                  <button
                    onClick={() => TabManager.createTabChangeHandler(setActiveTab, fixtureId)('rankings')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                    Sıralama Sekmesine Git
                  </button>
                </div>
              </div>
            </div>
          ) : (
            activeMatches.map(match => (
              <div key={match.id} className="w-full sm:w-80 md:w-96">
                {renderMatch(match)}
              </div>
            ))
          )}
        </div>
      )}
      {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
      )}
      {activeTab === 'rankings' && (
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} playersLength={players.length} />
      )}
    </div>
  );
};

export default DoubleElimination4; 