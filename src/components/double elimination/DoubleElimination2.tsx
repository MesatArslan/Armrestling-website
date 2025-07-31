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

const DoubleElimination2: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [playerWins, setPlayerWins] = useState<{[playerId: string]: number}>({});
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{[matchId: string]: string | null}>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

  // Handle tab change and save to storage
  const handleTabChange = TabManager.createTabChangeHandler(setActiveTab, fixtureId);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, winsState: any) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      playerWins: winsState,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(2, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(2, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setPlayerWins(state.playerWins || {});
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
    DoubleEliminationStorage.clearDoubleEliminationState(2, playerIds, fixtureId);
  };

  // Initialize tournament structure for 2-3 players
  const initializeTournament = () => {
    // Clear any existing saved state for new tournament
    clearTournamentState();
    const newMatches: Match[] = [];
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight); // Seeded by weight
    
    if (players.length === 2) {
      // True double elimination for 2 players - Semifinal (first match)
      // Match 1: A (higher seed) sol, B (lower seed) sağ
      newMatches.push({
        id: 'semifinal',
        player1Id: sortedPlayers[0].id, // A (higher seed) on left table
        player2Id: sortedPlayers[1].id, // B (lower seed) on right table
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
      });
    } else if (players.length === 3) {
      // 3-player double elimination: Start with A vs B
      newMatches.push({
        id: 'wb1', // A vs B (first match)
        player1Id: sortedPlayers[0].id, // A (highest seed)
        player2Id: sortedPlayers[1].id, // B (middle seed)
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB1')
      });
    }
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    
    // Initialize player wins tracking for 2 players
    if (players.length === 2) {
      const winTracker: {[playerId: string]: number} = {};
      players.forEach(player => {
        winTracker[player.id] = 0;
      });
      setPlayerWins(winTracker);
    }
  };

  React.useEffect(() => {
    if (players.length >= 2 && players.length <= 3) {
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
  
  React.useEffect(() => {
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, {});
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
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id;
    
    // Initialize variables for state updates
    let finalMatches = updatedMatches;
    let finalRankings = rankings;
    let finalTournamentComplete = tournamentComplete;
    let finalPlayerWins = playerWins;
    
    // Generate next matches and determine rankings based on results
    if (players.length === 2) {
      // Update win count for the winner
      finalPlayerWins = { ...playerWins };
      finalPlayerWins[winnerId] = (finalPlayerWins[winnerId] || 0) + 1;
      setPlayerWins(finalPlayerWins);
      
      // True double elimination for 2 players
      if (matchId === 'semifinal') {
        // After semifinal, create the final match with positions swapped
        // Match 2: Pozisyonları değiştir - Semifinal'de sol olan sağa, sağ olan sola
        const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
        const playerA = sortedPlayers[0]; // Higher seed
        const playerB = sortedPlayers[1]; // Lower seed
        
        finalMatches.push({
          id: 'final',
          player1Id: playerB.id,    // B (lower seed) now on left table
          player2Id: playerA.id,    // A (higher seed) now on right table
          bracket: 'winner',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('Final')
        });
      } else if (matchId === 'final') {
        // Check who won the semifinal
        const semifinalMatch = matches.find(m => m.id === 'semifinal');
        const semifinalWinner = semifinalMatch?.winnerId;
        
        if (winnerId === semifinalWinner) {
          // Same player won both matches (2-0) - Tournament over
          finalRankings = {
            first: winnerId,
            second: loserId
          };
          finalTournamentComplete = true;
          setRankings(finalRankings);
          setTournamentComplete(finalTournamentComplete);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(finalRankings);
          }
        } else {
          // Each player won one match (1-1) - Need Grand Final
          // Match 3: Original pozisyonlara dön - A (higher seed) sol, B (lower seed) sağ
          const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
          const playerA = sortedPlayers[0]; // Higher seed
          const playerB = sortedPlayers[1]; // Lower seed
          
          finalMatches.push({
            id: 'grandfinal',
            player1Id: playerA.id,    // A (higher seed) back to left table
            player2Id: playerB.id,    // B (lower seed) back to right table
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          });
        }
      } else if (matchId === 'grandfinal') {
        // Grand Final completed - Winner is champion
        finalRankings = {
          first: winnerId,
          second: loserId
        };
        finalTournamentComplete = true;
        setRankings(finalRankings);
        setTournamentComplete(finalTournamentComplete);
        
        // Call parent's tournament complete handler
        if (onTournamentComplete) {
          onTournamentComplete(finalRankings);
        }
      }
    } else if (players.length === 3) {
      const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
      
      if (matchId === 'wb1') {
        // A vs B completed, winner advances, loser drops to LB
        // Create WB Semifinal: Winner vs C
        updatedMatches.push({
          id: 'wb2', // Winner(A or B) vs C
          player1Id: winnerId, // Winner from A vs B
          player2Id: sortedPlayers[2].id, // C (lowest seed)
          bracket: 'winner',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
        });
      } else if (matchId === 'wb2') {
        // WB Semifinal (Winner vs C) completed
        // Create LB Semifinal: First loser vs Second loser
        const wb1Match = matches.find(m => m.id === 'wb1');
        const wb1Loser = wb1Match?.player1Id === wb1Match?.winnerId ? wb1Match?.player2Id : wb1Match?.player1Id;
        
        updatedMatches.push({
          id: 'lbsf', // LB Semifinal: wb1Loser vs wb2Loser
          player1Id: wb1Loser!, // Loser from A vs B
          player2Id: loserId, // Loser from WB Semifinal
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('LB_Final')
        });
      } else if (matchId === 'lbsf') {
        // LB Semifinal completed, loser gets 3rd place
        finalRankings = {
          ...finalRankings,
          third: loserId
        };
        
        // Create Final: WB winner vs LB winner
        const wb2Match = matches.find(m => m.id === 'wb2');
        const wb2Winner = wb2Match?.winnerId;
        
        updatedMatches.push({
          id: 'final', // Final match
          player1Id: winnerId, // LB Semifinal winner
          player2Id: wb2Winner!, // WB winner
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('Final')
        });
      } else if (matchId === 'final') {
        // Check if WB winner won the final
        const wb2Match = matches.find(m => m.id === 'wb2');
        const wb2Winner = wb2Match?.winnerId;
        const lbsfMatch = matches.find(m => m.id === 'lbsf');
        const thirdId = lbsfMatch ? (lbsfMatch.player1Id === lbsfMatch.winnerId ? lbsfMatch.player2Id : lbsfMatch.player1Id) : undefined;
        if (winnerId === wb2Winner) {
          // WB winner won final - tournament over
          finalRankings = {
            ...finalRankings,
            first: winnerId,
            second: loserId,
            third: thirdId
          };
          finalTournamentComplete = true;
          setRankings(finalRankings);
          setTournamentComplete(finalTournamentComplete);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(finalRankings);
          }
        } else {
          // LB winner won final - need Grand Final
          // Balance table positions: Final winner was on left table, so goes to right table in grand final
          // WB winner was on right table in final, so goes to left table in grand final
          const finalMatch = matches.find(m => m.id === 'final');
          const finalWinnerWasPlayer1 = finalMatch?.player1Id === winnerId;
          
          updatedMatches.push({
            id: 'grandfinal',
            player1Id: finalWinnerWasPlayer1 ? wb2Winner! : winnerId, // Swap positions for fairness
            player2Id: finalWinnerWasPlayer1 ? winnerId : wb2Winner!, // Swap positions for fairness
            bracket: 'winner',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          });
        }
      } else if (matchId === 'grandfinal') {
        // Grand Final completed
        const lbsfMatch = matches.find(m => m.id === 'lbsf');
        const thirdId = lbsfMatch ? (lbsfMatch.player1Id === lbsfMatch.winnerId ? lbsfMatch.player2Id : lbsfMatch.player1Id) : undefined;
        finalRankings = {
          ...finalRankings,
          first: winnerId,
          second: loserId,
          third: thirdId
        };
        finalTournamentComplete = true;
        setRankings(finalRankings);
        setTournamentComplete(finalTournamentComplete);
        
        // Call parent's tournament complete handler
        if (onTournamentComplete) {
          onTournamentComplete(finalRankings);
        }
      }
    }
    
    setMatches(finalMatches);
    
    // Save tournament state after updating matches
    saveTournamentState(finalMatches, finalRankings, finalTournamentComplete, finalPlayerWins);
    
    // Call parent's match result handler with correct signature
    const matchForResult = matches.find(m => m.id === matchId);
    const loserForResult = matchForResult?.player1Id === winnerId ? matchForResult?.player2Id : matchForResult?.player1Id;
    onMatchResult(matchId, winnerId, loserForResult);
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
      saveTournamentState(previousState, rankings, false, playerWins);
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
        player1Id={match.player1Id}
        player2Id={match.player2Id}
        bracket={match.bracket}
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



  if (players.length < 2 || players.length > 3) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for 2-3 players only.
      </div>
    );
  }

  const activeMatches = matches.filter(m => !m.winnerId);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
              <TabSwitcher activeTab={activeTab} onTabChange={handleTabChange} />
      
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
                  
                  if (players.length === 2) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 3 : 2;
                  } else if (players.length === 3) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 5 : 4;
                  }
                  
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
              
              if (players.length === 2) {
                // 2 kişilik turnuva: Semifinal + Final + (opsiyonel) Grand Final
                totalMatches = 2; // Minimum 2 maç
                if (matches.some(m => m.id === 'grandfinal')) {
                  totalMatches = 3; // Grand Final eklendi
                }
              } else if (players.length === 3) {
                // 3 kişilik turnuva: WB1 + WB2 + LB1 + Final + (opsiyonel) Grand Final
                totalMatches = 4; // Minimum 4 maç
                if (matches.some(m => m.id === 'grandfinal')) {
                  totalMatches = 5; // Grand Final eklendi
                }
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
                  
                  if (players.length === 2) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 3 : 2;
                  } else if (players.length === 3) {
                    totalMatches = matches.some(m => m.id === 'grandfinal') ? 5 : 4;
                  }
                  
                  return totalMatches > 0 ? (completedCount / totalMatches) * 100 : 0;
                })()}%` 
              }}
            ></div>
          </div>
          {players.length === 2 && !matches.some(m => m.id === 'grandfinal') && (
            <div className="text-xs text-gray-500 mt-2">
              * Grand Final may be needed if each player wins one match
            </div>
          )}
          {players.length === 3 && !matches.some(m => m.id === 'grandfinal') && (
            <div className="text-xs text-gray-500 mt-2">
              * Grand Final may be needed if Loser Bracket champion wins the Final
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoubleElimination2; 