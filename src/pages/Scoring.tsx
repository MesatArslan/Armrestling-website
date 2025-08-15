import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrophyIcon, Cog6ToothIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Player } from '../types';
import { PlayersStorage, type Column as PlayersColumn } from '../utils/playersStorage';
import { TournamentsStorage, type Tournament as StoredTournament } from '../utils/tournamentsStorage';
import { MatchesStorage, type Fixture } from '../utils/matchesStorage';
import { openScoringPreviewModal, generateScoringPDF } from '../utils/pdfGenerator';

type PlacementKey = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh' | 'eighth';

interface PointsConfig {
  first: number;
  second: number;
  third: number;
  fourth: number;
  fifth: number;
  sixth: number;
  seventh: number;
  eighth: number;
}

interface ScoringConfig {
  points: PointsConfig;
  groupBy: string; // player field id
  selectedTournamentIds: string[]; // tournaments from TournamentsStorage
}

const defaultPoints: PointsConfig = {
  first: 10,
  second: 7,
  third: 5,
  fourth: 3,
  fifth: 2,
  sixth: 1,
  seventh: 0,
  eighth: 0,
};

const placementOrder: PlacementKey[] = ['first','second','third','fourth','fifth','sixth','seventh','eighth'];

const SCORING_STORAGE_KEY = 'arm-wrestling-scoring-config';

const Scoring: React.FC = () => {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersColumns, setPlayersColumns] = useState<PlayersColumn[]>([]);
  const [tournaments, setTournaments] = useState<StoredTournament[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  const [config, setConfig] = useState<ScoringConfig>({
    points: defaultPoints,
    groupBy: 'city',
    selectedTournamentIds: [],
  });

  // PDF Preview Modal States
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  // Load initial data
  useEffect(() => {
    setPlayers(PlayersStorage.getPlayers());
    setPlayersColumns(PlayersStorage.getColumns());
    setTournaments(TournamentsStorage.getTournaments());
    setFixtures(MatchesStorage.getAllFixtures());

    try {
      const raw = localStorage.getItem(SCORING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ScoringConfig;
        setConfig(prev => ({ ...prev, ...parsed }));
      } else {
        // Default: select all tournaments by default when none stored
        setConfig(prev => ({ ...prev, selectedTournamentIds: TournamentsStorage.getTournaments().map(t => t.id) }));
      }
    } catch {}
  }, []);

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem(SCORING_STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }, [config]);

  const selectedTournaments = useMemo(() => {
    const setIds = new Set(config.selectedTournamentIds);
    return tournaments.filter(t => setIds.has(t.id));
  }, [tournaments, config.selectedTournamentIds]);

  // Build a map tournamentId -> fixtures for that tournament
  const tournamentIdToFixtures = useMemo(() => {
    const map = new Map<string, Fixture[]>();
    for (const f of fixtures) {
      if (!map.has(f.tournamentId)) map.set(f.tournamentId, []);
      map.get(f.tournamentId)!.push(f);
    }
    // Sort fixtures by createdAt for consistency
    for (const [k, list] of map.entries()) {
      map.set(
        k,
        [...list].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
      );
    }
    return map;
  }, [fixtures]);

  // Compute aggregated scores per group value
  const aggregatedScores = useMemo(() => {
    const scores = new Map<string, number>();
    const points = config.points;
    const groupField = config.groupBy;
    const selectedIds = new Set(config.selectedTournamentIds);
    const playerById = new Map(players.map(p => [p.id, p] as const));

    for (const f of fixtures) {
      if (!selectedIds.has(f.tournamentId)) continue;
      if (f.status !== 'completed' || !f.rankings) continue;

      for (const key of placementOrder) {
        const playerId = (f.rankings as any)[key] as string | undefined;
        if (!playerId) continue;
        const player = playerById.get(playerId);
        if (!player) continue;
        const rawGroupValue: any = (player as any)[groupField];
        const groupValue = (rawGroupValue === undefined || rawGroupValue === null || String(rawGroupValue).trim() === '')
          ? 'Unknown'
          : String(rawGroupValue);
        const earned = (points as any)[key] as number;
        scores.set(groupValue, (scores.get(groupValue) || 0) + (Number.isFinite(earned) ? earned : 0));
      }
    }

    const rows = Array.from(scores.entries()).map(([group, total]) => ({ group, total }));
    rows.sort((a, b) => b.total - a.total || a.group.localeCompare(b.group));
    return rows;
  }, [fixtures, config.points, config.groupBy, config.selectedTournamentIds, players]);

  const availableGroupFields = useMemo(() => {
    // Allow grouping by any visible player column plus fallback known fields if hidden
    const fromColumns = playersColumns.map(c => ({ id: c.id, name: c.name }));
    const ensureField = (id: string, name: string) => {
      if (!fromColumns.some(c => c.id === id)) {
        fromColumns.push({ id, name });
      }
    };
    ensureField('city', 'City');
    // Include any custom fields present on players but not in columns, up to a small limit
    const extraIds = new Set<string>();
    for (const p of players) {
      Object.keys(p).forEach(k => {
        if (['id', 'name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city'].includes(k)) return;
        if (!fromColumns.some(c => c.id === k)) extraIds.add(k);
      });
      if (extraIds.size > 8) break;
    }
    extraIds.forEach(id => fromColumns.push({ id, name: id }));
    return fromColumns;
  }, [playersColumns, players]);

  const getPlayerName = (id?: string) => {
    if (!id) return '—';
    const p = players.find(pp => pp.id === id);
    if (!p) return '—';
    return `${p.name || ''} ${p.surname || ''}`.trim() || p.id;
  };

  const handleToggleTournament = (tid: string) => {
    setConfig(prev => {
      const set = new Set(prev.selectedTournamentIds);
      if (set.has(tid)) set.delete(tid); else set.add(tid);
      return { ...prev, selectedTournamentIds: Array.from(set) };
    });
  };

  const allSelected = config.selectedTournamentIds.length === tournaments.length && tournaments.length > 0;
  const anySelected = config.selectedTournamentIds.length > 0;

  const getPlacementIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      case 3: return '🏅';
      case 4: return '🎖️';
      case 5: return '6️⃣';
      case 6: return '7️⃣';
      case 7: return '8️⃣';
      default: return `${index + 1}.`;
    }
  };

  const getPlacementColor = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-400 to-yellow-600';
      case 1: return 'from-gray-400 to-gray-600';
      case 2: return 'from-orange-400 to-orange-600';
      case 3: return 'from-blue-400 to-blue-600';
      case 4: return 'from-purple-400 to-purple-600';
      case 5: return 'from-pink-400 to-pink-600';
      case 6: return 'from-green-400 to-green-600';
      case 7: return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  // PDF Functions
  const handleShowPDFPreview = () => {
    if (aggregatedScores.length === 0) return;
    
    const groupFieldName = availableGroupFields.find(f => f.id === config.groupBy)?.name || config.groupBy;
    const { pages } = openScoringPreviewModal(aggregatedScores, config, groupFieldName);
    
    setPreviewPages(pages);
    setCurrentPreviewPage(0);
    setIsPDFPreviewModalOpen(true);
  };

  const handleExportPDF = async () => {
    if (aggregatedScores.length === 0) return;
    
    try {
      setIsExporting(true);
      setPdfProgress(0);
      
      const groupFieldName = availableGroupFields.find(f => f.id === config.groupBy)?.name || config.groupBy;
      
      await generateScoringPDF(
        aggregatedScores,
        config,
        groupFieldName,
        (p) => setPdfProgress(p)
      );
      
      // Show success message
      alert(t('scoring.pdfSuccessMessage', {
        fileSize: 'PDF',
        totalPages: Math.ceil(aggregatedScores.length / 18)
      }));
      
    } catch (error) {
      alert(t('scoring.pdfErrorMessage'));
    } finally {
      setIsExporting(false);
      setPdfProgress(0);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <TrophyIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Puanlama Sistemi</h1>
          <p className="text-lg text-gray-600">Turnuva sonuçlarına göre puan hesaplama ve sıralama</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="xl:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Cog6ToothIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Puan Ayarları</h2>
              </div>

              {/* Points Configuration */}
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sıralama Puanları</h3>
                <div className="grid grid-cols-1 gap-3">
                  {placementOrder.map((key, idx) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/50">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlacementColor(idx)} flex items-center justify-center text-white text-sm font-bold`}>
                        {getPlacementIcon(idx)}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">{idx + 1}. sıraya</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={(config.points as any)[key] === 0 ? '' : (config.points as any)[key] || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value || '0', 10);
                            setConfig(prev => ({ ...prev, points: { ...prev.points, [key]: Number.isFinite(val) ? val : 0 } }));
                          }}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-semibold bg-white text-gray-900"
                          min="0"
                        />
                        <span className="text-sm text-gray-500 font-medium">puan</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grouping Configuration */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Sıralama Kriteri</h3>
                <select
                  value={config.groupBy}
                  onChange={(e) => setConfig(prev => ({ ...prev, groupBy: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 font-medium"
                >
                  {availableGroupFields.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Oyuncu kaydındaki seçilen kolona göre toplanır (örn. şehir, kulüp).</p>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => setConfig(prev => ({ ...prev, points: defaultPoints }))}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Varsayılan Puanları Yükle
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Tournament Selection */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Turnuva Seçimi</h2>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">{config.selectedTournamentIds.length}</span> turnuva seçildi
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, selectedTournamentIds: tournaments.map(t => t.id) }))}
                    className="px-4 py-2 text-sm rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-all duration-200 font-medium"
                    disabled={allSelected}
                  >
                    Hepsini Seç
                  </button>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, selectedTournamentIds: [] }))}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-all duration-200 font-medium"
                    disabled={!anySelected}
                  >
                    Temizle
                  </button>
                </div>
              </div>

              {tournaments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrophyIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">Henüz turnuva yok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tournaments.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={config.selectedTournamentIds.includes(t.id)}
                        onChange={() => handleToggleTournament(t.id)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {t.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t.weightRanges.length} fikstür
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Aggregated Scores */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Toplam Puanlar</h2>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {config.groupBy}
                  </span>
                  <button
                    onClick={handleShowPDFPreview}
                    disabled={aggregatedScores.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm flex items-center gap-2"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    {t('scoring.createPDF')}
                  </button>
                </div>
              </div>

              {aggregatedScores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ClockIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">Henüz puan hesaplanamadı.</p>
                  <p className="text-xs text-gray-400 mt-1">Tamamlanan fikstür bulunamadı.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {aggregatedScores.map((row, index) => (
                    <div key={row.group} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200/50 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlacementColor(index)} flex items-center justify-center text-white text-sm font-bold`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">{row.group}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{row.total}</div>
                        <div className="text-sm text-gray-500">puan</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Per-tournament/fixture details */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <StarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Fikstür Detayları</h2>
              </div>

              {selectedTournaments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircleIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">Lütfen en az bir turnuva seçin.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedTournaments.map(t => {
                    const fs = tournamentIdToFixtures.get(t.id) || [];
                    if (fs.length === 0) {
                      return (
                        <div key={t.id} className="border border-gray-200/50 rounded-xl p-6 bg-gray-50/50">
                          <div className="font-semibold text-gray-900 text-lg mb-2">{t.name}</div>
                          <div className="text-sm text-gray-600">Bu turnuvaya ait fikstür bulunamadı.</div>
                        </div>
                      );
                    }
                    return (
                      <div key={t.id} className="border border-gray-200/50 rounded-xl p-6 bg-gradient-to-br from-gray-50/50 to-white/50">
                        <div className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <TrophyIcon className="w-3 h-3 text-white" />
                          </div>
                          {t.name}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {fs.map(f => {
                            const completed = f.status === 'completed' && !!f.rankings;
                            return (
                              <div key={f.id} className={`rounded-xl p-4 border-2 transition-all duration-200 ${
                                completed 
                                  ? 'border-green-300 bg-gradient-to-br from-green-50/50 to-white shadow-md' 
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium text-gray-900 truncate flex-1" title={f.name}>
                                    {f.name}
                                  </div>
                                  <span className={`ml-2 text-xs px-3 py-1.5 rounded-full font-medium ${
                                    completed 
                                      ? 'bg-green-100 text-green-700 border border-green-200' 
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}>
                                    {completed ? 'Tamamlandı' : 'Devam Ediyor'}
                                  </span>
                                </div>
                                {completed ? (
                                  <div className="space-y-2">
                                    {placementOrder.map((pk, idx) => {
                                      const pid = (f.rankings as any)[pk] as string | undefined;
                                      if (!pid) return null;
                                      const pts = (config.points as any)[pk] as number;
                                      return (
                                        <div key={pk} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-2 text-sm">
                                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${getPlacementColor(idx)} flex items-center justify-center text-white text-xs font-bold`}>
                                              {getPlacementIcon(idx)}
                                            </div>
                                            <span className="text-gray-700 font-medium">{getPlayerName(pid)}</span>
                                          </div>
                                          <div className="text-gray-900 font-bold text-lg">{Number.isFinite(pts) ? pts : 0}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-600 text-center py-4">
                                    <ClockIcon className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                    Sonuçlar henüz oluşmadı
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {isPDFPreviewModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999] overflow-hidden"
          onClick={() => {
            setIsPDFPreviewModalOpen(false);
            setPreviewPages([]);
            setCurrentPreviewPage(0);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('scoring.pdfPreview')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-xs sm:text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {pdfProgress}%
                    </div>
                  ) : (
                    t('scoring.downloadPDF')
                  )}
                </button>
                <button
                  onClick={() => setIsPDFPreviewModalOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-8 rounded-xl border-2 border-dashed border-gray-300">
              {/* Page Navigation */}
              {previewPages.length > 1 && (
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 mb-4 rounded-t-lg">
                  <div className="flex justify-center items-center gap-4">
                    <button
                      onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                      disabled={currentPreviewPage === 0}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                    >
                      ← {t('scoring.previousPage')}
                    </button>
                    <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-full">
                      {t('scoring.page')} {currentPreviewPage + 1} / {previewPages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPreviewPage(Math.min(previewPages.length - 1, currentPreviewPage + 1))}
                      disabled={currentPreviewPage === previewPages.length - 1}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                    >
                      {t('scoring.nextPage')} →
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: previewPages[currentPreviewPage] }} />
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('scoring.previewDescription')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scoring;


