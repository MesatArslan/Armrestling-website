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
  'WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB3', 'WB4', 'LB4', '7-8', 'LB5', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination9_11: React.FC<DoubleEliminationProps> = ({ players,onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [] = useState<'results' | 'active' | 'completed'>('active'); // yeni state
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);
  const [, setIsUndoing] = useState(false);

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
    DoubleEliminationStorage.saveDoubleEliminationState(9, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(9, playerIds, fixtureId);
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey);
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
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches, currentRoundKey]);
    
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
        
        for (let i = 0; i < lb3Players.length; i += 2) {
          if (i + 1 < lb3Players.length) {
            lb3Matches.push({
              id: `lb3_${Math.floor(i/2) + 1}`,
              player1Id: lb3Players[i],
              player2Id: lb3Players[i + 1],
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
        // Finalı LB'den gelen kazanırsa
        const finalMatch = matchList.find(m => m.id === 'final');
        if (finalMatch && finalMatch.winnerId && finalMatch.player1Id && finalMatch.player2Id) {
          // WB'den gelen kaybederse Grand Final
          if (finalMatch.winnerId === finalMatch.player2Id) {
            return [{
              id: 'grandfinal',
              player1Id: finalMatch.player2Id,
              player2Id: finalMatch.player1Id,
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
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const updatedMatches = matches.map(match =>
      match.id === matchId ? { ...match, winnerId } : match
    );
    let newRankings = { ...rankings };
    const match = matches.find(m => m.id === matchId);
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
    saveTournamentState(updatedMatches, newRankings, tournamentComplete, currentRoundKey);
    
    // Call parent's tournament complete handler if tournament is complete
    if (match && (match.id === 'final' || match.id === 'grandfinal')) {
      if (onTournamentComplete) {
        onTournamentComplete(newRankings);
      }
    }
  };

  // --- UI Helpers ---
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
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
      
      setMatches(previousMatches);
      setMatchHistory(prev => prev.slice(0, -1));
      
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
        } else if (matchId === 'lb_final') {
          delete updatedRankings.third;
        } else if (matchId === 'place56') {
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
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
      const updatedMatchHistory = matchHistory.slice(0, -1);
      const state = {
        matches: previousMatches,
        rankings: updatedRankings,
        tournamentComplete: false,
        currentRoundKey: getMatchRoundKey(previousMatches[previousMatches.length - 1] || previousMatches[0]),
        matchHistory: updatedMatchHistory,
        timestamp: new Date().toISOString()
      };
      const playerIds = players.map(p => p.id).sort().join('-');
      DoubleEliminationStorage.saveDoubleEliminationState(9, playerIds, state, fixtureId);
      
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
    }
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

    // For grandfinal matches, swap player positions
    if (match.id === 'grandfinal') {
      return (
        <MatchCard
          matchId={match.id}
          player1Name={player2Name}
          player2Name={player1Name}
          winnerId={match.winnerId}
          player1Id={match.player2Id || ''}
          player2Id={match.player1Id || ''}
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
    }

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
            <button
              onClick={() => {
                if (window.confirm('Turnuvayı sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                  clearTournamentState();
                  initializeTournament();
                  setSelectedWinner({});
                  setMatchHistory([]);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Turnuvayı Sıfırla
            </button>
            
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
                        <p className="text-green-700 text-lg mb-2">
                      {(() => {
                        const nonByeMatches = matches.filter(m => !m.isBye);
                        const completedCount = nonByeMatches.filter(m => m.winnerId).length;
                        const totalMatches = nonByeMatches.length;
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
      )}
      {activeTab === 'rankings' && (
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
      )}
    </div>
  );
};

export default DoubleElimination9_11; 