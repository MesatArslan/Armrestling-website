import * as React from 'react';
import { useState, useEffect } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';

const DoubleElimination5: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
    fifth?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId, initialTab)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
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
    DoubleEliminationStorage.saveDoubleEliminationState(5, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(5, playerIds, fixtureId);
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
    DoubleEliminationStorage.clearDoubleEliminationState(5, playerIds, fixtureId);
  };

  // Initialize tournament structure for 5 players
  const initializeTournament = () => {
    clearTournamentState();
    const newMatches: Match[] = [];
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight); // Seeded by weight
    
    if (players.length === 5) {
      // WB Round 1: A vs B, C, D, E bye
      newMatches.push({
        id: 'wb1',
        player1Id: sortedPlayers[0].id, // A (highest seed)
        player2Id: sortedPlayers[1].id, // B (second seed)
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: 'Winner Bracket Round 1'
      });
    }
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
  };

  useEffect(() => {
    if (players.length === 5) {
      // Try to load saved state first
      const stateLoaded = loadTournamentState();
      
      // If no saved state exists, initialize new tournament
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, []); // Remove players dependency to prevent re-initialization

  // Auto-complete bye matches (only once to prevent infinite loop)
  const byeMatchesProcessedRef = React.useRef(new Set<string>());
  
  useEffect(() => {
    const byeMatches = matches.filter(m => m.isBye && !m.winnerId && !byeMatchesProcessedRef.current.has(m.id));
    if (byeMatches.length > 0) {
      const updatedMatches = matches.map(match => {
        if (match.isBye && !match.winnerId && !byeMatchesProcessedRef.current.has(match.id)) {
          byeMatchesProcessedRef.current.add(match.id);
          return { ...match, winnerId: match.player1Id };
        }
        return match;
      });
      setMatches(updatedMatches);
      saveTournamentState(updatedMatches, rankings, tournamentComplete);
    }
  }, [matches.length, tournamentComplete]); // Removed matches from deps

  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const updatedMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id || '';
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
    
    let newRankings = { ...rankings };
    let complete = false;
    
    if (matchId === 'wb1') {
      // WB Round 1 completed - create WB Round 2 matches
      updatedMatches.push({
        id: 'wb2-1',
        player1Id: sortedPlayers[2].id, // C
        player2Id: sortedPlayers[3].id, // D
        bracket: 'winner',
        round: 2,
        matchNumber: 1,
        isBye: false,
        description: 'Winner Bracket Round 2: Match 1'
      });
      
      updatedMatches.push({
        id: 'wb2-2',
        player1Id: winnerId, // Winner from A vs B
        player2Id: sortedPlayers[4].id, // E
        bracket: 'winner',
        round: 2,
        matchNumber: 2,
        isBye: false,
        description: 'Winner Bracket Round 2: Match 2'
      });
      
      // Create LB Round 1
      updatedMatches.push({
          id: 'lb1',
        player1Id: sortedPlayers[3].id, // D
        player2Id: sortedPlayers[4].id, // E
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: 'Loser Bracket Round 1'
        });
    } else if (matchId === 'wb2-1') {
      // C vs D completed - check if we can create WB Round 3
      const wb2_2 = updatedMatches.find(m => m.id === 'wb2-2');
      if (wb2_2?.winnerId) {
        updatedMatches.push({
          id: 'wb3',
          player1Id: winnerId, // Winner from C vs D
          player2Id: wb2_2.winnerId, // Winner from WB2-2
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: 'Winner Bracket Semifinal'
        });
      }
    } else if (matchId === 'wb2-2') {
      // Winner vs E completed - check if we can create WB Round 3
      const wb2_1 = updatedMatches.find(m => m.id === 'wb2-1');
      if (wb2_1?.winnerId) {
        updatedMatches.push({
          id: 'wb3',
          player1Id: wb2_1.winnerId, // Winner from C vs D
          player2Id: winnerId, // Winner from WB2-2
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: 'Winner Bracket Semifinal'
        });
      }
    } else if (matchId === 'lb1') {
      // LB Round 1 completed - create LB Round 2
      const wb1 = updatedMatches.find(m => m.id === 'wb1');
      if (wb1?.winnerId) {
        updatedMatches.push({
        id: 'lb2',
          player1Id: wb1.player1Id === wb1.winnerId ? wb1.player2Id : wb1.player1Id, // Loser from A vs B
          player2Id: winnerId, // Winner from LB1
        bracket: 'loser',
        round: 2,
        matchNumber: 1,
        isBye: false,
        description: 'Loser Bracket Round 2'
      });
      }
    } else if (matchId === 'wb3') {
      // WB Semifinal completed - create Final
      const lb2 = updatedMatches.find(m => m.id === 'lb2');
      if (lb2?.winnerId) {
        updatedMatches.push({
          id: 'final',
          player1Id: winnerId, // WB winner
          player2Id: lb2.winnerId, // LB winner
          bracket: 'winner',
          round: 4,
          matchNumber: 1,
          isBye: false,
          description: 'Final'
        });
      }
    } else if (matchId === 'lb2') {
      // LB Round 2 completed - create LB Final
      const wb3 = updatedMatches.find(m => m.id === 'wb3');
      if (wb3?.winnerId) {
                  updatedMatches.push({
        id: 'lb3',
            player1Id: winnerId, // LB Round 2 winner
            player2Id: wb3.player1Id === wb3.winnerId ? wb3.player2Id : wb3.player1Id, // WB loser
        bracket: 'loser',
        round: 3,
        matchNumber: 1,
        isBye: false,
        description: 'Loser Bracket Final'
      });
      }
    } else if (matchId === 'lb3') {
        // LB Final completed - create 4th/5th place match first
        const lb1 = updatedMatches.find(m => m.id === 'lb1');
        const lb2 = updatedMatches.find(m => m.id === 'lb2');
        // 3. oyuncuyu ata
        const lb3Loser = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id;
        newRankings.third = lb3Loser;
        if (lb1 && lb2) {
          const lb1Loser = lb1.player1Id === lb1.winnerId ? lb1.player2Id : lb1.player1Id;
          const lb2Loser = lb2.player1Id === lb2.winnerId ? lb2.player2Id : lb2.player1Id;
      
          updatedMatches.push({
        id: 'place45',
            player1Id: lb1Loser,
            player2Id: lb2Loser,
        bracket: 'placement',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: '4th/5th Place Match'
      });
        }
      
        // Then create Final
        const wb3 = updatedMatches.find(m => m.id === 'wb3');
        if (wb3?.winnerId) {
          updatedMatches.push({
        id: 'final',
            player1Id: wb3.winnerId, // WB winner
            player2Id: winnerId, // LB winner
        bracket: 'winner',
        round: 4,
        matchNumber: 1,
        isBye: false,
        description: 'Final'
      });
        }
    } else if (matchId === 'final') {
      // Final completed - check if Grand Final needed
      const wb3 = updatedMatches.find(m => m.id === 'wb3');
      if (wb3?.winnerId === winnerId) {
        // WB winner won final - tournament over
        newRankings.first = winnerId;
        newRankings.second = loserId;
        complete = true;
      } else {
        // LB winner won final - need Grand Final
        const wb3 = updatedMatches.find(m => m.id === 'wb3');
        if (wb3 && wb3.winnerId) {
          updatedMatches.push({
            id: 'grandfinal',
            player1Id: wb3.winnerId, // WB winner
            player2Id: winnerId, // Final winner
            bracket: 'winner',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: 'Grand Final'
          });
        } else {
          // wb3 veya winnerId yoksa grandfinal eklenmesin veya logla
          console.error('Grand Final oluşturulurken WB3 veya winnerId bulunamadı.');
        }
      }
    } else if (matchId === 'grandfinal') {
      // Grand Final completed
      newRankings.first = winnerId;
      newRankings.second = loserId;
      complete = true;
    } else if (matchId === 'place45') {
      // 4th/5th place match completed
      newRankings.fourth = winnerId;
      newRankings.fifth = loserId;
    }
    
    setMatches(updatedMatches);
    setRankings(newRankings);
    setTournamentComplete(complete);
    
    // Save state after every match
    saveTournamentState(updatedMatches, newRankings, complete);
    
    // Call parent callback
    onMatchResult(matchId, winnerId, loserId || '');
    
    // Call parent's tournament complete handler if tournament is complete
    if (complete && onTournamentComplete) {
      onTournamentComplete(newRankings);
    }
  };


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

  if (players.length !== 5) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for exactly 5 players.
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
                  
                  if (players.length === 5) {
                    // 5 kişilik turnuva: WB1, WB2-1, WB2-2, LB1, WB3, LB2, LB3, Final, Place45, Grand Final (if needed)
                    totalMatches = 9; // Minimum 9 maç
                    if (matches.some(m => m.id === 'grandfinal')) {
                      totalMatches = 10; // Grand Final eklendi
                    }
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
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} playersLength={players.length} />
      )}
      
      {/* Turnuva ilerlemesi sadece aktif sekmede gösterilsin */}
      {activeTab === 'active' && !tournamentComplete && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            {(() => {
              const completedCount = matches.filter(m => m.winnerId).length;
              let totalMatches = 0;
              
              if (players.length === 5) {
                totalMatches = matches.some(m => m.id === 'grandfinal') ? 10 : 9;
              }
              
              return `${completedCount} / ${totalMatches} maç tamamlandı`;
            })()}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs mx-auto">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(() => {
                  const completedCount = matches.filter(m => m.winnerId).length;
                  let totalMatches = 0;
                  
                  if (players.length === 5) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 10 : 9;
                  }
                  
                  return totalMatches > 0 ? (completedCount / totalMatches) * 100 : 0;
                })()}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubleElimination5; 