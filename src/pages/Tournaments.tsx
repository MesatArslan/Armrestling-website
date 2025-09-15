import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import TournamentCard from '../components/UI/TournamentCard';
import ActionsMenu from '../components/UI/ActionsMenu';
import TemplateSelectionModal from '../components/UI/TemplateSelectionModal';
import ConfirmationModal from '../components/UI/ConfirmationModal';
import CreateTournamentModal from '../components/UI/CreateTournamentModal';
import type { Tournament as StorageTournament, WeightRange } from '../storage/schemas';
import { type Column } from '../utils/playersStorage';
import { openPreviewModal, generatePDF, generateCombinedPreviewPages, generateCombinedTournamentPDF } from '../utils/pdfGenerator';
import { useTournaments } from '../hooks/useTournaments';
import { usePlayers } from '../hooks/usePlayers';
import { useMatches } from '../hooks/useMatches';
import { createTournamentFromTemplate, type TournamentTemplate } from '../utils/tournamentTemplates';
import { PlayersStorage } from '../utils/playersStorage';
import { MatchesStorage } from '../utils/matchesStorage';

type UITournament = Omit<StorageTournament, 'isExpanded'> & { isExpanded: boolean };

// Tournaments sayfası için Player interface'ini genişletiyoruz
interface ExtendedPlayer extends Player {
  [key: string]: any;
}

const Tournaments = () => {
  const { t } = useTranslation();
  const { tournaments: repoTournaments, selectedTournamentId, selectedWeightRangeId, playerFilters: repoFilters, isLoading, saveTournaments, setSelectedTournament, setSelectedWeightRange, savePlayerFilters, clearAllTournamentData } = useTournaments();
  const { players: repoPlayers, columns: playerColumns } = usePlayers();
  const { fixtures } = useMatches();
  const [tournaments, setTournaments] = useState<UITournament[]>([]);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [selectedWeightRange, setSelectedWeightRangeLocal] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournamentLocal] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [playerFilters, setPlayerFilters] = useState<import('../hooks/useTournaments').PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setAppliedFilters] = useState<import('../hooks/useTournaments').PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setShowFilteredPlayers] = useState(false);
  const navigate = useNavigate();

  // PDF Preview Modal States
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [selectedPDFColumns, setSelectedPDFColumns] = useState<string[]>([
    'name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'
  ]);
  const [availablePDFColumns, setAvailablePDFColumns] = useState<Column[]>([]);
  const [playersPerPage, setPlayersPerPage] = useState<number>(33);
  const [currentTournamentForPDF, setCurrentTournamentForPDF] = useState<UITournament | null>(null);
  const [currentWeightRangeForPDF, setCurrentWeightRangeForPDF] = useState<WeightRange | null>(null);
  const [isPDFColumnModalOpen, setIsPDFColumnModalOpen] = useState(false);
  const [isBulkPDFModalOpen, setIsBulkPDFModalOpen] = useState(false);
  const [selectedBulkRanges, setSelectedBulkRanges] = useState<Record<string, boolean>>({});
  const [isBulkPreviewMode, setIsBulkPreviewMode] = useState<boolean>(false);
  const [bulkPlayersPerPage, setBulkPlayersPerPage] = useState<number>(33);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const hideProgressTimer = React.useRef<number | null>(null);
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const previewContentRef = React.useRef<HTMLDivElement | null>(null);
  const [previewLeftPad, setPreviewLeftPad] = useState<number>(0);

  // Handle wheel and gesture zoom inside preview
  useEffect(() => {
    const el = previewContainerRef.current;
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

    // Safari pinch gestures
    let baseZoom = previewZoom;
    const onGestureStart = (e: any) => {
      e.preventDefault();
      baseZoom = previewZoom;
    };
    const onGestureChange = (e: any) => {
      e.preventDefault();
      const scale = e?.scale || 1;
      const next = clamp(baseZoom * scale);
      setPreviewZoom(next);
    };

    el.addEventListener('wheel', onWheel as any, { passive: false } as any);
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false } as any);
    el.addEventListener('gesturechange', onGestureChange as any, { passive: false } as any);
    return () => {
      el.removeEventListener('wheel', onWheel as any);
      el.removeEventListener('gesturestart', onGestureStart as any);
      el.removeEventListener('gesturechange', onGestureChange as any);
    };
  }, [previewZoom, isPDFPreviewModalOpen]);

  // Center scroll position horizontally so user can pan both left and right
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

  // Template Selection Modal States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Import Tournament Package Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation Modal States
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  // Toggle to disable all background sync effects (diagnostic/safe mode)
  const NO_BACKGROUND_SYNC = true;
  const [hasInitialSync, setHasInitialSync] = useState(false);

  // Helpers: stable deep equal (sorts object keys to avoid stringify order issues)
  const normalizeForCompare = (val: any): any => {
    if (Array.isArray(val)) return val.map(normalizeForCompare);
    if (val && typeof val === 'object') {
      const keys = Object.keys(val).sort();
      const out: Record<string, any> = {};
      for (const k of keys) out[k] = normalizeForCompare(val[k]);
      return out;
    }
    return val;
  };
  const deepEqual = (a: any, b: any) => {
    try { return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b)); } catch { return false; }
  };

  // Normalize tournaments for compare/save: drop UI fields and empty arrays
  const canonicalizeTournaments = (arr: any[]): any[] => {
    return (arr || []).map((t: any) => {
      const { isExpanded, ...rest } = t || {};
      return {
        ...rest,
        weightRanges: (rest.weightRanges || []).map((wr: any) => {
          const { excludedPlayerIds, ...wrRest } = wr || {};
          // Treat empty/undefined excludedPlayerIds the same: omit
          if (!excludedPlayerIds || (Array.isArray(excludedPlayerIds) && excludedPlayerIds.length === 0)) {
            return { ...wrRest };
          }
          return { ...wrRest, excludedPlayerIds: [...excludedPlayerIds] };
        })
      };
    });
  };

  // One-shot initial sync on page entry to show saved data (pending fixtures import support handled in Matches import logic)
  useEffect(() => {
    if (isLoading || hasInitialSync) return;
    // players
    setPlayers(repoPlayers as any);
    // tournaments (attach UI-only flag)
    const uiTournaments = (repoTournaments as StorageTournament[]).map(t => ({ ...t, isExpanded: Boolean((t as any).isExpanded) }));
    setTournaments(uiTournaments);
    // selection ids
    setSelectedTournamentLocal(selectedTournamentId || null);
    setSelectedWeightRangeLocal(selectedWeightRangeId || null);
    // filters (UI only)
    setPlayerFilters(repoFilters as any);
    setAppliedFilters(repoFilters as any);
    setShowFilteredPlayers(true);
    setHasInitialSync(true);
  }, [isLoading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isCreateModalOpen || isPDFPreviewModalOpen || isPDFColumnModalOpen || isBulkPDFModalOpen || isTemplateModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen, isPDFPreviewModalOpen, isPDFColumnModalOpen, isBulkPDFModalOpen, isTemplateModalOpen]);

  // Sync from repositories (guarded by stable snapshot to prevent loops)
  const lastRepoSnapshotRef = React.useRef<{
    players: string;
    tournaments: string;
    selectedTournamentId: string | null;
    selectedWeightRangeId: string | null;
    filters: string;
  }>({ players: '', tournaments: '', selectedTournamentId: null, selectedWeightRangeId: null, filters: '' });

  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    if (isLoading) return;

    const playersSnap = JSON.stringify(normalizeForCompare(repoPlayers));
    const tournamentsSnap = JSON.stringify(normalizeForCompare(canonicalizeTournaments(repoTournaments as any)));
    const filtersSnap = JSON.stringify(normalizeForCompare(repoFilters));
    const sameSnapshot =
      lastRepoSnapshotRef.current.players === playersSnap &&
      lastRepoSnapshotRef.current.tournaments === tournamentsSnap &&
      lastRepoSnapshotRef.current.selectedTournamentId === (selectedTournamentId || null) &&
      lastRepoSnapshotRef.current.selectedWeightRangeId === (selectedWeightRangeId || null) &&
      lastRepoSnapshotRef.current.filters === filtersSnap;

    if (sameSnapshot) return;

    // Update local states from repo
    if (!deepEqual(players, repoPlayers)) setPlayers(repoPlayers as any);

    const uiTournaments = (repoTournaments as StorageTournament[]).map(t => ({ ...t, isExpanded: Boolean((t as any).isExpanded) }));
    if (!deepEqual(canonicalizeTournaments(tournaments), canonicalizeTournaments(uiTournaments))) {
      setTournaments(uiTournaments);
    }

    const selTid = selectedTournamentId || null;
    if (selectedTournament !== selTid) setSelectedTournamentLocal(selTid);

    const selWrid = selectedWeightRangeId || null;
    if (selectedWeightRange !== selWrid) setSelectedWeightRangeLocal(selWrid);

    if (!deepEqual(playerFilters, repoFilters)) setPlayerFilters(repoFilters as any);

    // Save snapshot
    lastRepoSnapshotRef.current = {
      players: playersSnap,
      tournaments: tournamentsSnap,
      selectedTournamentId: selTid,
      selectedWeightRangeId: selWrid,
      filters: filtersSnap,
    };
  }, [isLoading, repoPlayers, repoTournaments, selectedTournamentId, selectedWeightRangeId, repoFilters]);

  // Load PDF columns from Players hook
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    const columns = playerColumns;
    if (!deepEqual(availablePDFColumns, columns)) {
      setAvailablePDFColumns(columns);
    }
    const visibleColumnIds = columns.filter(col => col.visible).map(col => col.id);
    if (!deepEqual(selectedPDFColumns, visibleColumnIds)) {
      setSelectedPDFColumns(visibleColumnIds);
    }
  }, [playerColumns]);

  // NOTE: We avoid persisting here to prevent loops. We already call saveTournaments
  // from explicit user actions (create/edit/delete/include/exclude).

  // Persist selection only on explicit UI actions (see handleSelectWeightRange)

  // Persist filters only when they actually differ from repo
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    if (isLoading) return;
    if (!deepEqual(playerFilters, repoFilters)) {
      savePlayerFilters(playerFilters as any);
    }
  }, [playerFilters, repoFilters, isLoading]);

  // Derive UI-only flags from filters (not persisted)
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    setAppliedFilters(playerFilters);
    setShowFilteredPlayers(true);
  }, [playerFilters.gender, playerFilters.handPreference, playerFilters.weightMin, playerFilters.weightMax]);

  const toggleTournament = (tournamentId: string) => {
    setTournaments(tournaments.map(tournament => 
      tournament.id === tournamentId 
        ? { ...tournament, isExpanded: !tournament.isExpanded }
        : tournament
    ));
  };

  const handleSelectWeightRange = (tournamentId: string, weightRangeId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const weightRange = tournament?.weightRanges.find(wr => wr.id === weightRangeId);
    
    if (weightRange) {
      setSelectedTournamentLocal(tournamentId);
      setSelectedWeightRangeLocal(weightRangeId);
      // Persist selection on explicit action
      try { setSelectedTournament(tournamentId); } catch {}
      try { setSelectedWeightRange(weightRangeId); } catch {}
      
      // Set weight filter to the weight range and apply it immediately
      const newFilters = {
        gender: null,
        handPreference: null,
        weightMin: weightRange.min,
        weightMax: weightRange.max,
      };
      
      setPlayerFilters(newFilters);
      setAppliedFilters(newFilters);
      setShowFilteredPlayers(true);
    }
  };



  // JSON Export

  // JSON Import
  const resetImportState = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setIsImporting(false);
    setImportMessage(null);
  };

  const handleImportTournamentPackage = async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportMessage(null);
    try {
      const text = await importFile.text();
      const pkg = JSON.parse(text);
      if (!pkg || !pkg.tournament) throw new Error('Geçersiz turnuva paketi');

      // Merge players
      try {
        const existing = PlayersStorage.getPlayers();
        const byId = new Map(existing.map((p: any) => [p.id, p]));
        const cols = PlayersStorage.getColumns().filter((c: any) => c.visible).map((c: any) => c.id);
        const incoming = Array.isArray(pkg.players) ? pkg.players : [];
        for (const p of incoming) {
          if (!byId.has(p.id)) {
            const np: any = { id: p.id };
            cols.forEach((cid: string) => { if (p.hasOwnProperty(cid)) np[cid] = p[cid]; });
            byId.set(p.id, np);
          }
        }
        PlayersStorage.savePlayers(Array.from(byId.values()));
      } catch {}

      // Merge tournament
      const baseTournaments = (repoTournaments as StorageTournament[]) as any[];
      const exists = baseTournaments.find(t => t.id === pkg.tournament.id);
      let merged: any[];
      if (!exists) {
        const tNew = {
          id: pkg.tournament.id,
          name: pkg.tournament.name,
          weightRanges: (pkg.tournament.weightRanges || []).map((wr: any) => ({
            id: wr.id, name: wr.name, min: wr.min, max: wr.max, excludedPlayerIds: [],
          })),
          genderFilter: pkg.tournament.genderFilter ?? null,
          handPreferenceFilter: pkg.tournament.handPreferenceFilter ?? null,
          birthYearMin: pkg.tournament.birthYearMin ?? null,
          birthYearMax: pkg.tournament.birthYearMax ?? null,
          isExpanded: false,
        };
        merged = [...baseTournaments, tNew];
      } else {
        exists.genderFilter = pkg.tournament.genderFilter ?? exists.genderFilter ?? null;
        exists.handPreferenceFilter = pkg.tournament.handPreferenceFilter ?? exists.handPreferenceFilter ?? null;
        exists.birthYearMin = pkg.tournament.birthYearMin ?? exists.birthYearMin ?? null;
        exists.birthYearMax = pkg.tournament.birthYearMax ?? exists.birthYearMax ?? null;
        const wrIds = new Set(exists.weightRanges.map((wr: any) => wr.id));
        for (const wr of (pkg.tournament.weightRanges || [])) {
          if (!wrIds.has(wr.id)) exists.weightRanges.push({ ...wr, excludedPlayerIds: [] });
        }
        merged = baseTournaments.map(t => t.id === exists.id ? exists : t);
      }
      saveTournaments(merged as any);

      // Import fixtures (pending: kept as pending; active: add to Matches)
      try {
        const list = Array.isArray(pkg.fixtures) ? pkg.fixtures : [];
        for (const fx of list) {
          // Normalize to entry format used by Matches importer
          // If active, add to Matches; if not, leave for Tournaments
          if (fx.status === 'active' || fx.status === 'paused') {
            const existing = MatchesStorage.getFixtureById(fx.id);
            if (!existing) {
              MatchesStorage.addFixture({ ...fx } as any);
            }
          }
        }
      } catch {}

      setImportMessage({ type: 'success', text: 'Turnuva paketi içe aktarıldı' });
    } catch (e: any) {
      setImportMessage({ type: 'error', text: e?.message || 'Turnuva paketi içe aktarılamadı' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateTournament = (tournamentData: {
    name: string;
    weightRanges: WeightRange[];
    genderFilter: 'male' | 'female' | null;
    handPreferenceFilter: 'left' | 'right' | null;
    birthYearMin: number | null;
    birthYearMax: number | null;
  }) => {
    const newTournament: UITournament = {
      id: uuidv4(),
      name: tournamentData.name,
      weightRanges: tournamentData.weightRanges,
      isExpanded: false,
      genderFilter: tournamentData.genderFilter,
      handPreferenceFilter: tournamentData.handPreferenceFilter,
      birthYearMin: tournamentData.birthYearMin,
      birthYearMax: tournamentData.birthYearMax,
    };

    const updatedTournaments: UITournament[] = [...tournaments, newTournament];
    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments as any);
    setIsCreateModalOpen(false);
  };

  const handleEditTournament = (tournament: UITournament) => {
    setIsEditMode(true);
    setEditingTournamentId(tournament.id);
    setPlayerFilters({
      gender: tournament.genderFilter || null,
      handPreference: tournament.handPreferenceFilter || null,
      weightMin: null,
      weightMax: null,
    });
    setAppliedFilters({
      gender: tournament.genderFilter || null,
      handPreference: tournament.handPreferenceFilter || null,
      weightMin: null,
      weightMax: null,
    });
    setShowFilteredPlayers(true);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTournament = (tournamentId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    setConfirmationModal({
      isOpen: true,
      title: 'Turnuvayı Sil',
      message: t('tournamentCard.confirmDeleteTournament', { name: tournament.name }),
      onConfirm: () => {
        const updatedTournaments = tournaments.filter(t => t.id !== tournamentId);
        setTournaments(updatedTournaments);
        saveTournaments(updatedTournaments as any);
      },
      type: 'danger'
    });
  };

  // Template selection handlers
  const handleTemplateSelect = (template: TournamentTemplate, handPreference: 'left' | 'right') => {
    const handPreferenceText = handPreference === 'left' ? t('players.leftHanded') : t('players.rightHanded');
    const tournamentName = `${t(template.nameKey)} - ${handPreferenceText}`;
    
    setConfirmationModal({
      isOpen: true,
      title: 'Turnuva Oluştur',
      message: `"${tournamentName}" turnuvasını oluşturmak istiyor musunuz?`,
      onConfirm: () => {
        const newTournament = createTournamentFromTemplate(template, tournamentName);
        // Apply hand preference filter to the tournament
        newTournament.handPreferenceFilter = handPreference;
        const updatedTournaments = [...tournaments, newTournament];
        setTournaments(updatedTournaments);
        saveTournaments(updatedTournaments as any);
      },
      type: 'info'
    });
  };

  const handleOpenTemplateModal = () => {
    setIsTemplateModalOpen(true);
  };

  const handleSaveEdit = (tournamentData: {
    name: string;
    weightRanges: WeightRange[];
    genderFilter: 'male' | 'female' | null;
    handPreferenceFilter: 'left' | 'right' | null;
    birthYearMin: number | null;
    birthYearMax: number | null;
  }) => {
    if (!editingTournamentId) return;

    const base = tournaments.find(t => t.id === editingTournamentId)!;
    const updatedTournament: UITournament = {
      ...base,
      name: tournamentData.name,
      weightRanges: tournamentData.weightRanges.map(range => {
        // Find existing weight range to preserve excludedPlayerIds
        const existingRange = base.weightRanges.find(wr => wr.id === range.id);
        return {
          ...range,
          excludedPlayerIds: existingRange?.excludedPlayerIds || []
        };
      }),
      isExpanded: Boolean(base.isExpanded),
      genderFilter: tournamentData.genderFilter,
      handPreferenceFilter: tournamentData.handPreferenceFilter,
      birthYearMin: tournamentData.birthYearMin,
      birthYearMax: tournamentData.birthYearMax,
    };
    
    const updatedTournaments = tournaments.map(t => t.id === updatedTournament.id ? updatedTournament : t);
    setTournaments(updatedTournaments);
    // Persist edits immediately
    try { saveTournaments(updatedTournaments as any); } catch {}

    // Reset form
    setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
    setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
    setIsEditMode(false);
    setEditingTournamentId(null);
    setIsCreateModalOpen(false);
  };


  const getAvailablePlayersCount = (weightRange: WeightRange, tournament?: UITournament) => {
    return players.filter(player => {
      // Exclude players that are specifically excluded from this weight range
      if (weightRange.excludedPlayerIds?.includes(player.id)) {
        return false;
      }
      
      const matchesWeight = Number(player.weight || 0) >= weightRange.min && Number(player.weight || 0) <= weightRange.max;
      const matchesTournamentGender = !tournament?.genderFilter || player.gender === tournament.genderFilter;
      const matchesTournamentHand = !tournament?.handPreferenceFilter || 
        player.handPreference === tournament.handPreferenceFilter || 
        player.handPreference === 'both';
      
      // Apply birth year filter if tournament has birth year restrictions
      let matchesBirthYear = true;
      if (tournament && (tournament.birthYearMin || tournament.birthYearMax) && player.birthday) {
        const playerBirthYear = new Date(player.birthday).getFullYear();
        matchesBirthYear = 
          (!tournament.birthYearMin || playerBirthYear >= tournament.birthYearMin) &&
          (!tournament.birthYearMax || playerBirthYear <= tournament.birthYearMax);
      }
      
      return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
    }).length;
  };

  const handleExcludePlayer = (tournamentId: string, weightRangeId: string, playerId: string) => {
    const updated = tournaments.map(t => t.id === tournamentId ? ({
      ...t,
      weightRanges: t.weightRanges.map(wr => wr.id === weightRangeId ? {
        ...wr,
        excludedPlayerIds: [...(wr.excludedPlayerIds || []), playerId]
      } : wr)
    } as UITournament) : t);
    setTournaments(updated);
    saveTournaments(updated as any);
  };

  const handleIncludePlayer = (tournamentId: string, weightRangeId: string, playerId: string) => {
    const updated = tournaments.map(t => t.id === tournamentId ? ({
      ...t,
      weightRanges: t.weightRanges.map(wr => wr.id === weightRangeId ? {
        ...wr,
        excludedPlayerIds: (wr.excludedPlayerIds || []).filter(id => id !== playerId)
      } : wr)
    } as UITournament) : t);
    setTournaments(updated);
    saveTournaments(updated as any);
  };

  

  const handleClearAllTournamentData = () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Tüm Turnuva Verilerini Temizle',
      message: 'Tüm turnuva verilerini temizlemek istediğinizden emin misiniz? Bu işlem tüm turnuvaları, seçimleri ve filtreleri kaldıracaktır.',
      onConfirm: () => {
        clearAllTournamentData();
        setTournaments([]);
        setSelectedTournamentLocal(null);
        setSelectedWeightRangeLocal(null);
        setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
        setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
        setShowFilteredPlayers(false);
      }
    });
  };

  const handleStartTournament = (tournamentId: string, weightRangeId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const weightRange = tournament?.weightRanges.find(wr => wr.id === weightRangeId);
    
    if (tournament && weightRange) {
      // Navigate to matches page with state
      navigate('/matches', {
        state: {
          tournament,
          weightRange
        }
      });
    }
  };

  // PDF Preview Modal Functions
  const getFilteredPlayers = (weightRange: WeightRange, tournament: UITournament) => {
    return players.filter(player => {
      // Weight range filter
      const weightMatch = player.weight >= weightRange.min && player.weight <= weightRange.max;
      
      // Tournament filters
      const genderMatch = !tournament.genderFilter || player.gender === tournament.genderFilter;
      const handMatch = !tournament.handPreferenceFilter || 
        player.handPreference === tournament.handPreferenceFilter || 
        player.handPreference === 'both';
      
      // Birth year filters
      let birthYearMatch = true;
      if (tournament.birthYearMin || tournament.birthYearMax) {
        const birthYear = player.birthday ? new Date(player.birthday).getFullYear() : null;
        if (birthYear) {
          if (tournament.birthYearMin && birthYear < tournament.birthYearMin) birthYearMatch = false;
          if (tournament.birthYearMax && birthYear > tournament.birthYearMax) birthYearMatch = false;
        }
      }
      
      // Not excluded
      const notExcluded = !weightRange.excludedPlayerIds?.includes(player.id);
      
      return weightMatch && genderMatch && handMatch && birthYearMatch && notExcluded;
    });
  };

  const handleShowPDFPreview = (tournament: UITournament, weightRange: WeightRange) => {
    setCurrentTournamentForPDF(tournament);
    setCurrentWeightRangeForPDF(weightRange);
    
    const previewData = openPreviewModal(
      tournament,
      weightRange,
      selectedPDFColumns,
      playersPerPage,
      availablePDFColumns,
      (wr) => getFilteredPlayers(wr, tournament)
    );
    
    setPreviewPages(previewData.pages);
    setCurrentPreviewPage(previewData.currentPage);
    setIsPDFPreviewModalOpen(true);
  };

  const handleExportPDF = async () => {
    if (!currentTournamentForPDF || !currentWeightRangeForPDF) return;

    try {
      setIsExporting(true);
      setPdfProgress(0);
      await generatePDF(
        currentTournamentForPDF,
        currentWeightRangeForPDF,
        selectedPDFColumns,
        playersPerPage,
        availablePDFColumns,
        (wr) => getFilteredPlayers(wr, currentTournamentForPDF),
        (p) => setPdfProgress(p)
      );
      
    } catch (error) {
      // PDF oluşturulurken hata
    } finally {
      // Hold 100% for a brief moment to give a nice finish
      if (pdfProgress < 100) {
        setPdfProgress(100);
      }
      if (hideProgressTimer.current) {
        window.clearTimeout(hideProgressTimer.current);
      }
      hideProgressTimer.current = window.setTimeout(() => {
        setIsExporting(false);
        setPdfProgress(0);
      }, 800);
    }
  };

  const handleShowPDFColumnModal = (tournament: UITournament, weightRange: WeightRange) => {
    setCurrentTournamentForPDF(tournament);
    setCurrentWeightRangeForPDF(weightRange);
    // Initialize available/selected columns from Players repo when opening the modal
    try {
      const cols = Array.isArray(playerColumns) && playerColumns.length > 0 ? playerColumns : availablePDFColumns;
      if (cols && cols.length > 0) {
        if (!deepEqual(availablePDFColumns, cols)) setAvailablePDFColumns(cols);
        const visibleIds = cols.filter((c) => c.visible).map((c) => c.id);
        if (visibleIds.length > 0 && !deepEqual(selectedPDFColumns, visibleIds)) {
          setSelectedPDFColumns(visibleIds);
        }
      }
    } catch {}
    setIsPDFColumnModalOpen(true);
  };

  return (
    <>
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start pt-8 pb-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="backdrop-blur-md bg-white/80 rounded-2xl border border-gray-200 shadow-2xl p-4 sm:p-6 transition-all duration-300">
          {/* Header */}
          <div className="mb-8">
            {/* Mobile: Full width row with title and kebab menu */}
            <div className="flex items-center justify-between lg:hidden w-full">
              <div className="pl-2">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight drop-shadow-sm">{t('tournaments.title')}</h1>
                <p className="text-base text-gray-500 mt-1">{t('tournaments.totalTournaments')}: {tournaments.length}</p>
              </div>
              {/* Mobile kebab menu - positioned at the very end of the row */}
              <div className="flex-shrink-0">
                <ActionsMenu
                  items={[
                    { id: 'import', label: 'Turnuva İçe Aktar', onClick: () => setIsImportModalOpen(true) },
                    { id: 'use-template', label: t('tournaments.useTemplate'), onClick: handleOpenTemplateModal },
                    { id: 'create', label: t('tournaments.createTournament'), onClick: () => {
                      setIsEditMode(false);
                      setEditingTournamentId(null);
                      setIsCreateModalOpen(true);
                    } },
                    { id: 'clear-all', label: t('tournaments.clearAllData'), onClick: handleClearAllTournamentData },
                  ]}
                  buttonLabel={t('common.actions') ?? 'Actions'}
                  iconOnly={true}
                  ariaLabel={t('common.actions') ?? 'Actions'}
                />
              </div>
            </div>
            
            {/* Desktop: Original layout */}
            <div className="hidden lg:flex lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight drop-shadow-sm">{t('tournaments.title')}</h1>
                <p className="text-base text-gray-500 mt-1">{t('tournaments.totalTournaments')}: {tournaments.length}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <ActionsMenu
                  items={[
                    { id: 'import', label: 'Turnuva İçe Aktar', onClick: () => setIsImportModalOpen(true) },
                    { id: 'use-template', label: t('tournaments.useTemplate'), onClick: handleOpenTemplateModal },
                    { id: 'create', label: t('tournaments.createTournament'), onClick: () => {
                      setIsEditMode(false);
                      setEditingTournamentId(null);
                      setIsCreateModalOpen(true);
                    } },
                    { id: 'clear-all', label: t('tournaments.clearAllData'), onClick: handleClearAllTournamentData },
                  ]}
                  buttonLabel={t('common.actions') ?? 'Actions'}
                  iconOnly={true}
                  ariaLabel={t('common.actions') ?? 'Actions'}
                />
              </div>
            </div>
        </div>
        
        {/* Tournaments List */}
          <div className="space-y-6 max-w-7xl mx-auto">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('tournaments.noTournamentsYet')}</h3>
                <p className="text-gray-600 mb-6">{t('tournaments.createFirstTournament')}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleOpenTemplateModal}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow-lg hover:from-green-500 hover:to-green-700 transition-all duration-200 text-base font-semibold"
                  >
                    {t('tournaments.useTemplate')}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingTournamentId(null);
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
                  >
                    {t('tournaments.createFirstTournamentButton')}
                  </button>
                </div>
                        </div>
            ) : (
              tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  players={players}
                  onToggle={toggleTournament}
                  onEdit={handleEditTournament}
                  onDelete={handleDeleteTournament}
                  onSelectWeightRange={handleSelectWeightRange}
                  onStartTournament={handleStartTournament}
                  onExcludePlayer={handleExcludePlayer}
                  onIncludePlayer={handleIncludePlayer}
                  getAvailablePlayersCount={getAvailablePlayersCount}
                  selectedWeightRange={selectedWeightRange}
                  selectedTournament={selectedTournament}
                  onShowPDFPreview={handleShowPDFPreview}
                  onShowPDFColumnModal={handleShowPDFColumnModal}
                  onOpenBulkPDF={(t) => {
                    const defaults: Record<string, boolean> = {};
                    t.weightRanges.forEach(wr => { defaults[wr.id] = true; });
                    setSelectedBulkRanges(defaults);
                    // Initialize available/selected columns before opening bulk modal
                    try {
                      const cols = Array.isArray(playerColumns) && playerColumns.length > 0 ? playerColumns : availablePDFColumns;
                      if (cols && cols.length > 0) {
                        if (!deepEqual(availablePDFColumns, cols)) setAvailablePDFColumns(cols);
                        const visibleIds = cols.filter((c) => c.visible).map((c) => c.id);
                        if (visibleIds.length > 0 && !deepEqual(selectedPDFColumns, visibleIds)) {
                          setSelectedPDFColumns(visibleIds);
                        }
                      }
                    } catch {}
                    setIsBulkPDFModalOpen(true);
                    setCurrentTournamentForPDF(t);
                    setIsBulkPreviewMode(false);
                  }}
                  fixtures={Object.values(fixtures)}
                />
              ))
            )}
        </div>

        </div>
      </div>
    </div>

    {/* Import Tournament Modal */}
    {isImportModalOpen && (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[9998] overflow-hidden" onClick={() => setIsImportModalOpen(false)}>
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[85vh] overflow-y-auto mx-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Turnuva İçe Aktar</h3>
              <p className="text-sm text-gray-600">Turnuva paketi JSON dosyasını seçin</p>
            </div>
            <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Turnuva Paketi (.json)</label>
              <input type="file" accept=".json" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer border border-gray-300 rounded-lg" />
            </div>
            {importFile && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800"><span className="font-semibold">Seçilen dosya:</span> {importFile.name}</p>
                <p className="text-xs text-blue-600 mt-1">Boyut: {(importFile.size / 1024).toFixed(2)} KB</p>
              </div>
            )}
            {importMessage && (
              <div className={`p-3 rounded-lg border ${importMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <p className="text-sm">{importMessage.text}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={resetImportState} className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-sm font-semibold rounded-lg" disabled={isImporting}>İptal</button>
            <button onClick={handleImportTournamentPackage} disabled={!importFile || isImporting} className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">{isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}</button>
          </div>
        </div>
      </div>
    )}

    {/* Top-right export progress indicator */}
    {isExporting && (
      <div className="fixed top-4 right-4 z-[10000] transition-opacity duration-300">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">{t('tournamentCard.downloadPDF')}</div>
            <div className="mt-1 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${pdfProgress}%` }} />
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-700 w-10 text-right">{pdfProgress}%</div>
        </div>
      </div>
    )}

    {/* Template-Style PDF Download Form Modal */}
    {isBulkPDFModalOpen && currentTournamentForPDF && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
          {/* Header - Template Style */}
          <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">
                    {t('tournamentCard.pdfPreview')}
                  </h2>
                  <p className="text-red-100 mt-1 text-xs sm:text-sm">
                    {currentTournamentForPDF.name} - PDF Ayarları
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const selectedRanges = currentTournamentForPDF!.weightRanges.filter(wr => selectedBulkRanges[wr.id]);
                    if (selectedRanges.length === 0) return;
                    const pages = generateCombinedPreviewPages(
                      currentTournamentForPDF!,
                      selectedRanges,
                      selectedPDFColumns,
                      bulkPlayersPerPage,
                      availablePDFColumns,
                      (wr) => {
                        return players.filter((player) => {
                          if (wr.excludedPlayerIds?.includes(player.id)) return false;
                          const matchesWeight = Number(player.weight || 0) >= wr.min && Number(player.weight || 0) <= wr.max;
                          const matchesTournamentGender = !currentTournamentForPDF?.genderFilter || player.gender === currentTournamentForPDF?.genderFilter;
                          const matchesTournamentHand = !currentTournamentForPDF?.handPreferenceFilter || player.handPreference === currentTournamentForPDF?.handPreferenceFilter || player.handPreference === 'both';
                          let matchesBirthYear = true;
                          if ((currentTournamentForPDF?.birthYearMin || currentTournamentForPDF?.birthYearMax) && player.birthday) {
                            const y = new Date(player.birthday).getFullYear();
                            matchesBirthYear = (!currentTournamentForPDF?.birthYearMin || y >= currentTournamentForPDF?.birthYearMin) && (!currentTournamentForPDF?.birthYearMax || y <= currentTournamentForPDF?.birthYearMax);
                          }
                          return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
                        });
                      }
                    );
                    setPreviewPages(pages);
                    setCurrentPreviewPage(0);
                    setIsBulkPreviewMode(true);
                    setIsBulkPDFModalOpen(false);
                    setIsPDFPreviewModalOpen(true);
                  }}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('tournamentCard.openPreview')}
                </button>
                <button
                  onClick={() => setIsBulkPDFModalOpen(false)}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="h-[calc(85vh-120px)]">
            {/* Main Content - Selection Areas */}
            <div className="p-3 sm:p-6 overflow-y-auto bg-gray-50 h-full">

              {/* Weight Range Selection */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Gösterilecek Fikstürler</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentTournamentForPDF.weightRanges.map(wr => (
                    <div
                      key={wr.id}
                      className={`border-2 rounded-lg p-2 transition-all duration-200 ${
                        selectedBulkRanges[wr.id] 
                          ? 'bg-white hover:border-blue-500 hover:shadow-md cursor-pointer border-blue-500' 
                          : 'bg-white hover:border-blue-400 hover:shadow-md cursor-pointer border-gray-200'
                      }`}
                      onClick={() => setSelectedBulkRanges(prev => ({ ...prev, [wr.id]: !prev[wr.id] }))}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded p-1">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-xs">{wr.name}</h4>
                        </div>
                        {selectedBulkRanges[wr.id] && (
                          <div className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                            Seçili
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-1">
                        <div className="inline-block bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 text-xs px-1.5 py-0.5 rounded font-medium border border-blue-200">
                          {wr.min} - {wr.max} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column Selection */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Gösterilecek PDF Kolonları</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availablePDFColumns.map((column) => (
                    <div
                      key={column.id}
                      className={`border-2 rounded-lg p-3 transition-all duration-200 ${
                        selectedPDFColumns.includes(column.id)
                          ? 'bg-white hover:border-green-500 hover:shadow-md cursor-pointer border-green-500' 
                          : 'bg-white hover:border-green-400 hover:shadow-md cursor-pointer border-gray-200'
                      }`}
                      onClick={() => {
                        if (selectedPDFColumns.includes(column.id)) {
                          setSelectedPDFColumns(selectedPDFColumns.filter(id => id !== column.id));
                        } else {
                          setSelectedPDFColumns([...selectedPDFColumns, column.id]);
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
                            {['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'].includes(column.id)
                              ? t(`players.${column.id}`)
                              : column.name
                            }
                          </h4>
                        </div>
                        {selectedPDFColumns.includes(column.id) && (
                          <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                            Seçili
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Players Per Page - After PDF Columns */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{t('tournamentCard.playersPerPage')}</h3>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.min')}: 1</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.max')}: 40</span>
                  </div>
                  <input
                    type="text"
                    value={bulkPlayersPerPage || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        setBulkPlayersPerPage(0);
                      } else {
                        const n = parseInt(v);
                        if (n >= 1 && n <= 40) setBulkPlayersPerPage(n);
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value || parseInt(e.target.value) < 1) setBulkPlayersPerPage(33);
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-center text-sm font-semibold text-gray-900 outline-none"
                    placeholder="33"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Modern Individual PDF Column Selection Modal */}
    {isPDFColumnModalOpen && (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9998] overflow-hidden animate-in fade-in duration-300"
        onClick={() => {
          setIsPDFColumnModalOpen(false);
          setCurrentTournamentForPDF(null);
          setCurrentWeightRangeForPDF(null);
        }}
      >
        <div 
          className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-2 animate-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with modern styling */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('tournamentCard.pdfColumnSelection')}</h3>
                <p className="text-sm text-gray-600">{t('tournamentCard.selectColumnsForPDF')}</p>
              </div>
            </div>
            <button
              onClick={() => setIsPDFColumnModalOpen(false)}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all duration-200 group"
            >
              <XMarkIcon className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
            </button>
          </div>
          
          {/* Column Selection */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">PDF Kolonları</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">PDF'de görüntülenecek oyuncu bilgilerini seçin</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePDFColumns.map((column) => (
                <label key={column.id} className="group cursor-pointer">
                  <div className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedPDFColumns.includes(column.id)
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedPDFColumns.includes(column.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPDFColumns([...selectedPDFColumns, column.id]);
                        } else {
                          setSelectedPDFColumns(selectedPDFColumns.filter(id => id !== column.id));
                        }
                      }}
                      className="w-5 h-5 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2 transition-all duration-200"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800 block">
                        {['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'].includes(column.id)
                          ? t(`players.${column.id}`)
                          : column.name
                        }
                      </span>
                    </div>
                    {selectedPDFColumns.includes(column.id) && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Players Per Page */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-900">{t('tournamentCard.playersPerPage')}</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">Sayfa başına gösterilecek oyuncu sayısını belirleyin</p>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">{t('tournamentCard.min')}: 1</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">{t('tournamentCard.max')}: 40</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">Önerilen: 33</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="40"
                value={playersPerPage || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setPlayersPerPage(0);
                  } else {
                    const numValue = parseInt(value);
                    if (numValue >= 1 && numValue <= 40) {
                      setPlayersPerPage(numValue);
                    }
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value || parseInt(e.target.value) < 1) {
                    setPlayersPerPage(33);
                  }
                }}
                className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center text-lg font-bold bg-white transition-all duration-200"
                placeholder="33"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-sm text-gray-400 font-medium">oyuncu</span>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (selectedPDFColumns.length === 0) {
                  alert(t('tournamentCard.atLeastOneColumn'));
                  return;
                }
                setIsPDFColumnModalOpen(false);
                if (currentTournamentForPDF && currentWeightRangeForPDF) {
                  handleShowPDFPreview(currentTournamentForPDF, currentWeightRangeForPDF);
                }
              }}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-base font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {t('tournamentCard.openPreview')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modern PDF Preview Modal */}
    {isPDFPreviewModalOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-hidden animate-in fade-in duration-300"
        onClick={() => {
          setIsPDFPreviewModalOpen(false);
          setCurrentTournamentForPDF(null);
          setCurrentWeightRangeForPDF(null);
          setPreviewPages([]);
          setCurrentPreviewPage(0);
        }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden mx-1 sm:mx-2 animate-in slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Template Style (match bulk form) */}
          <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-white">{t('tournamentCard.pdfPreview')}</h2>
                  <p className="text-red-100 mt-1 text-xs sm:text-sm">PDF önizlemesi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsPDFPreviewModalOpen(false);
                    if (isBulkPreviewMode && currentTournamentForPDF) {
                      const selectedRanges = currentTournamentForPDF.weightRanges.filter(wr => selectedBulkRanges[wr.id]);
                      if (selectedRanges.length === 0) return;
                      try {
                        setIsExporting(true);
                        setPdfProgress(0);
                        await generateCombinedTournamentPDF(
                          currentTournamentForPDF,
                          selectedRanges,
                          selectedPDFColumns,
                          bulkPlayersPerPage,
                          availablePDFColumns,
                          (wr) => {
                            return players.filter((player) => {
                              if (wr.excludedPlayerIds?.includes(player.id)) return false;
                              const matchesWeight = Number(player.weight || 0) >= wr.min && Number(player.weight || 0) <= wr.max;
                              const matchesTournamentGender = !currentTournamentForPDF?.genderFilter || player.gender === currentTournamentForPDF?.genderFilter;
                              const matchesTournamentHand = !currentTournamentForPDF?.handPreferenceFilter || player.handPreference === currentTournamentForPDF?.handPreferenceFilter || player.handPreference === 'both';
                              let matchesBirthYear = true;
                              if ((currentTournamentForPDF?.birthYearMin || currentTournamentForPDF?.birthYearMax) && player.birthday) {
                                const y = new Date(player.birthday).getFullYear();
                                matchesBirthYear = (!currentTournamentForPDF?.birthYearMin || y >= currentTournamentForPDF?.birthYearMin) && (!currentTournamentForPDF?.birthYearMax || y <= currentTournamentForPDF?.birthYearMax);
                              }
                              return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
                            });
                          },
                          (p) => setPdfProgress(p)
                        );
                      } catch (error) {
                      } finally {
                        if (pdfProgress < 100) setPdfProgress(100);
                        if (hideProgressTimer.current) window.clearTimeout(hideProgressTimer.current);
                        hideProgressTimer.current = window.setTimeout(() => {
                          setIsExporting(false);
                          setPdfProgress(0);
                        }, 800);
                      }
                      setIsBulkPreviewMode(false);
                    } else {
                      await handleExportPDF();
                    }
                  }}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2 text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('tournamentCard.downloadPDF')}
                </button>
                <button
                  onClick={() => {
                    setIsPDFPreviewModalOpen(false);
                    if (isBulkPreviewMode) {
                      setIsBulkPDFModalOpen(true);
                    } else if (currentTournamentForPDF && currentWeightRangeForPDF) {
                      handleShowPDFColumnModal(currentTournamentForPDF, currentWeightRangeForPDF);
                    }
                  }}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2 text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('tournamentCard.returnToColumnSelection')}
                </button>
                <button
                  onClick={() => setIsPDFPreviewModalOpen(false)}
                  className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content area to match bulk form sizing */}
          <div className="h-[calc(85vh-120px)]">
            <div className="p-3 sm:p-6 overflow-y-auto bg-gray-50 h-full">
              {/* Sticky page navigation toolbar (just below header) */}
              {previewPages.length > 1 && (
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-gray-200 py-4 sm:py-6 mb-4 sm:mb-6 rounded-2xl shadow-lg">
                  <div className="grid grid-cols-3 items-center">
                    <div className="flex justify-start pl-2 sm:pl-4">
                      <button
                        onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                        disabled={currentPreviewPage === 0}
                        className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('tournamentCard.previousPage')}
                      </button>
                    </div>
                    <div className="flex justify-center">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl border border-blue-200">
                        <span className="text-sm sm:text-base font-bold text-blue-800">
                          {t('tournamentCard.page')} {currentPreviewPage + 1} / {previewPages.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end pr-2 sm:pr-4">
                      <button
                        onClick={() => setCurrentPreviewPage(Math.min(previewPages.length - 1, currentPreviewPage + 1))}
                        disabled={currentPreviewPage === previewPages.length - 1}
                        className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2"
                      >
                        {t('tournamentCard.nextPage')}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modern Preview Container */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8 rounded-2xl border-2 border-dashed border-gray-300 overflow-auto">
                {/* Navigation moved above; keep container clean */}

                <div className="flex justify-start overflow-auto" ref={previewContainerRef as any}>
                  {/* dynamic left spacer to keep centered when content narrower than viewport */}
                  <div style={{ width: `${previewLeftPad}px`, flex: '0 0 auto' }} />
                  <div
                    className="flex-none"
                    style={{
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      width: 'fit-content',
                      willChange: 'transform'
                    }}
                  >
                    <div
                      className="pdf-preview-content"
                      ref={previewContentRef as any}
                      dangerouslySetInnerHTML={{ __html: previewPages[currentPreviewPage] }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 text-center px-2">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm sm:text-base text-blue-800 leading-relaxed font-medium">
                    Bu, PDF'inizin nasıl görüneceğinin önizlemesidir. PDF'i indirmek için üstteki "PDF İndir" butonunu kullanabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

        {/* Create Tournament Modal */}
        <CreateTournamentModal
          isOpen={isCreateModalOpen}
          onClose={() => {
                      setIsCreateModalOpen(false);
                      setIsEditMode(false);
                      setEditingTournamentId(null);
          }}
          onSubmit={isEditMode ? handleSaveEdit : handleCreateTournament}
          isEditMode={isEditMode}
          initialData={isEditMode && editingTournamentId ? (() => {
            const tournament = tournaments.find(t => t.id === editingTournamentId);
            if (!tournament) return undefined;
            return {
              name: tournament.name,
              weightRanges: tournament.weightRanges,
              genderFilter: tournament.genderFilter || null,
              handPreferenceFilter: tournament.handPreferenceFilter || null,
              birthYearMin: tournament.birthYearMin || null,
              birthYearMax: tournament.birthYearMax || null,
            };
          })() : undefined}
        />

        {/* Template Selection Modal */}
        <TemplateSelectionModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onTemplateSelect={handleTemplateSelect}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          message={confirmationModal.message}
          type={confirmationModal.type || 'danger'}
        />
    </>
  );
};

export default Tournaments; 