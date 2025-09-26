import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState, useRef } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import MatchCounter from '../UI/MatchCounter';
import TournamentCompletionPanel from '../UI/TournamentCompletionPanel';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';
import { useTranslation } from 'react-i18next';

const ROUND_ORDER = [
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'LB7', 'WB5', 'LB8', 'LB9', 'WB6', 'LB10', 'LB11', 'WB7', 'LB12', 'YariFinal', 'LB13', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
] as const;

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination192_256Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination192_256: React.FC<DoubleElimination192_256Props> = ({ players, resetKey, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, onClearAllOpponents, fixtureId }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');

  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);
  const [, setAutoSelecting] = useState<boolean>(false);
  const autoSelectingRef = useRef<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const matchesRef = useRef<Match[]>(matches);
  const currentRoundKeyRef = useRef<RoundKey>(currentRoundKey);
  const tournamentCompleteRef = useRef<boolean>(tournamentComplete);
  const autoRoundKeyRef = useRef<RoundKey | null>(null);
  const completedOrderRef = useRef<string[]>(completedOrder);

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
    DoubleEliminationStorage.saveDoubleEliminationState(192, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(192, playerIds, fixtureId);
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
    DoubleEliminationStorage.clearDoubleEliminationState(192, playerIds, fixtureId);
    setCompletedOrder([]);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 256; // 192-256 players need 256 slots for WB1
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = shuffledPlayers.slice(0, byesNeeded);
    const playersForMatches = shuffledPlayers.slice(byesNeeded);
    const wb1Matches: Match[] = [];

    // WB1: Pair up remaining players
    for (let i = 0; i < playersForMatches.length; i += 2) {
      if (i + 1 < playersForMatches.length) {
        wb1Matches.push({
          id: `wb1_${Math.floor(i / 2) + 1}`,
          player1Id: playersForMatches[i].id,
          player2Id: playersForMatches[i + 1].id,
          bracket: 'winner',
          round: 1,
          matchNumber: Math.floor(i / 2) + 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('WB1', Math.floor(i / 2) + 1)
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
    if (players.length >= 192 && players.length <= 256) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, []); // Remove players dependency to prevent re-initialization

  // Keep refs in sync for interval-based auto selection
  React.useEffect(() => { matchesRef.current = matches; }, [matches]);
  React.useEffect(() => { currentRoundKeyRef.current = currentRoundKey; }, [currentRoundKey]);
  React.useEffect(() => { tournamentCompleteRef.current = tournamentComplete; }, [tournamentComplete]);
  React.useEffect(() => { completedOrderRef.current = completedOrder; }, [completedOrder]);

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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey, completedOrder);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey]);

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

  // Complete one match automatically

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


  // Cleanup interval on unmount
  React.useEffect(() => () => { stopAutoSelecting(); }, []);

  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    const nonByeMatches = roundMatches.filter(m => !m.isBye);
    const byeMatches = roundMatches.filter(m => m.isBye);

    if (nonByeMatches.length === 0 && byeMatches.length > 0) {
      return true;
    }
    return nonByeMatches.length > 0 && nonByeMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
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
    if (match.id.startsWith('lb13')) return 'LB13';
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
      currentRoundKeyRef.current = nextRoundKey;
      saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey, completedOrder);
    }
  }, [matches]);

  // Debug useEffect to track currentRoundKey changes
  React.useEffect(() => {
  }, [currentRoundKey, matches]);

  function createNextRound(): Match[] {
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'LB1': {
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        const lb1Players = wb1Losers;
        const byesNeeded = 128 - lb1Players.length;
        const byePlayers = lb1Players.slice(0, byesNeeded);
        const matchPlayers = lb1Players.slice(byesNeeded);
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
              id: `lb1_${Math.floor(i / 2) + 1}`,
              player1Id: matchPlayers[i],
              player2Id: matchPlayers[i + 1],
              bracket: 'loser',
              round: 1,
              matchNumber: byesNeeded + Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB1', Math.floor(i / 2) + 1)
            });
          }
        }
        return lb1Matches;
      }
      case 'WB2': {
        const wb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.isBye).map(m => m.player1Id);
        const wb2Players = [...wb1Winners, ...wb1Byes];
        if (wb2Players.length !== 128) return [];
        const wb2Matches: Match[] = [];
        for (let i = 0; i < wb2Players.length; i += 2) {
          if (i + 1 < wb2Players.length) {
            wb2Matches.push({
              id: `wb2_${Math.floor(i / 2) + 1}`,
              player1Id: wb2Players[i],
              player2Id: wb2Players[i + 1],
              bracket: 'winner',
              round: 2,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB2', Math.floor(i / 2) + 1)
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
        if (lb2Players.length !== 128) return [];
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
        if (lb2Winners.length !== 64) return [];
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
        if (wb2Winners.length !== 64) return [];
        const wb3Matches: Match[] = [];
        for (let i = 0; i < wb2Winners.length; i += 2) {
          if (i + 1 < wb2Winners.length) {
            wb3Matches.push({
              id: `wb3_${Math.floor(i / 2) + 1}`,
              player1Id: wb2Winners[i],
              player2Id: wb2Winners[i + 1],
              bracket: 'winner',
              round: 3,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB3', Math.floor(i / 2) + 1)
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
        if (lb4Players.length !== 64) return [];
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
        if (lb4Winners.length !== 32) return [];
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
        if (wb3Winners.length !== 32) return [];
        const wb4Matches: Match[] = [];
        for (let i = 0; i < wb3Winners.length; i += 2) {
          if (i + 1 < wb3Winners.length) {
            wb4Matches.push({
              id: `wb4_${Math.floor(i / 2) + 1}`,
              player1Id: wb3Winners[i],
              player2Id: wb3Winners[i + 1],
              bracket: 'winner',
              round: 4,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB4', Math.floor(i / 2) + 1)
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
        if (lb6Players.length !== 32) return [];
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
        if (lb6Winners.length !== 16) return [];
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
        if (wb4Winners.length !== 16) return [];
        const wb5Matches: Match[] = [];
        for (let i = 0; i < wb4Winners.length; i += 2) {
          if (i + 1 < wb4Winners.length) {
            wb5Matches.push({
              id: `wb5_${Math.floor(i / 2) + 1}`,
              player1Id: wb4Winners[i],
              player2Id: wb4Winners[i + 1],
              bracket: 'winner',
              round: 5,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB5', Math.floor(i / 2) + 1)
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
        if (lb8Players.length !== 16) return [];
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
        if (lb8Winners.length !== 8) return [];
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
        if (wb5Winners.length !== 8) return [];
        const wb6Matches: Match[] = [];
        for (let i = 0; i < wb5Winners.length; i += 2) {
          if (i + 1 < wb5Winners.length) {
            wb6Matches.push({
              id: `wb6_${Math.floor(i / 2) + 1}`,
              player1Id: wb5Winners[i],
              player2Id: wb5Winners[i + 1],
              bracket: 'winner',
              round: 6,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB6', Math.floor(i / 2) + 1)
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
        if (lb10Players.length !== 8) return [];
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
        if (lb10Winners.length !== 4) return [];
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
        if (wb6Winners.length !== 4) return [];
        const wb7Matches: Match[] = [];
        for (let i = 0; i < wb6Winners.length; i += 2) {
          if (i + 1 < wb6Winners.length) {
            wb7Matches.push({
              id: `wb7_${Math.floor(i / 2) + 1}`,
              player1Id: wb6Winners[i],
              player2Id: wb6Winners[i + 1],
              bracket: 'winner',
              round: 7,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i / 2) + 1)
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
        if (lb12Players.length !== 4) return [];
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
      case 'YariFinal': {
        const wb7Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB7' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (wb7Winners.length !== 2) return [];
        const yariFinalMatches: Match[] = [];
        for (let i = 0; i < wb7Winners.length; i += 2) {
          if (i + 1 < wb7Winners.length) {
            yariFinalMatches.push({
              id: `yarifinal_${Math.floor(i / 2) + 1}`,
              player1Id: wb7Winners[i],
              player2Id: wb7Winners[i + 1],
              bracket: 'winner',
              round: 8,
              matchNumber: Math.floor(i / 2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
            });
          }
        }
        return yariFinalMatches;
      }
      case 'LB13': {
        const lb12Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB12' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (lb12Winners.length !== 2) return [];
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
      case '7-8': {
        const lb11Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB11' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb11Losers.length !== 2) {
          return [];
        }
        return [{
          id: 'seventh_eighth',
          player1Id: lb11Losers[0],
          player2Id: lb11Losers[1],
          bracket: 'placement',
          round: 14,
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
        const lb13Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB13' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        if (yariFinalLoser.length !== 1 || lb13Winners.length !== 1) return [];
        return [{
          id: 'lbfinal',
          player1Id: lb13Winners[0],
          player2Id: yariFinalLoser[0],
          bracket: 'loser',
          round: 15,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.getDescription('LB_Final')
        }];
      }
      case '5-6': {
        const lb12Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB12' && m.winnerId && !m.isBye).map(m => {
          if (m.player1Id === m.winnerId) return m.player2Id;
          return m.player1Id;
        }).filter(Boolean);
        if (lb12Losers.length !== 2) {
          return [];
        }
        return [{
          id: 'fifth_sixth',
          player1Id: lb12Losers[0],
          player2Id: lb12Losers[1],
          bracket: 'placement',
          round: 16,
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
          round: 17,
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
              player2Id: finalLoser as string, // Type assertion to handle potential undefined
              bracket: 'winner',
              round: 18,
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

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const undoLastMatch = () => {
    if (autoSelectingRef.current) {
      stopAutoSelecting();
    }
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
      newCurrentRoundKey = '5-6';
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
      newCurrentRoundKey = '7-8';
    } else if (lastId === 'fifth_sixth') {
      clearWinner('fifth_sixth');
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      newCurrentRoundKey = '5-6';
    } else if (lastId === 'lb13_1') {
      clearWinner('lb13_1');
      delete updatedRankings.fourth;
      newCurrentRoundKey = 'LB13';
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
    // Opponents listesinden sil
    if (onRemoveOpponents && undoneMatchRef && !undoneMatchRef.isBye) {
      onRemoveOpponents(undoneMatchRef.player1Id, undoneMatchRef.player2Id, undoneMatchRef.description || 'Unknown Match');
    }
    // Reactivate fixture if an undo happens
    try {
      if (fixtureId) {
        MatchesStorage.activateFixture(fixtureId);
      }
    } catch { }
  };


  const handleMatchResult = (matchId: string, winnerId: string) => {
    const baseMatches = matchesRef.current;
    const updatedMatches = baseMatches.map(match =>
      match.id === matchId ? { ...match, winnerId } : match
    );
    let updatedRankings = { ...rankings };
    let complete = tournamentCompleteRef.current;

    // Her maçtan sonra anlık sıralamayı güncelle ve isteğe bağlı callback'i tetikle
    if (onMatchResult) {
      const match = updatedMatches.find(m => m.id === matchId);
      if (match) {
        const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        onMatchResult('double-elimination', winnerId, loserId);
      }
    }

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
    } else {
      updatedRankings = calculateRankings(updatedMatches);
    }

    setMatches(updatedMatches);
    matchesRef.current = updatedMatches;
    setRankings(updatedRankings);
    setTournamentComplete(complete);
    tournamentCompleteRef.current = complete;
    const matchRefObj = baseMatches.find(m => m.id === matchId);
    const isByeMatch = Boolean(matchRefObj?.isBye);
    const prevOrder = completedOrderRef.current;
    const newCompletedOrder = isByeMatch || prevOrder.includes(matchId)
      ? prevOrder
      : [...prevOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    saveTournamentState(updatedMatches, updatedRankings, complete, currentRoundKeyRef.current, newCompletedOrder);

    // Update opponents after match
    if (matchRefObj && onUpdateOpponents) {
      onUpdateOpponents(matchRefObj.player1Id, matchRefObj.player2Id, matchRefObj.description || 'Unknown Match', winnerId);
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
    // 4: LB13 kaybedeni
    const lb13Match = matchList.find(m => m.id === 'lb13_1');
    if (lb13Match?.winnerId) {
      rankings.fourth = lb13Match.winnerId === lb13Match.player1Id ? lb13Match.player2Id : lb13Match.player1Id;
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





  if (players.length < 192 || players.length > 256) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 192-256 oyuncu arası için tasarlanmıştır.
          Mevcut oyuncu sayısı: {players.length}
        </p>
      </div>
    );
  }

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

          {/* Complete One Match Button removed */}

        </div>
      )}
      {activeTab === 'active' && (
        <>
          {(() => {
            const r = calculateRankings(matches);
            const firstSecondDetermined = Boolean(r.first && r.second);
            return firstSecondDetermined;
          })() ? (
            <TournamentCompletionPanel 
              onGoToRankings={() => TabManager.createTabChangeHandler(setActiveTab, fixtureId)('rankings')}
            />
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
                  // Tüm oyuncuların opponents listesini temizle
                  if (onClearAllOpponents) {
                    onClearAllOpponents();
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

export default DoubleElimination192_256; 
