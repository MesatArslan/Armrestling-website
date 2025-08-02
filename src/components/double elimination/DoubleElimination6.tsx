import * as React from 'react';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

const ROUND_ORDER = ['WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB_Final', 'Place56', 'Final', 'GrandFinal'] as const;
type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination6: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
    fifth?: string;
    sixth?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(6, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(6, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        setMatchHistory([]);
        setLastCompletedMatch(null);
        return true;
      }
    } catch (error) {
      console.error('Error loading tournament state:', error);
    }
    return false;
  };

  // Clear tournament state using utility
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(6, playerIds, fixtureId);
  };

  // Initialize tournament structure for 6 players
  const initializeTournament = () => {
    if (players.length !== 6) return;
    
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    const newMatches: Match[] = [
      // WB1: 4 players play, 2 get bye
      {
        id: 'wb1-1',
        player1Id: shuffledPlayers[0].id,
        player2Id: shuffledPlayers[1].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB1')
      },
      {
        id: 'wb1-2',
        player1Id: shuffledPlayers[2].id,
        player2Id: shuffledPlayers[3].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB1')
      }
    ];
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    setSelectedWinner({});
    setMatchHistory([]);
    setLastCompletedMatch(null);
  };

  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]): boolean => {
    switch (roundKey) {
      case 'WB1':
        return matchList.filter(m => m.id.startsWith('wb1-') && m.winnerId).length === 2;
      case 'WB2':
        return matchList.filter(m => m.id.startsWith('wb2-') && m.winnerId).length === 2;
      case 'LB1':
        return matchList.filter(m => m.id.startsWith('lb1-') && m.winnerId).length === 2;
      case 'LB2':
        return matchList.some(m => m.id === 'lb2' && m.winnerId);
      case 'WB3':
        return matchList.some(m => m.id === 'wb3' && m.winnerId);
      case 'LB_Final':
        return matchList.some(m => m.id === 'lb_final' && m.winnerId);
      case 'Place56':
        return matchList.some(m => m.id === 'place56' && m.winnerId);
      case 'Final':
        return matchList.some(m => m.id === 'final' && m.winnerId);
      case 'GrandFinal':
        return matchList.some(m => m.id === 'grandfinal' && m.winnerId);
      default:
        return false;
    }
  };

  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1-')) return 'WB1';
    if (match.id.startsWith('wb2-')) return 'WB2';
    if (match.id.startsWith('lb1-')) return 'LB1';
    if (match.id === 'lb2') return 'LB2';
    if (match.id === 'wb3') return 'WB3';
    if (match.id === 'lb_final') return 'LB_Final';
    if (match.id === 'place56') return 'Place56';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
    return 'WB1';
  }

  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'WB2': {
        const wb1Matches = matchList.filter(m => m.id.startsWith('wb1-') && m.winnerId);
        if (wb1Matches.length !== 2) return [];
        
        // Get the 2 players who didn't play in WB1 (bye players)
        const wb1PlayerIds = wb1Matches.flatMap(m => [m.player1Id, m.player2Id]);
        const byePlayers = players.filter(p => !wb1PlayerIds.includes(p.id));
        
        return [
          {
            id: 'wb2-1',
            player1Id: wb1Matches[0]!.winnerId!,
            player2Id: wb1Matches[1]!.winnerId!,
            bracket: 'winner',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
          },
          {
            id: 'wb2-2',
            player1Id: byePlayers[0].id,
            player2Id: byePlayers[1].id,
            bracket: 'winner',
            round: 2,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
          }
        ];
      }
      
      case 'LB1': {
        // LB1: WB1 losers play each other, WB2 losers play each other
        const wb1Matches = matchList.filter(m => m.id.startsWith('wb1-') && m.winnerId);
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-') && m.winnerId);
        
        if (wb1Matches.length === 2 && wb2Matches.length === 2) {
          const wb1Losers = wb1Matches.map(m => 
            m.player1Id === m.winnerId ? m.player2Id : m.player1Id
          );
          const wb2Losers = wb2Matches.map(m => 
            m.player1Id === m.winnerId ? m.player2Id : m.player1Id
          );
          
          return [
            {
              id: 'lb1-1',
              player1Id: wb1Losers[0]!,
              player2Id: wb1Losers[1]!,
              bracket: 'loser',
              round: 1,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('LB1')
            },
            {
              id: 'lb1-2',
              player1Id: wb2Losers[0]!,
              player2Id: wb2Losers[1]!,
              bracket: 'loser',
              round: 1,
              matchNumber: 2,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('LB1')
            }
          ];
        }
        return [];
      }
      
      case 'LB2': {
        const lb1Matches = matchList.filter(m => m.id.startsWith('lb1-') && m.winnerId);
        if (lb1Matches.length === 2) {
          return [{
            id: 'lb2',
            player1Id: lb1Matches[0]!.winnerId!,
            player2Id: lb1Matches[1]!.winnerId!,
            bracket: 'loser',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB2')
          }];
        }
        return [];
      }
      
      case 'WB3': {
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-') && m.winnerId);
        if (wb2Matches.length === 2) {
          return [{
            id: 'wb3',
            player1Id: wb2Matches[0]!.winnerId!,
            player2Id: wb2Matches[1]!.winnerId!,
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      
      case 'LB_Final': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const lb2Match = matchList.find(m => m.id === 'lb2');
        
        if (wb3Match?.winnerId && lb2Match?.winnerId) {
          const wb3Loser = wb3Match.player1Id === wb3Match.winnerId ? wb3Match.player2Id : wb3Match.player1Id;
          return [{
            id: 'lb_final',
            player1Id: wb3Loser!,
            player2Id: lb2Match.winnerId,
            bracket: 'loser',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      
      case 'Place56': {
        const lb1Matches = matchList.filter(m => m.id.startsWith('lb1-'));
        
        if (lb1Matches.length === 2) {
          const lb1Losers = lb1Matches.map(m => 
            m.player1Id === m.winnerId ? m.player2Id : m.player1Id
          ).filter(Boolean);
          
          if (lb1Losers.length === 2) {
            return [{
              id: 'place56',
              player1Id: lb1Losers[0]!,
              player2Id: lb1Losers[1]!,
              bracket: 'placement',
              round: 1,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('5-6')
            }];
          }
        }
        return [];
      }
      
      case 'Final': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const lbFinalMatch = matchList.find(m => m.id === 'lb_final');
        
        if (wb3Match?.winnerId && lbFinalMatch?.winnerId) {
          return [{
            id: 'final',
            player1Id: wb3Match.winnerId,
            player2Id: lbFinalMatch.winnerId,
            bracket: 'winner',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      
      case 'GrandFinal': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const finalMatch = matchList.find(m => m.id === 'final');
        
        // Grand Final sadece LB kazananı Final'i kazandığında oluşturulur
        if (wb3Match?.winnerId && finalMatch?.winnerId && finalMatch.winnerId !== wb3Match.winnerId) {
          return [{
            id: 'grandfinal',
            player1Id: wb3Match.winnerId,
            player2Id: finalMatch.winnerId,
            bracket: 'winner',
            round: 5,
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
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id || '';
    
    let finalMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    let finalRankings = { ...rankings };
    let finalTournamentComplete = tournamentComplete;
    let nextRoundKey = currentRoundKey;

    // Check if current round is complete and create next round
    if (isRoundComplete(currentRoundKey, finalMatches)) {
      const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(currentRoundKey) + 1];
      if (nextRound) {
        // Grand Final sadece LB kazananı Final'i kazandığında oluşturulur
        if (nextRound === 'GrandFinal') {
          const wb3Match = finalMatches.find(m => m.id === 'wb3');
          const finalMatch = finalMatches.find(m => m.id === 'final');
          if (wb3Match?.winnerId && finalMatch?.winnerId && finalMatch.winnerId !== wb3Match.winnerId) {
            const newMatches = createNextRound(nextRound as RoundKey, finalMatches);
            finalMatches = [...finalMatches, ...newMatches];
            nextRoundKey = nextRound as RoundKey;
          }
        } else {
          const newMatches = createNextRound(nextRound as RoundKey, finalMatches);
          finalMatches = [...finalMatches, ...newMatches];
          nextRoundKey = nextRound as RoundKey;
        }
      }
    }

    // Determine rankings and tournament completion
    if (matchId === 'lb2') {
      // LB2 completed, 4th place determined (loser of LB2)
      finalRankings = { ...finalRankings, fourth: loserId };
    } else if (matchId === 'lb_final') {
      // LB Final completed, 3rd place determined (loser of LB Final)
      finalRankings = { ...finalRankings, third: loserId };
    } else if (matchId === 'place56') {
      // 5-6 place match completed
      finalRankings = { 
        ...finalRankings, 
        fifth: winnerId, 
        sixth: loserId 
      };
    } else if (matchId === 'final') {
      const wb3Match = matches.find(m => m.id === 'wb3');
      
      if (winnerId === wb3Match?.winnerId) {
        // WB winner won final - tournament over
        finalRankings = {
          ...finalRankings,
          first: winnerId,
          second: loserId
        };
        finalTournamentComplete = true;
      }
      // If LB winner won final, Grand Final will be created automatically
      // Don't set rankings yet - wait for Grand Final
    } else if (matchId === 'grandfinal') {
      // Grand Final completed - this determines the final rankings
      finalRankings = {
        ...finalRankings,
        first: winnerId,
        second: loserId
      };
      finalTournamentComplete = true;
    }
    
    // Her durumda mevcut ranking'i güncelle (3. ve 4. sıra için)
    if (!finalTournamentComplete) {
      setRankings(finalRankings);
      saveTournamentState(finalMatches, finalRankings, false, nextRoundKey);
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    setCurrentRoundKey(nextRoundKey);
    
    // Save state
    saveTournamentState(finalMatches, finalRankings, finalTournamentComplete, nextRoundKey);
    
    // Call parent's match result handler
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
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

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };

  const undoLastMatch = () => {
    if (matchHistory.length > 0) {
      const previousMatches = matchHistory[matchHistory.length - 1];
      setMatches(previousMatches);
      setMatchHistory(prev => prev.slice(0, -1));
      setLastCompletedMatch(null);
      setSelectedWinner(prev => ({
        ...prev,
        [previousMatches[previousMatches.length - 1]?.id || '']: null
      }));
      
      // Geri alındığında ranking'i yeniden hesapla
      let newRankings = {};
      let isComplete = false;
      
      // 4. sıra: LB2 kaybedeni
      const lb2Match = previousMatches.find(m => m.id === 'lb2' && m.winnerId);
      if (lb2Match) {
        const lb2Loser = lb2Match.player1Id === lb2Match.winnerId ? lb2Match.player2Id : lb2Match.player1Id;
        newRankings = { ...newRankings, fourth: lb2Loser };
      }
      
      // 3. sıra: LB Final kaybedeni
      const lbFinalMatch = previousMatches.find(m => m.id === 'lb_final' && m.winnerId);
      if (lbFinalMatch) {
        const lbFinalLoser = lbFinalMatch.player1Id === lbFinalMatch.winnerId ? lbFinalMatch.player2Id : lbFinalMatch.player1Id;
        newRankings = { ...newRankings, third: lbFinalLoser };
      }
      
      // 5-6. sıra: 5-6 maçı
      const place56Match = previousMatches.find(m => m.id === 'place56' && m.winnerId);
      if (place56Match) {
        const place56Loser = place56Match.player1Id === place56Match.winnerId ? place56Match.player2Id : place56Match.player1Id;
        newRankings = { ...newRankings, fifth: place56Match.winnerId, sixth: place56Loser };
      }
      
      // 1-2. sıra: Final veya Grand Final
      const finalMatch = previousMatches.find(m => m.id === 'final' && m.winnerId);
      const grandFinalMatch = previousMatches.find(m => m.id === 'grandfinal' && m.winnerId);
      
      if (grandFinalMatch) {
        // Grand Final oynandı
        const grandFinalLoser = grandFinalMatch.player1Id === grandFinalMatch.winnerId ? grandFinalMatch.player2Id : grandFinalMatch.player1Id;
        newRankings = { ...newRankings, first: grandFinalMatch.winnerId, second: grandFinalLoser };
        isComplete = true;
      } else if (finalMatch) {
        // Final oynandı ama Grand Final oynanmadı
        const wb3Match = previousMatches.find(m => m.id === 'wb3' && m.winnerId);
        if (finalMatch.winnerId === wb3Match?.winnerId) {
          // WB kazananı Final'i kazandı
          const finalLoser = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id;
          newRankings = { ...newRankings, first: finalMatch.winnerId, second: finalLoser };
          isComplete = true;
        }
        // Eğer LB kazananı Final'i kazandıysa, henüz 1-2. sıra belirlenmez
      }
      
      setRankings(newRankings);
      setTournamentComplete(isComplete);
      
      const lastMatch = previousMatches[previousMatches.length - 1];
      if (lastMatch) {
        const matchRoundKey = getMatchRoundKey(lastMatch);
        setCurrentRoundKey(matchRoundKey);
      }
      saveTournamentState(previousMatches, newRankings, isComplete, getMatchRoundKey(previousMatches[previousMatches.length - 1] || previousMatches[0]));
    }
  };

  const renderMatch = (match: Match) => {
    const currentSelectedWinner = selectedWinner[match.id] || null;

    const handleWinnerSelect = (winnerId: string) => {
      setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }));
    };

    const handleWinnerConfirm = () => {
      if (currentSelectedWinner) {
        handleMatchResult(match.id, currentSelectedWinner);
        setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
      }
    };

    const handleSelectionCancel = () => {
      setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
    };

    return (
      <MatchCard
        key={match.id}
        matchId={match.id}
        player1Name={getPlayerName(match.player1Id || '')}
        player2Name={getPlayerName(match.player2Id || '')}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        bracket={match.bracket}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        matchTitle={match.description}
        currentSelectedWinner={currentSelectedWinner}
        playersLength={players.length}
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
      />
    );
  };

  if (players.length !== 6) {
    return <div className="text-center p-4">Bu component sadece 6 oyuncu için tasarlanmıştır.</div>;
  }

  const activeMatches = matches.filter(match => !match.winnerId);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
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
            onClick={() => {
              if (window.confirm('Son maçı geri almak istediğinizden emin misiniz?')) {
                undoLastMatch();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Bir Önceki Maç
          </button>
        )}
      </div>
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

export default DoubleElimination6; 