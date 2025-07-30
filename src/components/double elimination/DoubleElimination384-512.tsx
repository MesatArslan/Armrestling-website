import React, { useState, useEffect } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';

const ROUND_ORDER = [
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'LB7', 'WB5', 'LB8', 'LB9', 'WB6', 'LB10', 'LB11', 'WB7', 'LB12', 'LB13', 'WB8', 'LB14', 'Semifinals', 'LB15', '7th8th', 'LBFinal', '5th6th', 'Final', 'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination384_512Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination384_512: React.FC<DoubleElimination384_512Props> = ({ players, resetKey, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [] = useState(false); // <-- yeni state
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
      complete: completeState,
      currentRound: roundKey,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(384, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(384, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setCurrentRoundKey(state.currentRound || 'WB1');
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
    DoubleEliminationStorage.clearDoubleEliminationState(384, playerIds, fixtureId);
  };

  const initializeTournament = () => {
    const totalSlots = 512;
    const byes = totalSlots - players.length;
    
    const initialMatches: Match[] = [];
    
    // Create matches for players who will compete
    const competingPlayers = players.slice(0, players.length - byes);
    const byePlayers = players.slice(players.length - byes);
    
    // Create regular matches for competing players
    for (let i = 0; i < competingPlayers.length; i += 2) {
      if (i + 1 < competingPlayers.length) {
        const match: Match = {
          id: `WB1_${Math.floor(i/2) + 1}`,
          player1Id: competingPlayers[i].id,
          player2Id: competingPlayers[i + 1].id,
          bracket: 'winner',
          round: 1,
          matchNumber: Math.floor(i/2) + 1,
          isBye: false,
          description: `Winner Bracket Round 1 - Match ${Math.floor(i/2) + 1}`
        };
        initialMatches.push(match);
      }
    }
    
    // Create bye matches for players who get byes
    byePlayers.forEach((player, index) => {
      const match: Match = {
        id: `WB1_bye_${index + 1}`,
        player1Id: player.id,
        player2Id: '',
        bracket: 'winner',
        round: 1,
        matchNumber: Math.floor(competingPlayers.length/2) + index + 1,
        isBye: true,
        description: `Winner Bracket Round 1 - Bye for ${player.name}`
      };
      initialMatches.push(match);
    });
    
    setMatches(initialMatches);
    setCurrentRoundKey('WB1');
    clearTournamentState();
  };

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
    const matchId = match.id;
    
    // Winner Bracket rounds - handle both WB and wb prefixes
    if (matchId.startsWith('WB') || matchId.startsWith('wb')) {
      const roundMatch = matchId.match(/[Ww][Bb](\d+)/);
      if (roundMatch) {
        const roundNum = parseInt(roundMatch[1]);
        if (roundNum >= 1 && roundNum <= 8) {
          return `WB${roundNum}` as RoundKey;
        }
      }
    }
    
    // Loser Bracket rounds
    if (matchId.startsWith('LB') || matchId.startsWith('lb')) {
      const roundMatch = matchId.match(/[Ll][Bb](\d+)/);
      if (roundMatch) {
        const roundNum = parseInt(roundMatch[1]);
        if (roundNum >= 1 && roundNum <= 15) {
          return `LB${roundNum}` as RoundKey;
        }
      }
    }
    
    // Special rounds
    if (matchId.includes('semifinals')) return 'Semifinals';
    if (matchId.includes('lbfinal')) return 'LBFinal';
    if (matchId.includes('grandfinal')) return 'GrandFinal';
    if (matchId.includes('final')) return 'Final';
    if (matchId.includes('fifth_sixth')) return '5th6th';
    if (matchId.includes('seventh_eighth')) return '7th8th';
    
    return 'WB1';
  }

  function createNextRoundWithMatches(matchList: Match[], nextRoundKey: RoundKey): Match[] {
    console.log('Creating next round:', { nextRoundKey, matchListLength: matchList.length });
    
    switch (nextRoundKey) {
      case 'LB1': {
        console.log('Creating LB1 matches');
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb1Players = wb1Losers;
        const byesNeeded = 256 - lb1Players.length;
        const byePlayers = lb1Players.slice(0, byesNeeded);
        const matchPlayers = lb1Players.slice(byesNeeded);
        const lb1Matches: Match[] = [];
        
        console.log('LB1 creation details:', {
          wb1Losers: wb1Losers.length,
          lb1Players: lb1Players.length,
          byesNeeded,
          byePlayers: byePlayers.length,
          matchPlayers: matchPlayers.length
        });
        
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
        console.log('LB1 matches created:', lb1Matches.length);
        return lb1Matches;
      }
      case 'WB2': {
        const wb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.isBye).map(m => m.player1Id);
        const wb2Players = [...wb1Winners, ...wb1Byes];
        if (wb2Players.length !== 256) return [];
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
      case 'LB2': {
        const lb1Winners = [...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.winnerId && !m.isBye).map(m => m.winnerId!), ...matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.isBye).map(m => m.player1Id)];
        const wb2Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb2Players = [...lb1Winners, ...wb2Losers];
        if (lb2Players.length !== 256) return [];
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
              description: `LB Round 2 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb2Matches;
      }
      case 'LB3': {
        const lb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb2Winners.length !== 128) return [];
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
              description: `LB Round 3 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb3Matches;
      }
      case 'WB3': {
        const wb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb2Winners.length !== 128) return [];
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
      case 'LB4': {
        const lb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb4Players = [...lb3Winners, ...wb3Losers];
        if (lb4Players.length !== 128) return [];
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
              description: `LB Round 4 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb4Matches;
      }
      case 'LB5': {
        const lb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb4Winners.length !== 64) return [];
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
              description: `LB Round 5 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb5Matches;
      }
      case 'WB4': {
        const wb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb3Winners.length !== 64) return [];
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
      case 'LB6': {
        const lb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb4Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb6Players = [...lb5Winners, ...wb4Losers];
        if (lb6Players.length !== 64) return [];
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
              description: `LB Round 6 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb6Matches;
      }
      case 'LB7': {
        const lb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb6Winners.length !== 32) return [];
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
              description: `LB Round 7 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb7Matches;
      }
      case 'WB5': {
        const wb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb4Winners.length !== 32) return [];
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
      case 'LB8': {
        const lb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb5Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb8Players = [...lb7Winners, ...wb5Losers];
        if (lb8Players.length !== 32) return [];
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
              description: `LB Round 8 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb8Matches;
      }
      case 'LB9': {
        const lb8Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB8' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb8Winners.length !== 16) return [];
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
              description: `LB Round 9 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb9Matches;
      }
      case 'WB6': {
        const wb5Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB5' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb5Winners.length !== 16) return [];
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
      case 'LB10': {
        const lb9Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB9' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb6Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb10Players = [...lb9Winners, ...wb6Losers];
        if (lb10Players.length !== 16) return [];
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
              description: `LB Round 10 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb10Matches;
      }
      case 'LB11': {
        const lb10Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb10Winners.length !== 8) return [];
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
              description: `LB Round 11 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb11Matches;
      }
      case 'WB7': {
        const wb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb6Winners.length !== 8) return [];
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
              description: `WB Round 7 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb7Matches;
      }
      case 'LB12': {
        const lb11Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB11' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb7Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb12Players = [...lb11Winners, ...wb7Losers];
        if (lb12Players.length !== 8) return [];
        const lb12Matches: Match[] = [];
        for (let i = 0; i < lb12Players.length; i += 2) {
          if (i + 1 < lb12Players.length) {
            lb12Matches.push({
              id: `lb12_${Math.floor(i/2) + 1}`,
              player1Id: lb12Players[i],
              player2Id: lb12Players[i + 1],
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
      case 'LB13': {
        const lb12Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB12' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb12Winners.length !== 4) return [];
        const lb13Matches: Match[] = [];
        for (let i = 0; i < lb12Winners.length; i += 2) {
          if (i + 1 < lb12Winners.length) {
            lb13Matches.push({
              id: `lb13_${Math.floor(i/2) + 1}`,
              player1Id: lb12Winners[i],
              player2Id: lb12Winners[i + 1],
              bracket: 'loser',
              round: 13,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 13 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb13Matches;
      }
      case 'WB8': {
        const wb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb7Winners.length !== 4) return [];
        const wb8Matches: Match[] = [];
        for (let i = 0; i < wb7Winners.length; i += 2) {
          if (i + 1 < wb7Winners.length) {
            wb8Matches.push({
              id: `wb8_${Math.floor(i/2) + 1}`,
              player1Id: wb7Winners[i],
              player2Id: wb7Winners[i + 1],
              bracket: 'winner',
              round: 8,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `WB Round 8 (Quarterfinals) - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return wb8Matches;
      }
      case 'LB14': {
        const lb13Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB13' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb8Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB8' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb14Players = [...lb13Winners, ...wb8Losers];
        if (lb14Players.length !== 4) return [];
        const lb14Matches: Match[] = [];
        for (let i = 0; i < lb14Players.length; i += 2) {
          if (i + 1 < lb14Players.length) {
            lb14Matches.push({
              id: `lb14_${Math.floor(i/2) + 1}`,
              player1Id: lb14Players[i],
              player2Id: lb14Players[i + 1],
              bracket: 'loser',
              round: 14,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 14 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb14Matches;
      }
      case 'Semifinals': {
        const wb8Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB8' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb8Winners.length !== 2) return [];
        const semifinalMatches: Match[] = [];
        for (let i = 0; i < wb8Winners.length; i += 2) {
          if (i + 1 < wb8Winners.length) {
            semifinalMatches.push({
              id: `semifinals_${Math.floor(i/2) + 1}`,
              player1Id: wb8Winners[i],
              player2Id: wb8Winners[i + 1],
              bracket: 'winner',
              round: 9,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `Semifinals (WB) - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return semifinalMatches;
      }
      case 'LB15': {
        const lb14Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB14' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb14Winners.length !== 2) return [];
        const lb15Matches: Match[] = [];
        for (let i = 0; i < lb14Winners.length; i += 2) {
          if (i + 1 < lb14Winners.length) {
            lb15Matches.push({
              id: `lb15_${Math.floor(i/2) + 1}`,
              player1Id: lb14Winners[i],
              player2Id: lb14Winners[i + 1],
              bracket: 'loser',
              round: 15,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: `LB Round 15 - Match ${Math.floor(i/2) + 1}`
            });
          }
        }
        return lb15Matches;
      }
      case '7th8th': {
        const lb13Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB13' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb13Losers.length !== 2) return [];
        return [{
          id: 'seventh_eighth',
          player1Id: lb13Losers[0],
          player2Id: lb13Losers[1],
          bracket: 'placement',
          round: 16,
          matchNumber: 1,
          isBye: false,
          description: '7.lik-8.lik Maçı'
        }];
      }
      case 'LBFinal': {
        const semifinalLoser = matchList.filter(m => getMatchRoundKey(m) === 'Semifinals' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb15Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB15' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (semifinalLoser.length !== 1 || lb15Winners.length !== 1) return [];
        return [{
          id: 'lbfinal',
          player1Id: lb15Winners[0],
          player2Id: semifinalLoser[0],
          bracket: 'loser',
          round: 17,
          matchNumber: 1,
          isBye: false,
          description: 'LB Final'
        }];
      }
      case '5th6th': {
        const lb14Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB14' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb14Losers.length !== 2) return [];
        return [{
          id: 'fifth_sixth',
          player1Id: lb14Losers[0],
          player2Id: lb14Losers[1],
          bracket: 'placement',
          round: 18,
          matchNumber: 1,
          isBye: false,
          description: '5.lik-6.lık Maçı'
        }];
      }
      case 'Final': {
        const semifinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'Semifinals' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lbFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        
        console.log('Final Debug:', {
          semifinalWinners,
          lbFinalWinners,
          semifinalWinnersLength: semifinalWinners.length,
          lbFinalWinnersLength: lbFinalWinners.length
        });
        
        if (semifinalWinners.length !== 1 || lbFinalWinners.length !== 1) return [];
        
        const finalMatch: Match = {
          id: 'final',
          player1Id: semifinalWinners[0], // WB winner
          player2Id: lbFinalWinners[0],   // LB winner
          bracket: 'winner',
          round: 19,
          matchNumber: 1,
          isBye: false,
          description: 'Final'
        };
        
        console.log('Final Match Created:', {
          player1Id: finalMatch.player1Id,
          player2Id: finalMatch.player2Id,
          description: finalMatch.description
        });
        
        return [finalMatch];
      }
      case 'GrandFinal': {
        const finalMatch = matchList.find(m => getMatchRoundKey(m) === 'Final');
        const lbFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        
        if (!finalMatch || !finalMatch.winnerId || lbFinalWinners.length !== 1) return [];
        
        // Grand Final sadece LB Final kazananı Final'i de kazandığında oluşturulmalı
        if (finalMatch.winnerId === lbFinalWinners[0]) {
          return [{
            id: 'grandfinal',
            player1Id: finalMatch.player1Id,
            player2Id: finalMatch.player2Id,
            bracket: 'winner',
            round: 20,
            matchNumber: 1,
            isBye: false,
            description: 'Grand Final (Gerekirse)'
          }];
        }
        return [];
      }
      default:
        return [];
    }
  }

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    return createNextRoundWithMatches(matchList, nextRoundKey);
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
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
      }
      
      // Save the reverted state
      saveTournamentState(previousState, {}, false, currentRoundKey);
    }
  };


  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    setMatches(prevMatches => {
      const updatedMatches = prevMatches.map(match => 
        match.id === matchId ? { ...match, winnerId } : match
      );
      
      // Debug for Final match
      if (matchId === 'final') {
        const finalMatch = updatedMatches.find(m => m.id === 'final');
        console.log('Final Match Result:', {
          matchId,
          winnerId,
          player1Id: finalMatch?.player1Id,
          player2Id: finalMatch?.player2Id,
          isLBWinnerWon: finalMatch?.player2Id === winnerId
        });
      }
      
      // Call the onMatchResult prop if provided
      if (onMatchResult) {
        const match = updatedMatches.find(m => m.id === matchId);
        if (match) {
          const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
          onMatchResult('double-elimination', winnerId, loserId);
        }
      }
      
      // Check if tournament is complete
      const finalMatch = updatedMatches.find(m => m.id === 'final');
      const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');
      
      if (finalMatch?.winnerId || grandFinalMatch?.winnerId) {
        const newRankings = calculateRankings(updatedMatches);
        setTournamentComplete(true);
        
        // Call parent's tournament complete handler
        if (onTournamentComplete) {
          onTournamentComplete(newRankings);
        }
      }
      
      saveTournamentState(updatedMatches, {}, false, currentRoundKey);
      return updatedMatches;
    });
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





  useEffect(() => {
    if (!loadTournamentState()) {
      initializeTournament();
    }
  }, [players.length]);

  useEffect(() => {
    if (resetKey) {
      initializeTournament();
    }
  }, [resetKey]);

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
      saveTournamentState(updatedMatches, {}, tournamentComplete, currentRoundKey);
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  // Recalculate rankings when tournament is complete
  useEffect(() => {
    if (tournamentComplete && matches.length > 0) {
      const recalculatedRankings = calculateRankings(matches);
      const currentRankingsStr = JSON.stringify({});
      const newRankingsStr = JSON.stringify(recalculatedRankings);
      if (currentRankingsStr !== newRankingsStr) {
        saveTournamentState(matches, recalculatedRankings, tournamentComplete, currentRoundKey);
      }
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  // --- Next Round Creation ---
  useEffect(() => {
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
      saveTournamentState(updatedMatches, {}, false, nextRoundKey);
    }
  }, [matches, currentRoundKey]);

  // Debug useEffect to track currentRoundKey changes
  useEffect(() => {
    console.log('CurrentRoundKey changed to:', currentRoundKey);
  }, [currentRoundKey]);

  // --- Yardımcı Fonksiyonlar ---
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

    const lb15Match = matchList.find(m => m.id === 'lb15_1');
    if (lb15Match?.winnerId) {
      rankings.fourth = lb15Match.winnerId === lb15Match.player1Id ? lb15Match.player2Id : lb15Match.player1Id;
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

  if (players.length < 384 || players.length > 512) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 384-512 oyuncu arası için tasarlanmıştır. 
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
          Double Elimination Tournament (384-512 oyuncu)
        </h2>
        <div className="flex gap-4">
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
      </div>
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Aktif Tur: {currentRoundKey}</h3>
      </div>
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && activeRoundMatches.filter(m => !m.isBye && !m.winnerId).length > 0 && (
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

export default DoubleElimination384_512; 