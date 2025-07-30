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

const DoubleElimination17_23: React.FC<DoubleEliminationProps> = ({ players, onMatchResult: _, onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB_R1');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId, initialTab)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean, roundKey: RoundKey) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
      currentRoundKey: roundKey,
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
        // Reset history when loading from storage
        setMatchHistory([]);
        setLastCompletedMatch(null);
        return true; // State was loaded
      }
    } catch (error) {
      console.error('Error loading tournament state:', error);
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
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
    const totalSlots = 32;
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = sortedPlayers.slice(0, byesNeeded);
    const playersForMatches = sortedPlayers.slice(byesNeeded);
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
          description: `WB Round 1 - Match ${Math.floor(i/2) + 1}`
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
        description: `WB Round 1 - Bye for ${player.name} ${player.surname}`
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
    const newMatches = createNextRound(nextRoundKey, matches);
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
      const previousState = matchHistory[matchHistory.length - 1];
      setMatches(previousState);
      setMatchHistory(prev => prev.slice(0, -1));
      setLastCompletedMatch(null);
      
      // Reset tournament completion if we're going back
      if (tournamentComplete) {
        setTournamentComplete(false);
        setRankings({});
      }
      
      // Save the reverted state
      saveTournamentState(previousState, rankings, false, currentRoundKey);
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
  function createNextRound(roundKey: RoundKey, matchList: Match[]): Match[] {
    // Helper: get winners/losers from a round
    const getWinners = (rk: RoundKey) => matchList.filter(m => getMatchRoundKey(m) === rk && m.winnerId && !m.isBye).map(m => m.winnerId!);
    const getLosers = (rk: RoundKey) => matchList.filter(m => getMatchRoundKey(m) === rk && m.winnerId && !m.isBye).map(m => {
      if (m.player1Id === m.winnerId) return m.player2Id;
      return m.player1Id;
    }).filter(Boolean);
    // Helper: get byes from a round
    const getByePlayers = (rk: RoundKey) => matchList.filter(m => getMatchRoundKey(m) === rk && m.isBye).map(m => m.player1Id);

    // Helper: pair up players
    const pairUp = (arr: string[], baseId: string, bracket: 'winner'|'loser', round: number, descPrefix: string) => {
      const matches: Match[] = [];
      for (let i = 0; i < arr.length; i += 2) {
        if (i + 1 < arr.length) {
          matches.push({
            id: `${baseId}_${Math.floor(i/2)+1}`,
            player1Id: arr[i],
            player2Id: arr[i+1],
            bracket,
            round,
            matchNumber: Math.floor(i/2)+1,
            isBye: false,
            description: `${descPrefix} - Match ${Math.floor(i/2)+1}`
          });
        }
      }
      return matches;
    };

    // --- ROUND LOGIC ---
    if (roundKey === 'WB_R2') {
      // WB R2: 16 oyuncu (byeler + WB R1 kazananları)
      const wb1Winners = getWinners('WB_R1');
      const wb1Byes = getByePlayers('WB_R1');
      const wb2Players = [...wb1Winners, ...wb1Byes];
      return pairUp(wb2Players, 'wb_r2', 'winner', 2, 'WB Round 2');
    }
    if (roundKey === 'LB_R1') {
      // LB R1: WB R1 kaybedenleri + WB R2 kaybedenleri
      const wb1Losers = getLosers('WB_R1');
      const wb2Losers = getLosers('WB_R2');
      let lbR1Players = [...wb1Losers, ...wb2Losers];
      // 16'ya tamamlamak için bye
      const byesNeeded = 16 - lbR1Players.length;
      const sorted = [...lbR1Players].sort((a, b) => getPlayerDetails(b)!.weight - getPlayerDetails(a)!.weight);
      const byePlayers = sorted.slice(0, byesNeeded);
      const forMatches = sorted.slice(byesNeeded);
      const matches: Match[] = [];
      for (let i = 0; i < forMatches.length; i += 2) {
        if (i + 1 < forMatches.length) {
          matches.push({
            id: `lb_r1_${Math.floor(i/2)+1}`,
            player1Id: forMatches[i],
            player2Id: forMatches[i+1],
            bracket: 'loser',
            round: 1,
            matchNumber: Math.floor(i/2)+1,
            isBye: false,
            description: `LB Round 1 - Match ${Math.floor(i/2)+1}`
          });
        }
      }
      byePlayers.forEach((pid, idx) => {
        matches.push({
          id: `lb_r1_bye_${idx+1}`,
          player1Id: pid,
          player2Id: '',
          bracket: 'loser',
          round: 1,
          matchNumber: matches.length+1,
          isBye: true,
          description: `LB Round 1 - Bye for ${getPlayerName(pid)}`
        });
      });
      return matches;
    }
    if (roundKey === 'LB_R2') {
      // LB R2: LB R1 kazananları + LB R1 byeleri
      const lbR1Winners = [...getWinners('LB_R1'), ...getByePlayers('LB_R1')];
      return pairUp(lbR1Winners, 'lb_r2', 'loser', 2, 'LB Round 2');
    }
    if (roundKey === 'WB_R3') {
      // WB R3: WB R2 kazananları
      const wb2Winners = getWinners('WB_R2');
      return pairUp(wb2Winners, 'wb_r3', 'winner', 3, 'WB Round 3');
    }
    if (roundKey === 'LB_R3') {
      // LB R3: LB R2 kazananları + WB R3 kaybedenleri
      const lbR2Winners = getWinners('LB_R2');
      const wb3Losers = getLosers('WB_R3');
      const players = [...lbR2Winners, ...wb3Losers];
      return pairUp(players, 'lb_r3', 'loser', 3, 'LB Round 3');
    }
    if (roundKey === 'LB_R4') {
      // LB R4: LB R3 kazananları
      const lbR3Winners = getWinners('LB_R3');
      return pairUp(lbR3Winners, 'lb_r4', 'loser', 4, 'LB Round 4');
    }
    if (roundKey === 'WB_R4') {
      // WB R4: WB R3 kazananları
      const wb3Winners = getWinners('WB_R3');
      return pairUp(wb3Winners, 'wb_r4', 'winner', 4, 'WB Round 4');
    }
    if (roundKey === 'LB_R5') {
      // LB R5: WB R4 kaybedenleri + LB R4 kazananları
      const wb4Losers = getLosers('WB_R4');
      const lbR4Winners = getWinners('LB_R4');
      const players = [...wb4Losers, ...lbR4Winners];
      return pairUp(players, 'lb_r5', 'loser', 5, 'LB Round 5');
    }
    if (roundKey === 'YARI_FINAL') {
      // Yarı Final: WB R4 kazananları
      const wb4Winners = getWinners('WB_R4');
      if (wb4Winners.length === 2) {
        return [{
          id: 'yari_final',
          player1Id: wb4Winners[0],
          player2Id: wb4Winners[1],
          bracket: 'winner',
          round: 5,
          matchNumber: 1,
          isBye: false,
          description: 'Yarı Final'
        }];
      }
      return [];
    }
    if (roundKey === 'LB_R6') {
      // LB R6: LB R5 kazananları
      const lbR5Winners = getWinners('LB_R5');
      if (lbR5Winners.length === 2) {
        return [{
          id: 'lb_r6',
          player1Id: lbR5Winners[0],
          player2Id: lbR5Winners[1],
          bracket: 'loser',
          round: 6,
          matchNumber: 1,
          isBye: false,
          description: 'LB Round 6'
        }];
      }
      return [];
    }
    if (roundKey === '7-8') {
      // 7-8.lik: LB R4 kaybedenleri
      const lbR4Losers = getLosers('LB_R4');
      if (lbR4Losers.length === 2) {
        return [{
          id: 'seventh_eighth',
          player1Id: lbR4Losers[0],
          player2Id: lbR4Losers[1],
          bracket: 'placement',
          round: 4,
          matchNumber: 1,
          isBye: false,
          description: '7.lik-8.lik Maçı'
        }];
      }
      return [];
    }
    if (roundKey === 'LB_FINAL') {
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
          description: 'LB Final'
        }];
      }
      return [];
    }
    if (roundKey === '5-6') {
      // 5-6.lık: LB R5 kaybedenleri
      const lbR5Losers = getLosers('LB_R5');
      if (lbR5Losers.length === 2) {
        return [{
          id: 'fifth_sixth',
          player1Id: lbR5Losers[0],
          player2Id: lbR5Losers[1],
          bracket: 'placement',
          round: 5,
          matchNumber: 1,
          isBye: false,
          description: '5.lik-6.lık Maçı'
        }];
      }
      return [];
    }
    if (roundKey === 'FINAL') {
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
          description: 'Final'
        }];
      }
      return [];
    }
    if (roundKey === 'GRAND_FINAL') {
      // Grand Final: Finali LB'den gelen kazanırsa, A ve E tekrar karşılaşır
      const final = matchList.find(m => m.id === 'final');
      if (final && final.winnerId) {
        // Finalde LB'den gelen kazandıysa (LB Final kazananı)
        const yariFinal = matchList.find(m => m.id === 'yari_final');
        const lbFinal = matchList.find(m => m.id === 'lb_final');
        if (yariFinal && lbFinal && lbFinal.winnerId === final.winnerId) {
          // Grand Final oynanmalı
          return [{
            id: 'grand_final',
            player1Id: yariFinal.winnerId!,
            player2Id: lbFinal.winnerId!,
            bracket: 'winner',
            round: 9,
            matchNumber: 1,
            isBye: false,
            description: 'Grand Final'
          }];
        }
      }
      return [];
    }
    return [];
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
    return (
      <MatchCard
        matchId={match.id}
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6">
        <div className="flex justify-center gap-4">
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
              onClick={() => {
                if (window.confirm('Son maçı geri almak istediğinizden emin misiniz?')) {
                  undoLastMatch();
                }
              }}
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
      
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !tournamentComplete && (() => {
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
      
      <h2 className="text-2xl font-bold text-center mb-2">
        Double Elimination Tournament ({players.length} players)
      </h2>
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      <div className="text-center text-gray-600 mb-6 text-sm bg-blue-50 p-4 rounded-lg max-w-4xl mx-auto">
        <p className="font-semibold mb-2">17-23 Oyuncu için Çift Eleme Turnuva Formatı:</p>
        <p>• WB R1: 32'ye tamamlamak için byeler, kalanlar eşleşir</p>
        <p>• WB R2: 16 oyuncu, 8 maç</p>
        <p>• LB R1: WB R1 ve WB R2 kaybedenleri, byelerle 16'ya tamamlanır</p>
        <p>• LB R2: 8 oyuncu, 4 maç</p>
        <p>• WB R3: 8 oyuncu, 4 maç</p>
        <p>• LB R3: LB R2 ve WB R3 kaybedenleri, 8 oyuncu</p>
        <p>• LB R4: 4 oyuncu</p>
        <p>• WB R4: 4 oyuncu</p>
        <p>• LB R5: 4 oyuncu</p>
        <p>• Yarı Final, LB R6, 7-8, LB Final, 5-6, Final, Grand Final</p>
      </div>
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {activeMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
        </div>
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