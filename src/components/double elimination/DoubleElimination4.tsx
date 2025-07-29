import * as React from 'react';
import { useState, useEffect } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';

const DoubleElimination4: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [, setCurrentStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(initialTab || 'active');
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});

  // Save tournament state using utility
  const saveTournamentState = (newMatches: Match[], newRankings: typeof rankings, complete: boolean) => {
    const state = {
      matches: newMatches,
      rankings: newRankings,
      tournamentComplete: complete,
      timestamp: Date.now()
    };
    console.log('Saving tournament state:', state);
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(4, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(4, playerIds, fixtureId);
      if (state) {
        console.log('Loading tournament state:', state);
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        return true; // State was loaded
      }
    } catch (error) {
      console.error('Error loading tournament state:', error);
    }
    return false; // No state found
  };

  // Clear tournament state from local storage
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(4, playerIds, fixtureId);
  };


  // Initialize 4-player tournament structure
  const initializeTournament = () => {
    if (players.length !== 4) return;
    
    const newMatches: Match[] = [];
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight); // Seeded by weight

    // WB Round 1: A vs B and C vs D
    newMatches.push({
      id: 'wb1-1',
      player1Id: sortedPlayers[0].id, // A (highest seed)
      player2Id: sortedPlayers[1].id, // B (second seed)
      bracket: 'winner',
      round: 1,
      matchNumber: 1,
      isBye: false,
      description: 'WB Round 1: Match 1',
      tablePosition: {
        [sortedPlayers[0].id]: 'left',
        [sortedPlayers[1].id]: 'right'
      }
    });

    newMatches.push({
      id: 'wb1-2',
      player1Id: sortedPlayers[2].id, // C (third seed)
      player2Id: sortedPlayers[3].id, // D (fourth seed)
      bracket: 'winner',
      round: 1,
      matchNumber: 2,
      isBye: false,
      description: 'WB Round 1: Match 2',
      tablePosition: {
        [sortedPlayers[2].id]: 'left',
        [sortedPlayers[3].id]: 'right'
      }
    });
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentStage('WB Round 1');
    saveTournamentState(newMatches, {}, false);
  };

  // Load state on component mount
  useEffect(() => {
    if (players.length === 4) {
      if (!loadTournamentState()) {
        initializeTournament();
      }
    }
  }, [players]); // Add players dependency to ensure state loads when players change

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
    const updatedMatches = matches.map(match => {
      if (match.id === matchId) {
        return { ...match, winnerId };
      }
      return match;
    });

    // Create next matches based on current match result
    const newMatches = [...updatedMatches];

    if (matchId === 'wb1-1' || matchId === 'wb1-2') {
      // Check if both WB Round 1 matches are completed
      const wb1_1 = updatedMatches.find(m => m.id === 'wb1-1');
      const wb1_2 = updatedMatches.find(m => m.id === 'wb1-2');
      
      if (wb1_1?.winnerId && wb1_2?.winnerId) {
        // Create WB Semifinal
        newMatches.push({
          id: 'wb2-1',
          player1Id: wb1_1.winnerId,
          player2Id: wb1_2.winnerId,
          bracket: 'winner',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: 'WB Semifinal',
          tablePosition: {
            [wb1_1.winnerId]: 'left',
            [wb1_2.winnerId]: 'right'
          }
        });

        // Create LB Round 1
        newMatches.push({
          id: 'lb1-1',
          player1Id: wb1_1.player1Id === wb1_1.winnerId ? wb1_1.player2Id : wb1_1.player1Id,
          player2Id: wb1_2.player1Id === wb1_2.winnerId ? wb1_2.player2Id : wb1_2.player1Id,
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: 'LB Round 1',
          tablePosition: {
            [wb1_1.player1Id === wb1_1.winnerId ? wb1_1.player2Id : wb1_1.player1Id]: 'left',
            [wb1_2.player1Id === wb1_2.winnerId ? wb1_2.player2Id : wb1_2.player1Id]: 'right'
          }
        });
        
        setCurrentStage('WB Semifinal & LB Round 1');
      }
    } else if (matchId === 'wb2-1') {
      // WB Semifinal completed - create Final
      const lb1 = updatedMatches.find(m => m.id === 'lb1-1');
      if (lb1?.winnerId) {
        newMatches.push({
          id: 'final-1',
          player1Id: winnerId, // WB winner
          player2Id: lb1.winnerId, // LB winner
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: 'Final',
          tablePosition: {
            [winnerId]: 'left',
            [lb1.winnerId]: 'right'
          }
        });
        
        setCurrentStage('Final');
      }
    } else if (matchId === 'lb1-1') {
      // LB Round 1 completed - check if we can create LB Final
      const wb2 = updatedMatches.find(m => m.id === 'wb2-1');
      if (wb2?.winnerId) {
        newMatches.push({
          id: 'lb2-1',
          player1Id: winnerId, // LB Round 1 winner
          player2Id: wb2.player1Id === wb2.winnerId ? wb2.player2Id : wb2.player1Id, // WB loser
          bracket: 'loser',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: 'LB Final',
          tablePosition: {
            [winnerId]: 'left',
            [wb2.player1Id === wb2.winnerId ? wb2.player2Id : wb2.player1Id]: 'right'
          }
        });
        
        setCurrentStage('LB Final');
      }
    } else if (matchId === 'lb2-1') {
      // LB Final completed - check if we can create Final
      const wb2 = updatedMatches.find(m => m.id === 'wb2-1');
      if (wb2?.winnerId) {
        newMatches.push({
        id: 'final-1',
          player1Id: wb2.winnerId, // WB winner
          player2Id: winnerId, // LB winner
        bracket: 'winner',
        round: 3,
        matchNumber: 1,
        isBye: false,
        description: 'Final',
        tablePosition: {
            [wb2.winnerId]: 'left',
          [winnerId]: 'right'
        }
      });
      
        setCurrentStage('Final');
      }
    } else if (matchId === 'final-1') {
      // Final completed - tournament is over
      const finalMatch = updatedMatches.find(m => m.id === 'final-1');
      const loserId = finalMatch?.player1Id === winnerId ? finalMatch?.player2Id : finalMatch?.player1Id;
      
      // Determine 3rd and 4th place
      const lb2 = updatedMatches.find(m => m.id === 'lb2-1');
      const lb1 = updatedMatches.find(m => m.id === 'lb1-1');
      
      let thirdPlace = '';
      let fourthPlace = '';
      
      if (lb2?.winnerId === winnerId) {
        // LB winner won final
        thirdPlace = lb2.player1Id === winnerId ? lb2.player2Id : lb2.player1Id;
        fourthPlace = lb1?.winnerId === lb2?.winnerId ? 
          (lb1.player1Id === lb1.winnerId ? lb1.player2Id : lb1.player1Id) : (lb1?.winnerId || '');
      } else {
        // WB winner won final
        thirdPlace = lb2?.winnerId || '';
        fourthPlace = lb2?.player1Id === lb2?.winnerId ? (lb2?.player2Id || '') : (lb2?.player1Id || '');
      }
      
      const finalRankings = {
        first: winnerId,
        second: loserId,
        third: thirdPlace,
        fourth: fourthPlace
      };
      
      setRankings(finalRankings);
      setTournamentComplete(true);
      setCurrentStage('Tournament Complete');
      
      // Save state with final rankings
      saveTournamentState(newMatches, finalRankings, true);
      
      // Call parent's tournament complete handler
      if (onTournamentComplete) {
        onTournamentComplete(finalRankings);
      }
    }
    
    setMatches(newMatches);
    
    // Only save state if tournament is not complete (for final match, we already saved above)
    if (matchId !== 'final-1') {
      saveTournamentState(newMatches, rankings, tournamentComplete);
    }
    
         // Call parent's match result handler
     const matchForResult = matches.find(m => m.id === matchId);
     if (matchForResult) {
       const loserForResult = matchForResult.player1Id === winnerId ? matchForResult.player2Id : matchForResult.player1Id;
       onMatchResult(matchId, winnerId, loserForResult);
     }
  };


  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
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
        bracket={match.bracket as 'winner' | 'loser'}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
        playersLength={players.length}
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Reset Tournament Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => {
            if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
              clearTournamentState();
              initializeTournament();
              setSelectedWinner({});
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Turnuvayı Sıfırla
        </button>
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
                  
                  if (players.length === 4) {
                    // 4 kişilik turnuva: WB1-1, WB1-2, WB2-1, LB1-1, LB2-1, Final
                    totalMatches = 6; // Minimum 6 maç
                    if (matches.some(m => m.id === 'grand-final')) {
                      totalMatches = 7; // Grand Final eklendi
                    }
                  }
                  
                      return `${completedCount} / ${totalMatches} maç başarıyla tamamlandı.`;
                })()}
                  </p>
                  <p className="text-green-700 text-lg mb-6">
                    Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
                  </p>
                  <button
                    onClick={() => setActiveTab('rankings')}
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

      {/* Turnuva ilerlemesi sadece aktif sekmede gösterilsin */}
      {activeTab === 'active' && !tournamentComplete && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            {(() => {
              const completedCount = matches.filter(m => m.winnerId).length;
              let totalMatches = 0;
              
              if (players.length === 4) {
                // 4 kişilik turnuva: WB1-1, WB1-2, WB2-1, LB1-1, LB2-1, Final
                totalMatches = 6; // Minimum 6 maç
                if (matches.some(m => m.id === 'grand-final')) {
                  totalMatches = 7; // Grand Final eklendi
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
                  
                  if (players.length === 4) {
                    totalMatches = matches.some(m => m.id === 'grand-final') ? 7 : 6;
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

export default DoubleElimination4; 