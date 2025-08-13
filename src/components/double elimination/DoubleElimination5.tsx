import * as React from 'react';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';
import { TabManager } from '../../utils/tabManager';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

const ROUND_ORDER = ['WB1', 'WB2', 'LB1', 'WB3', 'LB2', 'LB_Final', 'Place45', 'Final', 'GrandFinal'] as const;
type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination5: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<{
    first?: string;
    second?: string;
    third?: string;
    fourth?: string;
    fifth?: string;
  }>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
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
    DoubleEliminationStorage.saveDoubleEliminationState(5, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(5, playerIds, fixtureId);
      if (state) {
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
        // completedOrder varsa kullan; yoksa türet (bye maçlarını dışla)
        const derivedOrder: string[] = (() => {
          const idOrder = ['wb1','wb2-1','wb2-2','lb1','wb3','lb2','lb_final','place45','final','grandfinal'];
          const order: string[] = [];
          for (const id of idOrder) {
            const m = loadedMatches.find((mm: Match) => mm.id === id);
            if (m?.winnerId) order.push(id);
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
    DoubleEliminationStorage.clearDoubleEliminationState(5, playerIds, fixtureId);
  };

  // Initialize tournament structure for 5 players
  const initializeTournament = () => {
    if (players.length !== 5) return;
    
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    const newMatches: Match[] = [
      // WB1: 2 players match, 3 players get bye
      {
        id: 'wb1',
        player1Id: shuffledPlayers[0].id,
        player2Id: shuffledPlayers[1].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false,
        description: RoundDescriptionUtils.getDescription('WB1')
      },
      // Record three BYE matches so they appear in Completed Matches
      {
        id: 'wb1_bye_2',
        player1Id: shuffledPlayers[2].id,
        player2Id: '',
        winnerId: shuffledPlayers[2].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: true,
        description: `${RoundDescriptionUtils.createMatchDescription('WB1', 2)} - Bye`
      },
      {
        id: 'wb1_bye_3',
        player1Id: shuffledPlayers[3].id,
        player2Id: '',
        winnerId: shuffledPlayers[3].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 3,
        isBye: true,
        description: `${RoundDescriptionUtils.createMatchDescription('WB1', 3)} - Bye`
      },
      {
        id: 'wb1_bye_4',
        player1Id: shuffledPlayers[4].id,
        player2Id: '',
        winnerId: shuffledPlayers[4].id,
        bracket: 'winner',
        round: 1,
        matchNumber: 4,
        isBye: true,
        description: `${RoundDescriptionUtils.createMatchDescription('WB1', 4)} - Bye`
      }
    ];
    
    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
    setSelectedWinner({});
    setCompletedOrder([]);
  };

  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]): boolean => {
    switch (roundKey) {
      case 'WB1':
        return matchList.some(m => m.id === 'wb1' && m.winnerId);
      case 'WB2':
        return matchList.filter(m => m.id.startsWith('wb2-') && m.winnerId).length === 2;
      case 'LB1':
        return matchList.some(m => m.id === 'lb1' && m.winnerId);
      case 'WB3':
        return matchList.some(m => m.id === 'wb3' && m.winnerId);
      case 'LB2':
        return matchList.some(m => m.id === 'lb2' && m.winnerId);
      case 'LB_Final':
        return matchList.some(m => m.id === 'lb_final' && m.winnerId);
      case 'Place45':
        return matchList.some(m => m.id === 'place45' && m.winnerId);
      case 'Final':
        return matchList.some(m => m.id === 'final' && m.winnerId);
      case 'GrandFinal':
        return matchList.some(m => m.id === 'grandfinal' && m.winnerId);
      default:
        return false;
    }
  };

  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id === 'wb1') return 'WB1';
    if (match.id.startsWith('wb2-')) return 'WB2';
    if (match.id === 'lb1') return 'LB1';
    if (match.id === 'wb3') return 'WB3';
    if (match.id === 'lb2') return 'LB2';
    if (match.id === 'lb_final') return 'LB_Final';
    if (match.id === 'place45') return 'Place45';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'GrandFinal';
    return 'WB1';
  }

  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'WB2': {
        const wb1Match = matchList.find(m => m.id === 'wb1');
        if (!wb1Match?.winnerId) return [];
        
        // Get the 3 players who didn't play in WB1 (bye players)
        const wb1Player1 = wb1Match.player1Id;
        const wb1Player2 = wb1Match.player2Id;
        const byePlayers = players.filter(p => p.id !== wb1Player1 && p.id !== wb1Player2);
        
        return [
          {
            id: 'wb2-1',
            player1Id: byePlayers[0].id,
            player2Id: byePlayers[1].id,
            bracket: 'winner',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
          },
          {
            id: 'wb2-2',
            player1Id: wb1Match.winnerId,
            player2Id: byePlayers[2].id,
            bracket: 'winner',
            round: 2,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
          }
        ];
      }
      
      case 'LB1': {
        // LB1: WB2 losers play, WB1 loser gets bye
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-'));
        const wb2Losers = wb2Matches.map(m => 
          m.player1Id === m.winnerId ? m.player2Id : m.player1Id
        ).filter(Boolean);
        
        if (wb2Losers.length === 2) {
          return [{
            id: 'lb1',
            player1Id: wb2Losers[0]!,
            player2Id: wb2Losers[1]!,
            bracket: 'loser',
            round: 1,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB1')
          }];
        }
        return [];
      }
      
      case 'WB3': {
        const wb2Matches = matchList.filter(m => m.id.startsWith('wb2-') && m.winnerId);
        if (wb2Matches.length === 2) {
          return [{
            id: 'wb3',
            player1Id: wb2Matches[0]!.winnerId!,
            player2Id: wb2Matches[1]!.winnerId!,
            bracket: 'winner',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      
      case 'LB2': {
        const wb1Match = matchList.find(m => m.id === 'wb1');
        const lb1Match = matchList.find(m => m.id === 'lb1');
        
        if (wb1Match && lb1Match?.winnerId) {
          const wb1Loser = wb1Match.player1Id === wb1Match.winnerId ? wb1Match.player2Id : wb1Match.player1Id;
          return [{
            id: 'lb2',
            player1Id: wb1Loser!,
            player2Id: lb1Match.winnerId,
            bracket: 'loser',
            round: 2,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB2')
          }];
        }
        return [];
      }
      
      case 'LB_Final': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const lb2Match = matchList.find(m => m.id === 'lb2');
        
        if (wb3Match && lb2Match?.winnerId) {
          const wb3Loser = wb3Match.player1Id === wb3Match.winnerId ? wb3Match.player2Id : wb3Match.player1Id;
          return [{
            id: 'lb_final',
            player1Id: wb3Loser!,
            player2Id: lb2Match.winnerId,
            bracket: 'loser',
            round: 3,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      
      case 'Place45': {
        const lb1Match = matchList.find(m => m.id === 'lb1');
        const lb2Match = matchList.find(m => m.id === 'lb2');
        
        if (lb1Match && lb2Match) {
          const lb1Loser = lb1Match.player1Id === lb1Match.winnerId ? lb1Match.player2Id : lb1Match.player1Id;
          const lb2Loser = lb2Match.player1Id === lb2Match.winnerId ? lb2Match.player2Id : lb2Match.player1Id;
          
          return [{
            id: 'place45',
            player1Id: lb1Loser!,
            player2Id: lb2Loser!,
            bracket: 'placement',
            round: 1,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('4-5')
          }];
        }
        return [];
      }
      
      case 'Final': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const lbFinalMatch = matchList.find(m => m.id === 'lb_final');
        
        if (wb3Match?.winnerId && lbFinalMatch?.winnerId) {
          return [{
            id: 'final',
            player1Id: wb3Match.winnerId,
            player2Id: lbFinalMatch.winnerId,
            bracket: 'winner',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      
      case 'GrandFinal': {
        const wb3Match = matchList.find(m => m.id === 'wb3');
        const finalMatch = matchList.find(m => m.id === 'final');
        
        // Grand Final sadece LB kazananı Final'i kazandığında oluşturulur
        if (wb3Match?.winnerId && finalMatch?.winnerId && finalMatch.winnerId !== wb3Match.winnerId) {
          return [{
            id: 'grandfinal',
            player1Id: wb3Match.winnerId,
            player2Id: finalMatch.winnerId,
            bracket: 'winner',
            round: 5,
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
    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;
    
    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id || '';
    
    let finalMatches = matches.map(match => 
      match.id === matchId ? { ...match, winnerId } : match
    );
    
    let finalRankings = { ...rankings };
    let finalTournamentComplete = tournamentComplete;
    let nextRoundKey = currentRoundKey;

    // Check if current round is complete and create next round
    if (isRoundComplete(currentRoundKey, finalMatches)) {
      const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(currentRoundKey) + 1];
      if (nextRound) {
        // Grand Final sadece LB kazananı Final'i kazandığında oluşturulur
        if (nextRound === 'GrandFinal') {
          const wb3Match = finalMatches.find(m => m.id === 'wb3');
          const finalMatch = finalMatches.find(m => m.id === 'final');
          if (wb3Match?.winnerId && finalMatch?.winnerId && finalMatch.winnerId !== wb3Match.winnerId) {
            const newMatches = createNextRound(nextRound as RoundKey, finalMatches);
            finalMatches = [...finalMatches, ...newMatches];
            nextRoundKey = nextRound as RoundKey;
          }
        } else {
          const newMatches = createNextRound(nextRound as RoundKey, finalMatches);
          finalMatches = [...finalMatches, ...newMatches];
          nextRoundKey = nextRound as RoundKey;
        }
      }
    }

    // Determine rankings and tournament completion
    if (matchId === 'lb_final') {
      // LB Final completed, 3rd place determined (loser of LB Final)
      finalRankings = { ...finalRankings, third: loserId };
    } else if (matchId === 'place45') {
      // 4-5 place match completed
      finalRankings = { 
        ...finalRankings, 
        fourth: winnerId, 
        fifth: loserId 
      };
    } else if (matchId === 'final') {
      const wb3Match = matches.find(m => m.id === 'wb3');
      
      if (winnerId === wb3Match?.winnerId) {
        // WB winner won final - tournament over
        finalRankings = {
          ...finalRankings,
          first: winnerId,
          second: loserId
        };
        finalTournamentComplete = true;
      }
      // If LB winner won final, Grand Final will be created automatically
      // Don't set rankings yet - wait for Grand Final
    } else if (matchId === 'grandfinal') {
      // Grand Final completed - this determines the final rankings
      finalRankings = {
        ...finalRankings,
        first: winnerId,
        second: loserId
      };
      finalTournamentComplete = true;
    }
    
    // Her durumda mevcut ranking'i güncelle (3. sıra için)
    if (!finalTournamentComplete) {
      setRankings(finalRankings);
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);
    setCurrentRoundKey(nextRoundKey);
    // completedOrder'u güncelle
    const newCompletedOrder = completedOrder.includes(matchId)
      ? completedOrder
      : [...completedOrder, matchId];
    setCompletedOrder(newCompletedOrder);
    const state = {
      matches: finalMatches,
      rankings: finalRankings,
      tournamentComplete: finalTournamentComplete,
      currentRoundKey: nextRoundKey,
      completedOrder: newCompletedOrder,
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(5, playerIds, state, fixtureId);
    
    // Call parent's match result handler
    if (onMatchResult) {
      onMatchResult(matchId, winnerId);
    }
    
    // Call parent's tournament complete handler
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }
  };

  // Auto-complete bye matches
  React.useEffect(() => {
    if (matches.length > 0 && !tournamentComplete) {
      const byeMatches = matches.filter(match => match.isBye && !match.winnerId);
      byeMatches.forEach(match => {
        if (match.player1Id && !match.player2Id) {
          handleMatchResult(match.id, match.player1Id);
        }
      });
    }
  }, [matches, tournamentComplete]);

  // Initialize tournament on mount
  React.useEffect(() => {
    if (!loadTournamentState()) {
      initializeTournament();
    }
  }, []);


  const getPlayerName = (playerId: string) => {
    if (!playerId) return '';
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : '';
  };

  const undoLastMatch = () => {
    // Stack mevcutsa onu, yoksa matches'tan türet
    const stack = completedOrder.length > 0 ? completedOrder : (() => {
      const idOrder = ['wb1','wb2-1','wb2-2','lb1','wb3','lb2','lb_final','place45','final','grandfinal'];
      const order: string[] = [];
      for (const id of idOrder) {
        const m = matches.find((mm: Match) => mm.id === id);
        if (m?.winnerId) order.push(id);
      }
      return order;
    })();
    if (stack.length === 0) return;

    const lastId = stack[stack.length - 1];
    const newCompletedOrder = stack.slice(0, -1);

    let updatedMatches = [...matches];
    let updatedRankings = { ...rankings } as { first?: string; second?: string; third?: string; fourth?: string; fifth?: string };
    let newTournamentComplete = false;
    let newCurrentRoundKey: RoundKey = currentRoundKey;

    switch (lastId) {
      case 'grandfinal': {
        updatedMatches = updatedMatches.map(m => m.id === 'grandfinal' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.first;
        delete updatedRankings.second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'GrandFinal';
        break;
      }
      case 'final': {
        updatedMatches = updatedMatches.map(m => m.id === 'final' ? { ...m, winnerId: undefined } : m);
        const gf = updatedMatches.find(m => m.id === 'grandfinal');
        if (gf && !gf.winnerId) {
          updatedMatches = updatedMatches.filter(m => m.id !== 'grandfinal');
        }
        delete updatedRankings.first;
        delete updatedRankings.second;
        newTournamentComplete = false;
        newCurrentRoundKey = 'Final';
        break;
      }
      case 'place45': {
        updatedMatches = updatedMatches.map(m => m.id === 'place45' ? { ...m, winnerId: undefined } : m);
        delete updatedRankings.fourth;
        delete updatedRankings.fifth;
        newTournamentComplete = false;
        newCurrentRoundKey = 'Place45';
        break;
      }
      case 'lb_final': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb_final' ? { ...m, winnerId: undefined } : m);
        // Final ve GrandFinal'ı kaldır
        updatedMatches = updatedMatches.filter(m => m.id !== 'final' && m.id !== 'grandfinal');
        delete updatedRankings.third;
        newTournamentComplete = false;
        newCurrentRoundKey = 'LB_Final';
        break;
      }
      case 'lb2': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb2' ? { ...m, winnerId: undefined } : m);
        // LB_Final, Final, GrandFinal ve Place45'ı kaldır (Place45 lb2 loser'a bağlı)
        updatedMatches = updatedMatches.filter(m => m.id !== 'lb_final' && m.id !== 'final' && m.id !== 'grandfinal' && m.id !== 'place45');
        delete updatedRankings.third;
        delete updatedRankings.fourth;
        delete updatedRankings.fifth;
        newTournamentComplete = false;
        newCurrentRoundKey = 'LB2';
        break;
      }
      case 'wb3': {
        updatedMatches = updatedMatches.map(m => m.id === 'wb3' ? { ...m, winnerId: undefined } : m);
        // LB_Final, Final, GrandFinal'ı kaldır
        updatedMatches = updatedMatches.filter(m => m.id !== 'lb_final' && m.id !== 'final' && m.id !== 'grandfinal');
        delete updatedRankings.third;
        newTournamentComplete = false;
        newCurrentRoundKey = 'WB3';
        break;
      }
      case 'lb1': {
        updatedMatches = updatedMatches.map(m => m.id === 'lb1' ? { ...m, winnerId: undefined } : m);
        // LB2, LB_Final, Place45, Final, GrandFinal'ı kaldır
        updatedMatches = updatedMatches.filter(m => !['lb2','lb_final','place45','final','grandfinal'].includes(m.id));
        updatedRankings = {};
        newTournamentComplete = false;
        newCurrentRoundKey = 'LB1';
        break;
      }
      case 'wb2-2':
      case 'wb2-1': {
        updatedMatches = updatedMatches.map(m => m.id === lastId ? { ...m, winnerId: undefined } : m);
        // wb2 sonuçları kaldırılınca türeyen tüm maçları kaldır
        updatedMatches = updatedMatches.filter(m => !['lb1','wb3','lb2','lb_final','place45','final','grandfinal'].includes(m.id));
        updatedRankings = {};
        newTournamentComplete = false;
        newCurrentRoundKey = 'WB2';
        break;
      }
      case 'wb1': {
        updatedMatches = updatedMatches.map(m => m.id === 'wb1' ? { ...m, winnerId: undefined } : m);
        // Türetilen tüm maçları kaldır
        updatedMatches = updatedMatches.filter(m => !['wb2-1','wb2-2','lb1','wb3','lb2','lb_final','place45','final','grandfinal'].includes(m.id));
        updatedRankings = {};
        newTournamentComplete = false;
        newCurrentRoundKey = 'WB1';
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
    DoubleEliminationStorage.saveDoubleEliminationState(5, playerIds, state, fixtureId);
  };

  const renderMatch = (match: Match) => {
    // Grand Final maçında oyuncuları ters göster (final'daki pozisyonların tersi)
    if (match.id === 'grandfinal') {
      const player1Name = getPlayerName(match.player2Id);
      const player2Name = match.player1Id ? getPlayerName(match.player1Id) : '';
      const currentSelectedWinner = selectedWinner[match.id] || null;
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
          bracket={match.bracket}
          round={match.round}
          matchNumber={match.matchNumber}
          isBye={match.isBye}
          matchTitle={match.description}
          currentSelectedWinner={currentSelectedWinner}
          playersLength={players.length}
          onWinnerSelect={winnerId => {
            setSelectedWinner(prev => ({ ...prev, [match.id]: winnerId }));
          }}
          onWinnerConfirm={() => {
            if (currentSelectedWinner) {
              handleMatchResult(match.id, currentSelectedWinner);
              setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
            }
          }}
          onSelectionCancel={() => {
            setSelectedWinner(prev => ({ ...prev, [match.id]: null }));
          }}
        />
      );
    }
    // Diğer maçlar için mevcut haliyle devam
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
        player1Name={getPlayerName(match.player1Id || '')}
        player2Name={getPlayerName(match.player2Id || '')}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        bracket={match.bracket}
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
  };

  if (players.length !== 5) {
    return <div className="text-center p-4">Bu component sadece 5 oyuncu için tasarlanmıştır.</div>;
  }

  const activeMatches = matches.filter(match => !match.winnerId);

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
          <button
            onClick={() => {
              if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                clearTournamentState();
                initializeTournament();
                setSelectedWinner({});
                setCompletedOrder([]);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Turnuvayı Sıfırla
          </button>
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
      )}
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
                      let totalMatches = matches.length;
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} playersLength={players.length} />
      )}
    </div>
  );
};

export default DoubleElimination5; 