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
  'WB1', 'LB1', 'WB2', 'LB2', 'LB3', 'WB3', 'LB4', 'LB5', 'WB4', 'LB6', 'YariFinal', 'LB7', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination24_32Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination24_32: React.FC<DoubleElimination24_32Props> = ({ players, resetKey, onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  // viewMode kullanılmıyor, kaldırıldı
  const [showLb1ByeMessage, setShowLb1ByeMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);
  const [, setIsUndoing] = useState(false);

  // LB1'de herkes bye geçtiyse mesajı göster ve 3 saniye sonra WB2'ye geç
  React.useEffect(() => {
    if (currentRoundKey === 'LB1') {
      const activeLb1Matches = matches.filter(m => getMatchRoundKey(m) === 'LB1');
      if (activeLb1Matches.length > 0 && activeLb1Matches.every(m => m.isBye)) {
        setShowLb1ByeMessage(true);
        const timeout = setTimeout(() => {
          // WB2'ye geçişte yeni roundun maçlarını da oluştur
          const nextMatches = createNextRound();
          setMatches([...matches, ...nextMatches]);
          setCurrentRoundKey('WB2');
          setShowLb1ByeMessage(false);
        }, 3000);
        return () => clearTimeout(timeout);
      } else {
        setShowLb1ByeMessage(false);
      }
    } else {
      setShowLb1ByeMessage(false);
    }
  }, [currentRoundKey, matches]);

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
    DoubleEliminationStorage.saveDoubleEliminationState(24, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(24, playerIds, fixtureId);
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
    DoubleEliminationStorage.clearDoubleEliminationState(24, playerIds, fixtureId);
    setMatchHistory([]);
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
    setMatchHistory([]);
  };

  React.useEffect(() => {
    if (players.length >= 24 && players.length <= 32) {
      const stateLoaded = loadTournamentState();
      if (!stateLoaded) {
        initializeTournament();
      }
    }
  }, [players]);

  // Reset key değiştiğinde turnuvayı başlat
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey);
    }
  }, [matches, rankings, tournamentComplete, currentRoundKey]);

  // Fixtürü sıfırlama fonksiyonu

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey && !m.isBye);
    return roundMatches.length > 0 && roundMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id.startsWith('lb5')) return 'LB5';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('lb6')) return 'LB6';
    if (match.id === 'yarifinal') return 'YariFinal';
    if (match.id.startsWith('lb7')) return 'LB7';
    if (match.id === 'seventh_eighth') return '7-8';
    if (match.id === 'lbfinal') return 'LBFinal';
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
    const newMatches = createNextRound();
    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches, currentRoundKey]);

  // --- Next Round Match Creation Logic ---
  function createNextRound(): Match[] {
    // Son roundun maçlarını bulmak için
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
      case 'LB1': {
        // WB1 kaybedenleri
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB1');
        const wb1Losers = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        // LB1'e katılan oyuncu sayısı
        const N = wb1Losers.length;
        const Y = 16 - N; // bye sayısı
        const byePlayers = wb1Losers.slice(0, Y);
        const matchPlayers = wb1Losers.slice(Y);
        const lb1Matches: Match[] = [];
        // Byeler
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
        // Maçlar (kalanlar eşleşir)
        for (let i = 0; i < matchPlayers.length; i += 2) {
          if (i + 1 < matchPlayers.length) {
            lb1Matches.push({
              id: `lb1_${Math.floor(i/2) + 1}`,
              player1Id: matchPlayers[i],
              player2Id: matchPlayers[i + 1],
              bracket: 'loser',
              round: 1,
              matchNumber: Y + Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB1', Math.floor(i/2) + 1)
            });
          }
        }
        // LB2'ye geçenler: bye alanlar + maç kazananlar = 8 kişi olacak
        return lb1Matches;
      }
      case 'WB2': {
        // WB1 kazananları + byeler
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB1');
        const wb1Winners = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const wb1Byes = wb1Matches.filter(m => m.isBye).map(m => m.player1Id);
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
      case 'LB2': {
        // LB1 kazananları + byeler + WB2 kaybedenleri
        const lb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB1');
        const lb1Winners = lb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lb1Byes = lb1Matches.filter(m => m.isBye).map(m => m.player1Id);
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB2');
        const wb2Losers = wb2Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb2Players = [...lb1Winners, ...lb1Byes, ...wb2Losers];
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
      case 'LB3': {
        // LB2 kazananları
        const lb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB2');
        const lb2Winners = lb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb3Matches: Match[] = [];
        for (let i = 0; i < lb2Winners.length; i += 2) {
          if (i + 1 < lb2Winners.length) {
            lb3Matches.push({
              id: `lb3_${Math.floor(i/2) + 1}`,
              player1Id: lb2Winners[i],
              player2Id: lb2Winners[i + 1],
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
      case 'WB3': {
        // WB2 kazananları
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB2');
        const wb2Winners = wb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
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
              description: RoundDescriptionUtils.createMatchDescription('WB3', Math.floor(i/2) + 1)
            });
          }
        }
        return wb3Matches;
      }
      case 'LB4': {
        // WB3 kaybedenleri + LB3 kazananları
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Losers = wb3Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB3');
        const lb3Winners = lb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb4Players = [...wb3Losers, ...lb3Winners];
        const lb4Matches: Match[] = [];
        for (let i = 0; i < lb4Players.length; i += 2) {
          if (i + 1 < lb4Players.length) {
            lb4Matches.push({
              id: `lb4_${Math.floor(i/2) + 1}`,
              player1Id: lb4Players[i],
              player2Id: lb4Players[i + 1],
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
      case 'LB5': {
        // LB4 kazananları
        const lb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB4');
        const lb4Winners = lb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb5Matches: Match[] = [];
        for (let i = 0; i < lb4Winners.length; i += 2) {
          if (i + 1 < lb4Winners.length) {
            lb5Matches.push({
              id: `lb5_${Math.floor(i/2) + 1}`,
              player1Id: lb4Winners[i],
              player2Id: lb4Winners[i + 1],
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
      case 'WB4': {
        // WB3 kazananları
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Winners = wb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb4Matches: Match[] = [];
        for (let i = 0; i < wb3Winners.length; i += 2) {
          if (i + 1 < wb3Winners.length) {
            wb4Matches.push({
              id: `wb4_${Math.floor(i/2) + 1}`,
              player1Id: wb3Winners[i],
              player2Id: wb3Winners[i + 1],
              bracket: 'winner',
              round: 4,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.getDescription('WB_QuarterFinal')
            });
          }
        }
        return wb4Matches;
      }
      case 'LB6': {
        // WB4 kaybedenleri + LB5 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Losers = wb4Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB5');
        const lb5Winners = lb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb6Players = [...wb4Losers, ...lb5Winners];
        const lb6Matches: Match[] = [];
        for (let i = 0; i < lb6Players.length; i += 2) {
          if (i + 1 < lb6Players.length) {
            lb6Matches.push({
              id: `lb6_${Math.floor(i/2) + 1}`,
              player1Id: lb6Players[i],
              player2Id: lb6Players[i + 1],
              bracket: 'loser',
              round: 6,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB6', Math.floor(i/2) + 1)
            });
          }
        }
        return lb6Matches;
      }
      case 'YariFinal': {
        // WB4 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Winners = wb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (wb4Winners.length >= 2) {
          return [{
            id: 'yarifinal',
            player1Id: wb4Winners[0],
            player2Id: wb4Winners[1],
            bracket: 'winner',
            round: 7,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }
      case 'LB7': {
        // LB6 kazananları
        const lb6Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB6');
        const lb6Winners = lb6Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (lb6Winners.length >= 2) {
          return [{
            id: 'lb7',
            player1Id: lb6Winners[0],
            player2Id: lb6Winners[1],
            bracket: 'loser',
            round: 7,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB7')
          }];
        }
        return [];
      }
      case '7-8': {
        // LB5 kaybedenleri
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB5');
        const lb5Losers = lb5Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb5Losers.length >= 2) {
          return [{
            id: 'seventh_eighth',
            player1Id: lb5Losers[0],
            player2Id: lb5Losers[1],
            bracket: 'placement',
            round: 7,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('7-8')
          }];
        }
        return [];
      }
      case 'LBFinal': {
        // Yarı Final kaybedeni + LB7 kazananı
        const yariFinalMatch = matchList.find(m => m.id === 'yarifinal');
        const lb7Match = matchList.find(m => m.id === 'lb7');
        if (yariFinalMatch && yariFinalMatch.winnerId && lb7Match && lb7Match.winnerId) {
          const yariFinalLoser = yariFinalMatch.player1Id === yariFinalMatch.winnerId ? yariFinalMatch.player2Id : yariFinalMatch.player1Id;
          return [{
            id: 'lbfinal',
            player1Id: lb7Match.winnerId,
            player2Id: yariFinalLoser,
            bracket: 'loser',
            round: 8,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }
      case '5-6': {
        // LB6 kaybedenleri
        const lb6Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB6');
        const lb6Losers = lb6Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb6Losers.length >= 2) {
          return [{
            id: 'fifth_sixth',
            player1Id: lb6Losers[0],
            player2Id: lb6Losers[1],
            bracket: 'placement',
            round: 8,
            matchNumber: 2,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }
      case 'Final': {
        // Yarı Final kazananı + LB Final kazananı
        const yariFinalMatch = matchList.find(m => m.id === 'yarifinal');
        const lbFinalMatch = matchList.find(m => m.id === 'lbfinal');
        if (yariFinalMatch && yariFinalMatch.winnerId && lbFinalMatch && lbFinalMatch.winnerId) {
          return [{
            id: 'final',
            player1Id: yariFinalMatch.winnerId,
            player2Id: lbFinalMatch.winnerId,
            bracket: 'winner',
            round: 9,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }
      case 'GrandFinal': {
        // Finalde LB'den gelen kazanırsa Grand Final
        const finalMatch = matchList.find(m => m.id === 'final');
        if (finalMatch && finalMatch.winnerId && finalMatch.player1Id && finalMatch.player2Id) {
          // LB'den gelen kazanırsa Grand Final
          if (finalMatch.winnerId === finalMatch.player2Id) {
            return [{
              id: 'grandfinal',
              player1Id: finalMatch.player2Id,
              player2Id: finalMatch.player1Id,
              bracket: 'winner',
              round: 10,
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

  // --- Match Result Handler ---
  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    const updatedMatches = matches.map(match =>
      match.id === matchId ? { ...match, winnerId } : match
    );
    // Sıralama güncellemeleri (final, 3.lük, 5.lik, 7.lik maçları vs.)
    let updatedRankings = { ...rankings };
    let complete = tournamentComplete;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    // 7-8 maçı
    if (match.id === 'seventh_eighth') {
      updatedRankings.seventh = winnerId;
      updatedRankings.eighth = loserId;
    }
    // 5-6 maçı
    if (match.id === 'fifth_sixth') {
      updatedRankings.fifth = winnerId;
      updatedRankings.sixth = loserId;
    }
    // LB7 - 4. sıralama (LB7 kaybedeni 4. olur)
    if (match.id === 'lb7') {
      updatedRankings.fourth = loserId;
      // LB7 kazananı LBFinal'e gider
    }
    // LBFinal - 3. sıralama (LBFinal kaybedeni 3. olur)
    if (match.id === 'lbfinal') {
      updatedRankings.third = loserId;
      // LBFinal kazananı Final'e gider
    }
    // Final - 1. ve 2. sıralama (sadece GrandFinal yoksa)
    if (match.id === 'final') {
      // WB'den gelen kazanırsa turnuva biter, sıralama belli olur
      const yariFinalMatch = matches.find(m => m.id === 'yarifinal');
      if (yariFinalMatch && yariFinalMatch.player1Id && yariFinalMatch.player2Id) {
        // WB'den gelen oyuncu (player1) kazanırsa turnuva biter
        if (winnerId === yariFinalMatch.player1Id) {
          updatedRankings.first = winnerId;
          updatedRankings.second = loserId;
          complete = true;
        }
        // LB'den gelen kazanırsa GrandFinal oynanır, henüz sıralama belli değil
      }
    }
    // GrandFinal - 1. ve 2. sıralama (GrandFinal bittikten sonra)
    if (match.id === 'grandfinal') {
      updatedRankings.first = winnerId;
      updatedRankings.second = loserId;
      complete = true;
    }
    setMatches(updatedMatches);
    setRankings(updatedRankings);
    setTournamentComplete(complete);
    saveTournamentState(updatedMatches, updatedRankings, complete, currentRoundKey);
    
    // Call parent's tournament complete handler if tournament is complete
    if (complete && onTournamentComplete) {
      onTournamentComplete(updatedRankings);
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
        } else if (matchId === 'lbfinal') {
          delete updatedRankings.third;
        } else if (matchId === 'seventh_eighth') {
          delete updatedRankings.seventh;
          delete updatedRankings.eighth;
        } else if (matchId === 'fifth_sixth') {
          delete updatedRankings.fifth;
          delete updatedRankings.sixth;
        } else if (matchId === 'lb7') {
          delete updatedRankings.fourth;
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
      DoubleEliminationStorage.saveDoubleEliminationState(24, playerIds, state, fixtureId);
      
      // Reset the undoing flag after a short delay
      setTimeout(() => {
        setIsUndoing(false);
      }, 100);
    }
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

  // --- Aktif ve tamamlanan maçları göster ---
  const activeRoundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-6">
        Double Elimination Tournament (24-32 oyuncu)
      </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Aktif Tur: {currentRoundKey}</h3>
      </div>
      {activeTab === 'active' && (
        <>
          {/* Butonlar hem aktif hem de tamamlanmış turnuvalarda gösteriliyor */}
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
              
              {/* Undo Last Match Button - pop-up kaldırıldı */}
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
          
          {tournamentComplete ? (
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
                    Tüm maçlar başarıyla tamamlandı. Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
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
        ) : (
          <>
            {/* Otomatik Kazananları Seç Butonu */}
            {(() => {
              const roundMatches = activeRoundMatches.filter(m => !m.isBye && !m.winnerId);
              return roundMatches.length > 0;
            })() && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => {
                    const roundMatches = activeRoundMatches.filter(m => !m.isBye && !m.winnerId);
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl w-full mx-auto overflow-y-auto" style={{minHeight: 200, maxHeight: '60vh'}}>
              {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
            </div>
          </>
        )}
      </>
    )}
    {activeTab === 'completed' && (
      <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
    )}
    {activeTab === 'rankings' && (
      <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
    )}
    {/* LB1'de tüm oyuncular bye geçtiyse özel mesaj */}
    {currentRoundKey === 'LB1' && activeRoundMatches.length > 0 && activeRoundMatches.every(m => m.isBye) && (
      <div className="text-center text-blue-600 mb-4 font-semibold">
        {showLb1ByeMessage ? 'LB R1\'de herkes bye geçti, WB R2\ye geçiliyor...' : 'Tüm oyuncular bye geçti, bir sonraki tur başlatılıyor...'}
      </div>
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
}

export default DoubleElimination24_32;
