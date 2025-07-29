import * as React from 'react';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';

const ROUND_ORDER = [
  'WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB3', 'LB4', 'WB4', 'LB5', 'LB6', 'WB5', 'LB7', 'LB8', 'WB6', 'LB9', 'LB10', 'WB7', 'LB11', 'YariFinal', 'LB12', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination129_191Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination129_191: React.FC<DoubleElimination129_191Props> = ({ players, resetKey, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(initialTab || 'active');
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      timestamp: new Date().toISOString()
    };
    console.log('Saving tournament state:', {
      matchesCount: matchesState.length,
      currentRoundKey: roundKey,
      matches: matchesState.map(m => ({ id: m.id, roundKey: getMatchRoundKey(m) }))
    });
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(129, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(129, playerIds, fixtureId);
      if (state) {
        console.log('Loading tournament state:', {
          matchesCount: state.matches?.length || 0,
          currentRoundKey: state.currentRoundKey,
          matches: state.matches?.map((m: any) => ({ id: m.id, roundKey: getMatchRoundKey(m) })) || []
        });
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
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
    DoubleEliminationStorage.clearDoubleEliminationState(129, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    console.log('Initializing tournament with', players.length, 'players');
    clearTournamentState();
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
    const totalSlots = 256; // 129-191 players need 256 slots
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = sortedPlayers.slice(0, byesNeeded);
    const playersForMatches = sortedPlayers.slice(byesNeeded);
    const wb1Matches: Match[] = [];
    
    console.log('Tournament setup:', {
      totalSlots,
      byesNeeded,
      playersWithByesCount: playersWithByes.length,
      playersForMatchesCount: playersForMatches.length
    });
    
    // WB1: Pair up remaining players
    for (let i = 0; i < playersForMatches.length; i += 2) {
      if (i + 1 < playersForMatches.length) {
        wb1Matches.push({
          id: `wb1_${Math.floor(i/2) + 1}`,
          player1Id: playersForMatches[i].id,
          player2Id: playersForMatches[i + 1].id,
          bracket: 'winner',
          round: 1,
          matchNumber: Math.floor(i/2) + 1,
          isBye: false,
          description: `WB Round 1 - Match ${Math.floor(i/2) + 1}`
        });
      }
    }
    
    // WB1: Byes
    playersWithByes.forEach((player, index) => {
      wb1Matches.push({
        id: `wb1_bye_${index + 1}`,
        player1Id: player.id,
        player2Id: '',
        bracket: 'winner',
        round: 1,
        matchNumber: wb1Matches.length + 1,
        isBye: true,
        description: `WB Round 1 - Bye for ${player.name} ${player.surname}`
      });
    });
    
    console.log('Created', wb1Matches.length, 'WB1 matches');
    setMatches(wb1Matches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
  };

  React.useEffect(() => {
    console.log('DoubleElimination129_191 useEffect - players:', players.length);
    if (players.length >= 129 && players.length <= 191) {
      const stateLoaded = loadTournamentState();
      console.log('State loaded:', stateLoaded);
      if (!stateLoaded) {
        console.log('Initializing tournament...');
        initializeTournament();
      }
    }
  }, []); // Remove players dependency to prevent re-initialization

  React.useEffect(() => {
    if (typeof resetKey !== 'undefined') {
      initializeTournament();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey]);

  // Recalculate rankings when tournament is complete
  React.useEffect(() => {
    if (tournamentComplete && matches.length > 0) {
      const recalculatedRankings = calculateRankings(matches);
      if (JSON.stringify(recalculatedRankings) !== JSON.stringify(rankings)) {
        setRankings(recalculatedRankings);
        saveTournamentState(matches, recalculatedRankings, tournamentComplete, currentRoundKey);
      }
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    const nonByeMatches = roundMatches.filter(m => !m.isBye);
    const byeMatches = roundMatches.filter(m => m.isBye);
    
    console.log('isRoundComplete Debug:', {
      roundKey,
      roundMatchesCount: roundMatches.length,
      nonByeMatchesCount: nonByeMatches.length,
      byeMatchesCount: byeMatches.length,
      nonByeMatchesWithWinners: nonByeMatches.filter(m => m.winnerId).length,
      allNonByeHaveWinners: nonByeMatches.every(m => m.winnerId)
    });
    
    if (nonByeMatches.length === 0 && byeMatches.length > 0) {
      return true;
    }
    return nonByeMatches.length > 0 && nonByeMatches.every(m => m.winnerId);
  };

  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('wb5')) return 'WB5';
    if (match.id.startsWith('wb6')) return 'WB6';
    if (match.id.startsWith('wb7')) return 'WB7';
    if (match.id.startsWith('lb10')) return 'LB10';
    if (match.id.startsWith('lb11')) return 'LB11';
    if (match.id.startsWith('lb12')) return 'LB12';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id.startsWith('lb5')) return 'LB5';
    if (match.id.startsWith('lb6')) return 'LB6';
    if (match.id.startsWith('lb7')) return 'LB7';
    if (match.id.startsWith('lb8')) return 'LB8';
    if (match.id.startsWith('lb9')) return 'LB9';
    if (match.id.startsWith('yarifinal')) return 'YariFinal';
    if (match.id === 'seventh_eighth') return '7-8';
    if (match.id === 'lbfinal') return 'LBFinal';
    if (match.id === 'fifth_sixth') return '5-6';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
    return 'WB1';
  }

  // --- Next Round Creation ---
  React.useEffect(() => {
    if (matches.length === 0) return;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    console.log('useEffect Debug:', {
      currentRoundKey,
      currentIdx,
      isLastRound: currentIdx === ROUND_ORDER.length - 1,
      isRoundComplete: isRoundComplete(currentRoundKey, matches),
      matchesLength: matches.length
    });
    
    if (currentIdx === -1 || currentIdx === ROUND_ORDER.length - 1) return;
    if (!isRoundComplete(currentRoundKey, matches)) return;
    
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    console.log('Creating next round:', nextRoundKey);
    
    const newMatches = createNextRound();
    console.log('New matches created:', newMatches.length);
    
    if (newMatches.length > 0) {
      const updatedMatches = [...matches, ...newMatches];
      setMatches(updatedMatches);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches]);

  // Debug useEffect to track currentRoundKey changes
  React.useEffect(() => {
    console.log('CurrentRoundKey changed to:', currentRoundKey);
    const matchesForCurrentRound = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);
    console.log('Matches for current round:', matchesForCurrentRound.length, matchesForCurrentRound.map(m => m.id));
  }, [currentRoundKey, matches]);

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'WB2': {
        const wb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.isBye).map(m => m.player1Id);
        const wb2Players = [...wb1Winners, ...wb1Byes];
        if (wb2Players.length !== 128) return [];
        const wb2Matches: Match[] = [];
        for (let i = 0; i < wb2Players.length; i += 2) {
          if (i + 1 < wb2Players.length) {
            wb2Matches.push({
              id: `wb2_${Math.floor(i/2) + 1}`,
              player1Id: wb2Players[i],
              player2Id: wb2Players[i + 1],
              bracket: 'winner',
              round: 2,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 2 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb2Matches;
      }
      case 'LB1': {
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const wb2Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb1Players = [...wb1Losers, ...wb2Losers];
        const byesNeeded = 128 - lb1Players.length;
        const byePlayers = lb1Players.slice(0, byesNeeded);
        const matchPlayers = lb1Players.slice(byesNeeded);
        const lb1Matches: Match[] = [];
        
        byePlayers.forEach((playerId, i) => {
          lb1Matches.push({
            id: `lb1_bye_${i+1}`,
            player1Id: playerId,
            player2Id: '',
            bracket: 'loser',
            round: 1,
            matchNumber: i+1,
            isBye: true,
            description: `LB Round 1 - Bye for ${getPlayerName(playerId)}`
          });
        });
        
        for (let i = 0; i < matchPlayers.length; i += 2) {
          if (i + 1 < matchPlayers.length) {
            lb1Matches.push({
              id: `lb1_${Math.floor(i/2)+1}`,
              player1Id: matchPlayers[i],
              player2Id: matchPlayers[i+1],
              bracket: 'loser',
              round: 1,
              matchNumber: byesNeeded + Math.floor(i/2)+1,
              isBye: false,
              description: `LB Round 1 - Match ${Math.floor(i/2)+1}`
            });
          }
        }
        return lb1Matches;
      }
      case 'LB2': {
        const lb1Winners = [...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.winnerId && !m.isBye).map(m => m.winnerId!), ...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.isBye).map(m => m.player1Id)];
        if (lb1Winners.length !== 64) return [];
        const lb2Matches: Match[] = [];
        for (let i = 0; i < lb1Winners.length; i += 2) {
          if (i + 1 < lb1Winners.length) {
            lb2Matches.push({
              id: `lb2_${Math.floor(i/2) + 1}`,
              player1Id: lb1Winners[i],
              player2Id: lb1Winners[i + 1],
              bracket: 'loser',
              round: 2,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 2 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb2Matches;
      }
      case 'WB3': {
        const wb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb2Winners.length !== 64) return [];
        const wb3Matches: Match[] = [];
        for (let i = 0; i < wb2Winners.length; i += 2) {
          if (i + 1 < wb2Winners.length) {
            wb3Matches.push({
              id: `wb3_${Math.floor(i/2) + 1}`,
              player1Id: wb2Winners[i],
              player2Id: wb2Winners[i + 1],
              bracket: 'winner',
              round: 3,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 3 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb3Matches;
      }
      case 'LB3': {
        const lb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb3Players = [...lb2Winners, ...wb3Losers];
        if (lb3Players.length !== 64) return [];
        const lb3Matches: Match[] = [];
        for (let i = 0; i < lb3Players.length; i += 2) {
          if (i + 1 < lb3Players.length) {
            lb3Matches.push({
              id: `lb3_${Math.floor(i/2) + 1}`,
              player1Id: lb3Players[i],
              player2Id: lb3Players[i + 1],
              bracket: 'loser',
              round: 3,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 3 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb3Matches;
      }
      case 'LB4': {
        const lb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb3Winners.length !== 32) return [];
        const lb4Matches: Match[] = [];
        for (let i = 0; i < lb3Winners.length; i += 2) {
          if (i + 1 < lb3Winners.length) {
            lb4Matches.push({
              id: `lb4_${Math.floor(i/2) + 1}`,
              player1Id: lb3Winners[i],
              player2Id: lb3Winners[i + 1],
              bracket: 'loser',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 4 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb4Matches;
      }
      case 'WB4': {
        const wb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb3Winners.length !== 32) return [];
        const wb4Matches: Match[] = [];
        for (let i = 0; i < wb3Winners.length; i += 2) {
          if (i + 1 < wb3Winners.length) {
            wb4Matches.push({
              id: `wb4_${Math.floor(i/2) + 1}`,
              player1Id: wb3Winners[i],
              player2Id: wb3Winners[i + 1],
              bracket: 'winner',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 4 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb4Matches;
      }
      case 'LB5': {
        const lb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb4Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb5Players = [...lb4Winners, ...wb4Losers];
        if (lb5Players.length !== 32) return [];
        const lb5Matches: Match[] = [];
        for (let i = 0; i < lb5Players.length; i += 2) {
          if (i + 1 < lb5Players.length) {
            lb5Matches.push({
              id: `lb5_${Math.floor(i/2) + 1}`,
              player1Id: lb5Players[i],
              player2Id: lb5Players[i + 1],
              bracket: 'loser',
              round: 5,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 5 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb5Matches;
      }
      case 'LB6': {
        const lb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb5Winners.length !== 16) return [];
        const lb6Matches: Match[] = [];
        for (let i = 0; i < lb5Winners.length; i += 2) {
          if (i + 1 < lb5Winners.length) {
            lb6Matches.push({
              id: `lb6_${Math.floor(i/2) + 1}`,
              player1Id: lb5Winners[i],
              player2Id: lb5Winners[i + 1],
              bracket: 'loser',
              round: 6,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 6 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb6Matches;
      }
      case 'WB5': {
        const wb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb4Winners.length !== 16) return [];
        const wb5Matches: Match[] = [];
        for (let i = 0; i < wb4Winners.length; i += 2) {
          if (i + 1 < wb4Winners.length) {
            wb5Matches.push({
              id: `wb5_${Math.floor(i/2) + 1}`,
              player1Id: wb4Winners[i],
              player2Id: wb4Winners[i + 1],
              bracket: 'winner',
              round: 5,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 5 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb5Matches;
      }
      case 'LB7': {
        const lb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb5Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb7Players = [...lb6Winners, ...wb5Losers];
        if (lb7Players.length !== 16) return [];
        const lb7Matches: Match[] = [];
        for (let i = 0; i < lb7Players.length; i += 2) {
          if (i + 1 < lb7Players.length) {
            lb7Matches.push({
              id: `lb7_${Math.floor(i/2) + 1}`,
              player1Id: lb7Players[i],
              player2Id: lb7Players[i + 1],
              bracket: 'loser',
              round: 7,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 7 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb7Matches;
      }
      case 'LB8': {
        const lb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb7Winners.length !== 8) return [];
        const lb8Matches: Match[] = [];
        for (let i = 0; i < lb7Winners.length; i += 2) {
          if (i + 1 < lb7Winners.length) {
            lb8Matches.push({
              id: `lb8_${Math.floor(i/2) + 1}`,
              player1Id: lb7Winners[i],
              player2Id: lb7Winners[i + 1],
              bracket: 'loser',
              round: 8,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 8 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb8Matches;
      }
      case 'WB6': {
        const wb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb5Winners.length !== 8) return [];
        const wb6Matches: Match[] = [];
        for (let i = 0; i < wb5Winners.length; i += 2) {
          if (i + 1 < wb5Winners.length) {
            wb6Matches.push({
              id: `wb6_${Math.floor(i/2) + 1}`,
              player1Id: wb5Winners[i],
              player2Id: wb5Winners[i + 1],
              bracket: 'winner',
              round: 6,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 6 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb6Matches;
      }
      case 'LB9': {
        const lb8Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB8' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb6Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb9Players = [...lb8Winners, ...wb6Losers];
        if (lb9Players.length !== 8) return [];
        const lb9Matches: Match[] = [];
        for (let i = 0; i < lb9Players.length; i += 2) {
          if (i + 1 < lb9Players.length) {
            lb9Matches.push({
              id: `lb9_${Math.floor(i/2) + 1}`,
              player1Id: lb9Players[i],
              player2Id: lb9Players[i + 1],
              bracket: 'loser',
              round: 9,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 9 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb9Matches;
      }
      case 'LB10': {
        const lb9Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB9' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb9Winners.length !== 4) return [];
        const lb10Matches: Match[] = [];
        for (let i = 0; i < lb9Winners.length; i += 2) {
          if (i + 1 < lb9Winners.length) {
            lb10Matches.push({
              id: `lb10_${Math.floor(i/2) + 1}`,
              player1Id: lb9Winners[i],
              player2Id: lb9Winners[i + 1],
              bracket: 'loser',
              round: 10,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 10 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb10Matches;
      }
      case 'WB7': {
        const wb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb6Winners.length !== 4) return [];
        const wb7Matches: Match[] = [];
        for (let i = 0; i < wb6Winners.length; i += 2) {
          if (i + 1 < wb6Winners.length) {
            wb7Matches.push({
              id: `wb7_${Math.floor(i/2) + 1}`,
              player1Id: wb6Winners[i],
              player2Id: wb6Winners[i + 1],
              bracket: 'winner',
              round: 7,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 7 (Quarter Final) - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb7Matches;
      }
      case 'LB11': {
        const lb10Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb7Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb11Players = [...lb10Winners, ...wb7Losers];
        if (lb11Players.length !== 4) return [];
        const lb11Matches: Match[] = [];
        for (let i = 0; i < lb11Players.length; i += 2) {
          if (i + 1 < lb11Players.length) {
            lb11Matches.push({
              id: `lb11_${Math.floor(i/2) + 1}`,
              player1Id: lb11Players[i],
              player2Id: lb11Players[i + 1],
              bracket: 'loser',
              round: 11,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 11 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb11Matches;
      }
      case 'YariFinal': {
        const wb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb7Winners.length !== 2) return [];
        const yariFinalMatches: Match[] = [];
        for (let i = 0; i < wb7Winners.length; i += 2) {
          if (i + 1 < wb7Winners.length) {
            yariFinalMatches.push({
              id: `yarifinal_${Math.floor(i/2) + 1}`,
              player1Id: wb7Winners[i],
              player2Id: wb7Winners[i + 1],
              bracket: 'winner',
              round: 8,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `Yarı Final (WB) - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return yariFinalMatches;
      }
      case 'LB12': {
        const lb11Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB11' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb11Winners.length !== 2) return [];
        const lb12Matches: Match[] = [];
        for (let i = 0; i < lb11Winners.length; i += 2) {
          if (i + 1 < lb11Winners.length) {
            lb12Matches.push({
              id: `lb12_${Math.floor(i/2) + 1}`,
              player1Id: lb11Winners[i],
              player2Id: lb11Winners[i + 1],
              bracket: 'loser',
              round: 12,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 12 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb12Matches;
      }
      case '7-8': {
        const lb10Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        console.log('7-8 Debug:', {
          lb10Losers,
          lb10LosersLength: lb10Losers.length,
          lb10Matches: matchList.filter(m => getMatchRoundKey(m) === 'LB10').map(m => ({ id: m.id, winnerId: m.winnerId, player1Id: m.player1Id, player2Id: m.player2Id }))
        });
        if (lb10Losers.length !== 2) {
          console.log('7-8: Yeterli LB10 kaybeden yok, 2 bekleniyor ama', lb10Losers.length, 'var');
          return [];
        }
        return [{
          id: 'seventh_eighth',
          player1Id: lb10Losers[0],
          player2Id: lb10Losers[1],
          bracket: 'loser',
          round: 13,
          matchNumber: 1,
          isBye: false,
          description: '7.lik-8.lik Maçı'
        }];
      }
      case 'LBFinal': {
        const yariFinalLoser = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb12Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB12' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (yariFinalLoser.length !== 1 || lb12Winners.length !== 1) return [];
        return [{
          id: 'lbfinal',
          player1Id: lb12Winners[0],
          player2Id: yariFinalLoser[0],
          bracket: 'loser',
          round: 13,
          matchNumber: 1,
          isBye: false,
          description: 'LB Final'
        }];
      }
      case '5-6': {
        const wb7Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb10Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (wb7Losers.length !== 2 || lb10Losers.length !== 2) return [];
        return [{
          id: 'fifth_sixth',
          player1Id: wb7Losers[0],
          player2Id: lb10Losers[1],
          bracket: 'loser',
          round: 14,
          matchNumber: 1,
          isBye: false,
          description: '5.lik-6.lık Maçı'
        }];
      }
      case 'Final': {
        const yariFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lbFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (yariFinalWinners.length !== 1 || lbFinalWinners.length !== 1) return [];
        return [{
          id: 'final',
          player1Id: yariFinalWinners[0],
          player2Id: lbFinalWinners[0],
          bracket: 'winner',
          round: 14,
          matchNumber: 1,
          isBye: false,
          description: 'Final'
        }];
      }
      case 'GrandFinal': {
        const finalWinners = matchList.filter(m => getMatchRoundKey(m) === 'Final' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lbFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (finalWinners.length !== 1 || lbFinalWinners.length !== 1) return [];
        return [{
          id: 'grandfinal',
          player1Id: lbFinalWinners[0],
          player2Id: finalWinners[0],
          bracket: 'winner',
          round: 15,
          matchNumber: 1,
          isBye: false,
          description: 'Grand Final (Gerekirse)'
        }];
      }
      default:
        return [];
    }
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };


  const handleMatchResult = (matchId: string, winnerId: string) => {
    setMatches(prevMatches => {
      const updatedMatches = prevMatches.map(match => 
        match.id === matchId ? { ...match, winnerId } : match
      );

      // Her maçtan sonra anlık sıralamayı güncelle
      const newRankings = calculateRankings(updatedMatches);
      setRankings(newRankings);

      // Call the onMatchResult prop if provided
      if (onMatchResult) {
        const match = updatedMatches.find(m => m.id === matchId);
        if (match) {
          const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
          onMatchResult('double-elimination', winnerId, loserId);
        }
      }

      const finalMatch = updatedMatches.find(m => m.id === 'final');
      const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');

      if (finalMatch?.winnerId) {
        const lbfinalWinner = updatedMatches.find(m => m.id === 'lbfinal')?.winnerId;
        const finalWinner = finalMatch.winnerId;
        if (lbfinalWinner && finalWinner === lbfinalWinner) {
          // LB kazananı Final'i kazandı, Grand Final gerekli
        } else {
          // Final kazananı WB'den geldi, turnuva tamamlandı
          setTournamentComplete(true);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(newRankings || rankings);
          }
          
          saveTournamentState(updatedMatches, newRankings || rankings, true, currentRoundKey);
        }
      } else if (grandFinalMatch?.winnerId) {
        // Grand Final tamamlandı, turnuva tamamlandı
        setTournamentComplete(true);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(newRankings || rankings);
          }
          
          saveTournamentState(updatedMatches, newRankings || rankings, true, currentRoundKey);
      }

      saveTournamentState(updatedMatches, newRankings, tournamentComplete, currentRoundKey);
      return updatedMatches;
    });
  };

  const calculateRankings = (matchList: Match[]): Ranking => {
    const rankings: Ranking = {};
    const finalMatch = matchList.find(m => m.id === 'final');
    const grandFinalMatch = matchList.find(m => m.id === 'grandfinal');
    
    if (grandFinalMatch?.winnerId) {
      rankings.first = grandFinalMatch.winnerId;
      rankings.second = grandFinalMatch.winnerId === grandFinalMatch.player1Id ? grandFinalMatch.player2Id : grandFinalMatch.player1Id;
    } else if (finalMatch?.winnerId) {
      rankings.first = finalMatch.winnerId;
      rankings.second = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
    }
    
    const lbfinalMatch = matchList.find(m => m.id === 'lbfinal');
    if (lbfinalMatch?.winnerId) {
      rankings.third = lbfinalMatch.winnerId === lbfinalMatch.player1Id ? lbfinalMatch.player2Id : lbfinalMatch.player1Id;
    }
    
    const lb12Match = matchList.find(m => m.id === 'lb12_1');
    if (lb12Match?.winnerId) {
      rankings.fourth = lb12Match.winnerId === lb12Match.player1Id ? lb12Match.player2Id : lb12Match.player1Id;
    }
    
    const fifthSixthMatch = matchList.find(m => m.id === 'fifth_sixth');
    if (fifthSixthMatch?.winnerId) {
      rankings.fifth = fifthSixthMatch.winnerId;
      rankings.sixth = fifthSixthMatch.winnerId === fifthSixthMatch.player1Id ? fifthSixthMatch.player2Id : fifthSixthMatch.player1Id;
    }
    
    const seventhEighthMatch = matchList.find(m => m.id === 'seventh_eighth');
    if (seventhEighthMatch?.winnerId) {
      rankings.seventh = seventhEighthMatch.winnerId;
      rankings.eighth = seventhEighthMatch.winnerId === seventhEighthMatch.player1Id ? seventhEighthMatch.player2Id : seventhEighthMatch.player1Id;
    }
    
    return rankings;
  };

  const handleWinnerSelect = (matchId: string, winnerId: string) => {
    setSelectedWinner(prev => ({ ...prev, [matchId]: winnerId }));
  };
  const handleWinnerConfirm = (matchId: string) => {
    if (selectedWinner[matchId]) {
      handleMatchResult(matchId, selectedWinner[matchId]!);
      setSelectedWinner(prev => ({ ...prev, [matchId]: null }));
    }
  };
  const handleSelectionCancel = (matchId: string) => {
    setSelectedWinner(prev => ({ ...prev, [matchId]: null }));
  };
  const renderMatch = (match: Match) => {
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'TBD';
    const currentSelectedWinner = selectedWinner[match.id] || null;
    return (
      <MatchCard
        matchId={match.id}
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        bracket={match.bracket as 'winner' | 'loser'}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={winnerId => handleWinnerSelect(match.id, winnerId)}
        onWinnerConfirm={() => handleWinnerConfirm(match.id)}
        onSelectionCancel={() => handleSelectionCancel(match.id)}
        playersLength={players.length}
        matchTitle={match.description}
      />
    );
  };





  if (players.length < 129 || players.length > 191) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 129-191 oyuncu arası için tasarlanmıştır. 
          Mevcut oyuncu sayısı: {players.length}
        </p>
      </div>
    );
  }

  const activeRoundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);
  
  console.log('Debug Info:', {
    currentRoundKey,
    totalMatches: matches.length,
    activeRoundMatches: activeRoundMatches.length,
    playersLength: players.length,
    allMatches: matches.map(m => ({ id: m.id, roundKey: getMatchRoundKey(m), winnerId: m.winnerId })),
    activeMatches: activeRoundMatches.map(m => ({ id: m.id, roundKey: getMatchRoundKey(m), winnerId: m.winnerId })),
    currentRoundMatches: matches.filter(m => getMatchRoundKey(m) === currentRoundKey).map(m => m.id)
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Double Elimination Tournament (129-191 oyuncu)
        </h2>
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
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Aktif Tur: {currentRoundKey}</h3>
      </div>
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !tournamentComplete && activeRoundMatches.filter(m => !m.isBye && !m.winnerId).length > 0 && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              activeRoundMatches.filter(m => !m.isBye && !m.winnerId).forEach(match => {
                const winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
                handleMatchResult(match.id, winnerId);
              });
            }}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors shadow-md"
          >
            Otomatik Kazananları Seç
          </button>
        </div>
      )}
      {activeTab === 'active' && (
        <>
          {tournamentComplete ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center shadow-lg">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-green-800 mb-2">🏆 Turnuva Tamamlandı!</h2>
                  <p className="text-green-700 text-lg mb-6">
                    Tüm maçlar başarıyla tamamlandı. Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl w-full mx-auto overflow-y-auto" style={{minHeight: 200, maxHeight: '60vh'}}>
              {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
            </div>
          )}
        </>
      )}
      {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
      )}
      {activeTab === 'rankings' && (
        <RankingsTable rankings={calculateRankings(matches)} players={players} getPlayerName={getPlayerName} />
      )}
    </div>
  );
};

export default DoubleElimination129_191; 