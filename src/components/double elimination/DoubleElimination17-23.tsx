import * as React from 'react';
import { useState } from 'react';
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
  'WB_R1',
  'WB_R2',
  'LB_R1',
  'LB_R2',
  'WB_R3',
  'LB_R3',
  'LB_R4',
  'WB_R4',
  'LB_R5',
  'YARI_FINAL',
  'LB_R6',
  '7-8',
  'LB_FINAL',
  '5-6',
  'FINAL',
  'GRAND_FINAL'
];

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination17_23: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB_R1');
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
    DoubleEliminationStorage.saveDoubleEliminationState(17, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(17, playerIds, fixtureId);
      if (state) {
        const loadedMatches: Match[] = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB_R1');
        // completedOrder varsa kullan; yoksa round ve matchNumber'a göre türet
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
    DoubleEliminationStorage.clearDoubleEliminationState(17, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 32;
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = shuffledPlayers.slice(0, byesNeeded);
    const playersForMatches = shuffledPlayers.slice(byesNeeded);
    const wb1Matches: Match[] = [];
    // WB1: Pair up remaining players
    for (let i = 0; i < playersForMatches.length; i += 2) {
      if (i + 1 < playersForMatches.length) {
        wb1Matches.push({
          id: `wb_r1_${Math.floor(i/2) + 1}`,
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
        id: `wb_r1_bye_${index + 1}`,
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
    setCurrentRoundKey('WB_R1');
    setCompletedOrder([]);
  };

  React.useEffect(() => {
    if (players.length >= 17 && players.length <= 23) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, [players]);

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

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey && !m.isBye);
    return roundMatches.length > 0 && roundMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb_r1')) return 'WB_R1';
    if (match.id.startsWith('wb_r2')) return 'WB_R2';
    if (match.id.startsWith('lb_r1')) return 'LB_R1';
    if (match.id.startsWith('lb_r2')) return 'LB_R2';
    if (match.id.startsWith('wb_r3')) return 'WB_R3';
    if (match.id.startsWith('lb_r3')) return 'LB_R3';
    if (match.id.startsWith('lb_r4')) return 'LB_R4';
    if (match.id.startsWith('wb_r4')) return 'WB_R4';
    if (match.id.startsWith('lb_r5')) return 'LB_R5';
    if (match.id === 'yari_final') return 'YARI_FINAL';
    if (match.id.startsWith('lb_r6')) return 'LB_R6';
    if (match.id === 'seventh_eighth') return '7-8';
    if (match.id === 'lb_final') return 'LB_FINAL';
    if (match.id === 'fifth_sixth') return '5-6';
    if (match.id === 'final') return 'FINAL';
    if (match.id === 'grand_final') return 'GRAND_FINAL';
    return 'WB_R1';
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
    // Sıradaki roundu oluştur
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    const newMatches = createNextRound();
    if (newMatches.length > 0) {
      const updatedMatches = [...matches, ...newMatches];
      setMatches(updatedMatches);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey, completedOrder);
    }
  }, [matches, currentRoundKey]);

  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture

  // --- UI Helpers ---
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

    if (lastId === 'grand_final') {
      clearWinner('grand_final');
      delete updatedRankings.first;
      delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = 'GRAND_FINAL';
    } else if (lastId === 'final') {
      clearWinner('final');
      const gf = updatedMatches.find(m => m.id === 'grand_final');
      if (gf && !gf.winnerId) removeIds(['grand_final']);
      delete updatedRankings.first;
      delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = 'FINAL';
    } else if (lastId === 'lb_final') {
      clearWinner('lb_final');
      removeIds(['final', 'grand_final']);
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB_FINAL';
    } else if (lastId === 'lb_r6') {
      clearWinner('lb_r6');
      removeIds(['lb_final', 'final', 'grand_final']);
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB_R6';
    } else if (lastId === 'yari_final') {
      clearWinner('yari_final');
      removeIds(['lb_final', 'final', 'grand_final']);
      delete updatedRankings.first;
      delete updatedRankings.second;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      newCurrentRoundKey = 'YARI_FINAL';
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
    } else if (lastId.startsWith('lb_r5_')) {
      clearWinner(lastId);
      const lb6Id = updatedMatches.find(m => m.id === 'lb_r6') ? ['lb_r6'] : [];
      const idsToRemove = ['lb_final', 'final', 'grand_final', 'fifth_sixth', ...lb6Id];
      removeIds(idsToRemove);
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB_R5';
    } else if (lastId.startsWith('wb_r4_')) {
      clearWinner(lastId);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['yari_final', 'lb_r6', 'lb_final', 'final', 'grand_final', 'fifth_sixth', ...lb5Ids];
      removeIds(idsToRemove);
      delete updatedRankings.first;
      delete updatedRankings.second;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      newCurrentRoundKey = 'WB_R4';
    } else if (lastId.startsWith('lb_r4_')) {
      clearWinner(lastId);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...lb5Ids];
      removeIds(idsToRemove);
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB_R4';
    } else if (lastId.startsWith('lb_r3_')) {
      clearWinner(lastId);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.third;
      delete updatedRankings.fourth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB_R3';
    } else if (lastId.startsWith('wb_r3_')) {
      clearWinner(lastId);
      const wb4Ids = updatedMatches.filter(m => m.id.startsWith('wb_r4_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb_r3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['yari_final', 'lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...wb4Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB_R3';
    } else if (lastId.startsWith('lb_r2_')) {
      clearWinner(lastId);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb_r3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...lb3Ids, ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB_R2';
    } else if (lastId.startsWith('lb_r1_')) {
      clearWinner(lastId);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb_r2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb_r3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'LB_R1';
    } else if (lastId.startsWith('wb_r2_')) {
      clearWinner(lastId);
      const wb3Ids = updatedMatches.filter(m => m.id.startsWith('wb_r3_')).map(m => m.id);
      const wb4Ids = updatedMatches.filter(m => m.id.startsWith('wb_r4_')).map(m => m.id);
      const lb1Ids = updatedMatches.filter(m => m.id.startsWith('lb_r1_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb_r2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb_r3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['yari_final', 'lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...wb3Ids, ...wb4Ids, ...lb1Ids, ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB_R2';
    } else if (lastId.startsWith('wb_r1_')) {
      clearWinner(lastId);
      const wb2Ids = updatedMatches.filter(m => m.id.startsWith('wb_r2_')).map(m => m.id);
      const lb1Ids = updatedMatches.filter(m => m.id.startsWith('lb_r1_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb_r2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb_r3_')).map(m => m.id);
      const lb4Ids = updatedMatches.filter(m => m.id.startsWith('lb_r4_')).map(m => m.id);
      const lb5Ids = updatedMatches.filter(m => m.id.startsWith('lb_r5_')).map(m => m.id);
      const idsToRemove = ['lb_r6', 'lb_final', 'final', 'grand_final', 'seventh_eighth', 'fifth_sixth', ...wb2Ids, ...lb1Ids, ...lb2Ids, ...lb3Ids, ...lb4Ids, ...lb5Ids];
      removeIds(idsToRemove);
      updatedRankings = {} as Ranking;
      newCurrentRoundKey = 'WB_R1';
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
  const getPlayerDetails = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  // --- Match Result Handler ---
  const handleMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, winnerId } : m
    );
    let newRankings = { ...rankings };
    const match = updatedMatches.find(m => m.id === matchId) || matches.find(m => m.id === matchId);
    if (match) {
      if (match.id === 'seventh_eighth') {
        newRankings.seventh = winnerId;
        newRankings.eighth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'fifth_sixth') {
        newRankings.fifth = winnerId;
        newRankings.sixth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'lb_r6') {
        newRankings.fourth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'lb_final') {
        newRankings.third = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        // 4th place already set from lb_r6
      }
      if (match.id === 'yari_final') {
        // Yarı final kaybedeni lb_final'a gider, 3. ve 4. lb_final ile belirleniyor
        // Burada bir şey yapmaya gerek yok
      }
      if (match.id === 'final' || match.id === 'grand_final') {
        newRankings.first = winnerId;
        newRankings.second = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
    }
    setMatches(updatedMatches);
    setRankings(newRankings);
    // completedOrder'u güncelle (bye maçlarını sayma)
    const isByeMatch = Boolean(match?.isBye);
    const newCompletedOrder = isByeMatch || completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    saveTournamentState(updatedMatches, newRankings, tournamentComplete, currentRoundKey, newCompletedOrder);
    
    // Call parent's match result handler
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Update opponents after match
    if (match && onUpdateOpponents) {
      onUpdateOpponents(match.player1Id, match.player2Id, match.description || 'Unknown Match', winnerId);
    }
    
    // Call parent's tournament complete handler if tournament is complete
    if (match && (match.id === 'final' || match.id === 'grand_final')) {
      if (onTournamentComplete) {
        onTournamentComplete(newRankings);
      }
    }
  };

  // --- Next Round Match Creation Logic ---
  function createNextRound(): Match[] {
    // Son roundun maçlarını bulmak için
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'WB_R2': {
        // WB R2: WB R1 kazananları + byeler
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R1');
        const wb1Winners = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = wb1Matches.filter(m => m.isBye).map(m => m.player1Id);
        const allWb2Players = [...wb1Winners, ...wb1Byes];
        const wb2Matches: Match[] = [];
        for (let i = 0; i < allWb2Players.length; i += 2) {
          if (i + 1 < allWb2Players.length) {
            wb2Matches.push({
              id: `wb_r2_${Math.floor(i/2) + 1}`,
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
      case 'LB_R1': {
        // LB R1: WB R1 ve WB R2 kaybedenleri, byelerle 16'ya tamamlanır
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R1');
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R2');
        const wb1Losers = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const wb2Losers = wb2Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb1Players = [...wb1Losers, ...wb2Losers];
        const byesNeeded = 16 - lb1Players.length;
        const sorted = [...lb1Players].sort((a, b) => getPlayerDetails(b)!.weight - getPlayerDetails(a)!.weight);
        const byePlayers = sorted.slice(0, byesNeeded);
        const matchPlayers = sorted.slice(byesNeeded);
        const lb1Matches: Match[] = [];
        
        // Byeler
        byePlayers.forEach((playerId, i) => {
          lb1Matches.push({
            id: `lb_r1_bye_${i + 1}`,
            player1Id: playerId,
            player2Id: '',
            bracket: 'loser',
            round: 1,
            matchNumber: i + 1,
            isBye: true,
            description: `${RoundDescriptionUtils.getDescription('LB1')} - Bye for ${getPlayerName(playerId)}`
          });
        });
        
        // Maçlar
        for (let i = 0; i < matchPlayers.length; i += 2) {
          if (i + 1 < matchPlayers.length) {
            lb1Matches.push({
              id: `lb_r1_${Math.floor(i/2) + 1}`,
              player1Id: matchPlayers[i],
              player2Id: matchPlayers[i + 1],
              bracket: 'loser',
              round: 1,
              matchNumber: byePlayers.length + Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB1', Math.floor(i/2) + 1)
            });
          }
        }
        return lb1Matches;
      }
      case 'LB_R2': {
        // LB R2: LB R1 kazananları + byeler
        const lb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R1');
        const lb1Winners = lb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lb1Byes = lb1Matches.filter(m => m.isBye).map(m => m.player1Id);
        const lb2Players = [...lb1Winners, ...lb1Byes];
        const lb2Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb2Players);
        pairs.forEach(([p1, p2], idx) => {
          lb2Matches.push({
            id: `lb_r2_${idx + 1}`,
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
      case 'WB_R3': {
        // WB R3: WB R2 kazananları
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R2');
        const wb2Winners = wb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb3Matches: Match[] = [];
        for (let i = 0; i < wb2Winners.length; i += 2) {
          if (i + 1 < wb2Winners.length) {
            wb3Matches.push({
              id: `wb_r3_${Math.floor(i/2) + 1}`,
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
      case 'LB_R3': {
        // LB R3: LB R2 kazananları + WB R3 kaybedenleri
        const lb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R2');
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R3');
        const lb2Winners = lb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb3Losers = wb3Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb3Players = [...lb2Winners, ...wb3Losers];
        const lb3Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb3Players);
        pairs.forEach(([p1, p2], idx) => {
          lb3Matches.push({
            id: `lb_r3_${idx + 1}`,
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
      case 'LB_R4': {
        // LB R4: LB R3 kazananları
        const lb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R3');
        const lb3Winners = lb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb4Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb3Winners);
        pairs.forEach(([p1, p2], idx) => {
          lb4Matches.push({
            id: `lb_r4_${idx + 1}`,
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
      case 'WB_R4': {
        // WB R4: WB R3 kazananları
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R3');
        const wb3Winners = wb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb4Matches: Match[] = [];
        for (let i = 0; i < wb3Winners.length; i += 2) {
          if (i + 1 < wb3Winners.length) {
            wb4Matches.push({
              id: `wb_r4_${Math.floor(i/2) + 1}`,
              player1Id: wb3Winners[i],
              player2Id: wb3Winners[i + 1],
              bracket: 'winner',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
            });
          }
        }
        return wb4Matches;
      }
      case 'LB_R5': {
        // LB R5: WB R4 kaybedenleri + LB R4 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R4');
        const lb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R4');
        const wb4Losers = wb4Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb4Winners = lb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb5Players = [...wb4Losers, ...lb4Winners];
        const lb5Matches: Match[] = [];
        const pairs = pairAvoidingRematch(lb5Players);
        pairs.forEach(([p1, p2], idx) => {
          lb5Matches.push({
            id: `lb_r5_${idx + 1}`,
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
      case 'YARI_FINAL': {
        // Yarı Final: WB R4 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB_R4');
        const wb4Winners = wb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (wb4Winners.length >= 2) {
          return [{
            id: 'yari_final',
            player1Id: wb4Winners[0],
            player2Id: wb4Winners[1],
            bracket: 'winner',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      case 'LB_R6': {
        // LB R6: LB R5 kazananları
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R5');
        const lb5Winners = lb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (lb5Winners.length >= 2) {
          return [{
            id: 'lb_r6',
            player1Id: lb5Winners[0],
            player2Id: lb5Winners[1],
            bracket: 'loser',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB6')
          }];
        }
        return [];
      }
      case '7-8': {
        // 7-8.lik: LB R4 kaybedenleri
        const lb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R4');
        const lb4Losers = lb4Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb4Losers.length >= 2) {
          return [{
            id: 'seventh_eighth',
            player1Id: lb4Losers[0],
            player2Id: lb4Losers[1],
            bracket: 'placement',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('7-8')
          }];
        }
        return [];
      }
      case 'LB_FINAL': {
        // LB Final: Yarı Final kaybedeni + LB R6 kazananı
        const yariFinal = matchList.find(m => m.id === 'yari_final');
        const lbR6 = matchList.find(m => m.id === 'lb_r6');
        if (yariFinal && lbR6 && yariFinal.winnerId && lbR6.winnerId) {
          const yariFinalLoser = yariFinal.player1Id === yariFinal.winnerId ? yariFinal.player2Id : yariFinal.player1Id;
          return [{
            id: 'lb_final',
            player1Id: lbR6.winnerId,
            player2Id: yariFinalLoser,
            bracket: 'loser',
            round: 7,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      case '5-6': {
        // 5-6.lık: LB R5 kaybedenleri
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R5');
        const lb5Losers = lb5Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb5Losers.length >= 2) {
          return [{
            id: 'fifth_sixth',
            player1Id: lb5Losers[0],
            player2Id: lb5Losers[1],
            bracket: 'placement',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }
      case 'FINAL': {
        // Final: Yarı Final kazananı + LB Final kazananı
        const yariFinal = matchList.find(m => m.id === 'yari_final');
        const lbFinal = matchList.find(m => m.id === 'lb_final');
        if (yariFinal && lbFinal && yariFinal.winnerId && lbFinal.winnerId) {
          return [{
            id: 'final',
            player1Id: yariFinal.winnerId,
            player2Id: lbFinal.winnerId,
            bracket: 'winner',
            round: 8,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      case 'GRAND_FINAL': {
        // Grand Final: Finali LB'den gelen kazanırsa
        const final = matchList.find(m => m.id === 'final');
        if (final && final.winnerId) {
          const yariFinal = matchList.find(m => m.id === 'yari_final');
          const lbFinal = matchList.find(m => m.id === 'lb_final');
          if (yariFinal && lbFinal && lbFinal.winnerId === final.winnerId) {
            return [{
              id: 'grand_final',
              player1Id: yariFinal.winnerId!,
              player2Id: lbFinal.winnerId!,
              bracket: 'winner',
              round: 9,
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

  // --- Reset Matches Only ---

  // Fixtürü sıfırlama fonksiyonu

  // --- UI Fonksiyonları ---
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
    
    // For grandfinal matches, swap player positions
    if (match.id === 'grand_final') {
      return (
        <MatchCard
          key={match.id}
          matchId={match.id}
          player1Name={player2Name}
          player2Name={player1Name}
          winnerId={match.winnerId}
          player1Id={match.player2Id || ''}
          player2Id={match.player1Id || ''}
          player1={getPlayer(match.player2Id || '')}
          player2={getPlayer(match.player1Id || '')}
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
    }
    
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



  // Sadece aktif roundun maçlarını göster
  const activeMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6">
        {fixtureId && (
          <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
            {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
          </h2>
        )}
        <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />

      </div>
      
      {activeTab === 'active' && (
        <>
          <div className="flex justify-center gap-4 mb-6">
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
          
          {(() => {
            const globalUnfinished = matches.filter(m => !m.isBye && !m.winnerId);
            const roundUnfinished = activeMatches.filter(m => !m.isBye && !m.winnerId);
            if (globalUnfinished.length === 0) {
              // Show completion panel like DoubleElimination12-16
              return (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-8 text-center shadow-lg">
                    <div className="mb-6">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-3xl font-bold text-green-800 mb-2">🏆 Turnuva Tamamlandı!</h2>

                      <p className="text-green-700 text-lg mb-6">Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.</p>
                      <button
                        onClick={() => TabManager.createTabChangeHandler(setActiveTab, fixtureId)('rankings')}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Sıralama Sekmesine Git
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            
            // Default: show auto-select and matches
            return (
              <>
                {/* Otomatik Kazananları Seç Butonu */}
                {!tournamentComplete && roundUnfinished.length > 0 && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={() => {
                        roundUnfinished.forEach(match => {
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                  {roundUnfinished.map(renderMatch)}
                </div>
              </>
            );
          })()}
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
          <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
        </div>
      )}

    </div>
  );
};

export default DoubleElimination17_23; 