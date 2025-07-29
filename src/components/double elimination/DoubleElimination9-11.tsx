import * as React from 'react';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match, Ranking } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';

const ROUND_ORDER = [
  'WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB3', 'WB4', 'LB4', '7-8', 'LB5', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

const DoubleElimination9_11: React.FC<DoubleEliminationProps> = ({ players,onTournamentComplete, initialTab, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [] = useState<'results' | 'active' | 'completed'>('active'); // yeni state
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(initialTab || 'active');
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});

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
    DoubleEliminationStorage.clearDoubleEliminationState(9, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);
    const totalSlots = 16;
    const byesNeeded = totalSlots - players.length;
    const playersWithByes = sortedPlayers.slice(0, byesNeeded);
    const playersForMatches = sortedPlayers.slice(byesNeeded);
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
          description: `WB Round 1 - Match ${Math.floor(i/2) + 1}`
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
        description: `WB Round 1 - Bye for ${player.name} ${player.surname}`
      });
    });
    setMatches(wb1Matches);
    setRankings({});
    setTournamentComplete(false);
    setCurrentRoundKey('WB1');
  };

  // Fixtürü sıfırlama fonksiyonu
  const resetTournament = () => {
    initializeTournament();
    setSelectedWinner({});
  };

  React.useEffect(() => {
    if (players.length >= 9 && players.length <= 11) {
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
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id === 'seventh_eighth') return '7-8';
    if (match.id === 'lb5_final') return 'LB5';
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
    // Her round için, önceki roundun sonuçlarına göre yeni maçlar oluştur
    // Sadece bir sonraki roundun maçlarını döndür
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
            description: `WB Round 2 - Match ${Math.floor(i/2) + 1}`
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
        const lb1ByesNeeded = 8 - lb1PlayerCount;
        const lb1Matches: Match[] = [];
        // Byeler: ilk lb1ByesNeeded oyuncu bye geçer (sıralı)
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
            description: `LB Round 1 - Bye for ${getPlayerName(playerId)}`
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
            description: `LB Round 1 - Match ${Math.floor(i/2) + 1}`
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
            description: `LB Round 2 - Match ${Math.floor(i/2) + 1}`
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
              description: `WB Round 3 - Match ${Math.floor(i/2) + 1}`
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
            description: `LB Round 3 - Match ${Math.floor(i/2) + 1}`
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
            description: 'WB Round 4 - Semi-Final'
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
            description: 'LB Round 4 - LB Final'
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
          bracket: 'loser',
          round: 4,
          matchNumber: 2,
          isBye: false,
            description: '7th-8th Place Match'
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
            description: 'LB Final (LB R5)'
          }];
      }
        return [];
      }
      case '5-6': {
        // WB3 kaybedenleri + LB4 kaybedeni
        const wb3Losers = matchList.filter(m => getMatchRoundKey(m) === 'WB3' && m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb4Match = matchList.find(m => m.id === 'lb4_final');
        if (wb3Losers.length >= 1 && lb4Match && lb4Match.winnerId && lb4Match.player1Id && lb4Match.player2Id) {
          const lb4Loser = lb4Match.player1Id === lb4Match.winnerId ? lb4Match.player2Id : lb4Match.player1Id;
          return [{
          id: 'fifth_sixth',
            player1Id: wb3Losers[0],
            player2Id: lb4Loser,
          bracket: 'loser',
            round: 5,
            matchNumber: 2,
          isBye: false,
            description: '5th-6th Place Match'
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
            description: 'Final'
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
              description: 'Grand Final'
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
      if (match.id === 'lb4_final' || match.id === 'lb5_final' || match.id === 'lb_final') {
        newRankings.third = winnerId;
        newRankings.fourth = match.player1Id === winnerId ? match.player2Id : match.player1Id;
      }
      if (match.id.toLowerCase().includes('final') || match.id.toLowerCase().includes('grand')) {
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

  // --- UI Helpers ---
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
  };
  const renderMatch = (match: Match) => {
    const player1Name = getPlayerName(match.player1Id);
    const player2Name = match.player2Id ? getPlayerName(match.player2Id) : 'TBD';
    const currentSelectedWinner = selectedWinner[match.id] || null;

    // Maç başlığı (ROUND_ORDER'a göre)
    const roundNames: Record<string, string> = {
      'WB1': 'WB1 (Winner Bracket Round 1)',
      'WB2': 'WB2 (Winner Bracket Round 2)',
      'WB3': 'WB3 (Winner Bracket Round 3)',
      'WB4': 'WB4 (Winner Bracket Round 4)',
      'LB1': 'LB1 (Loser Bracket Round 1)',
      'LB2': 'LB2 (Loser Bracket Round 2)',
      'LB3': 'LB3 (Loser Bracket Round 3)',
      'LB4': 'LB4 (Loser Bracket Round 4)',
      'LB5': 'LB5 (Loser Bracket Final)',
      '7-8': '7.lik/8.lik Maçı',
      '5-6': '5.lik/6.lık Maçı',
      'Final': 'Final',
      'GrandFinal': 'Grand Final'
    };
    const matchTitle = roundNames[getMatchRoundKey(match)] || getMatchRoundKey(match);

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
        player1Name={player1Name}
        player2Name={player2Name}
        winnerId={match.winnerId}
        player1Id={match.player1Id || ''}
        player2Id={match.player2Id || ''}
        bracket={match.bracket === 'placement' ? 'winner' : (match.bracket as 'winner' | 'loser')}
        round={match.round}
        matchNumber={match.matchNumber}
        isBye={match.isBye}
        currentSelectedWinner={currentSelectedWinner}
        onWinnerSelect={handleWinnerSelect}
        onWinnerConfirm={handleWinnerConfirm}
        onSelectionCancel={handleSelectionCancel}
        playersLength={players.length}
        matchTitle={matchTitle}
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
      </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="text-center mb-6">
        <button
          onClick={resetTournament}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          🔄 Turnuvayı Sıfırla
        </button>
      </div>
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
                          onClick={() => setActiveTab('rankings')}
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