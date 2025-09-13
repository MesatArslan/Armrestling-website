import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState } from 'react';
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

const ROUND_ORDER = [
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'LB7', 'WB5', 'LB8', 'YariFinal', 'LB9', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination48_64Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination48_64: React.FC<DoubleElimination48_64Props> = ({ players, resetKey, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  // Tamamlanan maçların sırasını tutan yığın (en sondaki, son tamamlanan)
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);

  // Save tournament state using utility
  const saveTournamentState = (
    matchesState: Match[],
    rankingsState: any,
    completeState: boolean,
    roundKey: RoundKey,
    orderState: string[]
  ) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      completedOrder: orderState,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(48, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(48, playerIds, fixtureId);
      if (state) {
        const loadedMatches: Match[] = state.matches || [];
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
    DoubleEliminationStorage.clearDoubleEliminationState(48, playerIds, fixtureId);
    setCompletedOrder([]);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 64;
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
    setCompletedOrder([]);
  };

  React.useEffect(() => {
    if (players.length >= 48 && players.length <= 64) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, [players]);

  // Reset key değiştiğinde turnuvayı başlat
  React.useEffect(() => {
    if (typeof resetKey !== 'undefined') {
      initializeTournament();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey, completedOrder);
    }
  }, [matches.length, tournamentComplete, currentRoundKey]); // Removed matches from deps

  // Recalculate rankings when tournament is complete
  React.useEffect(() => {
    if (tournamentComplete && matches.length > 0) {
      const recalculatedRankings = calculateRankings(matches);
      if (JSON.stringify(recalculatedRankings) !== JSON.stringify(rankings)) {
        setRankings(recalculatedRankings);
        saveTournamentState(matches, recalculatedRankings, tournamentComplete, currentRoundKey, completedOrder);
      }
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    const nonByeMatches = roundMatches.filter(m => !m.isBye);
    const byeMatches = roundMatches.filter(m => m.isBye);
    
    // Eğer sadece bye maçları varsa, round tamamlanmış sayılır
    if (nonByeMatches.length === 0 && byeMatches.length > 0) {
      return true;
    }
    
    // Normal maçlar varsa, hepsi tamamlanmış olmalı
    return nonByeMatches.length > 0 && nonByeMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id.startsWith('lb5')) return 'LB5';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('lb6')) return 'LB6';
    if (match.id.startsWith('lb7')) return 'LB7';
    if (match.id.startsWith('wb5')) return 'WB5';
    if (match.id.startsWith('lb8')) return 'LB8';
    if (match.id === 'yarifinal') return 'YariFinal';
    if (match.id.startsWith('lb9')) return 'LB9';
    if (match.id === 'seventh_eighth') return '7-8';
    if (match.id === 'lbfinal') return 'LBFinal';
    if (match.id === 'fifth_sixth') return '5-6';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
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
            // swap second with candidate
            ids[i + 1] = candidate;
            ids[j] = second;
            second = ids[i + 1];
            break;
          }
        }
        // if not swapped, leave as is (unavoidable rematch)
      }
      pairs.push([first, second]);
    }
    return pairs;
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
      const updatedMatches = [...matches, ...newMatches];
      setMatches(updatedMatches);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey, completedOrder);
    }
  }, [matches, currentRoundKey]);

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'LB1': {
        // WB R1 kaybedenleri, 32 slot, byeler
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB1');
        const wb1Losers = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const N = wb1Losers.length;
        const Y = 32 - N;
        const byePlayers = wb1Losers.slice(0, Y);
        const matchPlayers = wb1Losers.slice(Y);
        const lb1Matches: Match[] = [];
        byePlayers.forEach((playerId, i) => {
          lb1Matches.push({
            id: `lb1_bye_${i + 1}`,
            player1Id: playerId,
            player2Id: '',
            bracket: 'loser',
            round: 1,
            matchNumber: i + 1,
            isBye: true,
            description: `${RoundDescriptionUtils.getDescription('LB1')} - Bye for ${getPlayerName(playerId)}`
          });
        });
        for (let i = 0; i < matchPlayers.length; i += 2) {
          if (i + 1 < matchPlayers.length) {
            lb1Matches.push({
              id: `lb1_${Math.floor(i/2) + 1}`,
              player1Id: matchPlayers[i],
              player2Id: matchPlayers[i + 1],
              bracket: 'loser',
              round: 1,
              matchNumber: Y + Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB1', Math.floor(i/2) + 1)
            });
          }
        }
        return lb1Matches;
      }
      case 'WB2': {
        // WB1 kazananları + byeler
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB1');
        const wb1Winners = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = wb1Matches.filter(m => m.isBye).map(m => m.player1Id);
        const allWb2Players = [...wb1Winners, ...wb1Byes];
        const wb2Matches: Match[] = [];
        for (let i = 0; i < allWb2Players.length; i += 2) {
          if (i + 1 < allWb2Players.length) {
            wb2Matches.push({
              id: `wb2_${Math.floor(i/2) + 1}`,
              player1Id: allWb2Players[i],
              player2Id: allWb2Players[i + 1],
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
        // LB1 kazananları + byeler + WB2 kaybedenleri
        const lb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB1');
        const lb1Winners = lb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lb1Byes = lb1Matches.filter(m => m.isBye).map(m => m.player1Id);
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB2');
        const wb2Losers = wb2Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb2Players = [...lb1Winners, ...lb1Byes, ...wb2Losers];
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
      case 'WB3': {
        // WB2 kazananları
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB2');
        const wb2Winners = wb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
      case 'LB3': {
        // LB2 kazananları + WB3 kaybedenleri
        const lb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB2');
        const lb2Winners = lb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Losers = wb3Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb3Players = [...lb2Winners, ...wb3Losers];
        const lb3Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb3Players);
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
      case 'WB4': {
        // WB3 kazananları
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Winners = wb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
      case 'LB4': {
        // LB R3'ten 8 kazanan + WB R3'ten 8 kaybeden = 16 oyuncu, 8 maç
        const lb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB3');
        const lb3Winners = lb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Losers = wb3Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb4Players = [...lb3Winners, ...wb3Losers]; // 8 + 8 = 16
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
        // LB4 kazananları
        const lb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB4');
        const lb4Winners = lb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
      case 'WB5': {
        // WB4 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Winners = wb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
            });
          }
        }
        return wb5Matches;
      }
      case 'LB6': {
        // WB4 kaybedenleri + LB5 kazananları = 8 oyuncu (4 maç)
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Losers = wb4Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB5');
        const lb5Winners = lb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb6Players = [...wb4Losers, ...lb5Winners]; // 4 + 4 = 8
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
        // 4 oyuncu maç yapar
        const lb6Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB6');
        const lb6Winners = lb6Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
      case 'LB8': {
        // WB5 kaybedenleri + LB7 kazananları
        const wb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB5');
        const wb5Losers = wb5Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb7Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB7');
        const lb7Winners = lb7Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const combined = [lb7Winners[0], wb5Losers[0], wb5Losers[1], lb7Winners[1]].filter(Boolean) as string[];
        if (combined.length !== 4) return [];
        const pairs = pairAvoidingRematch(combined);
        return pairs.map(([p1, p2], idx) => ({
          id: `lb8_${idx + 1}`,
          player1Id: p1,
          player2Id: p2,
          bracket: 'loser',
          round: 8,
          matchNumber: idx + 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB8', idx + 1)
        }));
      }
      case 'YariFinal': {
        // WB5 kazananları
        const wb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB5');
        const wb5Winners = wb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (wb5Winners.length >= 2) {
          return [{
            id: 'yarifinal',
            player1Id: wb5Winners[0],
            player2Id: wb5Winners[1],
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      case 'LB9': {
        // LB8 kazananları
        const lb8Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB8');
        const lb8Winners = lb8Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (lb8Winners.length >= 2) {
          return [{
            id: 'lb9_1',
            player1Id: lb8Winners[0],
            player2Id: lb8Winners[1],
            bracket: 'loser',
            round: 9,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.createMatchDescription('LB9', 1)
          }];
        }
        return [];
      }
      case '7-8': {
        // LB7 kaybedenleri
        const lb7Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB7');
        const lb7Losers = lb7Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb7Losers.length >= 2) {
          return [{
            id: 'seventh_eighth',
            player1Id: lb7Losers[0],
            player2Id: lb7Losers[1],
            bracket: 'placement',
            round: 8,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('7-8')
          }];
        }
        return [];
      }
      case 'LBFinal': {
        // Yarı Final kaybedeni + LB9 kazananı
        const yarifinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal');
        const yarifinalLoser = yarifinalMatches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb9Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB9');
        const lb9Winner = lb9Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (yarifinalLoser.length > 0 && lb9Winner.length > 0) {
          return [{
            id: 'lbfinal',
            player1Id: yarifinalLoser[0],
            player2Id: lb9Winner[0],
            bracket: 'loser',
            round: 10,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      case '5-6': {
        // LB8 kaybedenleri
        const lb8Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB8');
        const lb8Losers = lb8Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb8Losers.length >= 2) {
          return [{
            id: 'fifth_sixth',
            player1Id: lb8Losers[0],
            player2Id: lb8Losers[1],
            bracket: 'placement',
            round: 9,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }
      case 'Final': {
        // Yarı Final kazananı + LB Final kazananı
        const yarifinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal');
        const yarifinalWinner = yarifinalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lbfinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal');
        const lbfinalWinner = lbfinalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (yarifinalWinner.length > 0 && lbfinalWinner.length > 0) {
          return [{
            id: 'final',
            player1Id: yarifinalWinner[0],
            player2Id: lbfinalWinner[0],
            bracket: 'winner',
            round: 11,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      case 'GrandFinal': {
        // Final kaybedeni + Final kazananı (eğer LB Final kazananı Final'i kazandıysa)
        const finalMatches = matchList.filter(m => getMatchRoundKey(m) === 'Final');
        const finalWinner = finalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        const finalLoser = finalMatches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lbfinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal');
        const lbfinalWinnerId = lbfinalMatches.filter(m => m.winnerId).map(m => m.winnerId!)[0];
        if (finalWinner.length > 0 && finalLoser.length > 0 && lbfinalWinnerId && finalWinner[0] === lbfinalWinnerId) {
          return [{
            id: 'grandfinal',
            player1Id: finalWinner[0],
            player2Id: finalLoser[0],
            bracket: 'winner',
            round: 12,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          }];
        }
        return [];
      }
    }
    return [];
  }

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const undoLastMatch = () => {
    // Stack mevcutsa onu, yoksa maçlardan round ve numaraya göre türet
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
      // Geri alındığında, akış olarak Final'den bir önceki tur olan 5-6'a dönülmeli
      newCurrentRoundKey = '5-6';
    } else if (lastId === 'lbfinal') {
      clearWinner('lbfinal');
      removeIds(['final', 'grandfinal']);
          delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LBFinal';
    } else if (lastId.startsWith('lb9_')) {
      clearWinner(lastId);
      const idsToRemove = ['lbfinal', 'final', 'grandfinal'];
      removeIds(idsToRemove);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB9';
    } else if (lastId === 'yarifinal') {
      clearWinner('yarifinal');
      removeIds(['lbfinal', 'final', 'grandfinal']);
      delete updatedRankings.first;
      delete updatedRankings.second;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      newCurrentRoundKey = 'YariFinal';
    } else if (lastId === 'seventh_eighth') {
      clearWinner('seventh_eighth');
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      newCurrentRoundKey = '7-8';
    } else if (lastId === 'fifth_sixth') {
      clearWinner('fifth_sixth');
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      newCurrentRoundKey = '5-6';
    } else if (lastId.startsWith('lb8_')) {
      clearWinner(lastId);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'fifth_sixth'];
      removeIds(idsToRemove);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB8';
    } else if (lastId.startsWith('wb5_')) {
      clearWinner(lastId);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['yarifinal', 'lb9_1', 'lbfinal', 'final', 'grandfinal', 'fifth_sixth', ...lb8Ids];
      removeIds(idsToRemove);
      delete updatedRankings.first;
      delete updatedRankings.second;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      newCurrentRoundKey = 'WB5';
    } else if (lastId.startsWith('lb7_')) {
      clearWinner(lastId);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb8Ids];
      removeIds(idsToRemove);
          delete updatedRankings.seventh;
          delete updatedRankings.eighth;
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
      delete updatedRankings.third;
          delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB7';
    } else if (lastId.startsWith('lb6_')) {
      clearWinner(lastId);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB6';
    } else if (lastId.startsWith('wb4_')) {
      clearWinner(lastId);
      const wb5Ids = updatedMatches.filter(m => m.id.startsWith('wb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      // LB5, WB4'ten ÖNCE gelir; geri alırken LB5 maçları korunmalı
      const idsToRemove = ['yarifinal', 'lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...wb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB4';
    } else if (lastId.startsWith('lb5_')) {
      clearWinner(lastId);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB5';
    } else if (lastId.startsWith('lb4_')) {
      clearWinner(lastId);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb5Ids, ...lb6Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB4';
    } else if (lastId.startsWith('wb3_')) {
      clearWinner(lastId);
      const wb4Ids = updatedMatches.filter(m => m.id.startsWith('wb4_')).map(m => m.id);
      const wb5Ids = updatedMatches.filter(m => m.id.startsWith('wb5_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      // LB3, WB3'ten ÖNCE gelir; geri alırken LB3 maçları korunmalı
      const idsToRemove = ['yarifinal', 'lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...wb4Ids, ...wb5Ids, ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB3';
    } else if (lastId.startsWith('lb3_')) {
      clearWinner(lastId);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB3';
    } else if (lastId.startsWith('lb2_')) {
      clearWinner(lastId);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb3Ids, ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB2';
    } else if (lastId.startsWith('lb1_')) {
      clearWinner(lastId);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const idsToRemove = ['lb9_1', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB1';
    } else if (lastId.startsWith('wb2_')) {
      clearWinner(lastId);
      const wb3Ids = updatedMatches.filter(m => m.id.startsWith('wb3_')).map(m => m.id);
      const wb4Ids = updatedMatches.filter(m => m.id.startsWith('wb4_')).map(m => m.id);
      const wb5Ids = updatedMatches.filter(m => m.id.startsWith('wb5_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const lb9Ids = updatedMatches.filter(m => m.id.startsWith('lb9_')).map(m => m.id);
      // LB1, WB2'den ÖNCE gelir; geri alırken LB1 maçları korunmalı
      const idsToRemove = ['yarifinal', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...wb3Ids, ...wb4Ids, ...wb5Ids, ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids, ...lb9Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB2';
    } else if (lastId.startsWith('wb1_')) {
      clearWinner(lastId);
      const wb2Ids = updatedMatches.filter(m => m.id.startsWith('wb2_')).map(m => m.id);
      const wb3Ids = updatedMatches.filter(m => m.id.startsWith('wb3_')).map(m => m.id);
      const wb4Ids = updatedMatches.filter(m => m.id.startsWith('wb4_')).map(m => m.id);
      const wb5Ids = updatedMatches.filter(m => m.id.startsWith('wb5_')).map(m => m.id);
      const lb1Ids = updatedMatches.filter(m => m.id.startsWith('lb1_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb5_')).map(m => m.id);
      const lb6Ids = updatedMatches.filter(m => m.id.startsWith('lb6_')).map(m => m.id);
      const lb7Ids = updatedMatches.filter(m => m.id.startsWith('lb7_')).map(m => m.id);
      const lb8Ids = updatedMatches.filter(m => m.id.startsWith('lb8_')).map(m => m.id);
      const lb9Ids = updatedMatches.filter(m => m.id.startsWith('lb9_')).map(m => m.id);
      const idsToRemove = ['yarifinal', 'lbfinal', 'final', 'grandfinal', 'seventh_eighth', 'fifth_sixth', ...wb2Ids, ...wb3Ids, ...wb4Ids, ...wb5Ids, ...lb1Ids, ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids, ...lb6Ids, ...lb7Ids, ...lb8Ids, ...lb9Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB1';
    }

    // Seçilmiş kazananları var olmayan maçlardan temizle ve geri alınan maç için sıfırla
    const remainingIds = new Set(updatedMatches.map(m => m.id));
    const prunedSelected: { [matchId: string]: string | null } = {};
    Object.entries(selectedWinner).forEach(([k, v]) => {
      if (remainingIds.has(k)) prunedSelected[k] = v;
    });
    if (remainingIds.has(lastId)) prunedSelected[lastId] = null;

    // Hedef round'un sonrasındaki tüm maçları kaldır (duplicate oluşumunu engelle)
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
    // Opponents listesinden geri alınan maçı kaldır
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
    const updatedMatches = matches.map(match =>
        match.id === matchId ? { ...match, winnerId } : match
      );
    let updatedRankings = { ...rankings };
    let complete = tournamentComplete;
      const finalMatch = updatedMatches.find(m => m.id === 'final');
      const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');
      if (grandFinalMatch?.winnerId) {
        updatedRankings = calculateRankings(updatedMatches);
        complete = true;
      } else if (finalMatch?.winnerId) {
        const lbfinalWinner = updatedMatches.find(m => m.id === 'lbfinal')?.winnerId;
        const finalWinner = finalMatch.winnerId;
        if (!(lbfinalWinner && finalWinner === lbfinalWinner)) {
          updatedRankings = calculateRankings(updatedMatches);
          complete = true;
        }
      }
    setMatches(updatedMatches);
    setRankings(updatedRankings);
    setTournamentComplete(complete);
    const matchRef = updatedMatches.find(m => m.id === matchId) || matches.find(m => m.id === matchId);
    const isByeMatch = Boolean(matchRef?.isBye);
    const newCompletedOrder = isByeMatch || completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    saveTournamentState(updatedMatches, updatedRankings, complete, currentRoundKey, newCompletedOrder);
    
    // Call parent's match result handler
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Update opponents after match
    if (matchRef && onUpdateOpponents) {
      onUpdateOpponents(matchRef.player1Id, matchRef.player2Id, matchRef.description || 'Unknown Match', winnerId);
    }
    
    if (complete && onTournamentComplete) {
      onTournamentComplete(updatedRankings);
    }
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
    // 4: LB9 kaybedeni (LB9 roundunun ilk maçı)
    const lb9Match = matchList.find(m => m.id === 'lb9_1');
    if (lb9Match?.winnerId) {
      rankings.fourth = lb9Match.winnerId === lb9Match.player1Id ? lb9Match.player2Id : lb9Match.player1Id;
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




  if (players.length < 48 || players.length > 64) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 48-64 oyuncu arası için tasarlanmıştır. 
          Mevcut oyuncu sayısı: {players.length}
        </p>
      </div>
    );
  }

  // --- Aktif ve tamamlanan maçları göster ---
  const activeRoundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);
  const rankingsComputed = calculateRankings(matches);
  const firstSecondDetermined = Boolean(rankingsComputed.first && rankingsComputed.second);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      
      <div className="max-w-4xl mx-auto">
        {/* Aktif Tur bilgisi kaldırıldı */}
      </div>
      {activeTab === 'active' && (
        <>
          {/* Butonlar hem aktif hem de tamamlanmış turnuvalarda gösteriliyor */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-4">
              {/* Undo Last Match Button */}
              {completedOrder.length > 0 && (
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
          </div>
          
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
            <>
              {/* Otomatik Kazananları Seç Butonu */}
              {(() => {
                const roundMatches = activeRoundMatches.filter(m => !m.isBye && !m.winnerId);
                return roundMatches.length > 0;
              })() && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => {
                      const roundMatches = activeRoundMatches.filter(m => !m.isBye && !m.winnerId);
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl w-full mx-auto">
                {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
              </div>
            </>
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
                if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
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
              Turnuvayı Sıfırla
            </button>
          </div>
          <RankingsTable rankings={calculateRankings(matches)} players={players} getPlayerName={getPlayerName} />
        </div>
      )}
    </div>
  );
};

export default DoubleElimination48_64; 
