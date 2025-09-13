import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import MatchCounter from '../UI/MatchCounter';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';
import { useTranslation } from 'react-i18next';

const ROUND_ORDER = ['WB1', 'WB2', 'LB1', 'Final', 'GrandFinal'] as const;
type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination3: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{[matchId: string]: string | null}>({});
  // Tamamlanan maçların sıralı yığını (en sondaki, en son tamamlanan)
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');

  // Handle tab change and save to storage
  const handleTabChange = TabManager.createTabChangeHandler(setActiveTab, fixtureId);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey, orderState: string[]) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      completedOrder: orderState,
      // Do not persist matchHistory
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(3, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(3, playerIds, fixtureId);
      if (state) {
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        // completedOrder varsa kullan, yoksa matches'tan türet
        const derivedOrder: string[] = (() => {
          const order: string[] = [];
          const idOrder = ['wb1', 'wb2', 'lb1', 'final', 'grandfinal'];
          for (const id of idOrder) {
            const m = loadedMatches.find((mm: Match) => mm.id === id);
            if (m?.winnerId) order.push(id);
          }
          return order;
        })();
        setCompletedOrder(state.completedOrder || derivedOrder);
        return true;
      }
    } catch (error) {
      // Error loading tournament state
    }
    return false;
  };

  // Clear tournament state using utility
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(3, playerIds, fixtureId);
  };

  // Initialize tournament structure for 3 players only
  const initializeTournament = () => {
    if (players.length !== 3) return;
    
    clearTournamentState();
    const newMatches: Match[] = [];
    
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // WB1: Random A vs B (first match)
    newMatches.push({
      id: 'wb1',
      player1Id: shuffledPlayers[0].id,
      player2Id: shuffledPlayers[1].id,
      bracket: 'winner',
      round: 1,
      matchNumber: 1,
      isBye: false,
      description: RoundDescriptionUtils.getDescription('WB1')
    });
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    setCompletedOrder([]);
    setSelectedWinner({});
    
    // Save initial state
    saveTournamentState(newMatches, {}, false, 'WB1', []);
  };

  // Check if a round is complete
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]): boolean => {
    switch (roundKey) {
      case 'WB1':
        return matchList.some(m => m.id === 'wb1' && m.winnerId);
      case 'WB2':
        return matchList.some(m => m.id === 'wb2' && m.winnerId);
      case 'LB1':
        return matchList.some(m => m.id === 'lb1' && m.winnerId);
      case 'Final':
        return matchList.some(m => m.id === 'final' && m.winnerId);
      case 'GrandFinal':
        return matchList.some(m => m.id === 'grandfinal' && m.winnerId);
      default:
        return false;
    }
  };

  // getMatchRoundKey kaldırıldı; tek-adım geri alma mantığı sabit anahtarlar kullanır

  // Create next round matches
  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'WB2': {
        // WB1 completed, winner vs C
        const wb1Match = matchList.find(m => m.id === 'wb1');
        if (wb1Match?.winnerId) {
          const wb1Loser = wb1Match.player1Id === wb1Match.winnerId ? wb1Match.player2Id : wb1Match.player1Id;
          const playerC = players.find(p => p.id !== wb1Match.winnerId && p.id !== wb1Loser);
          
          return [{
            id: 'wb2',
            player1Id: wb1Match.winnerId,
            player2Id: playerC!.id,
            bracket: 'winner',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      case 'LB1': {
        // WB2 completed, create LB semifinal
        const wb1Match = matchList.find(m => m.id === 'wb1');
        const wb2Match = matchList.find(m => m.id === 'wb2');
        
        if (wb1Match?.winnerId && wb2Match?.winnerId) {
          const wb1Loser = wb1Match.player1Id === wb1Match.winnerId ? wb1Match.player2Id : wb1Match.player1Id;
          const wb2Loser = wb2Match.player1Id === wb2Match.winnerId ? wb2Match.player2Id : wb2Match.player1Id;
          
          return [{
            id: 'lb1',
            player1Id: wb1Loser,
            player2Id: wb2Loser,
            bracket: 'loser',
            round: 1,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      case 'Final': {
        // LB1 completed, create Final
        const wb2Match = matchList.find(m => m.id === 'wb2');
        const lb1Match = matchList.find(m => m.id === 'lb1');
        
        if (wb2Match?.winnerId && lb1Match?.winnerId) {
          return [{
            id: 'final',
            player1Id: wb2Match.winnerId,
            player2Id: lb1Match.winnerId,
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      case 'GrandFinal': {
        // Final completed, LB winner won - need Grand Final
        const wb2Match = matchList.find(m => m.id === 'wb2');
        const finalMatch = matchList.find(m => m.id === 'final');
        
        if (wb2Match?.winnerId && finalMatch?.winnerId && finalMatch.winnerId !== wb2Match.winnerId) {
          return [{
            id: 'grandfinal',
            player1Id: wb2Match.winnerId,
            player2Id: finalMatch.winnerId,
            bracket: 'winner',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          }];
        }
        return [];
      }
      default:
        return [];
    }
  }

  const handleMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    const currentMatch = updatedMatches.find(m => m.id === matchId) || matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id;
    
    let finalMatches = updatedMatches;
    let finalRankings = rankings;
    let finalTournamentComplete = tournamentComplete;
    let nextRoundKey = currentRoundKey;

    // Check if current round is complete and create next round
    if (isRoundComplete(currentRoundKey, finalMatches)) {
      const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(currentRoundKey) + 1];
      if (nextRound) {
        const newMatches = createNextRound(nextRound as RoundKey, finalMatches);
        finalMatches = [...finalMatches, ...newMatches];
        nextRoundKey = nextRound as RoundKey;
      }
    }

    // Determine rankings and tournament completion
    if (matchId === 'lb1') {
      // LB1 completed, 3rd place determined (loser of LB1)
      finalRankings = { ...finalRankings, third: loserId };
    } else if (matchId === 'final') {
      const wb2Match = matches.find(m => m.id === 'wb2');
      const lb1Match = matches.find(m => m.id === 'lb1');
      
      if (winnerId === wb2Match?.winnerId) {
        // WB winner won final - tournament over
        // 1st: Final winner (WB winner)
        // 2nd: Final loser (LB winner)
        // 3rd: LB1 loser (already set)
        finalRankings = {
          first: winnerId,
          second: loserId,
          third: lb1Match?.player1Id === lb1Match?.winnerId ? lb1Match?.player2Id : lb1Match?.player1Id
        };
        finalTournamentComplete = true;
      }
      // If LB winner won final, Grand Final will be created automatically
      // Don't set rankings yet - wait for Grand Final
    } else if (matchId === 'grandfinal') {
      // Grand Final completed - this determines the final rankings
      const lb1Match = matches.find(m => m.id === 'lb1');
      finalRankings = {
        first: winnerId,    // Grand Final winner
        second: loserId,    // Grand Final loser
        third: lb1Match?.player1Id === lb1Match?.winnerId ? lb1Match?.player2Id : lb1Match?.player1Id
      };
      finalTournamentComplete = true;
    }
    
    // Tamamlanan sırayı güncelle
    const newCompletedOrder = completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    // Her durumda mevcut ranking'i güncelle (3. sıra için)
    if (!finalTournamentComplete) {
      setRankings(finalRankings);
      saveTournamentState(finalMatches, finalRankings, false, nextRoundKey, newCompletedOrder);
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    setCurrentRoundKey(nextRoundKey);
    setCompletedOrder(newCompletedOrder);
    const state = {
      matches: finalMatches,
      rankings: finalRankings,
      tournamentComplete: finalTournamentComplete,
      currentRoundKey: nextRoundKey,
      completedOrder: newCompletedOrder,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(3, playerIds, state, fixtureId);
    
    // Call parent's match result handler
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Update opponents after match
    if (onUpdateOpponents) {
      onUpdateOpponents(currentMatch.player1Id, currentMatch.player2Id, currentMatch.description || 'Unknown Match', winnerId);
    }
    
    // Call parent's tournament complete handler
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }
  };

  // Auto-complete bye matches
  React.useEffect(() => {
    if (matches.length > 0 && !tournamentComplete) {
      const byeMatches = matches.filter(match => match.isBye && !match.winnerId);
      byeMatches.forEach(match => {
        if (match.player1Id && !match.player2Id) {
          handleMatchResult(match.id, match.player1Id);
        }
      });
    }
  }, [matches, tournamentComplete]);

  // Initialize tournament on mount
  React.useEffect(() => {
    if (!loadTournamentState()) {
      initializeTournament();
    }
  }, []);

  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture

  const resetTournament = () => {
    if (window.confirm(t('matches.resetTournamentConfirm'))) {
      clearTournamentState();
      initializeTournament();
      setSelectedWinner({});
      setCompletedOrder([]);
      // Fikstürü aktif hale getir
      if (fixtureId) {
        MatchesStorage.activateFixture(fixtureId);
      }
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const undoLastMatch = () => {
    // Stack mevcutsa onu, yoksa matches'tan türet
    const stack = completedOrder.length > 0 ? completedOrder : (() => {
      const order: string[] = [];
      const idOrder = ['wb1', 'wb2', 'lb1', 'final', 'grandfinal'];
      for (const id of idOrder) {
        const m = matches.find(mm => mm.id === id);
        if (m?.winnerId) order.push(id);
      }
      return order;
    })();
    if (stack.length === 0) return;

    const lastId = stack[stack.length - 1];
    const undoneMatchRef = matches.find(m => m.id === lastId);
    const newCompletedOrder = stack.slice(0, -1);

    let updatedMatches = [...matches];
    let updatedRankings: typeof rankings = { ...rankings };
    let newTournamentComplete = false;
    let newCurrentRoundKey: RoundKey = currentRoundKey;

    switch (lastId) {
      case 'grandfinal': {
        updatedMatches = updatedMatches.map(m => m.id === 'grandfinal' ? { ...m, winnerId: undefined } : m);
        // GrandFinal geri alındı: 1. ve 2. belirsiz, 3. (LB1 loser) korunur
        delete (updatedRankings as any).first;
        delete (updatedRankings as any).second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'GrandFinal';
        break;
      }
      case 'final': {
        // Final geri alındı: sonucunu temizle, varsa oynanmamış grandfinal'ı kaldır
        updatedMatches = updatedMatches.map(m => m.id === 'final' ? { ...m, winnerId: undefined } : m);
        const gf = updatedMatches.find(m => m.id === 'grandfinal');
        if (gf && !gf.winnerId) {
          updatedMatches = updatedMatches.filter(m => m.id !== 'grandfinal');
        }
        // Final sıralamasını temizle (1-2), 3 korunur
        delete (updatedRankings as any).first;
        delete (updatedRankings as any).second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'Final';
        break;
      }
      case 'lb1': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb1' ? { ...m, winnerId: undefined } : m);
        // Final ve GrandFinal'ı kaldır
        updatedMatches = updatedMatches.filter(m => m.id !== 'final' && m.id !== 'grandfinal');
        // 3.lük temizlenir
        delete (updatedRankings as any).third;
        newTournamentComplete = false;
        newCurrentRoundKey = 'LB1';
        break;
      }
      case 'wb2': {
        updatedMatches = updatedMatches.map(m => m.id === 'wb2' ? { ...m, winnerId: undefined } : m);
        // LB1, Final ve GrandFinal'ı kaldır
        updatedMatches = updatedMatches.filter(m => m.id !== 'lb1' && m.id !== 'final' && m.id !== 'grandfinal');
        // 3.lük de etkilenir, temizle
        delete (updatedRankings as any).third;
        newTournamentComplete = false;
        newCurrentRoundKey = 'WB2';
        break;
      }
      case 'wb1': {
        updatedMatches = updatedMatches.map(m => m.id === 'wb1' ? { ...m, winnerId: undefined } : m);
        // Türetilen tüm maçları kaldır
        updatedMatches = updatedMatches.filter(m => !['wb2', 'lb1', 'final', 'grandfinal'].includes(m.id));
        // Sıralamaları temizle
        updatedRankings = {};
        newTournamentComplete = false;
        newCurrentRoundKey = 'WB1';
        break;
      }
    }

    // Seçilmiş kazananları var olmayan maçlardan temizle ve geri alınan maç için sıfırla
    const remainingIds = new Set(updatedMatches.map(m => m.id));
    const prunedSelected: {[matchId: string]: string | null} = {};
    Object.entries(selectedWinner).forEach(([k, v]) => {
      if (remainingIds.has(k)) prunedSelected[k] = v;
    });
    if (remainingIds.has(lastId)) prunedSelected[lastId] = null;

    setMatches(updatedMatches);
    setRankings(updatedRankings);
    setTournamentComplete(newTournamentComplete);
    setCurrentRoundKey(newCurrentRoundKey);
    setSelectedWinner(prunedSelected);
    setCompletedOrder(newCompletedOrder);

    const state = {
      matches: updatedMatches,
      rankings: updatedRankings,
      tournamentComplete: newTournamentComplete,
      currentRoundKey: newCurrentRoundKey,
      completedOrder: newCompletedOrder,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(3, playerIds, state, fixtureId);
    
    // Opponents listesinden sil
    if (onRemoveOpponents && undoneMatchRef && !undoneMatchRef.isBye) {
      onRemoveOpponents(undoneMatchRef.player1Id, undoneMatchRef.player2Id, undoneMatchRef.description || 'Unknown Match');
    }
    // Reactivate fixture if an undo happens
    try {
      if (fixtureId) {
        MatchesStorage.activateFixture(fixtureId);
      }
    } catch {}
  };

  const renderMatch = (match: Match) => {
    // Final maçında oyuncuları ters göster
    if (match.id === 'final') {
      const player1Name = getPlayerName(match.player2Id);
      const player2Name = match.player1Id ? getPlayerName(match.player1Id) : 'Bye';
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
          player1={getPlayer(match.player2Id || '')}
          player2={getPlayer(match.player1Id || '')}
          bracket={match.bracket as 'winner' | 'loser' | 'placement'}
          round={match.round}
          matchNumber={match.matchNumber}
          isBye={match.isBye}
          matchTitle={match.description}
          currentSelectedWinner={currentSelectedWinner}
          onWinnerSelect={winnerId => setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }))}
          onWinnerConfirm={() => {
            const winnerId = selectedWinner[match.id];
            if (winnerId) handleMatchResult(match.id, winnerId);
          }}
          onSelectionCancel={() => setSelectedWinner(prev => ({ ...prev, [match.id]: null }))}
          playersLength={players.length}
        />
      );
    }
    // Diğer maçlar için mevcut haliyle devam
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'Bye';
    const currentSelectedWinner = selectedWinner[match.id] || null;

    const handleWinnerSelect = (winnerId: string) => {
      setSelectedWinner(prev => ({
        ...prev,
        [match.id]: winnerId
      }));
    };

    const handleWinnerConfirm = () => {
      const winnerId = selectedWinner[match.id];
      if (winnerId) {
        handleMatchResult(match.id, winnerId);
      }
    };

    const handleSelectionCancel = () => {
      setSelectedWinner(prev => ({
        ...prev,
        [match.id]: null
      }));
    };

    return (
      <MatchCard
        matchId={match.id}
        fixtureId={fixtureId}
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        player1={getPlayer(match.player1Id || '')}
        player2={getPlayer(match.player2Id || '')}
        bracket={match.bracket as 'winner' | 'loser' | 'placement'}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        matchTitle={match.description}
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
        playersLength={players.length}
      />
    );
  };

  const activeMatches = matches.filter(match => !match.winnerId);
  const completedMatches = matches.filter(match => match.winnerId);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
      <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'active' && (
        <div className="flex justify-center gap-4 mb-4">
          {completedOrder.length > 0 && (
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
                      const completedCount = matches.filter(m => m.winnerId && !m.isBye).length;
                      let totalMatches = matches.filter(m => !m.isBye).length;
                      return `${completedCount} / ${totalMatches} maç başarıyla tamamlandı.`;
                    })()}
                  </p>
                  <p className="text-green-700 text-lg mb-6">
                    Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
                  </p>
                  <button
                    onClick={() => handleTabChange('rankings')}
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
        <>
          <div className="max-w-4xl mx-auto mb-6">
            <MatchCounter 
              playerCount={players.length}
              completedMatches={matches.filter(m => m.winnerId && !m.isBye).length}
              hasGrandFinal={RoundDescriptionUtils.hasGrandFinalMatch(matches)}
            />
          </div>
          <CompletedMatchesTable
            matches={completedMatches}
            players={players}
            getPlayerName={getPlayerName}
          />
        </>
      )}
      {activeTab === 'rankings' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={resetTournament}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('matches.resetTournament')}
            </button>
          </div>
          <RankingsTable
            rankings={rankings}
            players={players}
            getPlayerName={getPlayerName}
            playersLength={players.length}
          />
        </>
      )}
    </div>
  );
};

export default DoubleElimination3; 