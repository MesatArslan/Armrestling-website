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
  'WB1', 'WB2', 'LB1', 'LB2', 'WB3', 'LB3', 'LB4', 'WB4', 'LB5', 'LB6', 'WB5', 'LB7', 'YariFinal', 'LB8', '7-8', 'LBFinal', '5-6', 'Final', 'GrandFinal'
];

type RoundKey = typeof ROUND_ORDER[number];

interface DoubleElimination33_47Props extends DoubleEliminationProps {
  resetKey?: number;
}

const DoubleElimination33_47: React.FC<DoubleElimination33_47Props> = ({ players, resetKey,onTournamentComplete, fixtureId }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [rankings, setRankings] = useState<Ranking>({});
  const [tournamentComplete, setTournamentComplete] = useState(false);
  const [currentRoundKey, setCurrentRoundKey] = useState<RoundKey>('WB1');
  const [showLb1ByeMessage, setShowLb1ByeMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(
    TabManager.getInitialTab(fixtureId)
  );
  const [selectedWinner, setSelectedWinner] = useState<{ [key: string]: string | null }>({});
  const [, setLastCompletedMatch] = useState<Match | null>(null);
  const [matchHistory, setMatchHistory] = useState<Match[][]>([]);

  // LB1'de herkes bye geçtiyse mesajı göster ve 3 saniye sonra LB2'ye geç
  React.useEffect(() => {
    if (currentRoundKey === 'LB1') {
      const activeLb1Matches = matches.filter(m => getMatchRoundKey(m) === 'LB1');
      if (activeLb1Matches.length > 0 && activeLb1Matches.every(m => m.isBye)) {
        setShowLb1ByeMessage(true);
        const timeout = setTimeout(() => {
          const nextMatches = createNextRound();
          setMatches([...matches, ...nextMatches]);
          setCurrentRoundKey('LB2');
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
      timestamp: new Date().toISOString()
    };
    const playerIds = players.map(p => p.id).sort().join('-');
    DoubleEliminationStorage.saveDoubleEliminationState(33, playerIds, state, fixtureId);
  };

  // Load tournament state using utility
  const loadTournamentState = () => {
    try {
      const playerIds = players.map(p => p.id).sort().join('-');
      const state = DoubleEliminationStorage.getDoubleEliminationState(33, playerIds, fixtureId);
      if (state) {
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
        setCurrentRoundKey(state.currentRoundKey || 'WB1');
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
    DoubleEliminationStorage.clearDoubleEliminationState(33, playerIds, fixtureId);
  };

  // --- Tournament Initialization ---
  const initializeTournament = () => {
    clearTournamentState();
    // Shuffle players randomly instead of seeding by weight
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const totalSlots = 64;
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
  };

  React.useEffect(() => {
    if (players.length >= 33 && players.length <= 47) {
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

  // Recalculate rankings when tournament is complete
  React.useEffect(() => {
    if (tournamentComplete && matches.length > 0) {
      const recalculatedRankings = calculateRankings(matches);
      if (JSON.stringify(recalculatedRankings) !== JSON.stringify(rankings)) {
        setRankings(recalculatedRankings);
        saveTournamentState(matches, recalculatedRankings, tournamentComplete, currentRoundKey);
      }
    }
  }, [matches, tournamentComplete, currentRoundKey]);

  // --- Round Completion Check ---
  const isRoundComplete = (roundKey: RoundKey, matchList: Match[]) => {
    const roundMatches = matchList.filter(m => getMatchRoundKey(m) === roundKey);
    const nonByeMatches = roundMatches.filter(m => !m.isBye);
    const byeMatches = roundMatches.filter(m => m.isBye);
    
    // Eğer sadece bye maçları varsa, round tamamlanmış sayılır
    if (nonByeMatches.length === 0 && byeMatches.length > 0) {
      return true;
    }
    
    // Normal maçlar varsa, hepsi tamamlanmış olmalı
    return nonByeMatches.length > 0 && nonByeMatches.every(m => m.winnerId);
  };

  // --- Round Key Helper ---
  function getMatchRoundKey(match: Match): RoundKey {
    if (match.id.startsWith('wb1')) return 'WB1';
    if (match.id.startsWith('wb2')) return 'WB2';
    if (match.id.startsWith('lb1')) return 'LB1';
    if (match.id.startsWith('lb2')) return 'LB2';
    if (match.id.startsWith('wb3')) return 'WB3';
    if (match.id.startsWith('lb3')) return 'LB3';
    if (match.id.startsWith('lb4')) return 'LB4';
    if (match.id.startsWith('wb4')) return 'WB4';
    if (match.id.startsWith('lb5')) return 'LB5';
    if (match.id.startsWith('lb6')) return 'LB6';
    if (match.id.startsWith('wb5')) return 'WB5';
    if (match.id.startsWith('lb7')) return 'LB7';
    if (match.id === 'yarifinal') return 'YariFinal';
    if (match.id.startsWith('lb8')) return 'LB8';
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
    
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;
    const newMatches = createNextRound();
    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);
      setCurrentRoundKey(nextRoundKey);
      saveTournamentState([...matches, ...newMatches], rankings, tournamentComplete, nextRoundKey);
    }
  }, [matches, currentRoundKey]);

  function createNextRound(): Match[] {
    // Son roundun maçlarını bulmak için
    const matchList = matches;
    const currentIdx = ROUND_ORDER.indexOf(currentRoundKey);
    const nextRoundKey = ROUND_ORDER[currentIdx + 1] as RoundKey;

    switch (nextRoundKey) {
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

      case 'LB1': {
        // WB1 kaybedenleri + WB2 kaybedenleri
        const wb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB1');
        const wb1Losers = wb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const wb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB2');
        const wb2Losers = wb2Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb1Players = [...wb1Losers, ...wb2Losers];
        // LB1'e katılan oyuncu sayısı
        const N = lb1Players.length;
        const Y = 32 - N; // bye sayısı (LB1'de 32 slot, 16 oyuncu LB2'ye geçer)
        const byePlayers = lb1Players.slice(0, Y);
        const matchPlayers = lb1Players.slice(Y);
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
        return lb1Matches;
      }

      case 'LB2': {
        // LB1'den gelen 16 oyuncu (kazananlar + byeler)
        const lb1Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB1');
        const lb1Winners = lb1Matches.filter(m => m.winnerId && !m.isBye).map(m => m.winnerId!);
        const lb1Byes = lb1Matches.filter(m => m.isBye).map(m => m.player1Id);
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

      case 'LB3': {
        // LB2 kazananları + WB3 kaybedenleri
        const lb2Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB2');
        const lb2Winners = lb2Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB3');
        const wb3Losers = wb3Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb3Players = [...lb2Winners, ...wb3Losers];
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

      case 'LB4': {
        // LB3 kazananları
        const lb3Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB3');
        const lb3Winners = lb3Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb4Matches: Match[] = [];
        for (let i = 0; i < lb3Winners.length; i += 2) {
          if (i + 1 < lb3Winners.length) {
            lb4Matches.push({
              id: `lb4_${Math.floor(i/2) + 1}`,
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
              description: RoundDescriptionUtils.getDescription('WB4')
            });
          }
        }
        return wb4Matches;
      }

      case 'LB5': {
        // LB4 kazananları + WB4 kaybedenleri
        const lb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB4');
        const lb4Winners = lb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Losers = wb4Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb5Players = [...lb4Winners, ...wb4Losers];
        const lb5Matches: Match[] = [];
        for (let i = 0; i < lb5Players.length; i += 2) {
          if (i + 1 < lb5Players.length) {
            lb5Matches.push({
              id: `lb5_${Math.floor(i/2) + 1}`,
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

      case 'LB6': {
        // LB5 kazananları
        const lb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB5');
        const lb5Winners = lb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb6Matches: Match[] = [];
        for (let i = 0; i < lb5Winners.length; i += 2) {
          if (i + 1 < lb5Winners.length) {
            lb6Matches.push({
              id: `lb6_${Math.floor(i/2) + 1}`,
              player1Id: lb5Winners[i],
              player2Id: lb5Winners[i + 1],
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

      case 'WB5': {
        // WB4 kazananları
        const wb4Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB4');
        const wb4Winners = wb4Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const wb5Matches: Match[] = [];
        for (let i = 0; i < wb4Winners.length; i += 2) {
          if (i + 1 < wb4Winners.length) {
            wb5Matches.push({
              id: `wb5_${Math.floor(i/2) + 1}`,
              player1Id: wb4Winners[i],
              player2Id: wb4Winners[i + 1],
              bracket: 'winner',
              round: 5,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('WB_QuarterFinal', Math.floor(i/2) + 1)
            });
          }
        }
        return wb5Matches;
      }

      case 'LB7': {
        // WB5 kaybedenleri + LB6 kazananları
        const wb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB5');
        const wb5Losers = wb5Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb6Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB6');
        const lb6Winners = lb6Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb7Players = [...wb5Losers, ...lb6Winners];
        const lb7Matches: Match[] = [];
        for (let i = 0; i < lb7Players.length; i += 2) {
          if (i + 1 < lb7Players.length) {
            lb7Matches.push({
              id: `lb7_${Math.floor(i/2) + 1}`,
              player1Id: lb7Players[i],
              player2Id: lb7Players[i + 1],
              bracket: 'loser',
              round: 7,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB7', Math.floor(i/2) + 1)
            });
          }
        }
        return lb7Matches;
      }

      case 'YariFinal': {
        // WB5 kazananları
        const wb5Matches = matchList.filter(m => getMatchRoundKey(m) === 'WB5');
        const wb5Winners = wb5Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (wb5Winners.length >= 2) {
          return [{
            id: 'yarifinal',
            player1Id: wb5Winners[0],
            player2Id: wb5Winners[1],
            bracket: 'winner',
            round: 6,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('WB_SemiFinal')
          }];
        }
        return [];
      }

      case 'LB8': {
        // LB7 kazananları
        const lb7Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB7');
        const lb7Winners = lb7Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lb8Matches: Match[] = [];
        for (let i = 0; i < lb7Winners.length; i += 2) {
          if (i + 1 < lb7Winners.length) {
            lb8Matches.push({
              id: `lb8_${Math.floor(i/2) + 1}`,
              player1Id: lb7Winners[i],
              player2Id: lb7Winners[i + 1],
              bracket: 'loser',
              round: 8,
              matchNumber: Math.floor(i/2) + 1,
              isBye: false,
              description: RoundDescriptionUtils.createMatchDescription('LB8', Math.floor(i/2) + 1)
            });
          }
        }
        return lb8Matches;
      }

      case '7-8': {
        // LB6 kaybedenleri
        const lb6Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB6');
        const lb6Losers = lb6Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb6Losers.length >= 2) {
          return [{
            id: 'seventh_eighth',
            player1Id: lb6Losers[0],
            player2Id: lb6Losers[1],
            bracket: 'placement',
            round: 7,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('7-8')
          }];
        }
        return [];
      }

      case 'LBFinal': {
        // Yarı Final kaybedeni + LB8 kazananı
        const yarifinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal');
        const yarifinalLoser = yarifinalMatches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lb8Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB8');
        const lb8Winner = lb8Matches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (yarifinalLoser.length > 0 && lb8Winner.length > 0) {
          return [{
            id: 'lbfinal',
            player1Id: yarifinalLoser[0],
            player2Id: lb8Winner[0],
            bracket: 'loser',
            round: 9,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('LB_Final')
          }];
        }
        return [];
      }

      case '5-6': {
        // LB7 kaybedenleri
        const lb7Matches = matchList.filter(m => getMatchRoundKey(m) === 'LB7');
        const lb7Losers = lb7Matches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        if (lb7Losers.length >= 2) {
          return [{
            id: 'fifth_sixth',
            player1Id: lb7Losers[0],
            player2Id: lb7Losers[1],
            bracket: 'placement',
            round: 8,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('5-6')
          }];
        }
        return [];
      }

      case 'Final': {
        // Yarı Final kazananı + LB Final kazananı
        const yarifinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'YariFinal');
        const yarifinalWinner = yarifinalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        const lbfinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal');
        const lbfinalWinner = lbfinalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        if (yarifinalWinner.length > 0 && lbfinalWinner.length > 0) {
          return [{
            id: 'final',
            player1Id: yarifinalWinner[0],
            player2Id: lbfinalWinner[0],
            bracket: 'winner',
            round: 7,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('Final')
          }];
        }
        return [];
      }

      case 'GrandFinal': {
        // Final kaybedeni + Final kazananı (eğer LB Final kazananı Final'i kazandıysa)
        const finalMatches = matchList.filter(m => getMatchRoundKey(m) === 'Final');
        const finalWinner = finalMatches.filter(m => m.winnerId).map(m => m.winnerId!);
        const finalLoser = finalMatches.filter(m => m.winnerId).map(m => m.player1Id === m.winnerId ? m.player2Id : m.player1Id);
        const lbfinalMatches = matchList.filter(m => getMatchRoundKey(m) === 'LBFinal');
        const lbfinalWinnerId = lbfinalMatches.filter(m => m.winnerId).map(m => m.winnerId!)[0];
        
        if (finalWinner.length > 0 && finalLoser.length > 0 && 
            lbfinalWinnerId && finalWinner[0] === lbfinalWinnerId) {
          return [{
            id: 'grandfinal',
            player1Id: finalWinner[0],
            player2Id: finalLoser[0],
            bracket: 'winner',
            round: 8,
            matchNumber: 1,
            isBye: false,
            description: RoundDescriptionUtils.getDescription('GrandFinal')
          }];
        }
        return [];
      }
    }

    return [];
  }

  const handleMatchResult = (matchId: string, winnerId: string) => {
    // Save current state to history before updating
    setMatchHistory(prev => [...prev, [...matches]]);
    setLastCompletedMatch(matches.find(m => m.id === matchId) || null);
    
    setMatches(prevMatches => {
      const updatedMatches = prevMatches.map(match => 
        match.id === matchId ? { ...match, winnerId } : match
      );
      
      // Check if tournament is complete
      const finalMatch = updatedMatches.find(m => m.id === 'final');
      const grandFinalMatch = updatedMatches.find(m => m.id === 'grandfinal');
      
      if (finalMatch?.winnerId) {
        const lbfinalWinner = updatedMatches.find(m => m.id === 'lbfinal')?.winnerId;
        const finalWinner = finalMatch.winnerId;
        
        // If LB Final winner won the Final, we need Grand Final
        if (lbfinalWinner && finalWinner === lbfinalWinner) {
          // Tournament continues to Grand Final - don't calculate rankings yet
        } else {
          // WB Final winner won, tournament is complete
          const newRankings = calculateRankings(updatedMatches);
          setRankings(newRankings);
          setTournamentComplete(true);
          saveTournamentState(updatedMatches, newRankings, true, currentRoundKey);
          
          // Call parent's tournament complete handler
          if (onTournamentComplete) {
            onTournamentComplete(newRankings);
          }
        }
      } else if (grandFinalMatch?.winnerId) {
        // Grand Final completed, tournament is complete
        const newRankings = calculateRankings(updatedMatches);
        setRankings(newRankings);
        setTournamentComplete(true);
        saveTournamentState(updatedMatches, newRankings, true, currentRoundKey);
        
        // Call parent's tournament complete handler
        if (onTournamentComplete) {
          onTournamentComplete(newRankings);
        }
      }
      
      saveTournamentState(updatedMatches, rankings, tournamentComplete, currentRoundKey);
      return updatedMatches;
    });
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

  const calculateRankings = (matchList: Match[]): Ranking => {
    const rankings: Ranking = {};
    
    // Final/Grand Final winner is 1st
    const finalMatch = matchList.find(m => m.id === 'final');
    const grandFinalMatch = matchList.find(m => m.id === 'grandfinal');
    
    // Only calculate 1st and 2nd if GrandFinal is completed or if WB won Final
    if (grandFinalMatch?.winnerId) {
      rankings.first = grandFinalMatch.winnerId;
      rankings.second = grandFinalMatch.winnerId === grandFinalMatch.player1Id ? grandFinalMatch.player2Id : grandFinalMatch.player1Id;
    } else if (finalMatch?.winnerId) {
      // Check if WB won Final (if LB won, don't set 1st and 2nd yet)
      const lbfinalMatch = matchList.find(m => m.id === 'lbfinal');
      const lbfinalWinner = lbfinalMatch?.winnerId;
      const finalWinner = finalMatch.winnerId;
      
      // Only set 1st and 2nd if WB won Final
      if (!lbfinalWinner || finalWinner !== lbfinalWinner) {
        rankings.first = finalMatch.winnerId;
        rankings.second = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
      }
    }
    
    // LB Final loser is 3rd
    const lbfinalMatch = matchList.find(m => m.id === 'lbfinal');
    if (lbfinalMatch?.winnerId) {
      rankings.third = lbfinalMatch.winnerId === lbfinalMatch.player1Id ? lbfinalMatch.player2Id : lbfinalMatch.player1Id;
    }
    
    // LB8 loser is 4th
    const lb8Match = matchList.find(m => m.id === 'lb8_1');
    if (lb8Match?.winnerId) {
      rankings.fourth = lb8Match.winnerId === lb8Match.player1Id ? lb8Match.player2Id : lb8Match.player1Id;
    }
    
    // 5-6 match determines 5th and 6th
    const fifthSixthMatch = matchList.find(m => m.id === 'fifth_sixth');
    if (fifthSixthMatch?.winnerId) {
      rankings.fifth = fifthSixthMatch.winnerId;
      rankings.sixth = fifthSixthMatch.winnerId === fifthSixthMatch.player1Id ? fifthSixthMatch.player2Id : fifthSixthMatch.player1Id;
    }
    
    // 7-8 match determines 7th and 8th
    const seventhEighthMatch = matchList.find(m => m.id === 'seventh_eighth');
    if (seventhEighthMatch?.winnerId) {
      rankings.seventh = seventhEighthMatch.winnerId;
      rankings.eighth = seventhEighthMatch.winnerId === seventhEighthMatch.player1Id ? seventhEighthMatch.player2Id : seventhEighthMatch.player1Id;
    }
    
    return rankings;
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown Player';
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



  if (players.length < 33 || players.length > 47) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Uygun Olmayan Oyuncu Sayısı</h2>
        <p className="text-gray-600">
          Bu turnuva formatı 33-47 oyuncu arası için tasarlanmıştır. 
          Mevcut oyuncu sayısı: {players.length}
        </p>
      </div>
    );
  }

  // --- Aktif ve tamamlanan maçları göster ---
  const activeRoundMatches = matches.filter(m => getMatchRoundKey(m) === currentRoundKey);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Double Elimination Tournament (33-47 oyuncu)
        </h2>
        <div className="flex gap-4">
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
              <TabSwitcher activeTab={activeTab} onTabChange={TabManager.createTabChangeHandler(setActiveTab, fixtureId)} />
      <div className="max-w-4xl mx-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 text-center">Aktif Tur: {currentRoundKey}</h3>
      </div>
      {/* Otomatik Kazananları Seç Butonu */}
      {activeTab === 'active' && !tournamentComplete && activeRoundMatches.filter(m => !m.isBye && !m.winnerId).length > 0 && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => {
              // Aktif turdaki tamamlanmamış maçlar için rastgele kazanan seç
              activeRoundMatches.filter(m => !m.isBye && !m.winnerId).forEach(match => {
                // Her maç için rastgele bir kazanan seç
                const winnerId = Math.random() < 0.5 ? match.player1Id : match.player2Id;
                handleMatchResult(match.id, winnerId);
              });
            }}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors shadow-md"
          >
            Otomatik Kazananları Seç
          </button>
        </div>
      )}
      {activeTab === 'active' && (
        <>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl w-full mx-auto overflow-y-auto" style={{minHeight: 200, maxHeight: '60vh'}}>
              {activeRoundMatches.filter(m => !m.isBye && !m.winnerId).map(renderMatch)}
            </div>
          )}
        </>
      )}
      {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
      )}
            {activeTab === 'rankings' && (
        <RankingsTable rankings={calculateRankings(matches)} players={players} getPlayerName={getPlayerName} />
      )}
        {/* LB1'de tüm oyuncular bye geçtiyse özel mesaj */}
        {currentRoundKey === 'LB1' && activeRoundMatches.length > 0 && activeRoundMatches.every(m => m.isBye) && (
          <div className="text-center text-blue-600 mb-4 font-semibold">
            {showLb1ByeMessage ? 'LB R1\'de herkes bye geçti, LB R2\'ye geçiliyor...' : 'Tüm oyuncular bye geçti, bir sonraki tur başlatılıyor...'}
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
};

export default DoubleElimination33_47; 

