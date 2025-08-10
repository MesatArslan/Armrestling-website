import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

const ROUND_ORDER = [
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'LB7', 'WB5', 'LB8', 'LB9', 'WB6', 'LB10', 'YariFinal', 'LB11', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination96_128Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination96_128: React.FC<DoubleElimination96_128Props> = ({ players, resetKey, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [, setIsUndoing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

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
    DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(96, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        setMatchHistory(state.matchHistory || []);
        setLastCompletedMatch(null);
        return true; // State was loaded
      }
    } catch (error) {
      // Error loading tournament state
    }
    return false; // No state found
  };

  // Clear tournament state using utility
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(96, playerIds, fixtureId);
    setMatchHistory([]);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 128;
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = shuffledPlayers.slice(0, byesNeeded);
    const playersForMatches = shuffledPlayers.slice(byesNeeded);
    const wb1Matches: Match[] = [];
    
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
        description: RoundDescriptionUtils.createMatchDescription('WB1', Math.floor(i/2) + 1)
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
        description: `${RoundDescriptionUtils.getDescription('WB1')} - Bye for ${player.name} ${player.surname}`
      });
    });
    
    setMatches(wb1Matches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
  };

  React.useEffect(() => {
    if (players.length >= 96 && players.length <= 128) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, [players]);

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
    if (match.id.startsWith('lb10')) return 'LB10';
    if (match.id.startsWith('lb11')) return 'LB11';
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
    
    if (currentIdx === -1 || currentIdx === ROUND_ORDER.length - 1) return;
    if (!isRoundComplete(currentRoundKey, matches)) return;
    
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    
    const newMatches = createNextRound();
    
    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches]);

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'WB1': {
        // Shuffle players randomly instead of seeding by weight
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        const totalSlots = 128;
        const byesNeeded = totalSlots - players.length;
        const playersWithByes = shuffledPlayers.slice(0, byesNeeded);
        const playersForMatches = shuffledPlayers.slice(byesNeeded);
        const wb1Matches: Match[] = [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB1', Math.floor(i/2) + 1)
            });
          }
        }
        playersWithByes.forEach((player, index) => {
          wb1Matches.push({
            id: `wb1_bye_${index + 1}`,
            player1Id: player.id,
            player2Id: '',
            bracket: 'winner',
            round: 1,
            matchNumber: wb1Matches.length + 1,
            isBye: true,
            description: `${RoundDescriptionUtils.getDescription('WB1')} - Bye for ${player.name} ${player.surname}`
          });
        });
        return wb1Matches;
      }
      case 'LB1': {
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb1Players = wb1Losers;
        const byesNeeded = 64 - lb1Players.length;
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
            description: `${RoundDescriptionUtils.getDescription('LB1')} - Bye for ${getPlayerName(playerId)}`
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
              description: RoundDescriptionUtils.createMatchDescription('LB1', Math.floor(i/2)+1)
            });
          }
        }
        return lb1Matches;
      }
      case 'WB2': {
        const wb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.isBye).map(m => m.player1Id);
        const wb2Players = [...wb1Winners, ...wb1Byes];
        if (wb2Players.length !== 64) return [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB2', Math.floor(i/2) + 1)
            });
          }
        }
        return wb2Matches;
      }
      case 'LB2': {
        const lb1Winners = [...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.winnerId && !m.isBye).map(m => m.winnerId!), ...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.isBye).map(m => m.player1Id)];
        const wb2Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb2Players = [...lb1Winners, ...wb2Losers];
        if (lb2Players.length !== 64) return [];
        const lb2Matches: Match[] = [];
        for (let i = 0; i < lb2Players.length; i += 2) {
          if (i + 1 < lb2Players.length) {
            lb2Matches.push({
              id: `lb2_${Math.floor(i/2) + 1}`,
              player1Id: lb2Players[i],
              player2Id: lb2Players[i + 1],
              bracket: 'loser',
              round: 2,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB2', Math.floor(i/2) + 1)
            });
          }
        }
        return lb2Matches;
      }
      case 'LB3': {
        const lb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb2Winners.length !== 32) return [];
        const lb3Matches: Match[] = [];
        for (let i = 0; i < lb2Winners.length; i += 2) {
          if (i + 1 < lb2Winners.length) {
            lb3Matches.push({
              id: `lb3_${Math.floor(i/2) + 1}`,
              player1Id: lb2Winners[i],
              player2Id: lb2Winners[i + 1],
              bracket: 'loser',
              round: 3,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB3', Math.floor(i/2) + 1)
            });
          }
        }
        return lb3Matches;
      }
      case 'WB3': {
        const wb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb2Winners.length !== 32) return [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB3', Math.floor(i/2) + 1)
            });
          }
        }
        return wb3Matches;
      }
      case 'LB4': {
        const lb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb4Players = [...lb3Winners, ...wb3Losers];
        if (lb4Players.length !== 32) return [];
        const lb4Matches: Match[] = [];
        for (let i = 0; i < lb4Players.length; i += 2) {
          if (i + 1 < lb4Players.length) {
            lb4Matches.push({
              id: `lb4_${Math.floor(i/2) + 1}`,
              player1Id: lb4Players[i],
              player2Id: lb4Players[i + 1],
              bracket: 'loser',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB4', Math.floor(i/2) + 1)
            });
          }
        }
        return lb4Matches;
      }
      case 'LB5': {
        const lb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb4Winners.length !== 16) return [];
        const lb5Matches: Match[] = [];
        for (let i = 0; i < lb4Winners.length; i += 2) {
          if (i + 1 < lb4Winners.length) {
            lb5Matches.push({
              id: `lb5_${Math.floor(i/2) + 1}`,
              player1Id: lb4Winners[i],
              player2Id: lb4Winners[i + 1],
              bracket: 'loser',
              round: 5,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB5', Math.floor(i/2) + 1)
            });
          }
        }
        return lb5Matches;
      }
      case 'WB4': {
        const wb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb3Winners.length !== 16) return [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB4', Math.floor(i/2) + 1)
            });
          }
        }
        return wb4Matches;
      }
      case 'LB6': {
        const lb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb4Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb6Players = [...lb5Winners, ...wb4Losers];
        if (lb6Players.length !== 16) return [];
        const lb6Matches: Match[] = [];
        for (let i = 0; i < lb6Players.length; i += 2) {
          if (i + 1 < lb6Players.length) {
            lb6Matches.push({
              id: `lb6_${Math.floor(i/2) + 1}`,
              player1Id: lb6Players[i],
              player2Id: lb6Players[i + 1],
              bracket: 'loser',
              round: 6,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB6', Math.floor(i/2) + 1)
            });
          }
        }
        return lb6Matches;
      }
      case 'LB7': {
        const lb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb6Winners.length !== 8) return [];
        const lb7Matches: Match[] = [];
        for (let i = 0; i < lb6Winners.length; i += 2) {
          if (i + 1 < lb6Winners.length) {
            lb7Matches.push({
              id: `lb7_${Math.floor(i/2) + 1}`,
              player1Id: lb6Winners[i],
              player2Id: lb6Winners[i + 1],
              bracket: 'loser',
              round: 7,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB7', Math.floor(i/2) + 1)
            });
          }
        }
        return lb7Matches;
      }
      case 'WB5': {
        const wb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb4Winners.length !== 8) return [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB5', Math.floor(i/2) + 1)
            });
          }
        }
        return wb5Matches;
      }
      case 'LB8': {
        const lb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb5Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb8Players = [...lb7Winners, ...wb5Losers];
        if (lb8Players.length !== 8) return [];
        const lb8Matches: Match[] = [];
        for (let i = 0; i < lb8Players.length; i += 2) {
          if (i + 1 < lb8Players.length) {
            lb8Matches.push({
              id: `lb8_${Math.floor(i/2) + 1}`,
              player1Id: lb8Players[i],
              player2Id: lb8Players[i + 1],
              bracket: 'loser',
              round: 8,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB8', Math.floor(i/2) + 1)
            });
          }
        }
        return lb8Matches;
      }
      case 'LB9': {
        const lb8Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB8' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb8Winners.length !== 4) return [];
        const lb9Matches: Match[] = [];
        for (let i = 0; i < lb8Winners.length; i += 2) {
          if (i + 1 < lb8Winners.length) {
            lb9Matches.push({
              id: `lb9_${Math.floor(i/2) + 1}`,
              player1Id: lb8Winners[i],
              player2Id: lb8Winners[i + 1],
              bracket: 'loser',
              round: 9,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB9', Math.floor(i/2) + 1)
            });
          }
        }
        return lb9Matches;
      }
      case 'WB6': {
        const wb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb5Winners.length !== 4) return [];
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
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
            });
          }
        }
        return wb6Matches;
      }
      case 'LB10': {
        const lb9Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB9' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb6Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb10Players = [...lb9Winners, ...wb6Losers];
        if (lb10Players.length !== 4) {
          return [];
        }
        const lb10Matches: Match[] = [];
        for (let i = 0; i < lb10Players.length; i += 2) {
          if (i + 1 < lb10Players.length) {
            lb10Matches.push({
              id: `lb10_${Math.floor(i/2) + 1}`,
              player1Id: lb10Players[i],
              player2Id: lb10Players[i + 1],
              bracket: 'loser',
              round: 10,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB10', Math.floor(i/2) + 1)
            });
          }
        }
        return lb10Matches;
      }
      case 'YariFinal': {
        const wb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb6Winners.length !== 2) return [];
        const yariFinalMatches: Match[] = [];
        for (let i = 0; i < wb6Winners.length; i += 2) {
          if (i + 1 < wb6Winners.length) {
            yariFinalMatches.push({
              id: `yarifinal_${Math.floor(i/2) + 1}`,
              player1Id: wb6Winners[i],
              player2Id: wb6Winners[i + 1],
              bracket: 'winner',
              round: 7,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
            });
          }
        }
        return yariFinalMatches;
      }
      case 'LB11': {
        const lb10Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb10Winners.length !== 2) return [];
        const lb11Matches: Match[] = [];
        for (let i = 0; i < lb10Winners.length; i += 2) {
          if (i + 1 < lb10Winners.length) {
            lb11Matches.push({
              id: `lb11_${Math.floor(i/2) + 1}`,
              player1Id: lb10Winners[i],
              player2Id: lb10Winners[i + 1],
              bracket: 'loser',
              round: 11,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB11', Math.floor(i/2) + 1)
            });
          }
        }
        return lb11Matches;
      }
      case '7-8': {
        const lb9Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB9' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb9Losers.length !== 2) return [];
        return [{
          id: 'seventh_eighth',
          player1Id: lb9Losers[0],
          player2Id: lb9Losers[1],
          bracket: 'placement',
          round: 8,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('7-8')
        }];
      }
      case 'LBFinal': {
        const yariFinalLoser = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb11Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB11' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (yariFinalLoser.length !== 1 || lb11Winners.length !== 1) return [];
        return [{
          id: 'lbfinal',
          player1Id: lb11Winners[0],
          player2Id: yariFinalLoser[0],
          bracket: 'loser',
          round: 12,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('LB_Final')
        }];
      }
      case '5-6': {
        const lb10Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb10Losers.length !== 2) return [];
        return [{
          id: 'fifth_sixth',
          player1Id: lb10Losers[0],
          player2Id: lb10Losers[1],
          bracket: 'placement',
          round: 9,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('5-6')
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
          round: 13,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('Final')
        }];
      }
      case 'GrandFinal': {
        const finalMatch = matchList.find(m => getMatchRoundKey(m) === 'Final' && m.winnerId && !m.isBye);
        const lbFinalMatch = matchList.find(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye);
        
        if (!finalMatch || !lbFinalMatch) return [];
        
        const finalWinner = finalMatch.winnerId;
        const lbFinalWinner = lbFinalMatch.winnerId;
        
        // Eğer LBFinal kazananı Final'i kazandıysa GrandFinal oynanır
        if (finalWinner === lbFinalWinner && finalWinner) {
          const finalLoser = finalWinner === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
          if (finalLoser && finalLoser !== '') {
            return [{
              id: 'grandfinal',
              player1Id: finalWinner,
              player2Id: finalLoser as string,
              bracket: 'winner',
              round: 14,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('GrandFinal')
            }];
          }
        }
        return [];
      }
      default:
        return [];
    }
  }

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
      
      // Calculate the updated match history first
      const updatedMatchHistory = matchHistory.slice(0, -1);
      
      setMatches(previousMatches);
      setMatchHistory(updatedMatchHistory);
      
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
        } else if (matchId === 'lbfinal') {
          delete updatedRankings.third;
        } else if (matchId === 'seventh_eighth') {
          delete updatedRankings.seventh;
          delete updatedRankings.eighth;
        } else if (matchId === 'fifth_sixth') {
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
        } else if (matchId === 'lb11_1') {
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
      const state = {
        matches: previousMatches,
        rankings: updatedRankings,
        tournamentComplete: false,
        currentRoundKey: getMatchRoundKey(previousMatches[previousMatches.length - 1] || previousMatches[0]),
        matchHistory: updatedMatchHistory,
        timestamp: new Date().toISOString()
      };
      const playerIds = players.map(p => p.id).sort().join('-');
      DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
      
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
    }
  };


  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    const newHistory = [...matchHistory, [...matches]];
    setMatchHistory(newHistory);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    setMatches(prevMatches => {
      const updatedMatches = prevMatches.map(match => 
        match.id === matchId ? { ...match, winnerId } : match
      );
      
      const finalMatch = updatedMatches.find(m => m.id === 'final');
      const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');
      
      if (finalMatch?.winnerId) {
        const lbfinalWinner = updatedMatches.find(m => m.id === 'lbfinal')?.winnerId;
        const finalWinner = finalMatch.winnerId;
        if (lbfinalWinner && finalWinner === lbfinalWinner) {
          // Tournament continues to Grand Final - don't complete tournament yet
          const state = {
            matches: updatedMatches,
            rankings: rankings,
            tournamentComplete: false,
            currentRoundKey: currentRoundKey,
            matchHistory: newHistory,
            timestamp: new Date().toISOString()
          };
          const playerIds = players.map(p => p.id).sort().join('-');
          DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
        } else {
          // Final tamamlandı ve GrandFinal oynanmayacaksa turnuvayı tamamla
          const newRankings = calculateRankings(updatedMatches);
          setRankings(newRankings);
          setTournamentComplete(true);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(newRankings || rankings);
          }
          
          // Save with updated history
          const state = {
            matches: updatedMatches,
            rankings: newRankings || rankings,
            tournamentComplete: true,
            currentRoundKey: currentRoundKey,
            matchHistory: newHistory,
            timestamp: new Date().toISOString()
          };
          const playerIds = players.map(p => p.id).sort().join('-');
          DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
        }
      } else if (grandFinalMatch?.winnerId) {
        // GrandFinal tamamlandıysa turnuvayı tamamla
        const newRankings = calculateRankings(updatedMatches);
        setRankings(newRankings);
        setTournamentComplete(true);
          
        // Call parent's tournament complete handler
        if (onTournamentComplete) {
          onTournamentComplete(newRankings || rankings);
        }
          
        // Save with updated history
        const state = {
          matches: updatedMatches,
          rankings: newRankings || rankings,
          tournamentComplete: true,
          currentRoundKey: currentRoundKey,
          matchHistory: newHistory,
          timestamp: new Date().toISOString()
        };
        const playerIds = players.map(p => p.id).sort().join('-');
        DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
      } else {
        // Normal match completion - save with updated history
        const state = {
          matches: updatedMatches,
          rankings: rankings,
          tournamentComplete: tournamentComplete,
          currentRoundKey: currentRoundKey,
          matchHistory: newHistory,
          timestamp: new Date().toISOString()
        };
        const playerIds = players.map(p => p.id).sort().join('-');
        DoubleEliminationStorage.saveDoubleEliminationState(96, playerIds, state, fixtureId);
      }
      return updatedMatches;
    });
  };

  const calculateRankings = (matchList: Match[]): Ranking => {
    const rankings: Ranking = {};
    const finalMatch = matchList.find(m => m.id === 'final');
    const grandFinalMatch = matchList.find(m => m.id === 'grandfinal');
    
    // GrandFinal oynanacaksa Final'dan sonra 1. ve 2. sıralama hesaplanmamalı
    const lbfinalMatch = matchList.find(m => m.id === 'lbfinal');
    const lbfinalWinner = lbfinalMatch?.winnerId;
    const finalWinner = finalMatch?.winnerId;
    
    // Eğer LBFinal kazananı Final'i kazandıysa GrandFinal oynanacak
    const willHaveGrandFinal = lbfinalWinner && finalWinner && finalWinner === lbfinalWinner;
    
    if (grandFinalMatch?.winnerId) {
      // GrandFinal tamamlandıysa 1. ve 2. sıralama hesapla
      rankings.first = grandFinalMatch.winnerId;
      rankings.second = grandFinalMatch.winnerId === grandFinalMatch.player1Id ? grandFinalMatch.player2Id : grandFinalMatch.player1Id;
    } else if (finalMatch?.winnerId && !willHaveGrandFinal) {
      // Final tamamlandı ve GrandFinal oynanmayacaksa 1. ve 2. sıralama hesapla
      rankings.first = finalMatch.winnerId;
      rankings.second = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
    }
    // Eğer GrandFinal oynanacaksa Final'dan sonra 1. ve 2. sıralama hesaplanmaz
    
    // 3: LB Final kaybedeni
    if (lbfinalMatch?.winnerId) {
      rankings.third = lbfinalMatch.winnerId === lbfinalMatch.player1Id ? lbfinalMatch.player2Id : lbfinalMatch.player1Id;
    }
    
    // 4: LB11 kaybedeni
    const lb11Match = matchList.find(m => m.id === 'lb11_1');
    if (lb11Match?.winnerId) {
      // LB11 kaybedeni 4. olur
      rankings.fourth = lb11Match.winnerId === lb11Match.player1Id ? lb11Match.player2Id : lb11Match.player1Id;
    }
    
    // 5-6: 5.lik-6.lık maçı
    const fifthSixthMatch = matchList.find(m => m.id === 'fifth_sixth');
    if (fifthSixthMatch?.winnerId) {
      rankings.fifth = fifthSixthMatch.winnerId;
      rankings.sixth = fifthSixthMatch.winnerId === fifthSixthMatch.player1Id ? fifthSixthMatch.player2Id : fifthSixthMatch.player1Id;
    }
    
    // 7-8: 7.lik-8.lik maçı
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
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={winnerId => handleWinnerSelect(match.id, winnerId)}
        onWinnerConfirm={() => handleWinnerConfirm(match.id)}
        onSelectionCancel={() => handleSelectionCancel(match.id)}
        playersLength={players.length}
        matchTitle={match.description}
      />
    );
  };





  if (players.length < 96 || players.length > 128) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 96-128 oyuncu arası için tasarlanmıştır. 
          Mevcut oyuncu sayısı: {players.length}
        </p>
      </div>
    );
  }

  // --- Aktif ve tamamlanan maçları göster ---
  const activeRoundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
          </h2>
        </div>
      )}
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      <div className="max-w-4xl mx-auto">
        {/* Aktif Tur bilgisi kaldırıldı */}
      </div>
      
      {/* Control Buttons - Only show in active tab */}
      {activeTab === 'active' && (
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => {
              clearTournamentState();
              initializeTournament();
              setSelectedWinner({});
              setMatchHistory([]);
              setLastCompletedMatch(null);
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
              onClick={undoLastMatch}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Bir Önceki Maç
            </button>
          )}
          
          {/* Auto-select Winners Button */}
          {!tournamentComplete && activeRoundMatches.filter(m => !m.isBye && !m.winnerId).length > 0 && (
            <button
              onClick={() => {
                activeRoundMatches.filter(m => !m.isBye && !m.winnerId).forEach(match => {
                  const winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
                  handleMatchResult(match.id, winnerId);
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Bu Turun Kazananlarını Otomatik Seç
            </button>
          )}
        </div>
      )}
      {activeTab === 'active' && (
        <>
          {(() => {
            const r = calculateRankings(matches);
            const firstSecondDetermined = Boolean(r.first && r.second);
            return firstSecondDetermined;
          })() ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl w-full mx-auto">
              {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
            </div>
          )}
        </>
      )}
      {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
      )}
      {activeTab === 'rankings' && (
        <RankingsTable
          rankings={calculateRankings(matches)}
          players={players}
          getPlayerName={getPlayerName}
        />
      )}
    </div>
  );
};

export default DoubleElimination96_128; 

