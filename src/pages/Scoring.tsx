import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrophyIcon, Cog6ToothIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import type { Player } from '../types';
import { PlayersStorage, type Column as PlayersColumn } from '../utils/playersStorage';
import { TournamentsStorage, type Tournament as StoredTournament } from '../utils/tournamentsStorage';
import { MatchesStorage, type Fixture } from '../utils/matchesStorage';
import { openScoringPreviewModal, generateScoringPDF } from '../utils/pdfGenerator';
import PDFSettingsShell from '../components/UI/PDFSettingsShell';
import PDFPreviewModal from '../components/UI/PDFPreviewModal';
import { DoubleEliminationRepository } from '../storage/DoubleEliminationRepository';

type PlacementKey = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh' | 'eighth';

interface PointsConfig extends Record<string, number> {
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

// Helper function to merge fixture with double elimination state
const mergeFixtureWithDEState = (fixture: Fixture): any => {
  try {
    const deRepo = new DoubleEliminationRepository<any>();
    const state = deRepo.getState(fixture.id);
    if (state && state.rankings && typeof state.rankings === 'object') {
      return { ...fixture, rankings: state.rankings };
    }
  } catch {}
  try {
    const legacy = window.localStorage.getItem(`double-elimination-fixture-${fixture.id}`);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed.rankings && typeof parsed.rankings === 'object') {
        return { ...fixture, rankings: parsed.rankings };
      }
    }
  } catch {}
  return fixture;
};

const Scoring: React.FC = () => {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersColumns, setPlayersColumns] = useState<PlayersColumn[]>([]);
  const [tournaments, setTournaments] = useState<StoredTournament[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);

  const [config, setConfig] = useState<ScoringConfig>({
    points: defaultPoints,
    groupBy: 'gender',
    selectedTournamentIds: [],
  });

  // Mobile tabs and UI helpers
  const [activeTab, setActiveTab] = useState<'selections' | 'summary' | 'details'>('selections');
  const [showAllSummary, setShowAllSummary] = useState(false);
  const [openTournamentIds, setOpenTournamentIds] = useState<Record<string, boolean>>({});

  // PDF Preview Modal States
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0);
  // Görünüm modu: sadece ayarlar, seçim+özet, seçim+detay
  const [viewMode, setViewMode] = useState<'settings' | 'selection+summary' | 'selection+details'>('selection+summary');
  
  const [isGroupByDropdownOpen, setIsGroupByDropdownOpen] = useState(false);
  const [isPDFSettingsOpen, setIsPDFSettingsOpen] = useState(false);
  const [pdfContentType, setPdfContentType] = useState<'tournaments' | 'both'>('both');
  const [isExporting, setIsExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  // Kullanıcının ilk sayfadaki satır sayısını belirlemesi için
  const [scoringFirstPageRows, setScoringFirstPageRows] = useState<number | ''>('');
  // Puanlama PDF başlık özelleştirme
  const [scoringHeaderTitle, setScoringHeaderTitle] = useState<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isGroupByDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.group-by-dropdown')) {
          setIsGroupByDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isGroupByDropdownOpen]);

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

  // Basit modda detay sekmesine geçildiyse özet sekmesine al
  useEffect(() => {
    // Görünüm modları sekmeye bağlı değil; yine de state tutarlılığı için ayarla
    if (viewMode === 'selection+summary' && activeTab !== 'summary') setActiveTab('summary');
    if (viewMode === 'selection+details' && activeTab !== 'details') setActiveTab('details');
  }, [viewMode]);

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
      if (f.status !== 'completed') continue;
      
      // Merge fixture with double elimination state to get rankings
      const mergedFixture = mergeFixtureWithDEState(f);
      if (!mergedFixture.rankings) continue;

      for (const key of placementOrder) {
        const playerId = (mergedFixture.rankings as any)[key] as string | undefined;
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
    // Allow grouping by any visible player column, but exclude fields not available in scoring
    const fromColumns = playersColumns.map(c => ({ id: c.id, name: c.name }));
    
    // Filter out fields that are not available as columns in scoring page
    const excludedFields = ['name', 'city', 'fullName', 'surname', 'weight', 'handPreference', 'birthday'];
    const filteredColumns = fromColumns.filter(col => !excludedFields.includes(col.id));
    
    // Include any custom fields present on players but not in columns, up to a small limit
    const extraIds = new Set<string>();
    for (const p of players) {
      Object.keys(p).forEach(k => {
        if (['id', 'name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city', 'fullName'].includes(k)) return;
        if (!filteredColumns.some(c => c.id === k)) extraIds.add(k);
      });
      if (extraIds.size > 8) break;
    }
    extraIds.forEach(id => filteredColumns.push({ id, name: id }));
    return filteredColumns;
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
  const scoringExtraInfo = useMemo(() => {
    const selectedIds = new Set(config.selectedTournamentIds);
    const includedTournaments = tournaments.filter(t => selectedIds.has(t.id));
    const tournamentNames = includedTournaments.map(t => t.name).filter(Boolean);
    const includedFixtures = fixtures.filter(f => selectedIds.has(f.tournamentId) && f.status === 'completed');
    
    // Clean fixture names for PDF - remove tournament name and hand preference
    const cleanFixtureName = (name: string) => {
      let cleanName = name;
      // Remove tournament name if present
      if (cleanName?.includes(' - ')) {
        cleanName = cleanName.split(' - ').slice(1).join(' - ');
      }
      // Remove hand preference
      if (cleanName?.includes('Sağ Kol -')) {
        cleanName = cleanName.replace('Sağ Kol -', '').trim();
      } else if (cleanName?.includes('Sol Kol -')) {
        cleanName = cleanName.replace('Sol Kol -', '').trim();
      }
      return cleanName;
    };
    
    const fixtureNames = includedFixtures.map(f => {
      const rawName = f.name || `${f.tournamentName || ''} - ${f.weightRangeName || ''}`;
      return cleanFixtureName(rawName);
    }).filter(Boolean);
    
    // Group fixtures by tournament
    const tournamentFixtures = includedTournaments.map(tournament => {
      const tournamentFixtures = includedFixtures.filter(f => f.tournamentId === tournament.id);
      return {
        tournamentName: tournament.name,
        fixtures: tournamentFixtures.map(f => {
          const rawName = f.name || `${f.weightRangeName || ''}`;
          return cleanFixtureName(rawName);
        }).filter(Boolean)
      };
    }).filter(tf => tf.fixtures.length > 0);
    
    return { tournamentNames, fixtureNames, tournamentFixtures };
  }, [tournaments, fixtures, config.selectedTournamentIds]);

  const handleOpenSettings = () => {
    if (aggregatedScores.length === 0) return;
    setIsPDFSettingsOpen(true);
  };
    
  const handleOpenPreviewFromSettings = () => {
    const groupFieldName = availableGroupFields.find(f => f.id === config.groupBy)?.name || config.groupBy;
    const { pages } = openScoringPreviewModal(aggregatedScores, groupFieldName, {
      includeTournamentNames: pdfContentType === 'tournaments' || pdfContentType === 'both',
      includeSelectedFixtures: pdfContentType === 'both',
      tournamentNames: scoringExtraInfo.tournamentNames,
      fixtureNames: scoringExtraInfo.fixtureNames,
      tournamentFixtures: scoringExtraInfo.tournamentFixtures,
      firstPageRows: typeof scoringFirstPageRows === 'number' && Number.isFinite(scoringFirstPageRows)
        ? Math.max(0, Math.min(40, Math.floor(scoringFirstPageRows)))
        : undefined,
      headerTitle: scoringHeaderTitle && scoringHeaderTitle.trim().length > 0 ? scoringHeaderTitle.trim() : undefined,
    });
    setIsPDFSettingsOpen(false);
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
      
      await generateScoringPDF(aggregatedScores, groupFieldName, (progress) => {
        setPdfProgress(progress);
      }, {
        includeTournamentNames: pdfContentType === 'tournaments' || pdfContentType === 'both',
        includeSelectedFixtures: pdfContentType === 'both',
        tournamentNames: scoringExtraInfo.tournamentNames,
        fixtureNames: scoringExtraInfo.fixtureNames,
        tournamentFixtures: scoringExtraInfo.tournamentFixtures,
        firstPageRows: typeof scoringFirstPageRows === 'number' && Number.isFinite(scoringFirstPageRows)
          ? Math.max(0, Math.min(40, Math.floor(scoringFirstPageRows)))
          : undefined,
        headerTitle: scoringHeaderTitle && scoringHeaderTitle.trim().length > 0 ? scoringHeaderTitle.trim() : undefined,
      });
      
      // Keep popup visible for a moment after completion
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
      
    } catch (error) {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">

        {/* Üst bar: 3 mod butonu */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-start">
          <button
            onClick={() => setViewMode('settings')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-lg border-2 font-semibold transition-all duration-200 ${viewMode === 'settings' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {t('scoring.pointsSettings')}
          </button>
          <button
            onClick={() => setViewMode('selection+summary')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-lg border-2 font-semibold transition-all duration-200 ${viewMode === 'selection+summary' ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {t('scoring.tournamentSelection')} + {t('scoring.totalPoints')}
          </button>
          <button
            onClick={() => setViewMode('selection+details')}
            className={`px-3 py-2 text-xs sm:text-sm rounded-lg border-2 font-semibold transition-all duration-200 ${viewMode === 'selection+details' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {t('scoring.tournamentSelection')} + {t('scoring.fixtureDetails')}
          </button>
        </div>

        {/* Mobil sekmeler kaldırıldı; görünüm butonları her boyutta aynı davranır */}

        <div className={`grid grid-cols-1 xl:grid-cols-1 gap-8`}>
          {/* Settings Panel */}
          <div className={`xl:col-span-1 max-h-[calc(100vh-4rem)] overflow-y-auto ${viewMode === 'settings' ? '' : 'hidden'}`}>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Cog6ToothIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('scoring.pointsSettings')}</h2>
              </div>

              {/* Points Configuration */}
              <div className="space-y-4 mb-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{t('scoring.placementPoints')}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {placementOrder.map((key, idx) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/50">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlacementColor(idx)} flex items-center justify-center text-white text-sm font-bold`}>
                        {getPlacementIcon(idx)}
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700">{t('scoring.placeLabel', { place: idx + 1 })}</label>
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
                        <span className="text-sm text-gray-500 font-medium">{t('scoring.pointsSuffix')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grouping Configuration */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('scoring.sortingCriteria')}</h3>
                </div>
                
                <div className="relative group-by-dropdown">
                  <button
                    onClick={() => setIsGroupByDropdownOpen(!isGroupByDropdownOpen)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-800 font-medium cursor-pointer hover:border-indigo-300 transition-all duration-200 flex items-center justify-between"
                  >
                    <span>{availableGroupFields.find(f => f.id === config.groupBy)?.name || config.groupBy}</span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isGroupByDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isGroupByDropdownOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-[9999] max-h-48 overflow-y-auto">
                      <div className="p-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">{t('scoring.selectSortingCriteria')}</div>
                        {availableGroupFields.map((field) => (
                          <button
                            key={field.id}
                            onClick={() => {
                              setConfig(prev => ({ ...prev, groupBy: field.id }));
                              setIsGroupByDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors duration-200 flex items-center gap-3 rounded-md ${
                              config.groupBy === field.id 
                                ? 'bg-indigo-100 text-indigo-700 font-semibold' 
                                : 'text-gray-700'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${config.groupBy === field.id ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                            <span className="flex-1 text-sm">{field.name}</span>
                            {config.groupBy === field.id && (
                              <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-indigo-700 font-medium">
                    <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('scoring.pointsWillBeAwardedByThisCriteria')}
                  </p>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => setConfig(prev => ({ ...prev, points: defaultPoints }))}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {t('scoring.loadDefaults')}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className={`xl:col-span-2 max-h-[calc(100vh-4rem)] overflow-y-auto space-y-6 ${viewMode === 'settings' ? 'hidden' : ''}`}> 
            {/* Tournament Selection */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('scoring.tournamentSelection')}</h2>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-600">
                  {t('scoring.tournamentsSelectedCount', { count: config.selectedTournamentIds.length })}
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, selectedTournamentIds: tournaments.map(t => t.id) }))}
                    className="px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center gap-2"
                    disabled={allSelected}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('scoring.selectAll')}
                  </button>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, selectedTournamentIds: [] }))}
                    className="px-3 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-sm hover:shadow-md flex items-center gap-2"
                    disabled={!anySelected}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t('scoring.clear')}
                  </button>
                </div>
              </div>

              {tournaments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrophyIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">{t('scoring.noTournaments')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournaments.map(tour => {
                    const isSelected = config.selectedTournamentIds.includes(tour.id);
                    return (
                      <label 
                        key={tour.id} 
                        className={`relative flex flex-col p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer group ${
                          isSelected 
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-100/50' 
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'
                          }`}>
                            {isSelected ? (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                            )}
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }`}>
                            {t('scoring.fixturesCount', { count: tour.weightRanges?.length ?? 0 })}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className={`font-semibold text-base transition-colors duration-200 ${
                            isSelected 
                              ? 'text-blue-900' 
                              : 'text-gray-900 group-hover:text-blue-800'
                          }`}>
                            {tour.name}
                          </h3>
                        </div>
                        
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTournament(tour.id)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Aggregated Scores (Summary) */}
            <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-4 sm:p-6 ${viewMode === 'selection+summary' ? '' : 'hidden'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('scoring.totalPoints')}</h2>
                </div>
                <div className="sm:ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-indigo-200 min-w-0">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-semibold text-indigo-700 truncate">
                      {t('scoring.sortingBy', { criteria: availableGroupFields.find(f => f.id === config.groupBy)?.name || config.groupBy })}
                    </span>
                  </div>
                  <button
                    onClick={handleOpenSettings}
                    disabled={aggregatedScores.length === 0}
                    className="px-3 py-2 text-xs sm:px-4 sm:py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center gap-2"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('scoring.createPDF')}</span>
                    <span className="sm:hidden">{t('tournamentCard.downloadPDF')}</span>
                  </button>
                </div>
              </div>

              {aggregatedScores.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ClockIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">{t('scoring.noScoresYet')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('scoring.noCompletedFixtures')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllSummary ? aggregatedScores : aggregatedScores.slice(0, 10)).map((row, index) => (
                    <div key={row.group} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200/50 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getPlacementColor(index)} flex items-center justify-center text-white text-sm font-bold`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg">{row.group === 'Unknown' ? t('scoring.unknown') : row.group}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{row.total}</div>
                        <div className="text-sm text-gray-500">{t('scoring.pointsSuffix')}</div>
                      </div>
                    </div>
                  ))}
                  {aggregatedScores.length > 10 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setShowAllSummary(!showAllSummary)}
                        className="px-4 py-2 text-sm font-semibold border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        {showAllSummary ? t('scoring.showLess') : t('scoring.showMore')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Per-tournament/fixture details (Details Tab) */}
            <div className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6 ${viewMode === 'selection+details' ? '' : 'hidden'}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <StarIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t('scoring.fixtureDetails')}</h2>
              </div>

              {selectedTournaments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircleIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm">{t('scoring.selectAtLeastOneTournament')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedTournaments.map(tour => {
                    const fs = tournamentIdToFixtures.get(tour.id) || [];
                    if (fs.length === 0) {
                      return (
                        <div key={tour.id} className="border border-gray-200/50 rounded-xl p-6 bg-gray-50/50">
                          <div className="font-semibold text-gray-900 text-lg mb-2">{tour.name}</div>
                          <div className="text-sm text-gray-600">{t('scoring.noFixturesForTournament')}</div>
                        </div>
                      );
                    }
                    const isOpen = openTournamentIds[tour.id] ?? false;
                    return (
                      <div key={tour.id} className="border border-gray-200/50 rounded-xl bg-gradient-to-br from-gray-50/50 to-white/50">
                        <button
                          className="w-full flex items-center justify-between px-6 py-4"
                          onClick={() => setOpenTournamentIds(prev => ({ ...prev, [tour.id]: !isOpen }))}
                        >
                          <div className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <TrophyIcon className="w-3 h-3 text-white" />
                          </div>
                          {tour.name}
                          </div>
                          <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {fs.map(f => {
                            // Merge fixture with double elimination state to get rankings
                            const mergedFixture = mergeFixtureWithDEState(f);
                            const completed = f.status === 'completed' && !!mergedFixture.rankings;
                            return (
                              <div key={f.id} className={`rounded-xl p-4 border-2 transition-all duration-200 ${
                                completed 
                                  ? 'border-green-300 bg-gradient-to-br from-green-50/50 to-white shadow-md' 
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="font-medium text-gray-900 truncate flex-1" title={f.name}>
                                    {(() => {
                                      let displayName = f.name?.includes(' - ') ? f.name.split(' - ').slice(1).join(' - ') : f.name;
                                      // Remove hand preference (Sağ Kol, Sol Kol) from the name
                                      if (displayName?.includes('Sağ Kol -')) {
                                        displayName = displayName.replace('Sağ Kol -', '').trim();
                                      } else if (displayName?.includes('Sol Kol -')) {
                                        displayName = displayName.replace('Sol Kol -', '').trim();
                                      }
                                      return displayName;
                                    })()}
                                  </div>
                                  <span className={`ml-2 text-xs px-3 py-1.5 rounded-full font-medium ${
                                    completed 
                                      ? 'bg-green-100 text-green-700 border border-green-200' 
                                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                                  }`}>
                                    {completed ? t('matches.completed') : t('matches.inProgress')}
                                  </span>
                                </div>
                                {completed ? (
                                  <div className="space-y-2">
                                    {placementOrder.map((pk, idx) => {
                                      const pid = (mergedFixture.rankings as any)[pk] as string | undefined;
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
                                    {t('scoring.resultsNotReady')}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PDFPreviewModal
        isOpen={isPDFPreviewModalOpen}
        pages={previewPages}
        currentPage={currentPreviewPage}
        onChangePage={(i) => setCurrentPreviewPage(i)}
        onClose={() => {
          setIsPDFPreviewModalOpen(false);
          setPreviewPages([]);
          setCurrentPreviewPage(0);
        }}
        onDownloadClick={handleExportPDF}
        onBackToSettings={() => {
          setIsPDFPreviewModalOpen(false);
          setIsPDFSettingsOpen(true);
        }}
        backToSettingsText={t('tournaments.pdfSettings')}
      />

      <PDFSettingsShell
        isOpen={isPDFSettingsOpen}
        onClose={() => setIsPDFSettingsOpen(false)}
        onOpenPreview={handleOpenPreviewFromSettings}
        customTitle={t('tournaments.pdfSettings')}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-900">{t('scoring.selectContentToShow')}</h4>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div
              className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                pdfContentType === 'tournaments'
                  ? 'bg-white sm:hover:border-green-500 sm:hover:shadow-md cursor-pointer border-green-500'
                  : 'bg-white sm:hover:border-green-400 sm:hover:shadow-md cursor-pointer border-gray-200'
              }`}
              onClick={() => setPdfContentType('tournaments')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{t('scoring.tournamentsOnly')}</h4>
                    <p className="text-sm text-gray-600">{t('scoring.tournamentsOnlyDesc')}</p>
                  </div>
                </div>
                {pdfContentType === 'tournaments' && (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">{t('scoring.selected')}</div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {t('scoring.tournamentsCount', { count: scoringExtraInfo.tournamentNames.length })}
              </div>
            </div>

            <div
              className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                pdfContentType === 'both'
                  ? 'bg-white sm:hover:border-green-500 sm:hover:shadow-md cursor-pointer border-green-500'
                  : 'bg-white sm:hover:border-green-400 sm:hover:shadow-md cursor-pointer border-gray-200'
              }`}
              onClick={() => setPdfContentType('both')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{t('scoring.tournamentsAndFixtures')}</h4>
                    <p className="text-sm text-gray-600">{t('scoring.tournamentsAndFixturesDesc')}</p>
                  </div>
                </div>
                {pdfContentType === 'both' && (
                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">{t('scoring.selected')}</div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {t('scoring.tournamentsCount', { count: scoringExtraInfo.tournamentNames.length })}, {t('scoring.fixturesCount', { count: scoringExtraInfo.fixtureNames.length })}
              </div>
            </div>
          </div>

          {/* Naming & layout section */}
          <div className="border-2 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
              <div className="text-sm font-bold text-gray-900">{t('scoring.pdfNamingSection')}</div>
            </div>

            {/* Custom header title setting */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t('scoring.customHeaderTitle')}</div>
                  <div className="text-xs text-gray-500">{t('scoring.customHeaderTitleDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={scoringHeaderTitle}
                  onChange={(e) => setScoringHeaderTitle(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  placeholder={t('scoring.pdfHeaderTitle') as string}
                />
              </div>
            </div>

            {/* First page rows setting */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">{t('scoring.firstPageRows')}</div>
                <div className="text-xs text-gray-500">{t('scoring.firstPageRowsDesc')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={40}
                value={scoringFirstPageRows === '' ? '' : scoringFirstPageRows}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') { setScoringFirstPageRows(''); return; }
                  const num = parseInt(v, 10);
                  if (Number.isFinite(num)) {
                    setScoringFirstPageRows(Math.max(0, Math.min(40, num)));
                  }
                }}
                className="w-28 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-semibold bg-white text-gray-900"
                placeholder="Oto"
              />
              <span className="text-xs text-gray-500">0-40</span>
            </div>
          </div>

        </div>
      </PDFSettingsShell>

      {/* PDF Download Progress Popup */}
      {isExporting && (
        <div className="fixed top-6 right-6 z-[10000] transition-all duration-500 ease-out animate-in slide-in-from-top-2 fade-in">
          <div className="bg-gradient-to-br from-white to-gray-50/95 backdrop-blur-xl border border-gray-200/50 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[240px] transform hover:scale-105 transition-transform duration-200">
            {/* Animated download icon */}
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="animate-bounce h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {/* Progress ring */}
              <div className="absolute -inset-0.5 rounded-lg">
                <div className="w-9 h-9 border-2 border-blue-200 rounded-lg animate-spin" style={{ animationDuration: '3s' }}>
                  <div className="w-full h-full border-t-2 border-blue-500 rounded-lg"></div>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-gray-800">{t('tournamentCard.downloadPDF')}</div>
                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">{pdfProgress}%</div>
              </div>
              
              {/* Enhanced progress bar */}
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out shadow-lg" 
                  style={{ width: `${pdfProgress}%` }}
                >
                  <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                </div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
              
              {/* Status text */}
              <div className="mt-1.5 text-xs text-gray-500 font-medium">
                {pdfProgress < 100 ? t('scoring.pdfCreating') : t('scoring.downloading')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scoring;


