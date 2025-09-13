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
  'WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB3', 'WB4', 'LB4', '7-8', 'LB5', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination9_11: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [] = useState<'results' | 'active' | 'completed'>('active'); // yeni state
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
    DoubleEliminationStorage.saveDoubleEliminationState(9, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(9, playerIds, fixtureId);
      if (state) {
        const loadedMatches = state.matches || [];
        setMatches(loadedMatches);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
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
    DoubleEliminationStorage.clearDoubleEliminationState(9, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 16;
    const byesNeeded = totalSlots - players.length;
    
    // İlk byesNeeded kadar oyuncu bye alır
    const playersWithByes = shuffledPlayers.slice(0, byesNeeded);
    const playersForMatches = shuffledPlayers.slice(byesNeeded);
    
    const wb1Matches: Match[] = [];
    
    // WB1: Kalan oyuncular eşleştirilir
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
    
    // WB1: Byeler
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

  // Fixtürü sıfırlama fonksiyonu

  React.useEffect(() => {
    if (players.length >= 9 && players.length <= 11) {
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

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey && !m.isBye);
    return roundMatches.length > 0 && roundMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id.startsWith('lb5')) return 'LB5';
    if (match.id === 'seventh_eighth') return '7-8';
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
    // Sıradaki roundu oluştur
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    const newMatches = createNextRound(nextRoundKey, matches);
    if (newMatches.length > 0) {
      const updatedMatches = [...matches, ...newMatches];
      setMatches(updatedMatches);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState(updatedMatches, rankings, tournamentComplete, nextRoundKey, completedOrder);
    }
  }, [matches, currentRoundKey]);

  // Rankings are already saved in double elimination storage, no need to duplicate in main fixture
    
  // --- Next Round Match Creation Logic ---
  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    switch (roundKey) {
      case 'WB2': {
        // WB1 kazananları + byeler
        const wb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.isBye).map(m => m.player1Id);
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
      
      case 'LB1': {
        // WB1 ve WB2 kaybedenleri
        const wb1Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB1' && m.winnerId && !m.isBye).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const wb2Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb1Players = [...wb1Losers, ...wb2Losers];
        const lb1PlayerCount = lb1Players.length;
        const lb1ByesNeeded = 8 - lb1PlayerCount; // 8 oyuncuya tamamlamak için
        
        const lb1Matches: Match[] = [];
        
        // Byeler: ilk lb1ByesNeeded oyuncu bye geçer
        const byePlayers = lb1Players.slice(0, lb1ByesNeeded);
        const matchPlayers = lb1Players.slice(lb1ByesNeeded);
        
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
        
        // Maçlar: kalan oyuncular eşleşir
        for (let i = 0; i < matchPlayers.length; i += 2) {
          if (i + 1 < matchPlayers.length) {
            lb1Matches.push({
              id: `lb1_${Math.floor(i/2) + 1}`,
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
      
      case 'LB2': {
        // LB1 kazananları ve LB1 byeleri
        const lb1Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lb1Byes = matchList.filter(m => getMatchRoundKey(m) === 'LB1' && m.isBye).map(m => m.player1Id);
        const lb2Players = [...lb1Winners, ...lb1Byes];
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
        const wb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB2' && m.winnerId).map(m => m.winnerId!);
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
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
            });
          }
        }
        return wb3Matches;
      }
      
      case 'LB3': {
        // WB3 kaybedenleri + LB2 kazananları
        const wb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb2Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId).map(m => m.winnerId!);
        const lb3Players = [...wb3Losers, ...lb2Winners];
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
        const wb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId).map(m => m.winnerId!);
        if (wb3Winners.length >= 2) {
          return [{
            id: 'wb4_semifinal',
            player1Id: wb3Winners[0],
            player2Id: wb3Winners[1],
            bracket: 'winner',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      
      case 'LB4': {
        // LB3 kazananları
        const lb3Winners = matchList.filter(m => getMatchRoundKey(m) === 'LB3' && m.winnerId).map(m => m.winnerId!);
        if (lb3Winners.length >= 2) {
          return [{
            id: 'lb4_final',
            player1Id: lb3Winners[0],
            player2Id: lb3Winners[1],
            bracket: 'loser',
            round: 4,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB4')
          }];
        }
        return [];
      }
      
      case '7-8': {
        // LB2 kaybedenleri
        const lb2Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB2' && m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb2Losers.length >= 2) {
          return [{
            id: 'seventh_eighth',
            player1Id: lb2Losers[0],
            player2Id: lb2Losers[1],
            bracket: 'placement',
            round: 4,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('7-8')
          }];
        }
        return [];
      }
      
      case 'LB5': {
        // WB4 kaybedeni + LB4 kazananı
        const wb4Match = matchList.find(m => m.id === 'wb4_semifinal');
        const lb4Match = matchList.find(m => m.id === 'lb4_final');
        if (wb4Match && wb4Match.winnerId && lb4Match && lb4Match.winnerId) {
          const wb4Loser = wb4Match.player1Id === wb4Match.winnerId ? wb4Match.player2Id : wb4Match.player1Id;
          return [{
            id: 'lb5_final',
            player1Id: wb4Loser,
            player2Id: lb4Match.winnerId,
            bracket: 'loser',
            round: 5,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      
      case '5-6': {
        // LB3 kaybedenleri
        const lb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'LB3' && m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb3Losers.length >= 2) {
          return [{
            id: 'fifth_sixth',
            player1Id: lb3Losers[0],
            player2Id: lb3Losers[1],
            bracket: 'placement',
            round: 5,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }
      
      case 'Final': {
        // WB4 kazananı + LB5 kazananı
        const wb4Match = matchList.find(m => m.id === 'wb4_semifinal');
        const lb5Match = matchList.find(m => m.id === 'lb5_final');
        if (wb4Match && wb4Match.winnerId && lb5Match && lb5Match.winnerId) {
          return [{
            id: 'final',
            player1Id: wb4Match.winnerId,
            player2Id: lb5Match.winnerId,
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      
      case 'GrandFinal': {
        // Final'ı LB'den gelen kazanırsa Grand Final oynanır.
        // Final'de solda oynayan oyuncu Grand Final'de sağda oynamalı: bunu tarafları ters çevirerek kuruyoruz.
        const finalMatch = matchList.find(m => m.id === 'final');
        if (finalMatch && finalMatch.winnerId && finalMatch.player1Id && finalMatch.player2Id) {
          if (finalMatch.winnerId === finalMatch.player2Id) {
            return [{
              id: 'grandfinal',
              player1Id: finalMatch.player2Id, // LB'den gelen, Final'de sağdaydı → GF'de solda
              player2Id: finalMatch.player1Id, // WB'den gelen, Final'de soldaydı → GF'de sağda
              bracket: 'winner',
              round: 7,
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

  // Maç sonucu onaylama fonksiyonu (rankings güncellemesiyle)
  const handleMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(match =>
      match.id === matchId ? { ...match, winnerId } : match
    );
    let newRankings = { ...rankings };
    const match = updatedMatches.find(m => m.id === matchId) || matches.find(m => m.id === matchId);
    if (match) {
      // 7-8 maçı
      if (match.id === 'seventh_eighth') {
        newRankings.seventh = winnerId;
        newRankings.eighth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      // 5-6 maçı
      if (match.id === 'fifth_sixth') {
        newRankings.fifth = winnerId;
        newRankings.sixth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      // LB4 final - 4. sıralama (LB4 kaybedeni 4. olur)
      if (match.id === 'lb4_final') {
        const lb4Loser = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        newRankings.fourth = lb4Loser;
        // LB4 kazananı LB5'e gider
      }
      // LB5 final - 3. sıralama (LB4 kaybedeni 3. olur)
      if (match.id === 'lb5_final') {
        // LB5 kaybedeni 3. olur (WB4'ten gelen)
        const lb5Loser = match.player1Id === winnerId ? match.player2Id : match.player1Id;
        newRankings.third = lb5Loser;
        // LB5 kazananı Final'e gider
      }
      // Final - 1. ve 2. sıralama (sadece Grand Final yoksa)
      if (match.id === 'final') {
        // WB'den gelen kazanırsa turnuva biter, sıralama belli olur
        const finalMatch = matches.find(m => m.id === 'final');
        if (finalMatch && finalMatch.player1Id && finalMatch.player2Id) {
          // WB'den gelen oyuncu (player1) kazanırsa turnuva biter
          if (winnerId === finalMatch.player1Id) {
            newRankings.first = winnerId;
            newRankings.second = match.player1Id === winnerId ? match.player2Id : match.player1Id;
          }
          // LB'den gelen kazanırsa Grand Final oynanır, henüz sıralama belli değil
        }
      }
      // Grand Final - 1. ve 2. sıralama (Grand Final bittikten sonra)
      if (match.id === 'grandfinal') {
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
    if (match && (match.id === 'final' || match.id === 'grandfinal')) {
      if (onTournamentComplete) {
        onTournamentComplete(newRankings);
      }
    }
  };

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

    if (lastId === 'grandfinal') {
      clearWinner('grandfinal');
          delete updatedRankings.first;
          delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = 'GrandFinal';
    } else if (lastId === 'final') {
      clearWinner('final');
      // Eğer grandfinal varsa ve tamamlanmadıysa kaldır
      const gf = updatedMatches.find(m => m.id === 'grandfinal');
      if (gf && !gf.winnerId) removeIds(['grandfinal']);
          delete updatedRankings.first;
          delete updatedRankings.second;
      newTournamentComplete = false;
      newCurrentRoundKey = 'Final';
    } else if (lastId === 'lb5_final') {
      clearWinner('lb5_final');
      // Final ve GrandFinal'ı kaldır
      removeIds(['final', 'grandfinal']);
          delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB5';
    } else if (lastId === 'lb4_final') {
      clearWinner('lb4_final');
      // LB5, Final ve GrandFinal'ı kaldır
      removeIds(['lb5_final', 'final', 'grandfinal']);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB4';
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
    } else if (lastId === 'wb4_semifinal') {
      clearWinner('wb4_semifinal');
      // LB5, Final ve GrandFinal'ı kaldır
      removeIds(['lb5_final', 'final', 'grandfinal']);
      delete updatedRankings.third;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'WB4';
    } else if (lastId.startsWith('lb3_')) {
      clearWinner(lastId);
      // LB4, LB5, Final, GrandFinal ve 5-6'yı kaldır (bağımlı)
      const idsToRemove = ['lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth'];
      removeIds(idsToRemove);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB3';
    } else if (lastId.startsWith('wb3_')) {
      clearWinner(lastId);
      // WB4, LB3, LB4, LB5, Final, GrandFinal ve 5-6'yı kaldır
      const idsToRemove = ['wb4_semifinal', 'lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth'];
      // Ayrıca tüm lb3_* maçlarını kaldır (WB3 kaybedenleri etkilenir)
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      removeIds([...idsToRemove, ...lb3Ids]);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'WB3';
    } else if (lastId.startsWith('lb2_')) {
      clearWinner(lastId);
      // LB3, LB4, LB5, 5-6, Final, GrandFinal, 7-8'yi kaldır
      const idsToRemove = ['lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth', 'seventh_eighth'];
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      removeIds([...idsToRemove, ...lb3Ids]);
      delete updatedRankings.fourth;
      delete updatedRankings.third;
      delete updatedRankings.fifth;
      delete updatedRankings.sixth;
      delete updatedRankings.seventh;
      delete updatedRankings.eighth;
      delete updatedRankings.first;
      delete updatedRankings.second;
      newCurrentRoundKey = 'LB2';
    } else if (lastId.startsWith('lb1_')) {
      clearWinner(lastId);
      // LB2, LB3, LB4, LB5, 5-6, 7-8, Final, GrandFinal'ı kaldır
      const idsToRemove = ['lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth', 'seventh_eighth'];
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      removeIds([...idsToRemove, ...lb2Ids, ...lb3Ids]);
      updatedRankings = {};
      newCurrentRoundKey = 'LB1';
    } else if (lastId.startsWith('wb2_')) {
      clearWinner(lastId);
      // WB3, LB2, LB3, WB4, LB4, LB5, 5-6, 7-8, Final, GrandFinal'ı kaldır
      const idsToRemove = ['wb4_semifinal', 'lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth', 'seventh_eighth'];
      const wb3Ids = updatedMatches.filter(m => m.id.startsWith('wb3_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      removeIds([...idsToRemove, ...wb3Ids, ...lb2Ids, ...lb3Ids]);
      updatedRankings = {};
      newCurrentRoundKey = 'WB2';
    } else if (lastId.startsWith('wb1_')) {
      clearWinner(lastId);
      // LB1, WB2 ve sonrası tüm maçları kaldır
      const idsToRemove = ['wb4_semifinal', 'lb4_final', 'lb5_final', 'final', 'grandfinal', 'fifth_sixth', 'seventh_eighth'];
      const wb2Ids = updatedMatches.filter(m => m.id.startsWith('wb2_')).map(m => m.id);
      const lb1Ids = updatedMatches.filter(m => m.id.startsWith('lb1_')).map(m => m.id);
      const lb2Ids = updatedMatches.filter(m => m.id.startsWith('lb2_')).map(m => m.id);
      const wb3Ids = updatedMatches.filter(m => m.id.startsWith('wb3_')).map(m => m.id);
      const lb3Ids = updatedMatches.filter(m => m.id.startsWith('lb3_')).map(m => m.id);
      removeIds([...idsToRemove, ...wb2Ids, ...lb1Ids, ...lb2Ids, ...wb3Ids, ...lb3Ids]);
      updatedRankings = {};
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
    if (onRemoveOpponents && undoneMatchRef && !undoneMatchRef.isBye) {
      onRemoveOpponents(undoneMatchRef.player1Id, undoneMatchRef.player2Id, undoneMatchRef.description || 'Unknown Match');
    }
    // If a completed match is undone, ensure fixture status returns to active
    try {
      if (fixtureId) {
        MatchesStorage.activateFixture(fixtureId);
      }
    } catch {}
  };
  const renderMatch = (match: Match) => {
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'TBD';
    const currentSelectedWinner = selectedWinner[match.id] || null;

    // Maç başlığı (ROUND_ORDER'a göre)

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

    // Grand final is stored with swapped sides already; render normally

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

  if (players.length < 9 || players.length > 11) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for 9-11 players only.
      </div>
    );
  }

  // Sadece aktif roundun maçlarını göster
  // Biten tüm maçlar (winnerId atanmış olanlar)

  // Biten maçlar için güzel bir liste

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      {fixtureId && (
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900">
          {MatchesStorage.getFixtureById(fixtureId)?.name || ''}
        </h2>
      )}
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
              
              
      {activeTab === 'active' && (
        <div className="text-center mb-6">
          <div className="flex justify-center gap-4">
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
      )}
      
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !tournamentComplete && (() => {
        const roundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey && !m.isBye && !m.winnerId);
        return roundMatches.length > 0;
      })() && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              const roundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey && !m.isBye && !m.winnerId);
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
        <>
          <div className="flex flex-wrap justify-center gap-4 max-w-6xl mx-auto">
            {(() => {
              const roundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey && !m.isBye && !m.winnerId);
              if (roundMatches.length === 0) {
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
                );
              }
              return roundMatches.map(match => (
                <div key={match.id} className="w-full sm:w-80 md:w-96">
                  {renderMatch(match)}
      </div>
              ));
            })()}
        </div>
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
          <CompletedMatchesTable
            matches={
              [...matches].sort((a, b) => {
                const roundA = ROUND_ORDER.indexOf(getMatchRoundKey(a));
                const roundB = ROUND_ORDER.indexOf(getMatchRoundKey(b));
                if (roundA !== roundB) return roundA - roundB;
                return (a.round - b.round) || (a.matchNumber - b.matchNumber);
              })
            }
            players={players}
            getPlayerName={getPlayerName}
          />
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
          <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
        </div>
      )}
    </div>
  );
};

export default DoubleElimination9_11; 