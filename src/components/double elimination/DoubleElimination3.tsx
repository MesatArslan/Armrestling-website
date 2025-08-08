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

const ROUND_ORDER = ['WB1', 'WB2', 'LB1', 'Final', 'GrandFinal'] as const;
type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination3: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
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
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [isUndoing, setIsUndoing] = useState(false);

  // Handle tab change and save to storage
  const handleTabChange = TabManager.createTabChangeHandler(setActiveTab, fixtureId);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      matchHistory: matchHistory,
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
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        setMatchHistory(state.matchHistory || []);
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
    setMatchHistory([]);
    setSelectedWinner({});
    
    // Save initial state
    saveTournamentState(newMatches, {}, false, 'WB1');
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

  // Get the round key for a match
  function getMatchRoundKey(match: Match): RoundKey {
    switch (match.id) {
      case 'wb1':
        return 'WB1';
      case 'wb2':
        return 'WB2';
      case 'lb1':
        return 'LB1';
      case 'final':
        return 'Final';
      case 'grandfinal':
        return 'GrandFinal';
      default:
        return 'WB1';
    }
  }

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
    // Save current state to history before updating (only if not undoing)
    if (!isUndoing) {
      setMatchHistory(prev => [...prev, [...matches]]);
    }
    
    const updatedMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    const currentMatch = matches.find(m => m.id === matchId);
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
    
    // Her durumda mevcut ranking'i güncelle (3. sıra için)
    if (!finalTournamentComplete) {
      setRankings(finalRankings);
      saveTournamentState(finalMatches, finalRankings, false, nextRoundKey);
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    setCurrentRoundKey(nextRoundKey);
    
    // Update match history before saving
    const updatedMatchHistory = isUndoing ? matchHistory : [...matchHistory, [...matches]];
    const state = {
      matches: finalMatches,
      rankings: finalRankings,
      tournamentComplete: finalTournamentComplete,
      currentRoundKey: nextRoundKey,
      matchHistory: updatedMatchHistory,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(3, playerIds, state, fixtureId);
    
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

  const resetTournament = () => {
    if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      clearTournamentState();
      initializeTournament();
      setSelectedWinner({});
      setMatchHistory([]);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
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
        
        // Remove rankings based on the undone match
        if (matchId === 'final') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        } else if (matchId === 'grandfinal') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        } else if (matchId === 'lb1') {
          delete updatedRankings.third;
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
      DoubleEliminationStorage.saveDoubleEliminationState(3, playerIds, state, fixtureId);
      
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
    }
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      {activeTab === 'active' && (
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={resetTournament}
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
        <CompletedMatchesTable
          matches={completedMatches}
          players={players}
          getPlayerName={getPlayerName}
        />
      )}
      {activeTab === 'rankings' && (
        <RankingsTable
          rankings={rankings}
          players={players}
          getPlayerName={getPlayerName}
          playersLength={players.length}
        />
      )}
    </div>
  );
};

export default DoubleElimination3; 