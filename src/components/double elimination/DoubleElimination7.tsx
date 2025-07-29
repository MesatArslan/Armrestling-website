import * as React from 'react';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import type { Match } from '../../types/doubleelimination';
import MatchCard from '../UI/MatchCard';
import TabSwitcher from '../UI/TabSwitcher';
import CompletedMatchesTable from '../UI/CompletedMatchesTable';
import RankingsTable from '../UI/RankingsTable';
import { DoubleEliminationStorage } from '../../utils/localStorage';

const DoubleElimination7: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, initialTab, fixtureId }) => {
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
  const [selectedWinner, setSelectedWinner] = useState<{ [matchId: string]: string | null }>({});
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'rankings'>(initialTab || 'active');
  const [showCompletedMatches, setShowCompletedMatches] = useState(false);

  // Save tournament state using utility
  const saveTournamentState = (matchesState: Match[], rankingsState: any, completeState: boolean) => {
    const state = {
      matches: matchesState,
      rankings: rankingsState,
      tournamentComplete: completeState,
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
        setMatches(state.matches || []);
        setRankings(state.rankings || {});
        setTournamentComplete(state.tournamentComplete || false);
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
    DoubleEliminationStorage.clearDoubleEliminationState(7, playerIds, fixtureId);
  };

  // Initialize tournament
  const initializeTournament = () => {
    clearTournamentState();
    const newMatches: Match[] = [];
    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);

    if (players.length === 7) {
      // WB Round 1: A vs B, C vs D, E vs F (G bye)
      newMatches.push({
        id: 'wb1-1',
        player1Id: sortedPlayers[0].id, // A
        player2Id: sortedPlayers[1].id, // B
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        isBye: false
      });

      newMatches.push({
        id: 'wb1-2',
        player1Id: sortedPlayers[2].id, // C
        player2Id: sortedPlayers[3].id, // D
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        isBye: false
      });

      newMatches.push({
        id: 'wb1-3',
        player1Id: sortedPlayers[4].id, // E
        player2Id: sortedPlayers[5].id, // F
        bracket: 'winner',
        round: 1,
        matchNumber: 3,
        isBye: false
      });
    }

    setMatches(newMatches);
    setRankings({});
    setTournamentComplete(false);
    setSelectedWinner({});
  };

  React.useEffect(() => {
    if (players.length === 7) {
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
      saveTournamentState(updatedMatches, rankings, tournamentComplete);
    }
  }, [matches, rankings, tournamentComplete]);

  const handleMatchResult = (matchId: string, winnerId: string) => {
    const updatedMatches = matches.map(match =>
      match.id === matchId ? { ...match, winnerId } : match
    );

    const currentMatch = matches.find(m => m.id === matchId);
    if (!currentMatch) return;

    const loserId = currentMatch.player1Id === winnerId ? currentMatch.player2Id : currentMatch.player1Id;

    let finalMatches = updatedMatches;
    let finalRankings = rankings;
    let finalTournamentComplete = tournamentComplete;

    const sortedPlayers = [...players].sort((a, b) => b.weight - a.weight);

    // Check if all WB Round 1 matches are completed
    const checkWBR1Complete = () => {
      const wb1_1 = finalMatches.find(m => m.id === 'wb1-1');
      const wb1_2 = finalMatches.find(m => m.id === 'wb1-2');
      const wb1_3 = finalMatches.find(m => m.id === 'wb1-3');
      return wb1_1?.winnerId && wb1_2?.winnerId && wb1_3?.winnerId;
    };

    if (matchId === 'wb1-1' || matchId === 'wb1-2' || matchId === 'wb1-3') {
      // WB Round 1 match completed, check if all are done to create LB R1
      if (checkWBR1Complete()) {
        const wb1_1Match = finalMatches.find(m => m.id === 'wb1-1');
        const wb1_2Match = finalMatches.find(m => m.id === 'wb1-2');

        const wb1_1Loser = wb1_1Match!.player1Id === wb1_1Match!.winnerId ? wb1_1Match!.player2Id : wb1_1Match!.player1Id;
        const wb1_2Loser = wb1_2Match!.player1Id === wb1_2Match!.winnerId ? wb1_2Match!.player2Id : wb1_2Match!.player1Id;

        // LB Round 1: B vs D (F bye)
        finalMatches.push({
          id: 'lb1',
          player1Id: wb1_1Loser, // B (loser from A vs B)
          player2Id: wb1_2Loser, // D (loser from C vs D)
          bracket: 'loser',
          round: 1,
          matchNumber: 1,
          isBye: false
        });
      }

    } else if (matchId === 'lb1') {
      // LB Round 1: B vs D completed, loser gets 7th place
      finalRankings = { ...finalRankings, seventh: loserId };

      // Create WB Round 2: A vs G, C vs E
      const wb1_1Match = finalMatches.find(m => m.id === 'wb1-1');
      const wb1_2Match = finalMatches.find(m => m.id === 'wb1-2');
      const wb1_3Match = finalMatches.find(m => m.id === 'wb1-3');

      const wb1_1Winner = wb1_1Match!.winnerId; // A
      const wb1_2Winner = wb1_2Match!.winnerId; // C
      const wb1_3Winner = wb1_3Match!.winnerId; // E

      // WB Round 2: A vs G
      finalMatches.push({
        id: 'wb2-1',
        player1Id: wb1_1Winner!, // A (winner from A vs B)
        player2Id: sortedPlayers[6].id, // G (bye from WB R1)
        bracket: 'winner',
        round: 2,
        matchNumber: 1,
        isBye: false
      });

      // WB Round 2: C vs E
      finalMatches.push({
        id: 'wb2-2',
        player1Id: wb1_2Winner!, // C (winner from C vs D)
        player2Id: wb1_3Winner!, // E (winner from E vs F)
        bracket: 'winner',
        round: 2,
        matchNumber: 2,
        isBye: false
      });

    } else if (matchId === 'wb2-1' || matchId === 'wb2-2') {
      // WB Round 2 match completed, check if both are done to create LB R2
      const wb2_1Match = finalMatches.find(m => m.id === 'wb2-1');
      const wb2_2Match = finalMatches.find(m => m.id === 'wb2-2');

      if (wb2_1Match?.winnerId && wb2_2Match?.winnerId) {
        const wb2_1Loser = wb2_1Match.player1Id === wb2_1Match.winnerId ? wb2_1Match.player2Id : wb2_1Match.player1Id;
        const wb2_2Loser = wb2_2Match.player1Id === wb2_2Match.winnerId ? wb2_2Match.player2Id : wb2_2Match.player1Id;
        const lb1Winner = finalMatches.find(m => m.id === 'lb1')!.winnerId;
        const wb1_3Match = finalMatches.find(m => m.id === 'wb1-3');
        const wb1_3Loser = wb1_3Match!.player1Id === wb1_3Match!.winnerId ? wb1_3Match!.player2Id : wb1_3Match!.player1Id;

        // LB Round 2: B vs E
        finalMatches.push({
          id: 'lb2-1',
          player1Id: lb1Winner!, // B (winner from B vs D)
          player2Id: wb2_2Loser, // E (loser from C vs E)
          bracket: 'loser',
          round: 2,
          matchNumber: 1,
          isBye: false
        });

        // LB Round 2: F vs G
        finalMatches.push({
          id: 'lb2-2',
          player1Id: wb1_3Loser, // F (loser from E vs F)
          player2Id: wb2_1Loser, // G (loser from A vs G)
          bracket: 'loser',
          round: 2,
          matchNumber: 2,
          isBye: false
        });
      }

    } else if (matchId === 'lb2-1' || matchId === 'lb2-2') {
      // LB Round 2 matches completed, check if both are done to create WB R3
      const lb2_1Match = finalMatches.find(m => m.id === 'lb2-1');
      const lb2_2Match = finalMatches.find(m => m.id === 'lb2-2');

      if (lb2_1Match?.winnerId && lb2_2Match?.winnerId) {
        const wb2_1Match = finalMatches.find(m => m.id === 'wb2-1');
        const wb2_2Match = finalMatches.find(m => m.id === 'wb2-2');

        // WB Round 3: A vs C (Semifinal)
        finalMatches.push({
          id: 'wb3',
          player1Id: wb2_1Match!.winnerId!, // A (winner from A vs G)
          player2Id: wb2_2Match!.winnerId!, // C (winner from C vs E)
          bracket: 'winner',
          round: 3,
          matchNumber: 1,
          isBye: false
        });
      }

    } else if (matchId === 'wb3') {
      // WB Round 3 (Semifinal) completed, create 5th/6th place match and LB R3
      const lb2_1Winner = finalMatches.find(m => m.id === 'lb2-1')!.winnerId; // B
      const lb2_2Winner = finalMatches.find(m => m.id === 'lb2-2')!.winnerId; // F
      const lb2_1Loser = finalMatches.find(m => m.id === 'lb2-1')!.player1Id === finalMatches.find(m => m.id === 'lb2-1')!.winnerId ?
        finalMatches.find(m => m.id === 'lb2-1')!.player2Id : finalMatches.find(m => m.id === 'lb2-1')!.player1Id; // E
      const lb2_2Loser = finalMatches.find(m => m.id === 'lb2-2')!.player1Id === finalMatches.find(m => m.id === 'lb2-2')!.winnerId ?
        finalMatches.find(m => m.id === 'lb2-2')!.player2Id : finalMatches.find(m => m.id === 'lb2-2')!.player1Id; // G

      // 5th/6th Place Match: G vs E
      finalMatches.push({
        id: 'place56',
        player1Id: lb2_2Loser, // G (loser from F vs G)
        player2Id: lb2_1Loser, // E (loser from B vs E)
        bracket: 'placement',
        round: 3,
        matchNumber: 1,
        isBye: false
      });

      // LB Round 3: B vs F
      finalMatches.push({
        id: 'lb3',
        player1Id: lb2_1Winner!, // B (winner from B vs E)
        player2Id: lb2_2Winner!, // F (winner from F vs G)
        bracket: 'loser',
        round: 3,
        matchNumber: 1,
        isBye: false
      });

    } else if (matchId === 'place56') {
      // 5th/6th place match completed
      finalRankings = { ...finalRankings, fifth: winnerId, sixth: loserId };

    } else if (matchId === 'lb3') {
      // LB Round 3 completed, loser gets 4th place
      finalRankings = { ...finalRankings, fourth: loserId };

      // Create LB Round 4 (LB Final): B vs C
      const wb3Match = finalMatches.find(m => m.id === 'wb3');
      const wb3Loser = wb3Match!.player1Id === wb3Match!.winnerId ? wb3Match!.player2Id : wb3Match!.player1Id;

      finalMatches.push({
        id: 'lb4',
        player1Id: winnerId, // B (winner from B vs F)
        player2Id: wb3Loser, // C (loser from A vs C)
        bracket: 'loser',
        round: 4,
        matchNumber: 1,
        isBye: false
      });

    } else if (matchId === 'lb4') {
      // LB Round 4 (LB Final) completed, loser gets 3rd place
      finalRankings = { ...finalRankings, third: loserId };

      // Create Final: A vs B
      const wb3Winner = finalMatches.find(m => m.id === 'wb3')!.winnerId;

      finalMatches.push({
        id: 'final',
        player1Id: wb3Winner!, // A (winner from A vs C)
        player2Id: winnerId, // B (winner from B vs C)
        bracket: 'winner',
        round: 5,
        matchNumber: 1,
        isBye: false
      });

    } else if (matchId === 'final') {
      // Final completed
      if (winnerId === finalMatches.find(m => m.id === 'wb3')!.winnerId) {
        // A won, tournament complete
        finalRankings = { ...finalRankings, first: winnerId, second: loserId };
        finalTournamentComplete = true;
      } else {
        // B won, create Grand Final
        finalMatches.push({
          id: 'grandfinal',
          player1Id: finalMatches.find(m => m.id === 'wb3')!.winnerId!, // A
          player2Id: winnerId, // B
          bracket: 'winner',
          round: 6,
          matchNumber: 1,
          isBye: false
        });
      }

    } else if (matchId === 'grandfinal') {
      // Grand Final completed
      finalRankings = { ...finalRankings, first: winnerId, second: loserId };
      finalTournamentComplete = true;
    }

    setMatches(finalMatches);
    setRankings(finalRankings);
    setTournamentComplete(finalTournamentComplete);

    saveTournamentState(finalMatches, finalRankings, finalTournamentComplete);

    // Call parent's match result handler
    const matchForResult = matches.find(m => m.id === matchId);
    if (matchForResult) {
      const loserForResult = matchForResult.player1Id === winnerId ? matchForResult.player2Id : matchForResult.player1Id;
      onMatchResult(matchId, winnerId, loserForResult);
    }
    
    // Call parent's tournament complete handler if tournament is complete
    if (finalTournamentComplete && onTournamentComplete) {
      onTournamentComplete(finalRankings);
    }
  };

  const resetTournament = () => {
    clearTournamentState();
    initializeTournament();
    setSelectedWinner({});
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.name} ${player.surname}` : 'Unknown';
  };

  const getPlayerDetails = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const getBracketName = (bracket: string) => {
    switch (bracket) {
      case 'winner': return 'Winner Bracket';
      case 'loser': return 'Loser Bracket';
      case 'placement': return 'Placement';
      default: return bracket;
    }
  };

  const getMatchTitle = (match: Match) => {
    if (match.id === 'wb1-1') return 'WB Round 1';
    if (match.id === 'wb1-2') return 'WB Round 1';
    if (match.id === 'wb1-3') return 'WB Round 1';
    if (match.id === 'lb1') return 'LB Round 1';
    if (match.id === 'wb2-1') return 'WB Round 2';
    if (match.id === 'wb2-2') return 'WB Round 2';
    if (match.id === 'lb2-1') return 'LB Round 2';
    if (match.id === 'lb2-2') return 'LB Round 2';
    if (match.id === 'wb3') return 'WB Semifinal';
    if (match.id === 'place56') return '5th/6th Place';
    if (match.id === 'lb3') return 'LB Round 3';
    if (match.id === 'lb4') return 'LB Final';
    if (match.id === 'final') return 'Final';
    if (match.id === 'grandfinal') return 'Grand Final';
    return 'Match';
  };

  const renderMatch = (match: Match) => {
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
      />
    );
  };

  const renderCompletedMatches = () => {
    const completedMatches = matches.filter(m => m.winnerId);

    if (completedMatches.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-gray-500 text-lg mb-4">Henüz oynanmış maç yok</div>
          <div className="text-gray-400 text-sm">Maçlar tamamlandıkça burada görünecek</div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
          <h3 className="text-lg font-bold">Oynanmış Maçlar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Maç No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bracket</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sol Masa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sağ Masa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kazanan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kaybeden</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {completedMatches.map((match, index) => {
                const winnerName = getPlayerName(match.winnerId!);
                const loserId = match.player1Id === match.winnerId ? match.player2Id : match.player1Id;
                const loserName = getPlayerName(loserId);
                const player1Name = getPlayerName(match.player1Id);
                const player2Name = match.player2Id ? getPlayerName(match.player2Id) : '—';

                return (
                  <tr key={match.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{match.matchNumber}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${match.bracket === 'winner'
                          ? 'bg-green-100 text-green-800'
                          : match.bracket === 'placement'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                        {getBracketName(match.bracket)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{player1Name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{player2Name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">{winnerName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">{loserName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRankings = () => {
    const places = [
      { key: 'first', emoji: '🥇', place: '1.', bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500', textColor: 'text-white' },
      { key: 'second', emoji: '🥈', place: '2.', bgColor: 'bg-gradient-to-r from-gray-400 to-gray-500', textColor: 'text-white' },
      { key: 'third', emoji: '🥉', place: '3.', bgColor: 'bg-gradient-to-r from-orange-400 to-orange-500', textColor: 'text-white' },
      { key: 'fourth', emoji: '🏅', place: '4.', bgColor: 'bg-gradient-to-r from-blue-400 to-blue-500', textColor: 'text-white' },
      { key: 'fifth', emoji: '🎖️', place: '5.', bgColor: 'bg-gradient-to-r from-purple-400 to-purple-500', textColor: 'text-white' },
      { key: 'sixth', emoji: '🏆', place: '6.', bgColor: 'bg-gradient-to-r from-green-400 to-green-500', textColor: 'text-white' },
      { key: 'seventh', emoji: '🏵️', place: '7.', bgColor: 'bg-gradient-to-r from-red-400 to-red-500', textColor: 'text-white' }
    ];

    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4">
          <h3 className="text-lg font-bold">🏆 Turnuva Sıralaması</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {places.map(({ key, emoji, place, bgColor, textColor }) => {
              const playerId = rankings[key as keyof typeof rankings];
              if (!playerId) return null;

              return (
                <div key={key} className={`flex items-center ${bgColor} rounded-xl p-4 shadow-md`}>
                  <div className="text-2xl mr-4">{emoji}</div>
                  <div className="flex-1">
                    <div className={`font-bold text-lg ${textColor}`}>{place} Sıra</div>
                    <div className={`text-sm ${textColor} opacity-90`}>{getPlayerName(playerId)}</div>
                    {getPlayerDetails(playerId) && (
                      <div className={`text-xs ${textColor} opacity-75`}>
                        {getPlayerDetails(playerId)!.weight} kg
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const activeMatches = matches.filter(m => !m.winnerId);
  const completedMatches = matches.filter(m => m.winnerId);

  if (players.length !== 7) {
    return (
      <div className="p-4 text-center text-gray-600">
        Bu bileşen tam olarak 7 oyuncu için tasarlanmıştır.
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
        Double Elimination Tournament ({players.length} players)
          </h2>
      <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        {activeTab === 'active' && (
          <div>
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
                    <p className="text-green-700 text-lg mb-6">
                      {completedMatches.length} maç başarıyla tamamlandı. Sonuçları ve sıralamaları görmek için aşağıdaki butona tıklayın.
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                {activeMatches.map(renderMatch)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
        <CompletedMatchesTable matches={matches} players={players} getPlayerName={getPlayerName} />
        )}

        {activeTab === 'rankings' && (
        <RankingsTable rankings={rankings} players={players} getPlayerName={getPlayerName} />
        )}

        {/* Reset Button */}
        {!tournamentComplete && matches.length > 0 && (
          <div className="text-center mt-8">
            <button
              onClick={resetTournament}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🔄 Turnuvayı Sıfırla
            </button>
          </div>
        )}
    </div>
  );
};

export default DoubleElimination7; 