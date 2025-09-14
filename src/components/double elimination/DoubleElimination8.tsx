import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState, useEffect } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
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

const DoubleElimination8: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, onClearAllOpponents, fixtureId }) => {
  const { t } = useTranslation();
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
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
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
    DoubleEliminationStorage.saveDoubleEliminationState(8, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(8, playerIds, fixtureId);
      if (state) {
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        // completedOrder varsa kullan; yoksa non-bye maçlardan türet
        const derivedOrder: string[] = (() => {
          const idOrder = [
            'wb1-1','wb1-2','wb1-3','wb1-4',
            'lb1-1','lb1-2',
            'wb2-1','wb2-2',
            'lb2-1','lb2-2',
            'wb3','lb3','place78','lb4','place56','final','grandfinal'
          ];
          const order: string[] = [];
          for (const id of idOrder) {
            const m = loadedMatches.find((mm: Match) => mm.id === id);
            if (m && m.winnerId && !m.isBye) order.push(id);
          }
          return order;
        })();
        setCompletedOrder((state as any).completedOrder || derivedOrder);
        return true;
      }
    } catch (error) {
      // Error loading tournament state
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
        
        // LB1-1 için rematch önleme
        const lb1_1Players = [losers[0], losers[1]];
        const lb1_1Pairs = pairAvoidingRematch(lb1_1Players);
        
        // LB1-2 için rematch önleme
        const lb1_2Players = [losers[2], losers[3]];
        const lb1_2Pairs = pairAvoidingRematch(lb1_2Players);
        
        newMatches.push({
          id: 'lb1-1',
          player1Id: lb1_1Pairs[0][0],
          player2Id: lb1_1Pairs[0][1],
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB1', 1)
        });
        
        newMatches.push({
          id: 'lb1-2',
          player1Id: lb1_2Pairs[0][0],
          player2Id: lb1_2Pairs[0][1],
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
        
        // LB2 için tüm oyuncuları birleştir ve rematch önleme uygula
        const lb2Players = [...lb1Winners, ...wb2Losers];
        const lb2Pairs = pairAvoidingRematch(lb2Players);
        
        newMatches.push({
          id: 'lb2-1',
          player1Id: lb2Pairs[0][0],
          player2Id: lb2Pairs[0][1],
          bracket: 'loser',
          round: 2,
          matchNumber: 1,
          isBye: false,
          description: RoundDescriptionUtils.createMatchDescription('LB2', 1)
        });
        
        newMatches.push({
          id: 'lb2-2',
          player1Id: lb2Pairs[1][0],
          player2Id: lb2Pairs[1][1],
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
        
        // LB3 için rematch önleme
        const lb3Pairs = pairAvoidingRematch(lb2Winners);
        
        newMatches.push({
          id: 'lb3',
          player1Id: lb3Pairs[0][0],
          player2Id: lb3Pairs[0][1],
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
    setCompletedOrder([]);
    saveTournamentState(newMatches, {}, false, 'WB1', []);
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey, completedOrder);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey]);

  // Check for round completion and create next round
  useEffect(() => {
    if (isCurrentRoundComplete(currentRoundKey, matches)) {
      const nextRoundKey = getNextRoundKey(currentRoundKey);
      if (nextRoundKey) {
        const newMatches = createNextRoundMatches(nextRoundKey, matches);
        if (newMatches.length > 0) {
          const updatedMatches = [...matches, ...newMatches];
          setMatches(updatedMatches);
          setCurrentRoundKey(nextRoundKey);
          saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey, completedOrder);
        }
      }
    }
  }, [matches, currentRoundKey, rankings, tournamentComplete]);

  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture

  const handleMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    const currentMatch = updatedMatches.find(m => m.id === matchId) || matches.find(m => m.id === matchId);
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
    // completedOrder'u güncelle (bye maçlarını sayma)
    const isByeMatch = Boolean(currentMatch?.isBye);
    const newCompletedOrder = isByeMatch || completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    saveTournamentState(finalMatches, finalRankings, finalTournamentComplete, currentRoundKey, newCompletedOrder);
    
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Update opponents after match
    if (onUpdateOpponents) {
      onUpdateOpponents(currentMatch.player1Id, currentMatch.player2Id, currentMatch.description || 'Unknown Match', winnerId);
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

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const getMatchRoundKey = (match: Match): RoundKey => {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id === 'wb3') return 'WB3';
    if (match.id === 'lb3') return 'LB3';
    if (match.id === 'place78') return '7-8';
    if (match.id === 'lb4') return 'LB4';
    if (match.id === 'place56') return '5-6';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
    return 'WB1';
  };

  // --- Rematch Avoidance Helpers ---
  const hasPlayedBefore = (playerAId: string, playerBId: string): boolean => {
    if (!playerAId || !playerBId) return false;
    const playerA = players.find(p => p.id === playerAId);
    if (!playerA || !playerA.opponents || playerA.opponents.length === 0) return false;
    return playerA.opponents.some(o => o.playerId === playerBId);
  };

  const pairAvoidingRematch = (playerIds: string[]): Array<[string, string]> => {
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
  };

  const undoLastMatch = () => {
    // Stack mevcutsa onu, yoksa matches'tan non-bye kazanılan maçlara göre türet
    const stack = completedOrder.length > 0 ? completedOrder : (() => {
      const idOrder = [
        'wb1-1','wb1-2','wb1-3','wb1-4',
        'lb1-1','lb1-2',
        'wb2-1','wb2-2',
        'lb2-1','lb2-2',
        'wb3','lb3','place78','lb4','place56','final','grandfinal'
      ];
      const order: string[] = [];
      for (const id of idOrder) {
        const m = matches.find((mm: Match) => mm.id === id);
        if (m && m.winnerId && !m.isBye) order.push(id);
      }
      return order;
    })();
    if (stack.length === 0) return;

    const lastId = stack[stack.length - 1];
    const undoneMatchRef = matches.find(m => m.id === lastId);
    const newCompletedOrder = stack.slice(0, -1);

    let updatedMatches = [...matches];
    let updatedRankings = { ...rankings } as { first?: string; second?: string; third?: string; fourth?: string; fifth?: string; sixth?: string; seventh?: string; eighth?: string };
    let newTournamentComplete = false;
    let newCurrentRoundKey: RoundKey = currentRoundKey;

    switch (lastId) {
      case 'grandfinal': {
        updatedMatches = updatedMatches.map(m => m.id === 'grandfinal' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.first;
        delete updatedRankings.second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'GrandFinal' as RoundKey;
        break;
      }
      case 'final': {
        updatedMatches = updatedMatches.map(m => m.id === 'final' ? { ...m, winnerId: undefined } : m);
        const gf = updatedMatches.find(m => m.id === 'grandfinal');
        if (gf && !gf.winnerId) updatedMatches = updatedMatches.filter(m => m.id !== 'grandfinal');
        delete updatedRankings.first;
        delete updatedRankings.second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'Final' as RoundKey;
        break;
      }
      case 'lb4': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb4' ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => m.id !== 'final' && m.id !== 'grandfinal');
        delete updatedRankings.third;
        newCurrentRoundKey = 'LB4' as RoundKey;
        break;
      }
      case 'lb3': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb3' ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => m.id !== 'lb4' && m.id !== 'final' && m.id !== 'grandfinal');
        delete updatedRankings.fourth;
        delete updatedRankings.third;
        newCurrentRoundKey = 'LB3' as RoundKey;
        break;
      }
      case 'place56': {
        updatedMatches = updatedMatches.map(m => m.id === 'place56' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.fifth;
        delete updatedRankings.sixth;
        newCurrentRoundKey = '5-6' as RoundKey;
        break;
      }
      case 'place78': {
        updatedMatches = updatedMatches.map(m => m.id === 'place78' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.seventh;
        delete updatedRankings.eighth;
        newCurrentRoundKey = '7-8' as RoundKey;
        break;
      }
      case 'lb2-2':
      case 'lb2-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb3','lb4','final','grandfinal','place56'].includes(m.id));
        delete updatedRankings.fourth;
        delete updatedRankings.fifth;
        delete updatedRankings.sixth;
        delete updatedRankings.third;
        newCurrentRoundKey = 'LB2' as RoundKey;
        break;
      }
      case 'wb3': {
        updatedMatches = updatedMatches.map(m => m.id === 'wb3' ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => m.id !== 'lb4' && m.id !== 'final' && m.id !== 'grandfinal');
        delete updatedRankings.third;
        newCurrentRoundKey = 'WB3' as RoundKey;
        break;
      }
      case 'wb2-2':
      case 'wb2-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb2-1','lb2-2','wb3','lb3','lb4','final','grandfinal','place56'].includes(m.id));
        updatedRankings = {};
        newCurrentRoundKey = 'WB2' as RoundKey;
        break;
      }
      case 'lb1-2':
      case 'lb1-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb2-1','lb2-2','lb3','lb4','final','grandfinal','place56','place78'].includes(m.id));
        delete updatedRankings.seventh;
        delete updatedRankings.eighth;
        updatedRankings = {};
        newCurrentRoundKey = 'LB1' as RoundKey;
        break;
      }
      case 'wb1-4':
      case 'wb1-3':
      case 'wb1-2':
      case 'wb1-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb1-1','lb1-2','wb2-1','wb2-2','lb2-1','lb2-2','wb3','lb3','lb4','final','grandfinal','place56','place78'].includes(m.id));
        updatedRankings = {};
        newCurrentRoundKey = 'WB1' as RoundKey;
        break;
      }
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

    // Opponents listelerinden bu maçı kaldır
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

  const renderMatch = (match: Match) => {
    // Grand Final maçında oyuncuları ters göster (final'daki pozisyonların tersi)
    if (match.id === 'grandfinal') {
      const player1Name = getPlayerName(match.player2Id);
      const player2Name = match.player1Id ? getPlayerName(match.player1Id) : 'TBD';
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
          setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
        }
      };

      const handleSelectionCancel = () => {
        setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
      };

      return (
        <MatchCard
          key={match.id}
          matchId={match.id}
          fixtureId={fixtureId}
          player1Name={player1Name}
          player2Name={player2Name}
          winnerId={match.winnerId}
          player1Id={match.player2Id || ''}
          player2Id={match.player1Id || ''}
          player1={getPlayer(match.player2Id || '')}
          player2={getPlayer(match.player1Id || '')}
          bracket={match.bracket as 'winner' | 'loser' | 'placement'}
          round={match.round}
          matchNumber={match.matchNumber}
          isBye={match.isBye}
          matchTitle={match.description}
          currentSelectedWinner={currentSelectedWinner}
          playersLength={players.length}
          onWinnerSelect={handleWinnerSelect}
          onWinnerConfirm={handleWinnerConfirm}
          onSelectionCancel={handleSelectionCancel}
        />
      );
    }
    // Diğer maçlar için mevcut haliyle devam
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
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />

      {activeTab === 'active' && (
        <div className="flex justify-center gap-4 mb-4">
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
      )}
      
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
            <TournamentCompletionPanel 
              onGoToRankings={() => TabManager.createTabChangeHandler(setActiveTab, fixtureId)('rankings')}
            />
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
          <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
        </div>
      )}
    </div>
  );
};

export default DoubleElimination8; 