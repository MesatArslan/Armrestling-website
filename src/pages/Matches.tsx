import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Player as UIPlayer } from '../types';
import type { Fixture, Tournament, WeightRange } from '../storage/schemas';
import DeleteConfirmationModal from '../components/UI/DeleteConfirmationModal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ActiveFixturesNav from '../components/UI/ActiveFixturesNav';
import { useMatches } from '../hooks/useMatches';
import { MatchesStorage } from '../utils/matchesStorage';
import { TournamentsStorage } from '../utils/tournamentsStorage';
import { openFixturePreviewModal, generateFixturePDF } from '../utils/pdfGenerator';
import { PlayersStorage, defaultColumns } from '../utils/playersStorage';
import PDFPreviewModal from '../components/UI/PDFPreviewModal';
import PDFSettingsShell from '../components/UI/PDFSettingsShell';


// Import all double elimination components
import {
  DoubleElimination1,
  DoubleElimination2,
  DoubleElimination3,
  DoubleElimination4,
  DoubleElimination5,
  DoubleElimination6,
  DoubleElimination7,
  DoubleElimination8,
  DoubleElimination9_11,
  DoubleElimination12_16,
  DoubleElimination17_23,
  DoubleElimination24_32,
  DoubleElimination33_47,
  DoubleElimination48_64,
  DoubleElimination65_95,
  DoubleElimination96_128,
  DoubleElimination129_191,
  DoubleElimination192_256,
  DoubleElimination257_383,
  DoubleElimination384_512,
} from '../components/double elimination';

const Matches = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const processedSearchRef = useRef<string | null>(null);
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const { fixtureIds, fixtures: fixturesMap, activeFixtureId, isLoading, upsertFixture, removeFixture, setActiveFixtureId, reorderFixtures } = useMatches();
  const fixtures: Fixture[] = fixtureIds.map(id => fixturesMap[id]).filter(Boolean) as Fixture[];
  const activeFixture: Fixture | null = activeFixtureId ? (fixturesMap[activeFixtureId] as Fixture) : null;
  const [desiredTab, setDesiredTab] = useState<'active' | 'completed' | 'rankings' | null>(null);
  // Matches page tournament filter state (derived from active fixtures)
  const [selectedTournamentIdForMatches, setSelectedTournamentIdForMatches] = useState<string | null>(null);
  const tournamentScrollRef = useRef<HTMLDivElement | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    fixtureId: string | null;
    fixtureName: string;
  }>({
    isOpen: false,
    fixtureId: null,
    fixtureName: ''
  });

  // PDF modal states for Matches page
  const [isMatchPDFModalOpen, setIsMatchPDFModalOpen] = useState(false);
  const [includeRankingsForPDF, setIncludeRankingsForPDF] = useState<boolean>(true);
  const [includeCompletedForPDF, setIncludeCompletedForPDF] = useState<boolean>(true);
  const [selectedPlayerColumnsForPDF, setSelectedPlayerColumnsForPDF] = useState<string[]>(['name', 'surname', 'weight']);
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const hideProgressTimer = useRef<number | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const [, setPreviewLeftPad] = useState<number>(0);

  // Import/Export modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate fixture confirmation states
  const [duplicateFixtureModal, setDuplicateFixtureModal] = useState<{
    isOpen: boolean;
    importData: any;
    existingFixture: any;
    processedPlayers: any[];
    addedPlayersCount: number;
  }>({
    isOpen: false,
    importData: null,
    existingFixture: null,
    processedPlayers: [],
    addedPlayersCount: 0
  });

  // Use ref to track current fixtures to avoid dependency issues
  const fixturesRef = useRef<Fixture[]>([]);
  fixturesRef.current = fixtures;

  // Load players on mount
  useEffect(() => {
    try {
      const loadedPlayers = PlayersStorage.getPlayers();
      setPlayers(loadedPlayers);
    } catch { }
  }, []);
  // Handle wheel and gesture zoom inside Matches PDF preview (pointer-anchored like Tournaments)
  useEffect(() => {
    const el = previewContainerRef.current as any;
    if (!el || !isPDFPreviewModalOpen) return;

    const clamp = (v: number) => Math.min(2, Math.max(0.5, v));

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const pointerOffsetX = e.clientX - rect.left;
        const pointerOffsetY = e.clientY - rect.top;
        const oldZoom = previewZoom;
        const step = 0.1;
        const nextZoom = clamp(
          Math.round(((e.deltaY < 0 ? oldZoom + step : oldZoom - step)) * 10) / 10
        );
        if (nextZoom === oldZoom) return;
        const ratio = nextZoom / oldZoom;
        const newScrollLeft = (el.scrollLeft + pointerOffsetX) * ratio - pointerOffsetX;
        const newScrollTop = (el.scrollTop + pointerOffsetY) * ratio - pointerOffsetY;
        setPreviewZoom(nextZoom);
        requestAnimationFrame(() => {
          el.scrollLeft = newScrollLeft;
          el.scrollTop = newScrollTop;
        });
      }
    };

    let baseZoom = previewZoom;
    const onGestureStart = (e: any) => { e.preventDefault(); baseZoom = previewZoom; };
    const onGestureChange = (e: any) => { e.preventDefault(); setPreviewZoom(() => clamp(baseZoom * (e.scale || 1))); };

    el.addEventListener('wheel', onWheel as any, { passive: false } as any);
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false } as any);
    el.addEventListener('gesturechange', onGestureChange as any, { passive: false } as any);
    return () => {
      el.removeEventListener('wheel', onWheel as any);
      el.removeEventListener('gesturestart', onGestureStart as any);
      el.removeEventListener('gesturechange', onGestureChange as any);
    };
  }, [previewZoom, isPDFPreviewModalOpen]);

  // Compute dynamic left spacer to center when content narrower (like Tournaments)
  useEffect(() => {
    if (!isPDFPreviewModalOpen) return;
    const el = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!el || !content) return;
    requestAnimationFrame(() => {
      const scaledWidth = content.offsetWidth * previewZoom;
      const pad = Math.max(0, Math.floor((el.clientWidth - scaledWidth) / 2));
      setPreviewLeftPad(pad);
      if (pad > 0) {
        el.scrollLeft = 0;
      }
    });
  }, [isPDFPreviewModalOpen, currentPreviewPage, previewZoom]);

  // Load player columns for PDF selection (excluding name and surname)
  useEffect(() => {
    try {
      const columns = PlayersStorage.getColumns();
      const visibleColumns = columns.filter(col => col.visible && col.id !== 'name' && col.id !== 'surname');
      const visibleColumnIds = visibleColumns.map(col => col.id);
      setSelectedPlayerColumnsForPDF(visibleColumnIds);
    } catch { }
  }, []);

  // Handle URL parameters for fixture selection and tab switching (process once per search change)
  useEffect(() => {
    if (isLoading || fixtures.length === 0) return;
    const currentSearch = location.search || '';
    if (!currentSearch || processedSearchRef.current === currentSearch) return;

    const tab = searchParams.get('tab') as 'active' | 'completed' | 'rankings' | null;
    const fixtureId = searchParams.get('fixture');

    if (tab) setDesiredTab(tab);
    if (fixtureId) setActiveFixtureId(fixtureId);

    processedSearchRef.current = currentSearch;
    // Clear URL parameters via router to prevent re-processing
    navigate({ pathname: location.pathname }, { replace: true });
  }, [isLoading, fixtures.length, location.search]);

  // Ensure an active fixture exists when tournament filter changes
  useEffect(() => {
    if (isLoading) return;
    if (!selectedTournamentIdForMatches) return;
    const filtered = fixtures.filter(f => f.tournamentId === selectedTournamentIdForMatches);
    if (filtered.length === 0) return;
    // If current active fixture is not in selected tournament, switch to first
    if (!activeFixture || activeFixture.tournamentId !== selectedTournamentIdForMatches) {
      setActiveFixtureId(filtered[0].id);
    }
  }, [selectedTournamentIdForMatches, fixtures, isLoading, activeFixture, setActiveFixtureId]);

  // Save fixtures whenever they change
  useEffect(() => {
    if (!isLoading) {
      // Read saved tab state from repo and persist
      fixtures.forEach(fixture => {
        const current = fixturesMap[fixture.id];
        const activeTab = current?.activeTab;
        if (activeTab && fixture.activeTab !== activeTab) upsertFixture({ ...fixture, activeTab });
      });
    }
  }, [fixtures, activeFixture, isLoading, upsertFixture]);

  // Handle tournament start from Tournaments page
  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        tournament: Tournament;
        weightRange: WeightRange;
      };

      // Check if fixture already exists for this tournament and weight range
      const existingFixture = fixturesRef.current.find(f =>
        f.tournamentId === state.tournament.id &&
        f.weightRangeId === state.weightRange.id
      );

      if (existingFixture) {
        setActiveFixtureId(existingFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        navigate({ pathname: location.pathname }, { replace: true, state: null });
        return;
      }

      // Create new fixture only if it doesn't exist
      const eligiblePlayers = players.filter(player => {
        const withinWeightRange = player.weight >= state.weightRange.min && player.weight <= state.weightRange.max;
        const notExcluded = !state.weightRange.excludedPlayerIds?.includes(player.id);
        const genderMatch = !state.tournament.genderFilter || player.gender === state.tournament.genderFilter;
        const handMatch = !state.tournament.handPreferenceFilter ||
          player.handPreference === state.tournament.handPreferenceFilter ||
          player.handPreference === 'both';
        let birthYearMatch = true;
        if (player.birthday && (state.tournament.birthYearMin || state.tournament.birthYearMax)) {
          const birthYear = new Date(player.birthday).getFullYear();
          if (state.tournament.birthYearMin && birthYear < state.tournament.birthYearMin) {
            birthYearMatch = false;
          }
          if (state.tournament.birthYearMax && birthYear > state.tournament.birthYearMax) {
            birthYearMatch = false;
          }
        }
        return withinWeightRange && notExcluded && genderMatch && handMatch && birthYearMatch;
      });

      if (eligiblePlayers.length > 0) {
        const existingForTournament = fixtures.filter(f => f.tournamentId === state.tournament.id);
        const fixtureNumber = existingForTournament.length + 1;
        const weightRangeName = state.weightRange.name || `${state.weightRange.min}-${state.weightRange.max} kg`;
        const now = new Date().toISOString();
        
        // Sadece görünür sütunları al
        const visibleColumns = PlayersStorage.getColumns().filter(col => col.visible);
        const visibleColumnIds = visibleColumns.map(col => col.id);
        
        const newFixture = {
          id: `${state.tournament.id}-${state.weightRange.id}-${fixtureNumber}`,
          name: `${state.tournament.name} - ${weightRangeName}`,
          tournamentId: state.tournament.id,
          tournamentName: state.tournament.name,
          weightRangeId: state.weightRange.id,
          weightRangeName,
          weightRange: { min: state.weightRange.min, max: state.weightRange.max },
          players: eligiblePlayers.map(p => {
            const player: any = {
              id: p.id, // id her zaman gerekli
              opponents: [] // opponents her zaman gerekli
            };
            
            // Sadece görünür sütunları kopyala
            visibleColumnIds.forEach(columnId => {
              if (p.hasOwnProperty(columnId)) {
                player[columnId] = p[columnId];
              }
            });
            
            return player;
          }),
          playerCount: eligiblePlayers.length,
          status: 'active' as const,
          createdAt: now,
          lastUpdated: now,
          activeTab: 'active' as const,
        };
        upsertFixture(newFixture);
        setActiveFixtureId(newFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        navigate({ pathname: location.pathname }, { replace: true, state: null });
      }
    }
  }, [location.state, players, upsertFixture, setActiveFixtureId, navigate, location.pathname]);

  const handleFixtureSelect = (fixtureId: string) => {
    setActiveFixtureId(fixtureId);
    setDesiredTab(null);
  };

  const handleFixtureClose = (fixtureId: string, fixtureName: string) => {
    setDeleteModal({
      isOpen: true,
      fixtureId,
      fixtureName
    });
  };

  const confirmDeleteFixture = () => {
    if (!deleteModal.fixtureId) return;

    removeFixture(deleteModal.fixtureId);

    // If this was the active fixture, clear it
    if (activeFixture?.id === deleteModal.fixtureId) setActiveFixtureId(null);
  };

  const handleMatchResult = () => {
    if (!activeFixture) return;

    // Update fixture timestamp only
    const next = {
      ...activeFixture,
      lastUpdated: new Date().toISOString(),
      activeTab: MatchesStorage.getFixtureActiveTab(activeFixture.id),
    };
    upsertFixture(next);
  };

  const handleTournamentComplete = () => {
    if (!activeFixture) return;

    // Read latest fixture to avoid overwriting recent opponents updates
    const latest = MatchesStorage.getFixtureById(activeFixture.id) as Fixture | null;
    const base = latest || activeFixture;

    const updatedFixture = {
      ...base,
      status: 'completed' as const,
      // Rankings are already saved in double elimination storage, no need to duplicate here
      completedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      activeTab: MatchesStorage.getFixtureActiveTab(activeFixture.id) // activeTab'ı localStorage'dan oku
    };

    upsertFixture(updatedFixture);
  };

  // Handle fixture export
  const handleExportFixture = async () => {
    if (!activeFixture) return;
    
    try {
      // Simple export logic inline
      const fixture = activeFixture;
      const tournaments = TournamentsStorage.getTournaments();
      const tournament = tournaments.find(t => t.id === fixture.tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const weightRange = tournament.weightRanges.find(wr => wr.id === fixture.weightRangeId);
      if (!weightRange) {
        throw new Error('Weight range not found');
      }

      // Get double elimination data
      let doubleEliminationData: any = null;
      try {
        // Check localStorage for double elimination data
        const deKeys = Object.keys(localStorage).filter(key => key.includes(`double-elimination-fixture-${fixture.id}`));
        if (deKeys.length > 0) {
          doubleEliminationData = {} as any;
          deKeys.forEach(key => {
            doubleEliminationData[key] = JSON.parse(localStorage.getItem(key) || '{}');
          });
        }
        
        // Also check the new repository format
        try {
          const { DoubleEliminationRepository } = await import('../storage/DoubleEliminationRepository');
          const deRepo = new DoubleEliminationRepository();
          const repoData = deRepo.getState(fixture.id);
          if (repoData) {
            if (!doubleEliminationData) doubleEliminationData = {} as any;
            (doubleEliminationData as any).repositoryData = repoData;
          }
        } catch (repoError) {
          console.warn('Could not load double elimination repository data:', repoError);
        }
      } catch (error) {
        console.warn('Could not load double elimination data:', error);
      }

      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        fixture,
        tournament,
        weightRange,
        doubleEliminationData
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      // Use fixture name as filename (consistent with File Management), sanitize unsafe characters
      const safeName = (fixture.name || 'fixture')
        .toString()
        .trim()
        .replace(/[\/:*?"<>|]+/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 120)
        .trim();
      const exportFileDefaultName = `${safeName || 'fixture'}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Export failed:', error);
      // Could add error toast here
    }
  };

  // Handle fixture import
  const handleImportFixture = async () => {
    const filesToProcess: File[] = importFiles.length > 0 ? importFiles : (importFile ? [importFile] : []);
    if (filesToProcess.length === 0) return;

    setIsImporting(true);
    setImportMessage(null);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      for (const file of filesToProcess) {
        const fileContent = await file.text();
      
      // First check if it's valid JSON
      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (jsonError) {
        console.error('JSON parse hatası:', jsonError);
        throw new Error('Dosya geçerli bir JSON formatında değil. Lütfen doğru fixtür dosyasını seçtiğinizden emin olun.');
      }

      // Check if this is a pending fixture (new format)
      // Normalize to a list of import entries (bundle aware)
      const entries: any[] = [];
      if (importData && importData.bundle && Array.isArray(importData.fixtures)) {
        for (const raw of importData.fixtures) {
          if (raw && raw.fixture) {
            entries.push(raw);
          } else if (raw && raw.id && raw.name && raw.players) {
            entries.push({ fixture: raw });
          } else if (raw && raw.version && raw.fixture) {
            entries.push(raw);
          }
        }
      } else if (importData && importData.id && importData.name && importData.players) {
        entries.push({ fixture: importData });
      } else {
        entries.push(importData);
      }

      for (const entry of entries) {
        let addedPlayersCount = 0;
        const isPendingFixture = entry.isPending && entry.fixture && entry.readyToStart;
      
      if (isPendingFixture) {
        // Başlamayı bekleyen fikstür formatı
        if (!entry.fixture.id || !entry.fixture.name || !entry.fixture.players) {
          throw new Error('Başlamayı bekleyen fikstür bilgileri eksik veya bozuk (id, name veya players eksik).');
        }
      } else {
        // Normal fikstür formatı (eski format)
        if (!entry.version) {
          // Check if this might be an old format file and try to handle it
          if (entry.fixture && entry.tournament && entry.weightRange) {
            entry.version = '1.0.0'; // Add missing version
          } else {
            // Allow raw fixture objects without tournament data
            if (!(entry && entry.fixture && entry.fixture.id && entry.fixture.name && entry.fixture.players)) {
              throw new Error('Fixtür dosyası tanınamadı. Geçerli bir fixtür yapısı bulunamadı.');
            }
          }
        }
        
        if (!entry.fixture) {
          throw new Error('Fixtür dosyasında fixture bilgisi eksik. Bu geçerli bir fixtür dosyası değil.');
        }
        
        // tournament/weightRange may be missing for raw fixtures; skip strict check

        // Additional validation for critical fixture fields
        if (!entry.fixture.id || !entry.fixture.name || !entry.fixture.players) {
          throw new Error('Fixtür bilgileri eksik veya bozuk (id, name veya players eksik).');
        }
      }

      // İçe aktarılan veri yapısı doğrulandı

      // Turnuva işleme: normal export bilgisi varsa onu kullan; yoksa fixtür üzerindeki meta ile oluştur
      try {
        const existingTournaments = TournamentsStorage.getTournaments();
        const tournamentId = entry.tournament?.id || entry.fixture?.tournamentId;
        const tournamentName = entry.tournament?.name || entry.fixture?.tournamentName || 'Turnuva';
        const birthYearMin = entry.tournament?.birthYearMin ?? null;
        const birthYearMax = entry.tournament?.birthYearMax ?? null;
        const genderFilter = entry.tournament?.genderFilter ?? null;
        const handPreferenceFilter = entry.tournament?.handPreferenceFilter ?? null;
        const weightRangeId = entry.weightRange?.id || entry.fixture?.weightRangeId;
        const weightRangeName = entry.weightRange?.name || entry.fixture?.weightRangeName || '';
        const weightRangeMin = entry.weightRange?.min ?? entry.fixture?.weightRange?.min;
        const weightRangeMax = entry.weightRange?.max ?? entry.fixture?.weightRange?.max;

        if (tournamentId && weightRangeId) {
          let tournament = existingTournaments.find(t => t.id === tournamentId);
          if (!tournament) {
            const newTournament = {
              id: tournamentId,
              name: tournamentName,
              weightRanges: [
                {
                  id: weightRangeId,
                  name: weightRangeName,
                  min: typeof weightRangeMin === 'number' ? weightRangeMin : 0,
                  max: typeof weightRangeMax === 'number' ? weightRangeMax : 0,
                  excludedPlayerIds: [] as string[],
                },
              ],
              isExpanded: false,
              genderFilter,
              handPreferenceFilter,
              birthYearMin,
              birthYearMax,
            };
            const updatedTournaments = [...existingTournaments, newTournament];
            TournamentsStorage.saveTournaments(updatedTournaments);
          } else {
            const hasWR = tournament.weightRanges.some((wr: any) => wr.id === weightRangeId);
            if (!hasWR) {
              tournament.weightRanges.push({
                id: weightRangeId,
                name: weightRangeName,
                min: typeof weightRangeMin === 'number' ? weightRangeMin : 0,
                max: typeof weightRangeMax === 'number' ? weightRangeMax : 0,
                excludedPlayerIds: [] as string[],
              });
              const updatedTournaments = existingTournaments.map(t => (t.id === tournament!.id ? tournament! : t));
              TournamentsStorage.saveTournaments(updatedTournaments);
            }
            // Update tournament bounds if provided
            let changed = false;
            if (birthYearMin !== null && tournament.birthYearMin !== birthYearMin) { tournament.birthYearMin = birthYearMin; changed = true; }
            if (birthYearMax !== null && tournament.birthYearMax !== birthYearMax) { tournament.birthYearMax = birthYearMax; changed = true; }
            if (genderFilter !== null && tournament.genderFilter !== genderFilter) { tournament.genderFilter = genderFilter; changed = true; }
            if (handPreferenceFilter !== null && tournament.handPreferenceFilter !== handPreferenceFilter) { tournament.handPreferenceFilter = handPreferenceFilter; changed = true; }
            if (changed) {
              const updatedTournaments2 = existingTournaments.map(t => (t.id === tournament!.id ? tournament! : t));
              TournamentsStorage.saveTournaments(updatedTournaments2);
            }
          }
        }
      } catch {}

      // Process players first
      const processedPlayers = entry.fixture.players.map((p: any) => ({
        id: p.id,
        name: p.name || '',
        surname: p.surname || '',
        weight: p.weight || 0,
        gender: (p.gender || 'male') as 'male' | 'female',
        handPreference: (p.handPreference || 'right') as 'left' | 'right' | 'both',
        birthday: p.birthday,
        city: p.city,
        opponents: p.opponents || []
      }));

      const existingFixture = MatchesStorage.getFixtureById(entry.fixture.id);
      if (existingFixture) {
        // Çoklu içe aktarmada, çakışanları atla (tek dosyada modal gösterilmeye devam)
        if (filesToProcess.length === 1) {
          setDuplicateFixtureModal({
            isOpen: true,
            importData: entry,
            existingFixture,
            processedPlayers,
            addedPlayersCount
          });
          setIsImporting(false);
          return;
        } else {
          skippedCount++;
          continue;
        }
      }

      // Perform the import (skip page reload in batch)
      await performFixtureImport(entry, processedPlayers, addedPlayersCount, { skipReload: filesToProcess.length > 1 });
      successCount++;
      }
      }

      if (successCount > 0) {
        setImportMessage({ type: 'success', text: successCount > 1 ? `${successCount} fixtür içe aktarıldı` : 'Fixtür başarıyla içe aktarıldı' });
      }
      if (skippedCount > 0) {
        setImportMessage({ type: 'error', text: `${skippedCount} fixtür mevcut olduğu için atlandı` });
      }
      if (errorCount > 0) {
        setImportMessage({ type: 'error', text: `${errorCount} fixtür içe aktarılamadı` });
      }
      // Batch sonrası tek seferlik yenile
      if (filesToProcess.length > 1 && successCount > 0) {
        window.location.reload();
      }
    } catch (error) {
      setImportMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Fixtür içe aktarılırken bir hata oluştu' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle duplicate fixture confirmation
  const handleDuplicateFixtureConfirm = async () => {
    const { importData, processedPlayers, addedPlayersCount } = duplicateFixtureModal;
    
    try {
      setIsImporting(true);
      setDuplicateFixtureModal({ ...duplicateFixtureModal, isOpen: false });

      // Remove existing fixture first
      MatchesStorage.deleteFixture(importData.fixture.id);

      // Continue with import process (same as original import logic)
      await performFixtureImport(importData, processedPlayers, addedPlayersCount);
      
    } catch (error) {
      setImportMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Fixtür güncellenirken bir hata oluştu' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle duplicate fixture cancel
  const handleDuplicateFixtureCancel = () => {
    setDuplicateFixtureModal({
      isOpen: false,
      importData: null,
      existingFixture: null,
      processedPlayers: [],
      addedPlayersCount: 0
    });
  };

  // Perform the actual fixture import (extracted from handleImportFixture)
  const performFixtureImport = async (importData: any, processedPlayers: any[], addedPlayersCount: number, options?: { skipReload?: boolean }) => {
    // Check if this is a pending fixture
    const isPendingFixture = importData.isPending && importData.fixture && importData.readyToStart;
    
    let fixtureToImport: Fixture | null = null;
    
    if (!isPendingFixture) {
      // Sadece başlamış/aktif fixtürleri Matches'e ekle
      fixtureToImport = {
        ...importData.fixture,
        players: processedPlayers,
        lastUpdated: new Date().toISOString()
      } as Fixture;
    }

    // Check and add missing players to Players page
      try {
        const existingPlayers = PlayersStorage.getPlayers();
        const existingPlayerIds = new Set(existingPlayers.map(p => p.id));
        const playersToAdd: any[] = [];
        
        // Sadece görünür sütunları al
        const visibleColumns = PlayersStorage.getColumns().filter(col => col.visible);
        const visibleColumnIds = visibleColumns.map(col => col.id);
        
        processedPlayers.forEach((fixturePlayer: any) => {
          if (!existingPlayerIds.has(fixturePlayer.id)) {
            // Player doesn't exist in Players page, add them
            // Sadece görünür sütunları kaydet
            const newPlayer: any = {
              id: fixturePlayer.id // id her zaman gerekli
            };
            
            // Sadece görünür sütunları kopyala
            visibleColumnIds.forEach(columnId => {
              if (fixturePlayer.hasOwnProperty(columnId)) {
                newPlayer[columnId] = fixturePlayer[columnId];
              }
            });
            
            playersToAdd.push(newPlayer);
          }
        });
        
        if (playersToAdd.length > 0) {
          const updatedPlayers = [...existingPlayers, ...playersToAdd];
          PlayersStorage.savePlayers(updatedPlayers);
          
          addedPlayersCount = playersToAdd.length;
        }
      } catch (playerError) {
        console.warn('Oyuncular eklenirken hata:', playerError);
      }

      if (fixtureToImport) {
        MatchesStorage.addFixture(fixtureToImport as any);
      }

      // Import double elimination data if available (sadece aktif fixtürlerde)
      if (!isPendingFixture && importData.doubleEliminationData) {
        try {
          // Restore localStorage keys
          Object.keys(importData.doubleEliminationData).forEach(key => {
            if (key !== 'repositoryData') {
              localStorage.setItem(key, JSON.stringify(importData.doubleEliminationData[key]));
            }
          });
          
          // Restore repository data
          if (importData.doubleEliminationData.repositoryData) {
            try {
              const { DoubleEliminationRepository } = await import('../storage/DoubleEliminationRepository');
              const deRepo = new DoubleEliminationRepository();
              deRepo.saveState(importData.fixture.id, importData.doubleEliminationData.repositoryData);
            } catch (repoError) {
              // Repository data restore failed
            }
          }
        } catch (deError) {
          // Double elimination data import failed
        }
      }

      // Create success message with player info
      let successMessage = isPendingFixture
        ? `Başlamamış fixtür turnuvaya eklendi: ${importData.fixture.name}`
        : `Fixtür başarıyla içe aktarıldı: ${importData.fixture.name}`;
      
      if (addedPlayersCount > 0) {
        successMessage += ` (${addedPlayersCount} yeni oyuncu Players sayfasına eklendi)`;
      }
      
      setImportMessage({ 
        type: 'success', 
        text: successMessage
      });
      
      // Refresh fixtures list
      if (!options?.skipReload && fixtureToImport) {
        window.location.reload();
      }
  };

  // Reset import modal
  const resetImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportMessage(null);
    setIsImporting(false);
  };


  const getDoubleEliminationComponentWithKey = () => {
    if (!activeFixture || activeFixture.players.length === 0) {
      return <div className="text-center text-gray-600">No players in this fixture</div>;
    }

    const playerCount = activeFixture.players.length;

    // Get the saved tab state for this fixture, or use desired tab, or default
    if (desiredTab) {
    } else {
    }

    const uiPlayers: UIPlayer[] = activeFixture.players.map(p => ({
      id: p.id,
      name: p.name ?? '',
      surname: p.surname ?? '',
      weight: p.weight ?? 0,
      gender: (p.gender as 'male' | 'female') ?? 'male',
      handPreference: (p.handPreference as 'left' | 'right' | 'both') ?? 'right',
      birthday: p.birthday,
      city: p.city,
      opponents: (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>,
    }));

    const props = {
      players: uiPlayers,
      onMatchResult: handleMatchResult,
      onTournamentComplete: handleTournamentComplete,
      onUpdateOpponents: (player1Id: string, player2Id: string, matchDescription: string, winnerId: string) => {
        // Maç sonrası opponents güncelleme - maç açıklaması ve sonuç ile
        const updatedPlayers = activeFixture.players.map(p => {
          if (p.id === player1Id) {
            const existingOpponents = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            const newOpponent: { playerId: string; matchDescription: string; result: 'win' | 'loss' } = {
              playerId: player2Id,
              matchDescription: matchDescription,
              result: p.id === winnerId ? 'win' : 'loss'
            };
            return { ...p, opponents: [...existingOpponents, newOpponent] };
          }
          if (p.id === player2Id) {
            const existingOpponents = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            const newOpponent: { playerId: string; matchDescription: string; result: 'win' | 'loss' } = {
              playerId: player1Id,
              matchDescription: matchDescription,
              result: p.id === winnerId ? 'win' : 'loss'
            };
            return { ...p, opponents: [...existingOpponents, newOpponent] };
          }
          return p;
        });

        const updatedFixture = { ...activeFixture, players: updatedPlayers };
        upsertFixture(updatedFixture);
      },
      onRemoveOpponents: (player1Id: string, player2Id: string, matchDescription: string) => {
        const updatedPlayers = activeFixture.players.map(p => {
          if (p.id === player1Id) {
            const list = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            let idx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
              const o = list[i];
              if (o.playerId === player2Id && o.matchDescription === matchDescription) { idx = i; break; }
            }
            if (idx !== -1) {
              const newList = [...list.slice(0, idx), ...list.slice(idx + 1)];
              return { ...p, opponents: newList };
            }
          }
          if (p.id === player2Id) {
            const list = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            let idx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
              const o = list[i];
              if (o.playerId === player1Id && o.matchDescription === matchDescription) { idx = i; break; }
            }
            if (idx !== -1) {
              const newList = [...list.slice(0, idx), ...list.slice(idx + 1)];
              return { ...p, opponents: newList };
            }
          }
          return p;
        });
        const updatedFixture = { ...activeFixture, players: updatedPlayers } as Fixture;
        upsertFixture(updatedFixture);
      },
      onClearAllOpponents: () => {
        // Tüm oyuncuların opponents listesini temizle
        const updatedPlayers = activeFixture.players.map(p => ({
          ...p,
          opponents: []
        }));
        const updatedFixture = { 
          ...activeFixture, 
          players: updatedPlayers,
          status: 'active' as const,
          lastUpdated: new Date().toISOString()
        };
        upsertFixture(updatedFixture);
      },
      fixtureId: activeFixture.id
    };

    // Return appropriate component based on player count
    switch (playerCount) {
      case 1:
        return <DoubleElimination1 key={activeFixture.id} {...props} />;
      case 2:
        return <DoubleElimination2 key={activeFixture.id} {...props} />;
      case 3:
        return <DoubleElimination3 key={activeFixture.id} {...props} />;
      case 4:
        return <DoubleElimination4 key={activeFixture.id} {...props} />;
      case 5:
        return <DoubleElimination5 key={activeFixture.id} {...props} />;
      case 6:
        return <DoubleElimination6 key={activeFixture.id} {...props} />;
      case 7:
        return <DoubleElimination7 key={activeFixture.id} {...props} />;
      case 8:
        return <DoubleElimination8 key={activeFixture.id} {...props} />;
      case 9:
      case 10:
      case 11:
        return <DoubleElimination9_11 key={activeFixture.id} {...props} />;
      case 12:
      case 13:
      case 14:
      case 15:
      case 16:
        return <DoubleElimination12_16 key={activeFixture.id} {...props} />;
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 23:
        return <DoubleElimination17_23 key={activeFixture.id} {...props} />;
      case 24:
      case 25:
      case 26:
      case 27:
      case 28:
      case 29:
      case 30:
      case 31:
      case 32:
        return <DoubleElimination24_32 key={activeFixture.id} {...props} />;
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        return <DoubleElimination33_47 key={activeFixture.id} {...props} />;
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      case 58:
      case 59:
      case 60:
      case 61:
      case 62:
      case 63:
      case 64:
        return <DoubleElimination48_64 key={activeFixture.id} {...props} />;
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
        return <DoubleElimination65_95 key={activeFixture.id} {...props} />;
      case 96:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
      case 123:
      case 124:
      case 125:
      case 126:
      case 127:
      case 128:
        return <DoubleElimination96_128 key={activeFixture.id} {...props} />;
      case 129:
      case 130:
      case 131:
      case 132:
      case 133:
      case 134:
      case 135:
      case 136:
      case 137:
      case 138:
      case 139:
      case 140:
      case 141:
      case 142:
      case 143:
      case 144:
      case 145:
      case 146:
      case 147:
      case 148:
      case 149:
      case 150:
      case 151:
      case 152:
      case 153:
      case 154:
      case 155:
      case 156:
      case 157:
      case 158:
      case 159:
      case 160:
      case 161:
      case 162:
      case 163:
      case 164:
      case 165:
      case 166:
      case 167:
      case 168:
      case 169:
      case 170:
      case 171:
      case 172:
      case 173:
      case 174:
      case 175:
      case 176:
      case 177:
      case 178:
      case 179:
      case 180:
      case 181:
      case 182:
      case 183:
      case 184:
      case 185:
      case 186:
      case 187:
      case 188:
      case 189:
      case 190:
      case 191:
        return <DoubleElimination129_191 key={activeFixture.id} {...props} />;
      case 192:
      case 193:
      case 194:
      case 195:
      case 196:
      case 197:
      case 198:
      case 199:
      case 200:
      case 201:
      case 202:
      case 203:
      case 204:
      case 205:
      case 206:
      case 207:
      case 208:
      case 209:
      case 210:
      case 211:
      case 212:
      case 213:
      case 214:
      case 215:
      case 216:
      case 217:
      case 218:
      case 219:
      case 220:
      case 221:
      case 222:
      case 223:
      case 224:
      case 225:
      case 226:
      case 227:
      case 228:
      case 229:
      case 230:
      case 231:
      case 232:
      case 233:
      case 234:
      case 235:
      case 236:
      case 237:
      case 238:
      case 239:
      case 240:
      case 241:
      case 242:
      case 243:
      case 244:
      case 245:
      case 246:
      case 247:
      case 248:
      case 249:
      case 250:
      case 251:
      case 252:
      case 253:
      case 254:
      case 255:
      case 256:
        return <DoubleElimination192_256 key={activeFixture.id} {...props} />;
      case 257:
      case 258:
      case 259:
      case 260:
      case 261:
      case 262:
      case 263:
      case 264:
      case 265:
      case 266:
      case 267:
      case 268:
      case 269:
      case 270:
      case 271:
      case 272:
      case 273:
      case 274:
      case 275:
      case 276:
      case 277:
      case 278:
      case 279:
      case 280:
      case 281:
      case 282:
      case 283:
      case 284:
      case 285:
      case 286:
      case 287:
      case 288:
      case 289:
      case 290:
      case 291:
      case 292:
      case 293:
      case 294:
      case 295:
      case 296:
      case 297:
      case 298:
      case 299:
      case 300:
      case 301:
      case 302:
      case 303:
      case 304:
      case 305:
      case 306:
      case 307:
      case 308:
      case 309:
      case 310:
      case 311:
      case 312:
      case 313:
      case 314:
      case 315:
      case 316:
      case 317:
      case 318:
      case 319:
      case 320:
      case 321:
      case 322:
      case 323:
      case 324:
      case 325:
      case 326:
      case 327:
      case 328:
      case 329:
      case 330:
      case 331:
      case 332:
      case 333:
      case 334:
      case 335:
      case 336:
      case 337:
      case 338:
      case 339:
      case 340:
      case 341:
      case 342:
      case 343:
      case 344:
      case 345:
      case 346:
      case 347:
      case 348:
      case 349:
      case 350:
      case 351:
      case 352:
      case 353:
      case 354:
      case 355:
      case 356:
      case 357:
      case 358:
      case 359:
      case 360:
      case 361:
      case 362:
      case 363:
      case 364:
      case 365:
      case 366:
      case 367:
      case 368:
      case 369:
      case 370:
      case 371:
      case 372:
      case 373:
      case 374:
      case 375:
      case 376:
      case 377:
      case 378:
      case 379:
      case 380:
      case 381:
      case 382:
      case 383:
        return <DoubleElimination257_383 key={activeFixture.id} {...props} />;
      default:
        return <DoubleElimination384_512 key={activeFixture.id} {...props} />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-6 sm:py-8 px-3 sm:px-2">
      <div className="w-full max-w-7xl px-0 sm:px-6 lg:px-8">
        <div className="transition-all duration-300 bg-transparent p-0 border-0 rounded-none shadow-none sm:backdrop-blur-md sm:bg-white/80 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl sm:p-6">
          {/* Header removed as requested */}

          {/* Tournament Filter (above active fixtures) */}
          {fixtures.length > 0 && (
            <div className="mb-3">
              <div className="relative">
                {/* Scrollable chips */}
                <div
                  ref={tournamentScrollRef}
                  className="overflow-x-auto scroll-smooth px-7 sm:px-9"
                  style={{ scrollbarWidth: 'none' as any }}
                >
                  <div className="flex flex-nowrap items-center gap-1.5 py-0.5" style={{ msOverflowStyle: 'none' as any }}>
                    <style>{`/* hide scrollbars */
                      .no-scrollbar::-webkit-scrollbar{display:none}
                    `}</style>
                    {/* All tournaments chip */}
                    <button
                      onClick={() => setSelectedTournamentIdForMatches(null)}
                      className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                        selectedTournamentIdForMatches === null
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-700'
                      }`}
                    >
                      Tümü
                    </button>
                    {Array.from(
                      fixtures.reduce((map, f) => {
                        if (!map.has(f.tournamentId)) map.set(f.tournamentId, f.tournamentName);
                        return map;
                      }, new Map<string, string>())
                    ).map(([tid, tname]) => (
                      <button
                        key={tid}
                        onClick={() => setSelectedTournamentIdForMatches(tid)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                          selectedTournamentIdForMatches === tid
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-700'
                        }`}
                        title={tname}
                      >
                        {tname}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Edge fades */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-7 sm:w-9 bg-gradient-to-r from-white/95 to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-7 sm:w-9 bg-gradient-to-l from-white/95 to-transparent" />
              </div>
            </div>
          )}

          {/* Fixtures Navigation */}
          {fixtures.length > 0 && (
            <div className="mb-8">
              <ActiveFixturesNav
                fixtures={selectedTournamentIdForMatches ? fixtures.filter(f => f.tournamentId === selectedTournamentIdForMatches) : fixtures}
                onFixtureSelect={handleFixtureSelect}
                onFixtureClose={handleFixtureClose}
                activeFixtureId={activeFixture?.id}
                onReorder={(ids) => reorderFixtures(ids)}
                selectedTournamentId={selectedTournamentIdForMatches}
              />
              <div className="mt-4 flex justify-end gap-3">
                {/* İçe Aktar butonu her zaman görünür */}
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow hover:from-green-500 hover:to-green-700 transition-all duration-200 text-sm sm:text-base font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  {t('matches.import')}
                </button>
                
                {/* Dışa Aktar ve PDF butonları sadece aktif fixtür varken görünür */}
                {activeFixture && (
                  <>
                    <button
                      onClick={handleExportFixture}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base font-semibold"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {t('matches.export')}
                    </button>
                    <button
                      onClick={() => setIsMatchPDFModalOpen(true)}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-sm sm:text-base font-semibold"
                    >
                      {t('tournamentCard.createPDF')}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Active Fixture Content */}
          {activeFixture ? (
            <div className="space-y-6">
              <div className="overflow-x-auto px-0 sm:px-2">
                {getDoubleEliminationComponentWithKey()}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('matches.noActiveFixtures')}</h3>
              <p className="text-gray-600 mb-6">{t('matches.startTournamentMessage')}</p>
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow hover:from-green-500 hover:to-green-700 transition-all duration-200 text-base font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  {t('matches.importFixture')}
                </button>
                <button
                  onClick={() => navigate('/tournaments')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
                >
                  {t('matches.goToTournaments')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Matches PDF Create Modal */}
      {isMatchPDFModalOpen && activeFixture && (
        <PDFSettingsShell
          isOpen={isMatchPDFModalOpen}
          titleSuffix={`${activeFixture.name} - ${t('tournaments.pdfSettings')}`}
          onClose={() => setIsMatchPDFModalOpen(false)}
          onOpenPreview={() => {
            const { pages, currentPage } = openFixturePreviewModal(
              activeFixture,
              includeRankingsForPDF,
              includeCompletedForPDF,
              selectedPlayerColumnsForPDF
            );
            setPreviewPages(pages);
            setCurrentPreviewPage(currentPage);
            setIsMatchPDFModalOpen(false);
            setIsPDFPreviewModalOpen(true);
          }}
        >
          {/* Include Sections */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{t('matches.pdfSettings.includedSections')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`border-2 rounded-lg p-3 transition-all duration-200 ${
                  includeRankingsForPDF
                    ? 'bg-white sm:hover:border-blue-500 sm:hover:shadow-md cursor-pointer border-blue-500'
                    : 'bg-white sm:hover:border-blue-400 sm:hover:shadow-md cursor-pointer border-gray-200'
                }`}
                onClick={() => setIncludeRankingsForPDF(!includeRankingsForPDF)}
                role="button"
                aria-pressed={includeRankingsForPDF}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded p-1">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{t('matches.tabRankings')}</h4>
                  </div>
                  {includeRankingsForPDF && (
                    <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{t('matches.pdfSettings.selected')}</div>
                  )}
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-3 transition-all duration-200 ${
                  includeCompletedForPDF
                    ? 'bg-white sm:hover:border-blue-500 sm:hover:shadow-md cursor-pointer border-blue-500'
                    : 'bg-white sm:hover:border-blue-400 sm:hover:shadow-md cursor-pointer border-gray-200'
                }`}
                onClick={() => setIncludeCompletedForPDF(!includeCompletedForPDF)}
                role="button"
                aria-pressed={includeCompletedForPDF}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded p-1">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{t('matches.tabCompleted')}</h4>
                  </div>
                  {includeCompletedForPDF && (
                    <div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{t('matches.pdfSettings.selected')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 text-lg">{t('matches.pdfSettings.editPlayerInfo')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const allColumns = PlayersStorage.getColumns().filter(col => col.id !== 'name' && col.id !== 'surname');
                return allColumns.map((col) => (
                  <div
                    key={col.id}
                    className={`border-2 rounded-lg p-3 transition-all duration-200 ${
                      selectedPlayerColumnsForPDF.includes(col.id)
                        ? 'bg-white sm:hover:border-green-500 sm:hover:shadow-md cursor-pointer border-green-500'
                        : 'bg-white sm:hover:border-green-400 sm:hover:shadow-md cursor-pointer border-gray-200'
                    }`}
                    onClick={() => {
                      if (selectedPlayerColumnsForPDF.includes(col.id)) {
                        setSelectedPlayerColumnsForPDF(prev => prev.filter(id => id !== col.id));
                      } else {
                        setSelectedPlayerColumnsForPDF(prev => [...prev, col.id]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded p-1.5">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {(() => {
                            const isDefaultColumn = defaultColumns.some(dc => dc.id === col.id);
                            return isDefaultColumn ? (t(`players.${col.id}`) || col.name) : col.name;
                          })()}
                        </h4>
                      </div>
                      {selectedPlayerColumnsForPDF.includes(col.id) && (
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">{t('matches.pdfSettings.selected')}</div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

        </PDFSettingsShell>
      )}

      {/* PDF Preview Modal for Matches - styled to match Tournaments */}
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
        onDownloadClick={async () => {
          setIsPDFPreviewModalOpen(false);
          if (!activeFixture) return;
          try {
            setIsExporting(true);
            setPdfProgress(0);
            await generateFixturePDF(
              activeFixture,
              includeRankingsForPDF,
              includeCompletedForPDF,
              selectedPlayerColumnsForPDF,
              (p) => setPdfProgress(p)
            );
          } catch (e) {
          } finally {
            if (pdfProgress < 100) setPdfProgress(100);
            if (hideProgressTimer.current) window.clearTimeout(hideProgressTimer.current);
            hideProgressTimer.current = window.setTimeout(() => {
              setIsExporting(false);
              setPdfProgress(0);
            }, 800);
          }
        }}
        onBackToSettings={() => {
          setIsPDFPreviewModalOpen(false);
          setIsMatchPDFModalOpen(true);
        }}
      />

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
                {pdfProgress < 100 ? 'PDF oluşturuluyor...' : 'İndiriliyor...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, fixtureId: null, fixtureName: '' })}
        onConfirm={confirmDeleteFixture}
        title={t('matches.deleteFixture')}
        message={t('matches.deleteFixtureMessage', { fixtureName: deleteModal.fixtureName })}
        confirmText={t('matches.deleteFixture')}
        cancelText={t('matches.cancel')}
      />

      {/* Import Fixture Modal */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-[100] overflow-hidden"
          onClick={resetImportModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg mx-2 sm:mx-4 max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-5 py-3.5 sm:py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{t('matches.importFixtureTitle')}</h3>
                  <p className="text-blue-100 mt-0.5 text-xs">Daha önce dışa aktardığınız bir fixtür dosyasını seçin</p>
                </div>
                <button
                  onClick={resetImportModal}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0 ml-2"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto">
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200/80 shadow-sm">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Fixtür Dosyası (.json)</label>
                  <input
                    type="file"
                    multiple
                    accept=".json"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setImportFiles(files);
                      setImportFile(files[0] || null);
                      setImportMessage(null);
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-md"
                  />
                </div>

                {importFiles.length > 0 && (
                  <div className="bg-blue-50 rounded-md border border-blue-200 p-3">
                    <p className="text-xs sm:text-sm text-blue-800">
                      <span className="font-semibold">Seçilen dosyalar:</span> {importFiles.length}
                    </p>
                    <ul className="mt-2 space-y-1 max-h-28 overflow-auto text-xs text-blue-700 list-disc list-inside">
                      {importFiles.map((f, idx) => (
                        <li key={idx}>{f.name} <span className="text-blue-500">({(f.size / 1024).toFixed(2)} KB)</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {importMessage && (
                  <div className={`p-3 rounded-md border ${
                    importMessage.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <p className="text-xs sm:text-sm">{importMessage.text}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
              <button
                onClick={resetImportModal}
                className="px-3.5 sm:px-4 py-2 rounded-md border-2 border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-gray-900 transition-colors font-semibold text-xs sm:text-sm"
                disabled={isImporting}
              >
                {t('matches.cancel')}
              </button>
              <button
                onClick={handleImportFixture}
                disabled={(importFiles.length === 0 && !importFile) || isImporting || (importMessage?.type === 'success')}
                className="px-4 sm:px-5 py-2 rounded-md border-2 border-blue-300 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:border-blue-400 transition-colors font-semibold text-xs sm:text-sm disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                {isImporting ? t('matches.importing') : t('matches.import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Fixture Confirmation Modal */}
      {duplicateFixtureModal.isOpen && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-hidden"
          onClick={handleDuplicateFixtureCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Fixtür Zaten Mevcut</h3>
                <p className="text-sm text-gray-600">Bu fixtür zaten sistemde var</p>
              </div>
              <button
                onClick={handleDuplicateFixtureCancel}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-800 mb-2">Mevcut Fixtür:</h4>
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Ad:</span> {duplicateFixtureModal.existingFixture?.name}
                </p>
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Oyuncu Sayısı:</span> {duplicateFixtureModal.existingFixture?.players?.length || 0}
                </p>
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Son Güncelleme:</span> {
                    duplicateFixtureModal.existingFixture?.lastUpdated 
                      ? new Date(duplicateFixtureModal.existingFixture.lastUpdated).toLocaleString('tr-TR')
                      : 'Bilinmiyor'
                  }
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">{t('matches.importFixtureToImport')}</h4>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Ad:</span> {duplicateFixtureModal.importData?.fixture?.name}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Oyuncu Sayısı:</span> {duplicateFixtureModal.processedPlayers?.length || 0}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Export Tarihi:</span> {
                    duplicateFixtureModal.importData?.exportDate 
                      ? new Date(duplicateFixtureModal.importData.exportDate).toLocaleString('tr-TR')
                      : 'Bilinmiyor'
                  }
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Uyarı:</strong> Mevcut fixtürü güncellerseniz, mevcut tüm veriler (maç sonuçları, turnuva ilerlemesi) 
                  içe aktarılan dosyadaki verilerle değiştirilecektir.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleDuplicateFixtureCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-sm font-semibold rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleDuplicateFixtureConfirm}
                disabled={isImporting}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg shadow hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
                {isImporting ? 'Güncelleniyor...' : 'Fixtürü Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;