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

const DoubleElimination8: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
    fifth?: string;
    sixth?: string;
    seventh?: string;
    eighth?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId, initialTab)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(8, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        // Reset history when loading from storage
        setMatchHistory([]);
        setLastCompletedMatch(null);
        return true; // State was loaded
      }
    } catch (error) {
      console.error('Error loading tournament state:', error);
    }
    return false; // No state found
  };

  // Clear tournament state using utility
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(8, playerIds, fixtureId);
  };

  // Initialize tournament for 8 players
  const initializeTournament = () => {
    clearTournamentState();
    const newMatches: Match[] = [];
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
    
    if (players.length === 8) {
      // WB Round 1: A vs B, C vs D, E vs F, G vs H
      newMatches.push({
        id: 'wb1-1',
        player1Id: sortedPlayers[0].id, // A
        player2Id: sortedPlayers[1].id, // B
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: 'Winner Bracket Round 1: Match 1'
      });
      
      newMatches.push({
        id: 'wb1-2',
        player1Id: sortedPlayers[2].id, // C
        player2Id: sortedPlayers[3].id, // D
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: false,
        description: 'Winner Bracket Round 1: Match 2'
      });

      newMatches.push({
        id: 'wb1-3',
        player1Id: sortedPlayers[4].id, // E
        player2Id: sortedPlayers[5].id, // F
        bracket: 'winner',
        round: 1,
        matchNumber: 3,
        isBye: false,
        description: 'Winner Bracket Round 1: Match 3'
      });

      newMatches.push({
        id: 'wb1-4',
        player1Id: sortedPlayers[6].id, // G
        player2Id: sortedPlayers[7].id, // H
        bracket: 'winner',
        round: 1,
        matchNumber: 4,
        isBye: false,
        description: 'Winner Bracket Round 1: Match 4'
      });
    }
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
  };

  React.useEffect(() => {
    if (players.length === 8) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, []); // Remove players dependency to prevent re-initialization

  // Auto-complete bye matches
  React.useEffect(() => {
    const byeMatches = matches.filter(m => m.isBye && !m.winnerId);
    if (byeMatches.length > 0) {
      const updatedMatches = matches.map(match => 
        match.isBye && !match.winnerId 
          ? { ...match, winnerId: match.player1Id }
          : match
      );
      setMatches(updatedMatches);
      saveTournamentState(updatedMatches, rankings, tournamentComplete);
    }
  }, [matches, rankings, tournamentComplete]);

  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const updatedMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id;
    
    let finalMatches = updatedMatches;
    let finalRankings = rankings;
    let finalTournamentComplete = tournamentComplete;
    
    
    // Check if all WB Round 1 matches are completed
    const checkWBR1Complete = () => {
      const wb1_1 = finalMatches.find(m => m.id === 'wb1-1');
      const wb1_2 = finalMatches.find(m => m.id === 'wb1-2');
      const wb1_3 = finalMatches.find(m => m.id === 'wb1-3');
      const wb1_4 = finalMatches.find(m => m.id === 'wb1-4');
      return wb1_1?.winnerId && wb1_2?.winnerId && wb1_3?.winnerId && wb1_4?.winnerId;
    };

    if (matchId === 'wb1-1' || matchId === 'wb1-2' || matchId === 'wb1-3' || matchId === 'wb1-4') {
      // WB Round 1 match completed, check if all are done to create LB R1
      if (checkWBR1Complete()) {
        const wb1_1Match = finalMatches.find(m => m.id === 'wb1-1');
        const wb1_2Match = finalMatches.find(m => m.id === 'wb1-2');
        const wb1_3Match = finalMatches.find(m => m.id === 'wb1-3');
        const wb1_4Match = finalMatches.find(m => m.id === 'wb1-4');
        
        const wb1_1Loser = wb1_1Match!.player1Id === wb1_1Match!.winnerId ? wb1_1Match!.player2Id : wb1_1Match!.player1Id;
        const wb1_2Loser = wb1_2Match!.player1Id === wb1_2Match!.winnerId ? wb1_2Match!.player2Id : wb1_2Match!.player1Id;
        const wb1_3Loser = wb1_3Match!.player1Id === wb1_3Match!.winnerId ? wb1_3Match!.player2Id : wb1_3Match!.player1Id;
        const wb1_4Loser = wb1_4Match!.player1Id === wb1_4Match!.winnerId ? wb1_4Match!.player2Id : wb1_4Match!.player1Id;
        
        // LB Round 1: B vs D, F vs H
        finalMatches.push({
          id: 'lb1-1',
          player1Id: wb1_1Loser, // B (loser from A vs B)
          player2Id: wb1_2Loser, // D (loser from C vs D)
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: 'Loser Bracket Round 1: Match 1'
        });

        finalMatches.push({
          id: 'lb1-2',
          player1Id: wb1_3Loser, // F (loser from E vs F)
          player2Id: wb1_4Loser, // H (loser from G vs H)
          bracket: 'loser',
          round: 1,
          matchNumber: 2,
          isBye: false,
          description: 'Loser Bracket Round 1: Match 2'
        });
      }
      
    } else if (matchId === 'lb1-1' || matchId === 'lb1-2') {
      // LB Round 1 matches completed, check if both are done to create WB R2
      const lb1_1Match = finalMatches.find(m => m.id === 'lb1-1');
      const lb1_2Match = finalMatches.find(m => m.id === 'lb1-2');
      
      if (lb1_1Match?.winnerId && lb1_2Match?.winnerId) {
        const wb1_1Winner = finalMatches.find(m => m.id === 'wb1-1')!.winnerId; // A
        const wb1_2Winner = finalMatches.find(m => m.id === 'wb1-2')!.winnerId; // C
        const wb1_3Winner = finalMatches.find(m => m.id === 'wb1-3')!.winnerId; // E
        const wb1_4Winner = finalMatches.find(m => m.id === 'wb1-4')!.winnerId; // G
        
        // WB Round 2: A vs C, E vs G
        finalMatches.push({
          id: 'wb2-1',
          player1Id: wb1_1Winner!, // A (winner from A vs B)
          player2Id: wb1_2Winner!, // C (winner from C vs D)
          bracket: 'winner',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: 'Winner Bracket Round 2: Match 1'
        });
        
        finalMatches.push({
          id: 'wb2-2',
          player1Id: wb1_3Winner!, // E (winner from E vs F)
          player2Id: wb1_4Winner!, // G (winner from G vs H)
          bracket: 'winner',
          round: 2,
          matchNumber: 2,
          isBye: false,
          description: 'Winner Bracket Round 2: Match 2'
        });
      }
      
    } else if (matchId === 'wb2-1' || matchId === 'wb2-2') {
      // WB Round 2 matches completed, check if both are done to create LB R2
      const wb2_1Match = finalMatches.find(m => m.id === 'wb2-1');
      const wb2_2Match = finalMatches.find(m => m.id === 'wb2-2');
      
      if (wb2_1Match?.winnerId && wb2_2Match?.winnerId) {
        const wb2_1Loser = wb2_1Match.player1Id === wb2_1Match.winnerId ? wb2_1Match.player2Id : wb2_1Match.player1Id;
        const wb2_2Loser = wb2_2Match.player1Id === wb2_2Match.winnerId ? wb2_2Match.player2Id : wb2_2Match.player1Id;
        const lb1_1Winner = finalMatches.find(m => m.id === 'lb1-1')!.winnerId; // B
        const lb1_2Winner = finalMatches.find(m => m.id === 'lb1-2')!.winnerId; // F
        
        // LB Round 2: B vs F, C vs G
        finalMatches.push({
          id: 'lb2-1',
          player1Id: lb1_1Winner!, // B (winner from B vs D)
          player2Id: lb1_2Winner!, // F (winner from F vs H)
          bracket: 'loser',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: 'Loser Bracket Round 2: Match 1'
        });
        
        finalMatches.push({
          id: 'lb2-2',
          player1Id: wb2_1Loser, // C (loser from A vs C)
          player2Id: wb2_2Loser, // G (loser from E vs G)
          bracket: 'loser',
          round: 2,
          matchNumber: 2,
          isBye: false,
          description: 'Loser Bracket Round 2: Match 2'
        });
      }
      
    } else if (matchId === 'lb2-1' || matchId === 'lb2-2') {
      // LB Round 2 matches completed, check if both are done to create WB R3
      const lb2_1Match = finalMatches.find(m => m.id === 'lb2-1');
      const lb2_2Match = finalMatches.find(m => m.id === 'lb2-2');
      
      if (lb2_1Match?.winnerId && lb2_2Match?.winnerId) {
        const wb2_1Winner = finalMatches.find(m => m.id === 'wb2-1')!.winnerId; // A
        const wb2_2Winner = finalMatches.find(m => m.id === 'wb2-2')!.winnerId; // E
        
        // WB Round 3: A vs E (Semifinal)
        finalMatches.push({
          id: 'wb3',
          player1Id: wb2_1Winner!, // A (winner from A vs C)
          player2Id: wb2_2Winner!, // E (winner from E vs G)
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: 'Winner Bracket Semifinal'
        });
      }
      
    } else if (matchId === 'wb3') {
      // WB Round 3 (Semifinal) completed, create placement matches
      const lb1_1Loser = finalMatches.find(m => m.id === 'lb1-1')!.player1Id === finalMatches.find(m => m.id === 'lb1-1')!.winnerId ? 
                         finalMatches.find(m => m.id === 'lb1-1')!.player2Id : finalMatches.find(m => m.id === 'lb1-1')!.player1Id; // D
      const lb1_2Loser = finalMatches.find(m => m.id === 'lb1-2')!.player1Id === finalMatches.find(m => m.id === 'lb1-2')!.winnerId ? 
                         finalMatches.find(m => m.id === 'lb1-2')!.player2Id : finalMatches.find(m => m.id === 'lb1-2')!.player1Id; // H
      const lb2_1Loser = finalMatches.find(m => m.id === 'lb2-1')!.player1Id === finalMatches.find(m => m.id === 'lb2-1')!.winnerId ? 
                         finalMatches.find(m => m.id === 'lb2-1')!.player2Id : finalMatches.find(m => m.id === 'lb2-1')!.player1Id; // F
      const lb2_2Loser = finalMatches.find(m => m.id === 'lb2-2')!.player1Id === finalMatches.find(m => m.id === 'lb2-2')!.winnerId ? 
                         finalMatches.find(m => m.id === 'lb2-2')!.player2Id : finalMatches.find(m => m.id === 'lb2-2')!.player1Id; // G
      
      // 7th/8th Place Match: D vs H
      finalMatches.push({
        id: 'place78',
        player1Id: lb1_1Loser, // D (loser from B vs D)
        player2Id: lb1_2Loser, // H (loser from F vs H)
        bracket: 'placement',
        round: 3,
        matchNumber: 1,
        isBye: false,
        description: '7th/8th Place Match'
      });
      
      // 5th/6th Place Match: F vs G
      finalMatches.push({
        id: 'place56',
        player1Id: lb2_1Loser, // F (loser from B vs F)
        player2Id: lb2_2Loser, // G (loser from C vs G)
        bracket: 'placement',
        round: 3,
        matchNumber: 2,
        isBye: false,
        description: '5th/6th Place Match'
      });
      
    } else if (matchId === 'place78') {
      // 7th/8th place match completed
      finalRankings = { ...finalRankings, seventh: winnerId, eighth: loserId };
      
    } else if (matchId === 'place56') {
      // 5th/6th place match completed
      finalRankings = { ...finalRankings, fifth: winnerId, sixth: loserId };
      
      // Check if we can create LB Round 3
      const lb2_1Winner = finalMatches.find(m => m.id === 'lb2-1')!.winnerId; // B
      const lb2_2Winner = finalMatches.find(m => m.id === 'lb2-2')!.winnerId; // C
      
      if (lb2_1Winner && lb2_2Winner) {
        // LB Round 3: B vs C
        finalMatches.push({
          id: 'lb3',
          player1Id: lb2_1Winner!, // B (winner from B vs F)
          player2Id: lb2_2Winner!, // C (winner from C vs G)
          bracket: 'loser',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: 'Loser Bracket Round 3'
        });
      }
      
    } else if (matchId === 'lb3') {
      // LB Round 3 completed, loser gets 4th place
      finalRankings = { ...finalRankings, fourth: loserId };
      
      // Create LB Round 4 (LB Final): B vs E
      const wb3Loser = finalMatches.find(m => m.id === 'wb3')!.player1Id === finalMatches.find(m => m.id === 'wb3')!.winnerId ? 
                      finalMatches.find(m => m.id === 'wb3')!.player2Id : finalMatches.find(m => m.id === 'wb3')!.player1Id;
      
      finalMatches.push({
        id: 'lb4',
        player1Id: winnerId, // B (winner from B vs C)
        player2Id: wb3Loser, // E (loser from A vs E)
        bracket: 'loser',
        round: 4,
        matchNumber: 1,
        isBye: false,
        description: 'Loser Bracket Final'
      });
      
    } else if (matchId === 'lb4') {
      // LB Round 4 (LB Final) completed, loser gets 3rd place
      finalRankings = { ...finalRankings, third: loserId };
      
      // Create Final: A vs B
      const wb3Winner = finalMatches.find(m => m.id === 'wb3')!.winnerId;
      
      finalMatches.push({
        id: 'final',
        player1Id: wb3Winner!, // A (winner from A vs E)
        player2Id: winnerId, // B (winner from B vs E)
        bracket: 'winner',
        round: 5,
        matchNumber: 1,
        isBye: false,
        description: 'Final'
      });
      
    } else if (matchId === 'final') {
      // Final completed
      if (winnerId === finalMatches.find(m => m.id === 'wb3')!.winnerId) {
        // A won, tournament complete
        finalRankings = { ...finalRankings, first: winnerId, second: loserId };
        finalTournamentComplete = true;
      } else {
        // B won, create Grand Final
        finalMatches.push({
          id: 'grandfinal',
          player1Id: finalMatches.find(m => m.id === 'wb3')!.winnerId!, // A
          player2Id: winnerId, // B
          bracket: 'winner',
          round: 6,
          matchNumber: 1,
          isBye: false,
          description: 'Grand Final'
        });
      }
      
    } else if (matchId === 'grandfinal') {
      // Grand Final completed
      finalRankings = { ...finalRankings, first: winnerId, second: loserId };
      finalTournamentComplete = true;
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    
    saveTournamentState(finalMatches, finalRankings, finalTournamentComplete);
    
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Call parent's tournament complete handler if tournament is complete
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }
  };

  // Reset tournament

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
  };

  const undoLastMatch = () => {
    if (matchHistory.length > 0) {
      const previousState = matchHistory[matchHistory.length - 1];
      setMatches(previousState);
      setMatchHistory(prev => prev.slice(0, -1));
      setLastCompletedMatch(null);
      
      // Reset tournament completion if we're going back
      if (tournamentComplete) {
        setTournamentComplete(false);
        setRankings({});
      }
      
      // Save the reverted state
      saveTournamentState(previousState, rankings, false);
    }
  };



  const renderMatch = (match: Match) => {
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'TBD';
    const currentSelectedWinner = selectedWinner[match.id] || null;

    const handleWinnerSelect = (winnerId: string) => {
      if (!match.winnerId) {
        setSelectedWinner(prev => ({
          ...prev,
          [match.id]: winnerId
        }));
      }
    };

    const handleWinnerConfirm = () => {
      if (currentSelectedWinner) {
        handleMatchResult(match.id, currentSelectedWinner);
        setSelectedWinner(prev => ({
          ...prev,
          [match.id]: null
        }));
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
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        bracket={match.bracket as 'winner' | 'loser' | 'placement'}
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


  if (players.length !== 8) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for exactly 8 players.
      </div>
    );
  }

  const activeMatches = matches.filter(m => !m.winnerId);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      
      {/* Reset Tournament Button */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => {
            if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
              clearTournamentState();
              initializeTournament();
              setSelectedWinner({});
              setMatchHistory([]);
              setLastCompletedMatch(null);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Turnuvayı Sıfırla
        </button>
        
        {/* Undo Last Match Button */}
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
      
      {/* Sekme içerikleri */}
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
                  let totalMatches = 0;
                  if (players.length === 8) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 15 : 14;
                  }
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
      )}
    </div>
  );
};

export default DoubleElimination8; 