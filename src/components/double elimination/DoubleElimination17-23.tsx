import * as React from 'react';
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

const DoubleElimination17_23: React.FC<DoubleEliminationProps> = ({ players, onMatchResult: _, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB_R1');
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
    DoubleEliminationStorage.saveDoubleEliminationState(17, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(17, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB_R1');
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
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches, currentRoundKey]);

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
        }
        if (matchId === 'grand_final') {
          delete updatedRankings.first;
          delete updatedRankings.second;
        }
        if (matchId === 'lb_final') {
          delete updatedRankings.third;
          delete updatedRankings.fourth;
        }
        if (matchId === 'fifth_sixth') {
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
        }
        if (matchId === 'seventh_eighth') {
          delete updatedRankings.seventh;
          delete updatedRankings.eighth;
        }
      }
      
      setRankings(updatedRankings);
      
      // Update currentRoundKey based on the last match in previous state
      if (previousMatches.length > 0) {
        const lastMatch = previousMatches[previousMatches.length - 1];
        const roundKey = getMatchRoundKey(lastMatch);
        setCurrentRoundKey(roundKey);
      }
      
      // Clear selectedWinner for matches that no longer exist in previous state
      setSelectedWinner(prev => {
        const newSelectedWinner = { ...prev };
        Object.keys(newSelectedWinner).forEach(matchId => {
          if (!previousMatches.find(m => m.id === matchId)) {
            delete newSelectedWinner[matchId];
          }
        });
        return newSelectedWinner;
      });
      
      // Save the reverted state
      saveTournamentState(previousMatches, updatedRankings, false, currentRoundKey);
      
      // Reset isUndoing after a short delay
      setTimeout(() => setIsUndoing(false), 100);
    }
  };
  const getPlayerDetails = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  // --- Match Result Handler ---
  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const updatedMatches = matches.map(m =>
      m.id === matchId ? { ...m, winnerId } : m
    );
    let newRankings = { ...rankings };
    const match = matches.find(m => m.id === matchId);
    if (match) {
      if (match.id === 'seventh_eighth') {
        newRankings.seventh = winnerId;
        newRankings.eighth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'fifth_sixth') {
        newRankings.fifth = winnerId;
        newRankings.sixth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'lb_final') {
        newRankings.third = winnerId;
        newRankings.fourth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id === 'yari_final') {
        // Yarı final kaybedeni 4. olabilir, ama 3. ve 4. kesin lb_final ile belirleniyor
        // Burada bir şey yapmaya gerek yok
      }
      if (match.id === 'final' || match.id === 'grand_final') {
        newRankings.first = winnerId;
        newRankings.second = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
    }
    setMatches(updatedMatches);
    setRankings(newRankings);
    saveTournamentState(updatedMatches, newRankings, tournamentComplete, currentRoundKey);
    
    // Call parent's tournament complete handler if tournament is complete
    if (match && (match.id.toLowerCase().includes('final') || match.id.toLowerCase().includes('grand'))) {
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
        for (let i = 0; i < lb2Players.length; i += 2) {
          if (i + 1 < lb2Players.length) {
            lb2Matches.push({
              id: `lb_r2_${Math.floor(i/2) + 1}`,
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
        for (let i = 0; i < lb3Players.length; i += 2) {
          if (i + 1 < lb3Players.length) {
            lb3Matches.push({
              id: `lb_r3_${Math.floor(i/2) + 1}`,
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
      case 'LB_R4': {
        // LB R4: LB R3 kazananları
        const lb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB_R3');
        const lb3Winners = lb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb4Matches: Match[] = [];
        for (let i = 0; i < lb3Winners.length; i += 2) {
          if (i + 1 < lb3Winners.length) {
            lb4Matches.push({
              id: `lb_r4_${Math.floor(i/2) + 1}`,
              player1Id: lb3Winners[i],
              player2Id: lb3Winners[i + 1],
              bracket: 'loser',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB4', Math.floor(i/2) + 1)
            });
          }
        }
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
        for (let i = 0; i < lb5Players.length; i += 2) {
          if (i + 1 < lb5Players.length) {
            lb5Matches.push({
              id: `lb_r5_${Math.floor(i/2) + 1}`,
              player1Id: lb5Players[i],
              player2Id: lb5Players[i + 1],
              bracket: 'loser',
              round: 5,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB5', Math.floor(i/2) + 1)
            });
          }
        }
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
          
          {/* Otomatik Kazananları Seç Butonu */}
          {!tournamentComplete && (() => {
            const roundMatches = activeMatches.filter(m => !m.isBye && !m.winnerId);
            return roundMatches.length > 0;
          })() && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  const roundMatches = activeMatches.filter(m => !m.isBye && !m.winnerId);
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {activeMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
          </div>
        </>
      )}
      {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
      )}
      {activeTab === 'rankings' && (
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
      )}
      {/* Turnuva ilerlemesi göstergesi */}
      {!tournamentComplete && activeTab === 'active' && (
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            {(() => {
              const nonByeMatches = matches.filter(m => !m.isBye);
              const completedCount = nonByeMatches.filter(m => m.winnerId).length;
              const totalMatches = nonByeMatches.length;
              return `${completedCount} / ${totalMatches} maç tamamlandı`;
            })()}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs mx-auto">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(() => {
                const nonByeMatches = matches.filter(m => !m.isBye);
                const completedCount = nonByeMatches.filter(m => m.winnerId).length;
                const totalMatches = nonByeMatches.length;
                return totalMatches > 0 ? (completedCount / totalMatches) * 100 : 0;
              })()}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubleElimination17_23; 