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
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

const ROUND_ORDER = [
  'WB1',
  'LB1', 
  'WB2',
  'LB2',
  'WB3',
  'LB3',
  '7-8',
  'LB4',
  '5-6',
  'Final',
  'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination8: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
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
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [isUndoing, setIsUndoing] = useState(false);

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
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        setMatchHistory(state.matchHistory || []);
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
    DoubleEliminationStorage.clearDoubleEliminationState(8, playerIds, fixtureId);
  };

  // Get current round matches
  const getCurrentRoundMatches = (roundKey: RoundKey, matchList: Match[]): Match[] => {
    switch (roundKey) {
      case 'WB1':
        return matchList.filter(m => m.id.startsWith('wb1-'));
      case 'LB1':
        return matchList.filter(m => m.id.startsWith('lb1-'));
      case 'WB2':
        return matchList.filter(m => m.id.startsWith('wb2-'));
      case 'LB2':
        return matchList.filter(m => m.id.startsWith('lb2-'));
      case 'WB3':
        return matchList.filter(m => m.id === 'wb3');
      case 'LB3':
        return matchList.filter(m => m.id === 'lb3');
      case '7-8':
        return matchList.filter(m => m.id === 'place78');
      case 'LB4':
        return matchList.filter(m => m.id === 'lb4');
      case '5-6':
        return matchList.filter(m => m.id === 'place56');
      case 'Final':
        return matchList.filter(m => m.id === 'final');
      case 'GrandFinal':
        return matchList.filter(m => m.id === 'grandfinal');
      default:
        return [];
    }
  };

  // Check if current round is complete
  const isCurrentRoundComplete = (roundKey: RoundKey, matchList: Match[]): boolean => {
    const roundMatches = getCurrentRoundMatches(roundKey, matchList);
    return roundMatches.length > 0 && roundMatches.every(m => m.winnerId);
  };

  // Get next round key
  const getNextRoundKey = (currentKey: RoundKey): RoundKey | null => {
    const currentIndex = ROUND_ORDER.indexOf(currentKey);
    if (currentIndex < ROUND_ORDER.length - 1) {
      return ROUND_ORDER[currentIndex + 1];
    }
    return null;
  };

  // Create matches for next round
  const createNextRoundMatches = (roundKey: RoundKey, matchList: Match[]): Match[] => {
    const newMatches: Match[] = [];

    switch (roundKey) {
      case 'LB1': {
        // LB1: 4 losers from WB1 play, 2 winners advance to LB2, 2 losers go to 7-8
        const wb1Matches = matchList.filter(m => m.id.startsWith('wb1-'));
        const losers = wb1Matches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        );
        
        newMatches.push({
          id: 'lb1-1',
          player1Id: losers[0],
          player2Id: losers[1],
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB1', 1)
        });
        
        newMatches.push({
          id: 'lb1-2',
          player1Id: losers[2],
          player2Id: losers[3],
          bracket: 'loser',
          round: 1,
          matchNumber: 2,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB1', 2)
        });
        break;
      }

      case 'WB2': {
        // WB2: 4 winners from WB1 play, 2 winners advance to WB3, 2 losers go to LB2
        const wb1Matches = matchList.filter(m => m.id.startsWith('wb1-'));
        const winners = wb1Matches.map(m => m.winnerId!);
        
        newMatches.push({
          id: 'wb2-1',
          player1Id: winners[0],
          player2Id: winners[1],
          bracket: 'winner',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('WB2', 1)
        });
        
        newMatches.push({
          id: 'wb2-2',
          player1Id: winners[2],
          player2Id: winners[3],
          bracket: 'winner',
          round: 2,
          matchNumber: 2,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('WB2', 2)
        });
        break;
      }

      case 'LB2': {
        // LB2: 2 winners from LB1 + 2 losers from WB2
        const lb1Matches = matchList.filter(m => m.id.startsWith('lb1-'));
        const lb1Winners = lb1Matches.map(m => m.winnerId!);
        
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-'));
        const wb2Losers = wb2Matches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        );
        
        // Pair players who haven't played each other in WB1
        const wb1Matches = matchList.filter(m => m.id.startsWith('wb1-'));
        const wb1Pairs = wb1Matches.map(m => [m.player1Id, m.player2Id]);
        
        // Find players who haven't played each other
        const findUnplayedPair = (players: string[], pairs: string[][]) => {
          for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
              const pair = [players[i], players[j]].sort();
              const hasPlayed = pairs.some(p => 
                p.sort().join(',') === pair.join(',')
              );
              if (!hasPlayed) {
                return [players[i], players[j]];
              }
            }
          }
          return [players[0], players[1]]; // Fallback
        };
        
        const lb2Pair1 = findUnplayedPair([...lb1Winners, ...wb2Losers], wb1Pairs);
        const lb2Pair2 = [lb1Winners[0], lb1Winners[1]].filter(p => !lb2Pair1.includes(p));
        const lb2Pair2Remaining = wb2Losers.filter(p => !lb2Pair1.includes(p));
        
        newMatches.push({
          id: 'lb2-1',
          player1Id: lb2Pair1[0],
          player2Id: lb2Pair1[1],
          bracket: 'loser',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB2', 1)
        });
        
        newMatches.push({
          id: 'lb2-2',
          player1Id: lb2Pair2[0] || lb2Pair2Remaining[0],
          player2Id: lb2Pair2[1] || lb2Pair2Remaining[1],
          bracket: 'loser',
          round: 2,
          matchNumber: 2,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB2', 2)
        });
        break;
      }

      case 'WB3': {
        // WB3: 2 winners from WB2 play (Semifinal)
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-'));
        const wb2Winners = wb2Matches.map(m => m.winnerId!);
        
        newMatches.push({
          id: 'wb3',
          player1Id: wb2Winners[0],
          player2Id: wb2Winners[1],
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
        });
        break;
      }

      case 'LB3': {
        // LB3: 2 winners from LB2 play
        const lb2Matches = matchList.filter(m => m.id.startsWith('lb2-'));
        const lb2Winners = lb2Matches.map(m => m.winnerId!);
        
        newMatches.push({
          id: 'lb3',
          player1Id: lb2Winners[0],
          player2Id: lb2Winners[1],
          bracket: 'loser',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('LB3')
        });
        break;
      }

      case '7-8': {
        // 7-8: 2 losers from LB1 play
        const lb1Matches = matchList.filter(m => m.id.startsWith('lb1-'));
        const lb1Losers = lb1Matches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        );
        
        newMatches.push({
          id: 'place78',
          player1Id: lb1Losers[0],
          player2Id: lb1Losers[1],
          bracket: 'placement',
          round: 3,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('7-8')
        });
        break;
      }

      case 'LB4': {
        // LB4: Winner from LB3 vs Loser from WB3
        const lb3Winner = matchList.find(m => m.id === 'lb3')!.winnerId!;
        const wb3Loser = matchList.find(m => m.id === 'wb3')!.player1Id === matchList.find(m => m.id === 'wb3')!.winnerId ? 
                         matchList.find(m => m.id === 'wb3')!.player2Id : matchList.find(m => m.id === 'wb3')!.player1Id;
        
        newMatches.push({
          id: 'lb4',
          player1Id: lb3Winner,
          player2Id: wb3Loser,
          bracket: 'loser',
          round: 4,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('LB_Final')
        });
        break;
      }

      case '5-6': {
        // 5-6: 2 losers from LB2 play
        const lb2Matches = matchList.filter(m => m.id.startsWith('lb2-'));
        const lb2Losers = lb2Matches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        );
        
        newMatches.push({
          id: 'place56',
          player1Id: lb2Losers[0],
          player2Id: lb2Losers[1],
          bracket: 'placement',
          round: 4,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('5-6')
        });
        break;
      }

      case 'Final': {
        // Final: Winner from WB3 vs Winner from LB4
        const wb3Winner = matchList.find(m => m.id === 'wb3')!.winnerId!;
        const lb4Winner = matchList.find(m => m.id === 'lb4')!.winnerId!;
        
        newMatches.push({
          id: 'final',
          player1Id: wb3Winner,
          player2Id: lb4Winner,
          bracket: 'winner',
          round: 5,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('Final')
        });
        break;
      }

      case 'GrandFinal': {
        // Grand Final: Only if LB4 winner wins the final
        const finalMatch = matchList.find(m => m.id === 'final')!;
        const wb3Winner = matchList.find(m => m.id === 'wb3')!.winnerId!;
        
        if (finalMatch.winnerId !== wb3Winner) {
          newMatches.push({
            id: 'grandfinal',
            player1Id: wb3Winner,
            player2Id: finalMatch.winnerId!,
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          });
        }
        break;
      }
    }

    return newMatches;
  };

  // Initialize tournament for 8 players
  const initializeTournament = () => {
    clearTournamentState();
    const newMatches: Match[] = [];
    // Shuffle players randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    if (players.length === 8) {
      // WB Round 1: Random pairing
      newMatches.push({
        id: 'wb1-1',
        player1Id: shuffledPlayers[0].id,
        player2Id: shuffledPlayers[1].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.createMatchDescription('WB1', 1)
      });
      
      newMatches.push({
        id: 'wb1-2',
        player1Id: shuffledPlayers[2].id,
        player2Id: shuffledPlayers[3].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: false,
        description: RoundDescriptionUtils.createMatchDescription('WB1', 2)
      });

      newMatches.push({
        id: 'wb1-3',
        player1Id: shuffledPlayers[4].id,
        player2Id: shuffledPlayers[5].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 3,
        isBye: false,
        description: RoundDescriptionUtils.createMatchDescription('WB1', 3)
      });

      newMatches.push({
        id: 'wb1-4',
        player1Id: shuffledPlayers[6].id,
        player2Id: shuffledPlayers[7].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 4,
        isBye: false,
        description: RoundDescriptionUtils.createMatchDescription('WB1', 4)
      });
    }
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    saveTournamentState(newMatches, {}, false, 'WB1');
  };

  useEffect(() => {
    if (players.length === 8) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, []);

  // Auto-complete bye matches
  useEffect(() => {
    const byeMatches = matches.filter(m => m.isBye && !m.winnerId);
    if (byeMatches.length > 0) {
      const updatedMatches = matches.map(match => 
        match.isBye && !match.winnerId 
          ? { ...match, winnerId: match.player1Id }
          : match
      );
      setMatches(updatedMatches);
      const state = {
        matches: updatedMatches,
        rankings: rankings,
        tournamentComplete: tournamentComplete,
        currentRoundKey: currentRoundKey,
        matchHistory: matchHistory,
        timestamp: new Date().toISOString()
      };
      const playerIds = players.map(p => p.id).sort().join('-');
      DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey, matchHistory]);

  // Check for round completion and create next round
  useEffect(() => {
    if (!isUndoing && isCurrentRoundComplete(currentRoundKey, matches)) {
      const nextRoundKey = getNextRoundKey(currentRoundKey);
      if (nextRoundKey) {
        const newMatches = createNextRoundMatches(nextRoundKey, matches);
        if (newMatches.length > 0) {
          const updatedMatches = [...matches, ...newMatches];
          setMatches(updatedMatches);
          setCurrentRoundKey(nextRoundKey);
          const state = {
            matches: updatedMatches,
            rankings: rankings,
            tournamentComplete: tournamentComplete,
            currentRoundKey: nextRoundKey,
            matchHistory: matchHistory,
            timestamp: new Date().toISOString()
          };
          const playerIds = players.map(p => p.id).sort().join('-');
          DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
        }
      }
    }
  }, [matches, currentRoundKey, rankings, tournamentComplete, isUndoing, matchHistory]);

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
    
    // Handle placement matches
    if (matchId === 'place78') {
      finalRankings = { ...finalRankings, seventh: winnerId, eighth: loserId };
    } else if (matchId === 'place56') {
      finalRankings = { ...finalRankings, fifth: winnerId, sixth: loserId };
    } else if (matchId === 'lb3') {
      finalRankings = { ...finalRankings, fourth: loserId };
    } else if (matchId === 'lb4') {
      finalRankings = { ...finalRankings, third: loserId };
    } else if (matchId === 'final') {
      const wb3Winner = finalMatches.find(m => m.id === 'wb3')!.winnerId;
      if (winnerId === wb3Winner) {
        // WB winner won, tournament complete
        finalRankings = { ...finalRankings, first: winnerId, second: loserId };
        finalTournamentComplete = true;
      }
      // If LB winner won, Grand Final will be created automatically
    } else if (matchId === 'grandfinal') {
      finalRankings = { ...finalRankings, first: winnerId, second: loserId };
      finalTournamentComplete = true;
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    
    // Update match history before saving
    const updatedMatchHistory = isUndoing ? matchHistory : [...matchHistory, [...matches]];
    const state = {
      matches: finalMatches,
      rankings: finalRankings,
      tournamentComplete: finalTournamentComplete,
      currentRoundKey: currentRoundKey,
      matchHistory: updatedMatchHistory,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
    
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Call parent's tournament complete handler if tournament is complete
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
  };

  const undoLastMatch = () => {
    if (matchHistory.length > 0) {
      setIsUndoing(true);
      
      const previousState = matchHistory[matchHistory.length - 1];
      const currentState = matches;
      
      // Find which match was undone by comparing current and previous states
      const undoneMatch = currentState.find(match => 
        match.winnerId && !previousState.find(pm => pm.id === match.id)?.winnerId
      );
      
      // Find the current round key for the previous state
      let previousRoundKey = currentRoundKey;
      for (const roundKey of ROUND_ORDER) {
        const roundMatches = getCurrentRoundMatches(roundKey, previousState);
        if (roundMatches.length > 0 && roundMatches.some(m => !m.winnerId)) {
          previousRoundKey = roundKey;
          break;
        }
      }
      
      setMatches(previousState);
      setMatchHistory(prev => prev.slice(0, -1));
      setCurrentRoundKey(previousRoundKey);
      
      // Reset tournament completion if we're going back
      if (tournamentComplete) {
        setTournamentComplete(false);
      }
      
      // Remove rankings that were affected by the undone match
      let updatedRankings = { ...rankings };
      
      if (undoneMatch) {
        const matchId = undoneMatch.id;
        
        // Remove rankings based on the undone match
        if (matchId === 'place78') {
          delete updatedRankings.seventh;
          delete updatedRankings.eighth;
        } else if (matchId === 'place56') {
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
        } else if (matchId === 'lb3') {
          delete updatedRankings.fourth;
        } else if (matchId === 'lb4') {
          delete updatedRankings.third;
        } else if (matchId === 'final') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        } else if (matchId === 'grandfinal') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        }
      }
      
      setRankings(updatedRankings);
      
      // Clear any selected winners for matches that no longer exist
      const previousMatchIds = previousState.map(m => m.id);
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
        matches: previousState,
        rankings: updatedRankings,
        tournamentComplete: false,
        currentRoundKey: previousRoundKey,
        matchHistory: updatedMatchHistory,
        timestamp: new Date().toISOString()
      };
      const playerIds = players.map(p => p.id).sort().join('-');
      DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
      
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
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
  const currentRoundMatches = getCurrentRoundMatches(currentRoundKey, matches);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
      <p className="text-center text-gray-600 mb-4">
        Current Round: {RoundDescriptionUtils.getDisplayName(currentRoundKey)}
      </p>
      
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
      
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !tournamentComplete && currentRoundMatches.length > 0 && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              const roundMatches = currentRoundMatches.filter(m => !m.isBye && !m.winnerId);
              roundMatches.forEach(match => {
                // Her maç için rastgele bir kazanan seç
                const winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
                handleMatchResult(match.id, winnerId);
              });
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Bu Turun Kazananlarını Otomatik Seç
          </button>
        </div>
      )}
      
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