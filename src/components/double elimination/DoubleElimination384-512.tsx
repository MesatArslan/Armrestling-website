import React, { useState, useEffect, useRef } from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import MatchCounter from '../UI/MatchCounter';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';
import { useTranslation } from 'react-i18next';

const ROUND_ORDER = [
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'LB7', 'WB5', 'LB8', 'LB9', 'WB6', 'LB10', 'LB11', 'WB7', 'LB12', 'LB13', 'WB8', 'LB14', 'Semifinals', 'LB15', '7th8th', 'LBFinal', '5th6th', 'Final', 'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination384_512Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination384_512: React.FC<DoubleElimination384_512Props> = ({ players, resetKey, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);
  const [autoSelecting, setAutoSelecting] = useState<boolean>(false);
  const autoSelectingRef = useRef<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const matchesRef = useRef<Match[]>(matches);
  const currentRoundKeyRef = useRef<RoundKey>(currentRoundKey);
  const tournamentCompleteRef = useRef<boolean>(tournamentComplete);
  const autoRoundKeyRef = useRef<RoundKey | null>(null);
  const completedOrderRef = useRef<string[]>(completedOrder);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey, orderState: string[]) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      completedOrder: orderState,
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
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        const derivedOrder: string[] = [...loadedMatches]
          .filter(m => m.winnerId && !m.isBye)
          .sort((a, b) => {
            const ra = ROUND_ORDER.indexOf(getMatchRoundKey(a));
            const rb = ROUND_ORDER.indexOf(getMatchRoundKey(b));
            if (ra !== rb) return ra - rb;
            return (a.round - b.round) || (a.matchNumber - b.matchNumber);
          })
          .map(m => m.id);
        setCompletedOrder((state as any).completedOrder || derivedOrder);
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
    DoubleEliminationStorage.clearDoubleEliminationState(384, playerIds, fixtureId);
    setCompletedOrder([]);
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
          description: RoundDescriptionUtils.createMatchDescription('WB1', Math.floor(i/2) + 1)
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
                  description: `${RoundDescriptionUtils.getDescription('WB1')} - Bye for ${player.name}`
      };
      initialMatches.push(match);
    });
    
    setMatches(initialMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    clearTournamentState();
    setCompletedOrder([]);
  };

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

  // --- Rematch Avoidance Helpers ---
  function hasPlayedBefore(playerAId: string, playerBId: string): boolean {
    if (!playerAId || !playerBId) return false;
    const playerA = players.find(p => p.id === playerAId);
    if (!playerA || !playerA.opponents || playerA.opponents.length === 0) return false;
    return playerA.opponents.some(o => o.playerId === playerBId);
  }

  function pairAvoidingRematch(playerIds: string[]): Array<[string, string]> {
    const ids = [...playerIds];
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < ids.length; i += 2) {
      if (i + 1 >= ids.length) break;
      let first = ids[i];
      let second = ids[i + 1];
      if (hasPlayedBefore(first, second)) {
        for (let j = i + 2; j < ids.length; j++) {
          const candidate = ids[j];
          if (!hasPlayedBefore(first, candidate)) {
            ids[i + 1] = candidate;
            ids[j] = second;
            second = ids[i + 1];
            break;
          }
        }
      }
      pairs.push([first, second]);
    }
    return pairs;
  }

  function createNextRoundWithMatches(matchList: Match[], nextRoundKey: RoundKey): Match[] {
    switch (nextRoundKey) {
      case 'LB1': {
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb1Players = wb1Losers;
        const byesNeeded = 256 - lb1Players.length;
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
        if (lb2Players.length !== 256) return [];
        const lb2Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb2Players);
        pairs.forEach(([p1, p2], idx) => {
          lb2Matches.push({
            id: `lb2_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 2,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB2', idx + 1)
          });
        });
        return lb2Matches;
      }
      case 'LB3': {
        const lb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb2Winners.length !== 128) return [];
        const lb3Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb2Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb3Matches.push({
            id: `lb3_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 3,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB3', idx + 1)
          });
        });
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
        if (lb4Players.length !== 128) return [];
        const lb4Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb4Players);
        pairs.forEach(([p1, p2], idx) => {
          lb4Matches.push({
            id: `lb4_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 4,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB4', idx + 1)
          });
        });
        return lb4Matches;
      }
      case 'LB5': {
        const lb4Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB4' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb4Winners.length !== 64) return [];
        const lb5Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb4Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb5Matches.push({
            id: `lb5_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 5,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB5', idx + 1)
          });
        });
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
        if (lb6Players.length !== 64) return [];
        const lb6Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb6Players);
        pairs.forEach(([p1, p2], idx) => {
          lb6Matches.push({
            id: `lb6_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 6,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB6', idx + 1)
          });
        });
        return lb6Matches;
      }
      case 'LB7': {
        const lb6Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB6' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb6Winners.length !== 32) return [];
        const lb7Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb6Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb7Matches.push({
            id: `lb7_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 7,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB7', idx + 1)
          });
        });
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
        if (lb8Players.length !== 32) return [];
        const lb8Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb8Players);
        pairs.forEach(([p1, p2], idx) => {
          lb8Matches.push({
            id: `lb8_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 8,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB8', idx + 1)
          });
        });
        return lb8Matches;
      }
      case 'LB9': {
        const lb8Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB8' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb8Winners.length !== 16) return [];
        const lb9Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb8Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb9Matches.push({
            id: `lb9_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 9,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB9', idx + 1)
          });
        });
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
              description: RoundDescriptionUtils.createMatchDescription('WB6', Math.floor(i/2) + 1)
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
        const pairs = pairAvoidingRematch(lb10Players);
        pairs.forEach(([p1, p2], idx) => {
          lb10Matches.push({
            id: `lb10_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 10,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB10', idx + 1)
          });
        });
        return lb10Matches;
      }
      case 'LB11': {
        const lb10Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB10' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb10Winners.length !== 8) return [];
        const lb11Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb10Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb11Matches.push({
            id: `lb11_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 11,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB11', idx + 1)
          });
        });
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
              description: RoundDescriptionUtils.createMatchDescription('WB7', Math.floor(i/2) + 1)
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
        const pairs = pairAvoidingRematch(lb12Players);
        pairs.forEach(([p1, p2], idx) => {
          lb12Matches.push({
            id: `lb12_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 12,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB12', idx + 1)
          });
        });
        return lb12Matches;
      }
      case 'LB13': {
        const lb12Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB12' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb12Winners.length !== 4) return [];
        const lb13Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb12Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb13Matches.push({
            id: `lb13_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 13,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB13', idx + 1)
          });
        });
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
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
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
        const pairs = pairAvoidingRematch(lb14Players);
        pairs.forEach(([p1, p2], idx) => {
          lb14Matches.push({
            id: `lb14_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 14,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB14', idx + 1)
          });
        });
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
              description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
            });
          }
        }
        return semifinalMatches;
      }
      case 'LB15': {
        const lb14Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB14' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb14Winners.length !== 2) return [];
        const lb15Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb14Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb15Matches.push({
            id: `lb15_${idx + 1}`,
            player1Id: p1,
            player2Id: p2,
            bracket: 'loser',
            round: 15,
            matchNumber: idx + 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB15', idx + 1)
          });
        });
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
          description: RoundDescriptionUtils.getDescription('7-8')
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
          description: RoundDescriptionUtils.getDescription('LB_Final')
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
          description: RoundDescriptionUtils.getDescription('5-6')
        }];
      }
      case 'Final': {
        const semifinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'Semifinals' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lbFinalWinners = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        
        if (semifinalWinners.length !== 1 || lbFinalWinners.length !== 1) return [];
        
        const finalMatch: Match = {
          id: 'final',
          player1Id: semifinalWinners[0], // WB winner
          player2Id: lbFinalWinners[0],   // LB winner
          bracket: 'winner',
          round: 19,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('Final')
        };
        
        return [finalMatch];
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
              player2Id: finalLoser as string, // Type assertion to handle potential undefined
              bracket: 'winner',
              round: 20,
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

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    return createNextRoundWithMatches(matchList, nextRoundKey);
  }

  const getPlayerName = (playerId: string) => {
    if (!playerId) return '';
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : '';
  };

  const getPlayer = (playerId: string) => {
    if (!playerId) return undefined;
    return players.find(p => p.id === playerId);
  };

  const undoLastMatch = () => {
    const stack = completedOrder.length > 0 ? completedOrder : [...matches]
      .filter(m => m.winnerId && !m.isBye)
      .sort((a, b) => {
        const ra = ROUND_ORDER.indexOf(getMatchRoundKey(a));
        const rb = ROUND_ORDER.indexOf(getMatchRoundKey(b));
        if (ra !== rb) return ra - rb;
        return (a.round - b.round) || (a.matchNumber - b.matchNumber);
      })
      .map(m => m.id);
    if (stack.length === 0) return;

    const lastId = stack[stack.length - 1];
    const undoneMatchRef = matches.find(m => m.id === lastId);
    const newCompletedOrder = stack.slice(0, -1);

    let updatedMatches = [...matches];
    let updatedRankings = { ...rankings } as Ranking;
    let newTournamentComplete = false;
    let newCurrentRoundKey: RoundKey = currentRoundKey;

    const removeIds = (ids: string[]) => {
      updatedMatches = updatedMatches.filter(m => !ids.includes(m.id));
    };

    const clearWinner = (id: string) => {
      updatedMatches = updatedMatches.map(m => m.id === id ? { ...m, winnerId: undefined } : m);
    };

    if (lastId === 'grandfinal') {
      clearWinner('grandfinal');
      delete updatedRankings.first;
      delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = 'GrandFinal';
    } else if (lastId === 'final') {
      clearWinner('final');
      const gf = updatedMatches.find(m => m.id === 'grandfinal');
      if (gf && !gf.winnerId) removeIds(['grandfinal']);
      delete updatedRankings.first;
      delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = '5th6th';
    } else if (lastId === 'lbfinal') {
      clearWinner('lbfinal');
      removeIds(['final', 'grandfinal']);
      delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LBFinal';
    } else if (lastId === 'seventh_eighth') {
      clearWinner('seventh_eighth');
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      newCurrentRoundKey = '7th8th';
    } else if (lastId === 'fifth_sixth') {
      clearWinner('fifth_sixth');
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      newCurrentRoundKey = '5th6th';
    } else if (lastId === 'lb15_1') {
      clearWinner('lb15_1');
      delete updatedRankings.fourth;
      newCurrentRoundKey = 'LB15';
    } else {
      const lastMatch = updatedMatches.find(m => m.id === lastId);
      if (lastMatch) {
        clearWinner(lastId);
        newCurrentRoundKey = getMatchRoundKey(lastMatch);
      }
    }

    const remainingIds = new Set(updatedMatches.map(m => m.id));
    const prunedSelected: { [matchId: string]: string | null } = {};
    Object.entries(selectedWinner).forEach(([k, v]) => {
      if (remainingIds.has(k)) prunedSelected[k] = v;
    });
    if (remainingIds.has(lastId)) prunedSelected[lastId] = null;

    const targetIdx = ROUND_ORDER.indexOf(newCurrentRoundKey);
    updatedMatches = updatedMatches.filter(m => {
      const key = getMatchRoundKey(m);
      return ROUND_ORDER.indexOf(key) <= targetIdx;
    });

    setMatches(updatedMatches);
    setRankings(updatedRankings);
    setTournamentComplete(newTournamentComplete);
    setCurrentRoundKey(newCurrentRoundKey);
    setSelectedWinner(prunedSelected);
    setCompletedOrder(newCompletedOrder);

    saveTournamentState(updatedMatches, updatedRankings, newTournamentComplete, newCurrentRoundKey, newCompletedOrder);
    if (onRemoveOpponents && undoneMatchRef && !undoneMatchRef.isBye) {
      onRemoveOpponents(undoneMatchRef.player1Id, undoneMatchRef.player2Id, undoneMatchRef.description || 'Unknown Match');
    }
    // Reactivate fixture if an undo happens
    try {
      if (fixtureId) {
        MatchesStorage.activateFixture(fixtureId);
      }
    } catch {}
  };


  const handleMatchResult = (matchId: string, winnerId: string) => {
    const baseMatches = matchesRef.current;
    const updatedMatches = baseMatches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );

    const newRankings = calculateRankings(updatedMatches);
    setMatches(updatedMatches);
    matchesRef.current = updatedMatches;
    setRankings(newRankings);

    // Call the onMatchResult prop if provided
    if (onMatchResult) {
      const match = updatedMatches.find(m => m.id === matchId);
      if (match) {
        const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        onMatchResult('double-elimination', winnerId, loserId);
      }
    }
    
    // completedOrder'u güncelle (bye maçlarını sayma)
    const match = baseMatches.find(m => m.id === matchId);
    
    // Update opponents after match
    if (match && onUpdateOpponents) {
      onUpdateOpponents(match.player1Id, match.player2Id, match.description || 'Unknown Match', winnerId);
    }
    const isByeMatch = Boolean(match?.isBye);
    const prevOrder = completedOrderRef.current;
    const newCompletedOrder = isByeMatch || prevOrder.includes(matchId)
      ? prevOrder
      : [...prevOrder, matchId];
    setCompletedOrder(newCompletedOrder);

    // Check if tournament is complete
    const finalMatch = updatedMatches.find(m => m.id === 'final');
    const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');

    if (finalMatch?.winnerId) {
      const lbfinalWinner = updatedMatches.find(m => m.id === 'lbfinal')?.winnerId;
      const finalWinner = finalMatch.winnerId;
      if (lbfinalWinner && finalWinner === lbfinalWinner) {
        // Tournament continues to Grand Final
        saveTournamentState(updatedMatches, newRankings, false, currentRoundKeyRef.current, newCompletedOrder);
      } else {
        setTournamentComplete(true);
        tournamentCompleteRef.current = true;
        if (onTournamentComplete) {
          onTournamentComplete(newRankings);
        }
        saveTournamentState(updatedMatches, newRankings, true, currentRoundKeyRef.current, newCompletedOrder);
      }
    } else if (grandFinalMatch?.winnerId) {
      setTournamentComplete(true);
      tournamentCompleteRef.current = true;
      if (onTournamentComplete) {
        onTournamentComplete(newRankings);
      }
      saveTournamentState(updatedMatches, newRankings, true, currentRoundKeyRef.current, newCompletedOrder);
    } else {
      // Normal match completion
      saveTournamentState(updatedMatches, newRankings, tournamentCompleteRef.current, currentRoundKeyRef.current, newCompletedOrder);
    }
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
        key={match.id}
        matchId={match.id}
        fixtureId={fixtureId}
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        player1={getPlayer(match.player1Id || '')}
        player2={getPlayer(match.player2Id || '')}
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey, completedOrder);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey, completedOrder]);

  // Recalculate rankings when tournament is complete
  useEffect(() => {
    if (tournamentComplete && matches.length > 0) {
      const recalculatedRankings = calculateRankings(matches);
      const currentRankingsStr = JSON.stringify({});
      const newRankingsStr = JSON.stringify(recalculatedRankings);
      if (currentRankingsStr !== newRankingsStr) {
        saveTournamentState(matches, recalculatedRankings, tournamentComplete, currentRoundKey, completedOrder);
      }
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  // --- Next Round Creation ---
  useEffect(() => {
    if (matches.length === 0) return;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    
    if (currentIdx === -1 || currentIdx === ROUND_ORDER.length - 1) return;
    if (!isRoundComplete(currentRoundKey, matches)) return;
    
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    
    const newMatches = createNextRound();
    
    if (newMatches.length > 0) {
      const updatedMatches = [...matches, ...newMatches];
      setMatches(updatedMatches);
      setCurrentRoundKey(nextRoundKey);
      currentRoundKeyRef.current = nextRoundKey;
      saveTournamentState(updatedMatches, rankings, false, nextRoundKey, completedOrder);
    }
  }, [matches, currentRoundKey, rankings, completedOrder]);

  // Debug useEffect to track currentRoundKey changes
  useEffect(() => {
    // CurrentRoundKey changed
  }, [currentRoundKey]);

  // --- Yardımcı Fonksiyonlar ---
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
    // 4: LB15 kaybedeni
    const lb15Match = matchList.find(m => m.id === 'lb15_1');
    if (lb15Match?.winnerId) {
      rankings.fourth = lb15Match.winnerId === lb15Match.player1Id ? lb15Match.player2Id : lb15Match.player1Id;
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

  // Keep refs in sync for interval-based auto selection
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { currentRoundKeyRef.current = currentRoundKey; }, [currentRoundKey]);
  useEffect(() => { tournamentCompleteRef.current = tournamentComplete; }, [tournamentComplete]);
  useEffect(() => { completedOrderRef.current = completedOrder; }, [completedOrder]);

  // Auto-select control
  const stopAutoSelecting = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    autoSelectingRef.current = false;
    setAutoSelecting(false);
    autoRoundKeyRef.current = null;
  };

  const startAutoSelecting = () => {
    if (autoSelectingRef.current) return;
    autoSelectingRef.current = true;
    setAutoSelecting(true);
    autoRoundKeyRef.current = currentRoundKeyRef.current;
    intervalRef.current = window.setInterval(() => {
      if (!autoSelectingRef.current) return;
      if (tournamentCompleteRef.current) {
        stopAutoSelecting();
        return;
      }
      const lockedKey = autoRoundKeyRef.current || currentRoundKeyRef.current;
      const currentMatches = matchesRef.current;
      const activeLocked = currentMatches.filter(m => getMatchRoundKey(m) === lockedKey);
      const pendingLocked = activeLocked.filter(m => !m.isBye && !m.winnerId);
      if (pendingLocked.length > 0) {
        const nextMatch = [...pendingLocked].sort((a, b) => (a.round - b.round) || (a.matchNumber - b.matchNumber))[0];
        const winnerId = Math.random() < 0.5 ? nextMatch.player1Id : nextMatch.player2Id;
        if (winnerId) handleMatchResult(nextMatch.id, winnerId);
        return;
      }
      if (currentRoundKeyRef.current !== lockedKey) {
        autoRoundKeyRef.current = currentRoundKeyRef.current;
        return;
      }
    }, 600);
  };

  // Cleanup interval on unmount
  useEffect(() => () => { stopAutoSelecting(); }, []);

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
  const rankingsComputed = calculateRankings(matches);
  const firstSecondDetermined = Boolean(rankingsComputed.first && rankingsComputed.second);
  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture
  
  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {fixtureId ? (MatchesStorage.getFixtureById(fixtureId)?.name || '') : ''}
        </h2>
        <div className="flex gap-4">
          {/* Undo Last Match Button */}
          {completedOrder.length > 0 && (
            <button
              onClick={undoLastMatch}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              {t('matches.undoLastMatch')}
            </button>
          )}
        </div>
      </div>
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
              
              
              <div className="max-w-4xl mx-auto">
                {/* Aktif Tur bilgisi kaldırıldı */}
              </div>
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !firstSecondDetermined && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              if (autoSelectingRef.current) {
                stopAutoSelecting();
              } else {
                startAutoSelecting();
              }
            }}
            className={`inline-flex items-center gap-2 px-6 py-2 ${autoSelecting ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'} text-white rounded-lg shadow transition-all duration-200 text-sm font-semibold`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {autoSelecting ? 'Otomatik Seçmeyi Durdur' : 'Bu Turun Kazananlarını Otomatik Seç'}
          </button>
        </div>
      )}
      {activeTab === 'active' && (
        <>
          {firstSecondDetermined ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl w-full mx-auto">
              {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
            </div>
          )}
        </>
      )}
      {activeTab === 'completed' && (
        <>
          <div className="max-w-4xl mx-auto mb-6">
            <MatchCounter 
              playerCount={players.length}
              completedMatches={matches.filter(m => m.winnerId && !m.isBye).length}
              hasGrandFinal={RoundDescriptionUtils.hasGrandFinalMatch(matches)}
            />
          </div>
          <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
        </>
      )}
      {activeTab === 'rankings' && (
        <div>
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => {
                if (window.confirm(t('matches.resetTournamentConfirm'))) {
                  clearTournamentState();
                  initializeTournament();
                  setSelectedWinner({});
                  setCompletedOrder([]);
                  // Fikstürü aktif hale getir
                  if (fixtureId) {
                    MatchesStorage.activateFixture(fixtureId);
                  }
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('matches.resetTournament')}
            </button>
          </div>
          <RankingsTable rankings={calculateRankings(matches)} players={players} getPlayerName={getPlayerName} />
        </div>
      )}
    </div>
  );
};

export default DoubleElimination384_512; 