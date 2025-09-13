import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState } from 'react';
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
  'WB1', 'LB1', 'WB2', 'LB2', 'WB3', 'LB3', 'LB4', 'Placement5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination7: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
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
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  // Tamamlanan maçların sırasını tutan yığın (en sondaki, son tamamlanan)
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey, orderState: string[]) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
      completedOrder: orderState,
      // Do not persist matchHistory
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(7, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(7, playerIds, fixtureId);
      if (state) {
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        // completedOrder varsa kullan; yoksa non-bye maçlardan türet
        const derivedOrder: string[] = (() => {
          const idOrder = ['wb1-1','wb1-2','wb1-3','lb1-1','wb2-1','wb2-2','lb2-1','lb2-2','wb3','lb3','lb4','placement5-6','final','grandfinal'];
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
    return false; // No state found
  };

  // Clear tournament state using utility
  const clearTournamentState = () => {
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.clearDoubleEliminationState(7, playerIds, fixtureId);
  };

  // Initialize tournament
  const initializeTournament = () => {
    clearTournamentState();
    const newMatches: Match[] = [];
    // Shuffle players randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    if (players.length === 7) {
      // WB1: 6 kişi maç yapar, 1 kişi bye geçer
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

      // 7. oyuncu bye geçer
      newMatches.push({
        id: 'wb1-bye',
        player1Id: shuffledPlayers[6].id,
        player2Id: '',
        bracket: 'winner',
        round: 1,
        matchNumber: 4,
        isBye: true,
        description: 'Bye - Otomatik geçiş'
      });
    }

    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    saveTournamentState(newMatches, {}, false, 'WB1', []);
  };

  React.useEffect(() => {
    if (players.length === 7) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, []); // Remove players dependency to prevent re-initialization

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

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]): boolean => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    const nonByeMatches = roundMatches.filter(m => !m.isBye);
    const byeMatches = roundMatches.filter(m => m.isBye);
    
    // Eğer sadece bye maçları varsa, round tamamlanmış sayılır
    if (nonByeMatches.length === 0 && byeMatches.length > 0) {
      return byeMatches.every(m => m.winnerId);
    }
    
    return nonByeMatches.length > 0 && nonByeMatches.every(m => m.winnerId) && byeMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id === 'placement5-6') return 'Placement5-6';
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
    const nextRoundKey = ROUND_ORDER[currentIdx + 1];
    const newMatches = createNextRound(nextRoundKey, matches);
    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey, completedOrder);
    }
    // eslint-disable-next-line
  }, [matches, currentRoundKey]);

  // --- Next Round Match Creation Logic ---
  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'LB1': {
        // WB1 kaybedenleri - 2 tanesi maç atar, 1 tanesi bye geçer
        const wb1_1 = matchList.find(m => m.id === 'wb1-1');
        const wb1_2 = matchList.find(m => m.id === 'wb1-2');
        const wb1_3 = matchList.find(m => m.id === 'wb1-3');
        
        if (wb1_1?.winnerId && wb1_2?.winnerId && wb1_3?.winnerId) {
          const wb1_1Loser = wb1_1.player1Id === wb1_1.winnerId ? wb1_1.player2Id : wb1_1.player1Id;
          const wb1_2Loser = wb1_2.player1Id === wb1_2.winnerId ? wb1_2.player2Id : wb1_2.player1Id;
          const wb1_3Loser = wb1_3.player1Id === wb1_3.winnerId ? wb1_3.player2Id : wb1_3.player1Id;
          
          return [
            {
              id: 'lb1-1',
              player1Id: wb1_1Loser,
              player2Id: wb1_2Loser,
              bracket: 'loser',
              round: 1,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB1', 1)
            },
            {
              id: 'lb1-bye',
              player1Id: wb1_3Loser,
              player2Id: '',
              bracket: 'loser',
              round: 1,
              matchNumber: 2,
              isBye: true,
              description: 'Bye - Otomatik geçiş'
            }
          ];
        }
        return [];
      }
      case 'WB2': {
        // WB1 kazananları + bye player (quarterfinal)
        const wb1_1 = matchList.find(m => m.id === 'wb1-1');
        const wb1_2 = matchList.find(m => m.id === 'wb1-2');
        const wb1_3 = matchList.find(m => m.id === 'wb1-3');
        const wb1_bye = matchList.find(m => m.id === 'wb1-bye');
        
        if (wb1_1?.winnerId && wb1_2?.winnerId && wb1_3?.winnerId && wb1_bye?.winnerId) {
          return [
            {
              id: 'wb2-1',
              player1Id: wb1_1.winnerId,
              player2Id: wb1_2.winnerId,
              bracket: 'winner',
              round: 2,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
            },
            {
              id: 'wb2-2',
              player1Id: wb1_3.winnerId,
              player2Id: wb1_bye.winnerId,
              bracket: 'winner',
              round: 2,
              matchNumber: 2,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
            }
          ];
        }
        return [];
      }
      case 'LB2': {
        // LB1 kazananı + LB1'den bye geçen kişi + WB2 kaybedenleri
        const lb1_1 = matchList.find(m => m.id === 'lb1-1');
        const lb1_bye = matchList.find(m => m.id === 'lb1-bye');
        const wb2_1 = matchList.find(m => m.id === 'wb2-1');
        const wb2_2 = matchList.find(m => m.id === 'wb2-2');
        
        if (lb1_1?.winnerId && lb1_bye?.winnerId && wb2_1?.winnerId && wb2_2?.winnerId) {
          const wb2_1Loser = wb2_1.player1Id === wb2_1.winnerId ? wb2_1.player2Id : wb2_1.player1Id;
          const wb2_2Loser = wb2_2.player1Id === wb2_2.winnerId ? wb2_2.player2Id : wb2_2.player1Id;
          
          // LB2-1 için rematch önleme
          const lb2_1Players = [lb1_1.winnerId, lb1_bye.winnerId];
          const lb2_1Pairs = pairAvoidingRematch(lb2_1Players);
          
          // LB2-2 için rematch önleme
          const lb2_2Players = [wb2_1Loser, wb2_2Loser];
          const lb2_2Pairs = pairAvoidingRematch(lb2_2Players);
          
          return [
            {
              id: 'lb2-1',
              player1Id: lb2_1Pairs[0][0],
              player2Id: lb2_1Pairs[0][1],
              bracket: 'loser',
              round: 2,
              matchNumber: 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB2', 1)
            },
            {
              id: 'lb2-2',
              player1Id: lb2_2Pairs[0][0],
              player2Id: lb2_2Pairs[0][1],
              bracket: 'loser',
              round: 2,
              matchNumber: 2,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB2', 2)
            }
          ];
        }
        return [];
      }
      case 'WB3': {
        // WB2 kazananları (semifinal)
        const wb2_1 = matchList.find(m => m.id === 'wb2-1');
        const wb2_2 = matchList.find(m => m.id === 'wb2-2');
        
        if (wb2_1?.winnerId && wb2_2?.winnerId) {
          return [{
            id: 'wb3',
            player1Id: wb2_1.winnerId,
            player2Id: wb2_2.winnerId,
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      case 'LB3': {
        // LB2 kazananları
        const lb2_1 = matchList.find(m => m.id === 'lb2-1');
        const lb2_2 = matchList.find(m => m.id === 'lb2-2');
        
        if (lb2_1?.winnerId && lb2_2?.winnerId) {
          return [{
            id: 'lb3',
            player1Id: lb2_1.winnerId,
            player2Id: lb2_2.winnerId,
            bracket: 'loser',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB3')
          }];
        }
        return [];
      }
      case 'LB4': {
        // LB3 kazananı vs WB3 kaybedeni (LB Final)
        const lb3 = matchList.find(m => m.id === 'lb3');
        const wb3 = matchList.find(m => m.id === 'wb3');
        
        if (lb3?.winnerId && wb3?.winnerId) {
          const wb3Loser = wb3.player1Id === wb3.winnerId ? wb3.player2Id : wb3.player1Id;
          
          return [{
            id: 'lb4',
            player1Id: lb3.winnerId,
            player2Id: wb3Loser,
            bracket: 'loser',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      case 'Placement5-6': {
        // LB2 kaybedenleri 5-6 maçı
        const lb2_1 = matchList.find(m => m.id === 'lb2-1');
        const lb2_2 = matchList.find(m => m.id === 'lb2-2');
        
        if (lb2_1?.winnerId && lb2_2?.winnerId) {
          const lb2_1Loser = lb2_1.player1Id === lb2_1.winnerId ? lb2_1.player2Id : lb2_1.player1Id;
          const lb2_2Loser = lb2_2.player1Id === lb2_2.winnerId ? lb2_2.player2Id : lb2_2.player1Id;
          
          return [{
            id: 'placement5-6',
            player1Id: lb2_1Loser,
            player2Id: lb2_2Loser,
            bracket: 'placement',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }
      case 'Final': {
        // WB3 kazananı vs LB4 kazananı
        const wb3 = matchList.find(m => m.id === 'wb3');
        const lb4 = matchList.find(m => m.id === 'lb4');
        
        if (wb3?.winnerId && lb4?.winnerId) {
          return [{
            id: 'final',
            player1Id: wb3.winnerId,
            player2Id: lb4.winnerId,
            bracket: 'winner',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      case 'GrandFinal': {
        // Final oynandıysa ve LB'den gelen kazandıysa Grand Final oynanır
        const finalMatch = matchList.find(m => m.id === 'final');
        const wb3 = matchList.find(m => m.id === 'wb3');
        
        if (finalMatch?.winnerId && wb3?.winnerId && finalMatch.winnerId !== wb3.winnerId) {
          return [{
            id: 'grandfinal',
            player1Id: wb3.winnerId,
            player2Id: finalMatch.winnerId,
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          }];
        }
        return [];
      }
      default:
        return [];
    }
  }

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

    // Check if tournament is complete
    if (matchId === 'final') {
      const wb3 = finalMatches.find(m => m.id === 'wb3');
      if (winnerId === wb3?.winnerId) {
        // WB kazananı kazandı, turnuva bitti
        finalRankings = { ...finalRankings, first: winnerId, second: loserId };
        finalTournamentComplete = true;
      }
      // LB'den gelen kazandıysa Grand Final oynanacak, 1. ve 2. henüz belli değil
    } else if (matchId === 'grandfinal') {
      // Grand Final tamamlandı
      finalRankings = { ...finalRankings, first: winnerId, second: loserId };
      finalTournamentComplete = true;
    } else if (matchId === 'lb4') {
      // LB Final tamamlandı, sadece 3. sıra belirlenir (yenilen 3. olur)
      finalRankings = { ...finalRankings, third: loserId };
    } else if (matchId === 'placement5-6') {
      // 5-6 maçı tamamlandı
      finalRankings = { ...finalRankings, fifth: winnerId, sixth: loserId };
    } else if (matchId === 'lb3') {
      // LB3 tamamlandı, 4. sıra belirlenir
      finalRankings = { ...finalRankings, fourth: loserId };
    } else if (matchId === 'lb1-1') {
      // LB1 tamamlandı, 7. sıra belirlenir
      finalRankings = { ...finalRankings, seventh: loserId };
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    setSelectedWinner(prev => ({
      ...prev,
      [matchId]: null
    }));

    // Call onMatchResult callback
    if (onMatchResult) {
      onMatchResult(matchId, winnerId, loserId);
    }

    // Update opponents after match
    if (onUpdateOpponents) {
      onUpdateOpponents(currentMatch.player1Id, currentMatch.player2Id, currentMatch.description || 'Unknown Match', winnerId);
    }

    // Call onTournamentComplete callback
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }

    // completedOrder'u güncelle (bye maçlarını sayma)
    const isByeMatch = Boolean(currentMatch?.isBye);
    const newCompletedOrder = isByeMatch || completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    const state = {
      matches: finalMatches,
      rankings: finalRankings,
      tournamentComplete: finalTournamentComplete,
      currentRoundKey: currentRoundKey,
      completedOrder: newCompletedOrder,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(7, playerIds, state, fixtureId);
  };

  const calculateRankings = (matchList: Match[]): any => {
    const rankings: any = {};
    
    // Find final matches
    const finalMatch = matchList.find(m => m.id === 'final');
    const grandFinalMatch = matchList.find(m => m.id === 'grandfinal');
    const lb4Match = matchList.find(m => m.id === 'lb4');
    const lb3Match = matchList.find(m => m.id === 'lb3');
    const placement5_6Match = matchList.find(m => m.id === 'placement5-6');
    const lb1Match = matchList.find(m => m.id === 'lb1-1');
    
    if (grandFinalMatch?.winnerId) {
      rankings.first = grandFinalMatch.winnerId;
      rankings.second = grandFinalMatch.player1Id === grandFinalMatch.winnerId ? grandFinalMatch.player2Id : grandFinalMatch.player1Id;
    } else if (finalMatch?.winnerId) {
      const wb3 = matchList.find(m => m.id === 'wb3');
      if (finalMatch.winnerId === wb3?.winnerId) {
        // WB kazananı kazandı, 1. ve 2. belli
        rankings.first = finalMatch.winnerId;
        rankings.second = finalMatch.player1Id === finalMatch.winnerId ? finalMatch.player2Id : finalMatch.player1Id;
      }
      // LB'den gelen kazandıysa Grand Final oynanacak, 1. ve 2. henüz belli değil
    }
    
    if (lb4Match?.winnerId) {
      rankings.third = lb4Match.player1Id === lb4Match.winnerId ? lb4Match.player2Id : lb4Match.player1Id;
    }
    
    if (placement5_6Match?.winnerId) {
      rankings.fifth = placement5_6Match.winnerId;
      rankings.sixth = placement5_6Match.player1Id === placement5_6Match.winnerId ? placement5_6Match.player2Id : placement5_6Match.player1Id;
    }
    
    if (lb3Match?.winnerId) {
      rankings.fourth = lb3Match.player1Id === lb3Match.winnerId ? lb3Match.player2Id : lb3Match.player1Id;
    }
    
    if (lb1Match?.winnerId) {
      rankings.seventh = lb1Match.player1Id === lb1Match.winnerId ? lb1Match.player2Id : lb1Match.player1Id;
    }
    
    return rankings;
  };


  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
  };

  const getPlayer = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const undoLastMatch = () => {
    // Stack mevcutsa onu, yoksa matches'tan non-bye kazanılan maçlara göre türet
    const stack = completedOrder.length > 0 ? completedOrder : (() => {
      const idOrder = ['wb1-1','wb1-2','wb1-3','lb1-1','wb2-1','wb2-2','lb2-1','lb2-2','wb3','lb3','lb4','placement5-6','final','grandfinal'];
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
    let updatedRankings = { ...rankings } as { first?: string; second?: string; third?: string; fourth?: string; fifth?: string; sixth?: string; seventh?: string };
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
      case 'placement5-6': {
        updatedMatches = updatedMatches.map(m => m.id === 'placement5-6' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.fifth;
        delete updatedRankings.sixth;
        newCurrentRoundKey = 'Placement5-6' as RoundKey;
        break;
      }
      case 'lb2-2':
      case 'lb2-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb3','lb4','final','grandfinal','placement5-6'].includes(m.id));
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
        updatedMatches = updatedMatches.filter(m => !['lb2-2','wb3','lb3','lb4','final','grandfinal','placement5-6'].includes(m.id));
        updatedRankings = {};
        newCurrentRoundKey = 'WB2' as RoundKey;
        break;
      }
      case 'lb1-1': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb1-1' ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb2-1','lb2-2','lb3','lb4','final','grandfinal','placement5-6'].includes(m.id));
        delete updatedRankings.seventh;
        updatedRankings = {};
        newCurrentRoundKey = 'LB1' as RoundKey;
        break;
      }
      case 'wb1-3':
      case 'wb1-2':
      case 'wb1-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        updatedMatches = updatedMatches.filter(m => !['lb1-1','wb2-1','wb2-2','lb2-1','lb2-2','wb3','lb3','lb4','final','grandfinal','placement5-6'].includes(m.id));
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

    const state = {
      matches: updatedMatches,
      rankings: updatedRankings,
      tournamentComplete: newTournamentComplete,
      currentRoundKey: newCurrentRoundKey,
      completedOrder: newCompletedOrder,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(7, playerIds, state, fixtureId);
    
    // Opponents listesinden sil
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
      const player2Name = match.player1Id ? getPlayerName(match.player1Id) : 'Bye';
      const currentSelectedWinner = selectedWinner[match.id] || null;

      const handleWinnerSelect = (winnerId: string) => {
        setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }));
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
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'Bye';
    const currentSelectedWinner = selectedWinner[match.id] || null;

    const handleWinnerSelect = (winnerId: string) => {
        setSelectedWinner(prev => ({
          ...prev,
          [match.id]: winnerId
        }));
    };

    const handleWinnerConfirm = () => {
      const winnerId = selectedWinner[match.id];
      if (winnerId) {
        handleMatchResult(match.id, winnerId);
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
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
        playersLength={players.length}
        matchTitle={match.description}
      />
    );
  };

  const activeMatches = matches.filter(m => !m.winnerId);

  if (players.length !== 7) {
    return (
      <div className="p-4 text-center text-gray-600">
        Bu bileşen tam olarak 7 oyuncu için tasarlanmıştır.
      </div>
    );
  }

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
      
      {/* Sekme içerikleri */}
        {activeTab === 'active' && (
          <div>
            {activeMatches.length === 0 ? (
              <TournamentCompletionPanel 
                onGoToRankings={() => TabManager.createTabChangeHandler(setActiveTab, fixtureId)('rankings')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
                {activeMatches.map(renderMatch)}
              </div>
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
          <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} playersLength={players.length} />
        </div>
      )}

    </div>
  );
};

export default DoubleElimination7; 