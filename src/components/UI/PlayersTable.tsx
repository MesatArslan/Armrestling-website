import * as React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useDeferredValue } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '../../types';
import { useTranslation } from 'react-i18next';
import OpponentsModal from './OpponentsModal';

interface Column {
  id: string;
  name: string;
  visible: boolean;
}

interface ExtendedPlayer extends Player {
  [key: string]: any;
}

interface WeightFilter {
  min: number | null;
  max: number | null;
}

interface ColumnFilter {
  [key: string]: string | null;
}

interface PlayersTableProps {
  players: ExtendedPlayer[];
  onPlayersChange: (players: ExtendedPlayer[]) => void;
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showAddRow?: boolean;
  showDeleteColumn?: boolean;
  onDeletePlayer?: (playerId: string) => void;
  className?: string;
  showFilters?: boolean;
  allPlayers?: Array<{ id: string; name: string; surname: string }>;
  scrollToBottomTrigger?: number;
  scrollToPlayerId?: string;
}

const PlayersTable: React.FC<PlayersTableProps> = ({
  players,
  onPlayersChange,
  columns,
  onColumnsChange,
  searchTerm,
  showAddRow = true,
  showDeleteColumn = true,
  onDeletePlayer,
  className = "",
  showFilters = true,
  allPlayers = [],
  scrollToBottomTrigger,
  scrollToPlayerId
}) => {
  const { t } = useTranslation();
  const normalizeForFilter = (text: string): string =>
    (text || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, ' ');
  const [editingCell, setEditingCell] = useState<{ id: string; column: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isWeightFilterOpen, setIsWeightFilterOpen] = useState(false);
  const [weightFilter, setWeightFilter] = useState<WeightFilter>({ min: null, max: null });
  const [newPlayer, setNewPlayer] = useState<Partial<ExtendedPlayer>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const weightFilterRef = useRef<HTMLDivElement>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [loadedCount, setLoadedCount] = useState(300);
  const [customWeightRanges, setCustomWeightRanges] = useState<Array<{ id: string; min: number | null; max: number | null }>>([]);
  const [newWeightRange, setNewWeightRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [showAddRangeForm, setShowAddRangeForm] = useState(false);
  const [isEditRangesMode, setIsEditRangesMode] = useState(false);
  const [selectedRangeIds, setSelectedRangeIds] = useState<string[]>([]);
  const [isOpponentsModalOpen, setIsOpponentsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    playerName: string;
    playerSurname: string;
    opponents: Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
  } | null>(null);

  // Virtualization constants
  const ROW_HEIGHT = 56; // px
  const OVERSCAN = 8; // extra rows above/below viewport
  const MIN_VISIBLE_ROWS = 7;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideColumnMenu = filterRef.current && filterRef.current.contains(target);
      const clickedInsideWeightMenu = weightFilterRef.current && weightFilterRef.current.contains(target);
      if (!clickedInsideColumnMenu && !clickedInsideWeightMenu) {
        setOpenFilter(null);
        setIsWeightFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset filter search text when opening/closing a column filter
  useEffect(() => {
    setFilterSearch('');
  }, [openFilter]);

  // Reset add/edit state when closing weight filter panel
  useEffect(() => {
    if (!isWeightFilterOpen) {
      setShowAddRangeForm(false);
      setIsEditRangesMode(false);
      setSelectedRangeIds([]);
      setNewWeightRange({ min: '', max: '' });
    }
  }, [isWeightFilterOpen]);

  // Measure viewport and update on resize
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const setSize = () => setViewportHeight(container.clientHeight);
    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, []);

  // Smooth scroll to bottom when triggered by parent (e.g., after adding a new row)
  useEffect(() => {
    if (scrollToBottomTrigger == null) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    // Delay to ensure new row is rendered
    const id = window.setTimeout(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [scrollToBottomTrigger]);

  // Scroll to a specific player row when requested
  useEffect(() => {
    if (!scrollToPlayerId) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    // Ensure we land at the very bottom so the newly added row is fully visible
    // Use a two-step approach in case virtualization delays rendering
    const t1 = window.setTimeout(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
      const t2 = window.setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }, 60);
      return () => window.clearTimeout(t2);
    }, 60);
    return () => window.clearTimeout(t1);
  }, [scrollToPlayerId]);

  // Persist custom weight ranges to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('playersTable.customWeightRanges');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomWeightRanges(parsed);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('playersTable.customWeightRanges', JSON.stringify(customWeightRanges));
    } catch {}
  }, [customWeightRanges]);

  const getUniqueValues = (columnId: string) => {
    const map = new Map<string, string>(); // normalized -> display
    for (const player of players) {
      let raw = player[columnId];
      if (raw === undefined || raw === null) continue;
      let display = String(raw).trim();
      if (!display) continue;
      if (columnId === 'gender') display = t(`players.${display}`);
      if (columnId === 'handPreference') display = t(`players.${display}`);
      const norm = normalizeForFilter(display);
      if (!map.has(norm)) map.set(norm, display);
    }
    return [t('players.all'), ...Array.from(map.values())];
  };

  // Build counts for values shown in the filter menu
  const getValueCounts = (columnId: string) => {
    const counts = new Map<string, number>(); // normalized -> count
    for (const p of players) {
      let raw: any = p[columnId];
      if (raw === undefined || raw === null || String(raw).trim() === '') continue;
      let display = String(raw).trim();
      if (columnId === 'gender') display = t(`players.${display}`);
      if (columnId === 'handPreference') display = t(`players.${display}`);
      const norm = normalizeForFilter(display);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
    return counts;
  };

  const handleOpenOpponentsModal = (playerName: string, playerSurname: string, opponents: Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>) => {
    setModalData({ playerName, playerSurname, opponents });
    setIsOpponentsModalOpen(true);
  };

  const handleFilterChange = (columnId: string, value: string) => {
    // Gender ve handPreference için ters çeviri
    if (value === t('players.all')) {
      setColumnFilters(prev => ({ ...prev, [columnId]: null }));
      return;
    }
    if (columnId === 'gender') {
      const code = value === t('players.male') ? 'male' : value === t('players.female') ? 'female' : null;
      setColumnFilters(prev => ({ ...prev, [columnId]: code }));
      return;
    }
    if (columnId === 'handPreference') {
      let code: any = null;
      if (value === t('players.left')) code = 'left';
      else if (value === t('players.right')) code = 'right';
      else if (value === t('players.both')) code = 'both';
      setColumnFilters(prev => ({ ...prev, [columnId]: code }));
      return;
    }
    // Other columns: store normalized value for case-insensitive filtering
    setColumnFilters(prev => ({ ...prev, [columnId]: normalizeForFilter(value) }));
  };

  const handleDeletePlayer = useCallback((playerId: string) => {
    if (onDeletePlayer) {
      onDeletePlayer(playerId);
    } else {
      if (window.confirm('Are you sure you want to delete this player?')) {
        onPlayersChange(players.filter(player => player.id !== playerId));
      }
    }
  }, [onDeletePlayer, onPlayersChange, players]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    // Map visible indices to actual indices in the full columns array
    const visibleToActual = columns
      .map((col, idx) => (col.visible ? idx : -1))
      .filter((idx) => idx !== -1);

    const sourceActualIndex = visibleToActual[result.source.index];
    const destinationActualIndex = visibleToActual[result.destination.index];
    if (sourceActualIndex == null || destinationActualIndex == null) return;

    const next = Array.from(columns);
    const [moved] = next.splice(sourceActualIndex, 1);
    next.splice(destinationActualIndex, 0, moved);

    onColumnsChange(next);
  };

  // Offset the drag preview by +20px on X and -20px on Y
  const getDragOffsetStyle = (
    style: React.CSSProperties | undefined,
    snapshot: { isDragging: boolean }
  ): React.CSSProperties | undefined => {
    if (!snapshot.isDragging || !style || !style.transform) return style;
    const transform = style.transform as string;
    const match = transform.match(/translate\(([-0-9.]+)px, ([-0-9.]+)px\)/);
    if (!match) return style;
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const newTransform = `translate(${x - 116}px, ${y - 65}px)`;
    return { ...style, transform: newTransform } as React.CSSProperties;
  };

  const handleCellClick = useCallback((playerId: string, columnId: string, value: any) => {
    if (columnId === 'gender') {
      const newGender = value === 'male' ? 'female' : 'male';
      onPlayersChange(players.map(player => 
        player.id === playerId 
          ? { ...player, gender: newGender }
          : player
      ));
      return;
    }
    
    if (columnId === 'handPreference') {
      return;
    }
    // Do not allow editing Opponents column; it only opens the modal
    if (columnId === 'opponents') {
      return;
    }
    
    setEditingCell({ id: playerId, column: columnId });
    setEditingValue(value ? String(value) : '');
  }, [onPlayersChange, players]);

  const handleHandPreferenceChange = useCallback((playerId: string, hand: 'left' | 'right') => {
    onPlayersChange(players.map(player => {
      if (player.id === playerId) {
        const currentPreference = player.handPreference;
        let newPreference: 'left' | 'right' | 'both';
        
        if (hand === 'left') {
          if (currentPreference === 'left') {
            newPreference = 'right';
          } else if (currentPreference === 'right') {
            newPreference = 'both';
          } else {
            newPreference = 'right';
          }
        } else {
          if (currentPreference === 'right') {
            newPreference = 'left';
          } else if (currentPreference === 'left') {
            newPreference = 'both';
          } else {
            newPreference = 'left';
          }
        }
        
        return { ...player, handPreference: newPreference };
      }
      return player;
    }));
  }, [onPlayersChange, players]);

  // Scroll handler with infinite loading
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - ROW_HEIGHT * 2;
    if (nearBottom) {
      setLoadedCount(prev => Math.min(prev + 200, Number.MAX_SAFE_INTEGER));
    }
  }, []);

  const handleCellEdit = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingValue(e.target.value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      onPlayersChange(players.map(player => 
        player.id === editingCell.id 
          ? { ...player, [editingCell.column]: editingValue || null }
          : player
      ));
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleWeightFilterChange = (type: 'min' | 'max', value: string) => {
    setWeightFilter(prev => ({
      ...prev,
      [type]: value === '' ? null : parseFloat(value)
    }));
  };

  const handleWeightFilterClear = () => {
    setWeightFilter({ min: null, max: null });
    setIsWeightFilterOpen(false);
  };

  const handleNewPlayerChange = (columnId: string, value: string) => {
    setNewPlayer(prev => ({
      ...prev,
      [columnId]: columnId === 'weight' ? parseFloat(value) || '' : value
    }));
  };

  const handleNewPlayerKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      if (newPlayer.name && newPlayer.surname && newPlayer.weight && newPlayer.gender && newPlayer.handPreference) {
        const player: Player = {
          id: uuidv4(),
          name: newPlayer.name,
          surname: newPlayer.surname,
          weight: newPlayer.weight,
          gender: newPlayer.gender,
          handPreference: newPlayer.handPreference,
          city: newPlayer.city || ''
        };
        onPlayersChange([...players, player]);
        setNewPlayer({});
        setTimeout(() => {
          const nameInput = document.querySelector('input[placeholder="Enter name"]') as HTMLInputElement;
          if (nameInput) nameInput.focus();
        }, 0);
      }
    }
  };

  const handleNewPlayerHandPreferenceChange = (hand: 'left' | 'right') => {
    const currentPreference = newPlayer.handPreference;
    let newPreference: 'left' | 'right' | 'both';
    
    if (hand === 'left') {
      if (currentPreference === 'left') {
        newPreference = 'right';
      } else if (currentPreference === 'right') {
        newPreference = 'both';
      } else if (currentPreference === 'both') {
        newPreference = 'right';
      } else {
        newPreference = 'left';
      }
    } else {
      if (currentPreference === 'right') {
        newPreference = 'left';
      } else if (currentPreference === 'left') {
        newPreference = 'both';
      } else if (currentPreference === 'both') {
        newPreference = 'left';
      } else {
        newPreference = 'right';
      }
    }
    
    setNewPlayer(prev => ({
      ...prev,
      handPreference: newPreference
    }));
  };

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const filteredPlayers = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
    const tokens = normalizedSearch.length > 0 ? normalizedSearch.split(/\s+/).filter(Boolean) : [];
    return players.filter(player => {
      const nameSurnameCombined = `${(player.name || '').toString()} ${(player.surname || '').toString()}`.trim().toLowerCase();
      const playerValuesLower = Object.values(player).map(v => String(v).toLowerCase());

      const matchesSearch = tokens.length === 0
        ? true
        : tokens.every(token =>
            nameSurnameCombined.includes(token) || playerValuesLower.some(val => val.includes(token))
          );

      const matchesWeight =
        (weightFilter.min === null || player.weight >= weightFilter.min) &&
        (weightFilter.max === null || player.weight <= weightFilter.max);

      const matchesColumnFilters = Object.entries(columnFilters).every(([columnId, filterValue]) => {
        if (filterValue === null) return true;
        if (columnId === 'gender' || columnId === 'handPreference') {
          return String(player[columnId]).trim() === String(filterValue);
        }
        return normalizeForFilter(String(player[columnId])) === String(filterValue);
      });

      return matchesSearch && matchesWeight && matchesColumnFilters;
    });
  }, [players, deferredSearchTerm, weightFilter.min, weightFilter.max, columnFilters]);

  const displayedPlayers = useMemo(() => filteredPlayers.slice(0, loadedCount), [filteredPlayers, loadedCount]);

  // Visible columns memoized
  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  // Virtual window over displayed players
  const totalRows = displayedPlayers.length;
  const estimatedVisibleCount = Math.ceil((viewportHeight || 1) / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalRows - 1, startIndex + estimatedVisibleCount - 1);
  const virtualPlayers = useMemo(
    () => displayedPlayers.slice(startIndex, endIndex + 1),
    [displayedPlayers, startIndex, endIndex]
  );
  const topPadding = startIndex * ROW_HEIGHT;
  const bottomPadding = Math.max(0, (totalRows - endIndex - 1) * ROW_HEIGHT);
  const minRowsPadding = Math.max(0, (MIN_VISIBLE_ROWS - totalRows) * ROW_HEIGHT);
  const bottomSpacerHeight = Math.max(bottomPadding, minRowsPadding);

  const renderCellContent = (player: ExtendedPlayer, column: Column) => {
    if (editingCell?.id === player.id && editingCell?.column === column.id) {
      return (
        <input
          type={column.id === 'weight' ? 'number' : column.id === 'birthday' ? 'date' : 'text'}
          step={column.id === 'weight' ? '0.1' : undefined}
          value={editingValue}
          onChange={handleCellEdit}
          onBlur={handleCellBlur}
          onKeyDown={handleCellKeyDown}
          className={`w-full bg-transparent outline-none text-base font-semibold ${
            column.id === 'name' ? 'text-blue-700' :
            column.id === 'surname' ? 'text-gray-900' :
            column.id === 'weight' ? 'text-gray-800' :
            'text-gray-700'
          }`}
          autoFocus
        />
      );
    } else {
      let displayValue = player[column.id] || '';
      let className = `text-base font-semibold ${
        column.id === 'name' ? 'text-blue-700' :
        column.id === 'surname' ? 'text-gray-900' :
        column.id === 'weight' ? 'text-gray-800' :
        'text-gray-700'
      }`;
      
      if (column.id === 'handPreference') {
        const isLeftSelected = player.handPreference === 'left' || player.handPreference === 'both';
        const isRightSelected = player.handPreference === 'right' || player.handPreference === 'both';
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleHandPreferenceChange(player.id, 'left')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${
                isLeftSelected
                  ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isLeftSelected
                  ? 'border-white bg-white'
                  : 'border-gray-400 bg-transparent'
              }`}>
                {isLeftSelected && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
              <span>{t('players.left')}</span>
            </button>
            <button
              onClick={() => handleHandPreferenceChange(player.id, 'right')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${
                isRightSelected
                  ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isRightSelected
                  ? 'border-white bg-white'
                  : 'border-gray-400 bg-transparent'
              }`}>
                {isRightSelected && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </div>
              <span>{t('players.right')}</span>
            </button>
          </div>
        );
      } else if (column.id === 'gender') {
        displayValue = t(`players.${displayValue}`);
        className += ' cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors';
      } else if (column.id === 'opponents') {
        const opponents = player.opponents || [];
        if (!opponents || opponents.length === 0) {
          return (
            <span className="text-gray-400 text-sm italic">
              {t('opponentsModal.noOpponentsYet')}
            </span>
          );
        }
        
        return (
          <OpponentsCell 
            opponents={opponents}
            playerName={player.name || ''}
            playerSurname={player.surname || ''}
            allPlayers={allPlayers}
            onOpenModal={handleOpenOpponentsModal}
          />
        );
      }
      
      // HandPreference hücresinde sadece "left", "right" veya "both" yazıyorsa çevir:
      if (column.id === 'handPreference' && typeof displayValue === 'string') {
        displayValue = t(`players.${displayValue}`);
      }

      return (
        <span className={className}>
          {displayValue}
        </span>
      );
    }
  };

  const renderNewPlayerInput = (column: Column) => {
    if (column.id === 'gender') {
      return (
        <select
          value={newPlayer[column.id] || ''}
          onChange={(e) => handleNewPlayerChange(column.id, e.target.value)}
          onKeyDown={handleNewPlayerKeyDown}
          className="w-full px-2 py-1 bg-transparent border-0 text-sm text-gray-700 focus:outline-none focus:ring-0"
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      );
    } else if (column.id === 'handPreference') {
      const isLeftSelected = newPlayer.handPreference === 'left' || newPlayer.handPreference === 'both';
      const isRightSelected = newPlayer.handPreference === 'right' || newPlayer.handPreference === 'both';
      
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleNewPlayerHandPreferenceChange('left')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              isLeftSelected
                ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              isLeftSelected
                ? 'border-white bg-white'
                : 'border-gray-400 bg-transparent'
            }`}>
              {isLeftSelected && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <span>Left</span>
          </button>
          
          <button
            onClick={() => handleNewPlayerHandPreferenceChange('right')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              isRightSelected
                ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              isRightSelected
                ? 'border-white bg-white'
                : 'border-gray-400 bg-transparent'
            }`}>
              {isRightSelected && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            <span>Right</span>
          </button>
          
          {/* Status indicator kaldırıldı */}
        </div>
      );
    } else {
      return (
        <input
          type={column.id === 'weight' ? 'number' : column.id === 'birthday' ? 'date' : 'text'}
          step={column.id === 'weight' ? '0.1' : undefined}
          value={newPlayer[column.id] || ''}
          onChange={(e) => handleNewPlayerChange(column.id, e.target.value)}
          onKeyDown={handleNewPlayerKeyDown}
          placeholder={column.id === 'birthday' ? '' : `Enter ${column.name.toLowerCase()}`}
          className="w-full px-2 py-1 bg-transparent border-0 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-0"
          autoFocus={column.id === 'name' && Object.keys(newPlayer).length === 0}
        />
      );
    }
  };

  const defaultColumnIds = ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'];

  const formatRangeLabel = (min: number | null, max: number | null) => {
    if (min == null && max == null) return 'All';
    if (min == null) return `≤ ${max}`;
    if (max == null) return `≥ ${min}`;
    return `${min}–${max}`;
  };

  const getCountForWeightRange = useCallback(
    (min: number | null, max: number | null) => {
      const normalizedSearch = (searchTerm || '').trim().toLowerCase();
      const tokens = normalizedSearch.length > 0 ? normalizedSearch.split(/\s+/).filter(Boolean) : [];
      let count = 0;
      for (const player of players) {
        const nameSurnameCombined = `${(player.name || '').toString()} ${(player.surname || '').toString()}`.trim().toLowerCase();
        const playerValuesLower = Object.values(player).map(v => String(v).toLowerCase());
        const matchesSearch = tokens.length === 0
          ? true
          : tokens.every(token => nameSurnameCombined.includes(token) || playerValuesLower.some(val => val.includes(token)));
        if (!matchesSearch) continue;
        const matchesColumnFilters = Object.entries(columnFilters).every(([columnId, filterValue]) => {
          if (filterValue === null) return true;
          return String(player[columnId]).trim() === filterValue;
        });
        if (!matchesColumnFilters) continue;
        const weightOk = (min == null || player.weight >= min) && (max == null || player.weight <= max);
        if (weightOk) count += 1;
      }
      return count;
    },
    [players, searchTerm, columnFilters]
  );

  const currentWeightMatches = useMemo(
    () => getCountForWeightRange(weightFilter.min, weightFilter.max),
    [getCountForWeightRange, weightFilter.min, weightFilter.max]
  );

  const getResponsiveVisibilityClass = (_visibleIndex: number) => {
    // Tüm cihazlarda tüm sütunlar görünsün; yatay kaydırma için dış sarmalayıcı zaten overflow-x-auto.
    return 'table-cell';
  };

  const getColumnWidthClass = (columnId: string) => {
    switch (columnId) {
      case 'name':
        return 'w-56 min-w-[14rem]';
      case 'surname':
        return 'w-48 min-w-[12rem]';
      case 'city':
        return 'w-48 min-w-[12rem]';
      case 'birthday':
        return 'w-40 min-w-[10rem]';
      case 'handPreference':
        return 'w-44 min-w-[11rem]';
      case 'gender':
        return 'w-40 min-w-[10rem]';
      case 'weight':
        return 'w-28 min-w-[7rem]';
      default:
        return 'w-44 min-w-[11rem]';
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`overflow-x-auto overflow-y-auto max-h-[70vh] mt-6 ${className}`}
    >
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns" direction="horizontal">
              {(provided) => (
                <tr
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-white"
                >
                  <th className="w-8 p-1 font-bold text-gray-900 text-sm sm:text-base bg-white border-b border-r border-gray-100 text-center sticky top-0 z-20">#</th>
                  {visibleColumns.map((column, visibleIndex) => {
                    const responsiveCls = getResponsiveVisibilityClass(visibleIndex);
                    return (
                      <Draggable key={column.id} draggableId={column.id} index={visibleIndex}>
                        {(provided, snapshot) => (
                          <th
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={getDragOffsetStyle(provided.draggableProps.style as React.CSSProperties | undefined, snapshot)}
                            className={`p-3 ${getColumnWidthClass(column.id)} bg-white border-b border-r ${snapshot.isDragging ? 'border-blue-500 border-2' : 'border-gray-100'} ${responsiveCls} sticky top-0 z-20`}
                          >
                              {column.visible && (
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                                      {defaultColumnIds.includes(column.id) ? t(`players.${column.id}`) : column.name}
                                    </span>
                                     {showFilters && column.id === 'weight' ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsWeightFilterOpen(!isWeightFilterOpen);
                                        }}
                                        className={`p-1 rounded transition-colors duration-200 ${
                                          (weightFilter.min !== null || weightFilter.max !== null) 
                                            ? 'text-blue-600 hover:bg-blue-50' 
                                            : 'text-gray-400 hover:bg-gray-50'
                                        }`}
                                      >
                                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${
                                          isWeightFilterOpen ? 'transform rotate-180' : ''
                                        }`} />
                                      </button>
                                     ) : showFilters && !['name', 'surname'].includes(column.id) && (
                                      <div className="relative" ref={filterRef}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenFilter(openFilter === column.id ? null : column.id);
                                          }}
                                          className={`px-2 py-1 rounded-md transition-colors duration-200 border ${
                                            columnFilters[column.id]
                                              ? 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
                                              : 'text-gray-500 border-gray-200 bg-white hover:bg-gray-50'
                                          } shadow-sm`}
                                        >
                                          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${
                                            openFilter === column.id ? 'transform rotate-180' : ''
                                          }`} />
                                        </button>
                                        {openFilter === column.id && (
                                          <div
                                            className="absolute right-0 mt-2 min-w-[14rem] bg-white rounded-2xl shadow-xl ring-1 ring-black/5 z-30"
                                            onMouseDown={(e) => e.stopPropagation()}
                                          >
                                            <div className="p-3 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                                              <input
                                                autoFocus
                                                value={filterSearch}
                                                onChange={(e) => setFilterSearch(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Escape') setOpenFilter(null);
                                                }}
                                                placeholder="Search options..."
                                                className="w-full px-3 py-2 text-sm text-gray-800 placeholder-gray-500 bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                              />
                                            </div>
                                            <div className="py-2 max-h-64 overflow-y-auto">
                                              {(() => {
                                                const counts = getValueCounts(column.id);
                                                const allValues = getUniqueValues(column.id);
                                                const [allLabel, ...rest] = allValues;
                                                const filtered = rest.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
                                                const finalValues = [allLabel, ...filtered];
                                                return finalValues.map((value) => {
                                                // Derive display of current filter for highlighting
                                                let currentDisplay: string | null = null;
                                                const stored = columnFilters[column.id];
                                                if (stored == null) {
                                                  currentDisplay = t('players.all');
                                                } else if (column.id === 'gender') {
                                                  currentDisplay = t(`players.${stored}`);
                                                } else if (column.id === 'handPreference') {
                                                  currentDisplay = t(`players.${stored}`);
                                                } else {
                                                  currentDisplay = String(stored);
                                                }
                                                const isSelected = currentDisplay === value;
                                                  const count = value === allLabel ? players.length : (counts.get(normalizeForFilter(value)) || 0);
                                                return (
                                                  <button
                                                    key={value}
                                                    onClick={() => handleFilterChange(column.id, value)}
                                                      className={`flex items-center justify-between w-full px-3 py-2 text-sm ${
                                                      isSelected
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                      <span className="flex items-center min-w-0">
                                                    <span
                                                      className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                                                        isSelected
                                                          ? 'border-blue-600 bg-blue-600 text-white'
                                                          : 'border-gray-300 text-transparent'
                                                      }`}
                                                    >
                                                      ✓
                                                    </span>
                                                    <span className="truncate">{value}</span>
                                                      </span>
                                                      <span className="ml-3 inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{count}</span>
                                                  </button>
                                                );
                                                });
                                              })()}
                                            </div>
                                            <div className="p-2 border-t border-gray-100 flex gap-2 justify-end bg-white rounded-b-2xl">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setColumnFilters(prev => ({ ...prev, [column.id]: null }));
                                                }}
                                                className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                                              >
                                                Clear
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenFilter(null);
                                                }}
                                                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                              >
                                                Done
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {column.id === 'weight' && isWeightFilterOpen && (
                                    <div
                                      ref={weightFilterRef}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 z-30"
                                    >
                                      <div className="p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="text-sm font-semibold text-gray-800">Weight range</div>
                                          <div className="text-xs text-gray-600">
                                            {currentWeightMatches} oyuncu
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-xs text-gray-500 mb-1">Min</label>
                                            <div className="relative">
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={weightFilter.min || ''}
                                          onChange={(e) => handleWeightFilterChange('min', e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setIsWeightFilterOpen(false); }}
                                                placeholder="e.g. 70"
                                                className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                              />
                                              <span className="absolute inset-y-0 right-2 flex items-center text-xs text-gray-400">kg</span>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="block text-xs text-gray-500 mb-1">Max</label>
                                            <div className="relative">
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={weightFilter.max || ''}
                                          onChange={(e) => handleWeightFilterChange('max', e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') setIsWeightFilterOpen(false); }}
                                                placeholder="e.g. 90"
                                                className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                              />
                                              <span className="absolute inset-y-0 right-2 flex items-center text-xs text-gray-400">kg</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="text-xs text-gray-500">Quick ranges</div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => {
                                                  setShowAddRangeForm(prev => !prev);
                                                  setIsEditRangesMode(false);
                                                  setSelectedRangeIds([]);
                                                }}
                                                className="px-2 py-1 text-[11px] rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                                title="Add range"
                                              >
                                                ＋
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setIsEditRangesMode(prev => !prev);
                                                  setShowAddRangeForm(false);
                                                  setNewWeightRange({ min: '', max: '' });
                                                }}
                                                className={`px-2 py-1 text-[11px] rounded-md border ${isEditRangesMode ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                                                title="Edit ranges"
                                              >
                                                Edit
                                              </button>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-2 mb-3">
                                            {customWeightRanges.map((r) => {
                                              const isSelected = selectedRangeIds.includes(r.id);
                                              return (
                                                <button
                                                  key={r.id}
                                                  onClick={() => {
                                                    if (isEditRangesMode) {
                                                      setSelectedRangeIds(prev => (
                                                        prev.includes(r.id)
                                                          ? prev.filter(id => id !== r.id)
                                                          : [...prev, r.id]
                                                      ));
                                                    } else {
                                                      setWeightFilter({ min: r.min, max: r.max });
                                                    }
                                                  }}
                                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border ${isSelected ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-800'} ${isEditRangesMode ? 'cursor-pointer' : ''}`}
                                                  title={isEditRangesMode ? 'Select to delete' : 'Apply'}
                                                >
                                                  {formatRangeLabel(r.min, r.max)}
                                                </button>
                                              );
                                            })}
                                          </div>
                                          {isEditRangesMode && (
                                            <div className="mt-2 flex justify-end">
                                              <button
                                                disabled={selectedRangeIds.length === 0}
                                                onClick={() => {
                                                  if (selectedRangeIds.length === 0) return;
                                                  setCustomWeightRanges(prev => prev.filter(r => !selectedRangeIds.includes(r.id)));
                                                  setSelectedRangeIds([]);
                                                }}
                                                className={`px-3 py-1.5 text-xs rounded-md ${selectedRangeIds.length === 0 ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                                              >
                                                Delete selected
                                              </button>
                                            </div>
                                          )}

                                          {showAddRangeForm && (
                                            <div className="mt-3 grid grid-cols-5 items-end gap-2">
                                              <div className="col-span-2">
                                                <label className="block text-xs text-gray-500 mb-1">Min</label>
                                                <input
                                                  value={newWeightRange.min}
                                                  onChange={(e) => setNewWeightRange(s => ({ ...s, min: e.target.value }))}
                                                  placeholder="min"
                                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                />
                                              </div>
                                              <div className="text-center pb-2">–</div>
                                              <div className="col-span-2">
                                                <label className="block text-xs text-gray-500 mb-1">Max</label>
                                                <input
                                                  value={newWeightRange.max}
                                                  onChange={(e) => setNewWeightRange(s => ({ ...s, max: e.target.value }))}
                                                  placeholder="max"
                                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                />
                                              </div>
                                              <button
                                                onClick={() => {
                                                  const min = newWeightRange.min.trim() === '' ? null : Number(newWeightRange.min);
                                                  const max = newWeightRange.max.trim() === '' ? null : Number(newWeightRange.max);
                                                  if ((min != null && Number.isNaN(min)) || (max != null && Number.isNaN(max))) return;
                                                  const id = `${min ?? 'null'}_${max ?? 'null'}_${Date.now()}`;
                                                  setCustomWeightRanges(prev => [...prev, { id, min, max }]);
                                                  setNewWeightRange({ min: '', max: '' });
                                                  setShowAddRangeForm(false);
                                                }}
                                                className="col-span-5 mt-2 px-3 py-1.5 text-xs rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                              >
                                                Add range
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="px-3 pb-3 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleWeightFilterClear();
                                          }}
                                          className="px-3 py-1.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                                        >
                                          Clear
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIsWeightFilterOpen(false);
                                          }}
                                          className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                          </th>
                        )}
                      </Draggable>
                    );
                  })}
                  {showDeleteColumn && (
                    <th className="w-12 p-1 font-bold text-gray-900 text-lg bg-white border-b border-r border-gray-100 text-center sticky top-0 z-20">
                      {t('players.delete')}
                    </th>
                  )}
                  {provided.placeholder}
                </tr>
              )}
            </Droppable>
          </DragDropContext>
        </thead>
        <tbody className="bg-white/80 divide-y divide-gray-100">
          {topPadding > 0 && (
            <tr aria-hidden="true">
              <td
                style={{ height: topPadding }}
                className="p-0"
                colSpan={1 + visibleColumns.length + (showDeleteColumn ? 1 : 0)}
              />
            </tr>
          )}

          {virtualPlayers.map((player, i) => {
            const globalIndex = startIndex + i;
            return (
              <tr id={`player-row-${player.id}`} key={player.id} className="hover:bg-blue-50/60 transition-all duration-200 rounded-xl shadow-md" style={{ height: ROW_HEIGHT }}>
                <td className="w-8 px-1 py-2 text-sm sm:text-base font-semibold text-gray-700 bg-white/80 border-r border-gray-100 text-center rounded-l-xl">{globalIndex + 1}</td>
              {visibleColumns.map((column, visibleBodyIndex) => {
                const responsiveCls = getResponsiveVisibilityClass(visibleBodyIndex);
                return (
                  <td
                    key={column.id}
                    className={`px-3 py-2 whitespace-nowrap text-sm sm:text-base border-r border-gray-100 bg-white/70 ${responsiveCls} ${getColumnWidthClass(column.id)}`}
                    onClick={() => handleCellClick(player.id, column.id, player[column.id])}
                  >
                    {renderCellContent(player, column)}
                  </td>
                );
              })}
              {showDeleteColumn && (
                <td className="w-12 px-2 py-2 text-center border-r border-gray-100 bg-white/70 rounded-r-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlayer(player.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                    title="Delete player"
                  >
                    ×
                  </button>
                </td>
              )}
            </tr>
            );
          })}

          {bottomSpacerHeight > 0 && (
            <tr aria-hidden="true">
              <td
                style={{ height: bottomSpacerHeight }}
                className="p-0"
                colSpan={1 + visibleColumns.length + (showDeleteColumn ? 1 : 0)}
              />
            </tr>
          )}
          {showAddRow && (
            <tr className="hover:bg-blue-50/60 transition-all duration-200 rounded-xl shadow">
              <td className="w-8 px-1 py-2 text-sm sm:text-base font-semibold text-gray-400 bg-white/80 border-r border-gray-100 text-center rounded-l-xl">
                {filteredPlayers.length + 1}
              </td>
              {visibleColumns.map((column, visibleAddRowIndex) => {
                const responsiveCls = getResponsiveVisibilityClass(visibleAddRowIndex);
                return (
                  <td
                    key={column.id}
                    className={`px-3 py-2 whitespace-nowrap text-sm sm:text-base border-r border-gray-100 bg-white/70 ${responsiveCls}`}
                  >
                    {renderNewPlayerInput(column)}
                  </td>
                );
              })}
              {showDeleteColumn && (
                <td className="w-12 px-2 py-2 text-center border-r border-gray-100 bg-white/70 rounded-r-xl"></td>
              )}
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Opponents Modal */}
      {modalData && (
        <OpponentsModal
          isOpen={isOpponentsModalOpen}
          onClose={() => {
            setIsOpponentsModalOpen(false);
            setModalData(null);
          }}
          playerName={modalData.playerName}
          playerSurname={modalData.playerSurname}
          opponents={modalData.opponents}
          allPlayers={allPlayers}
        />
      )}
    </div>
  );
};

// Opponents Cell Component
interface OpponentsCellProps {
  opponents: Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
  playerName: string;
  playerSurname: string;
  allPlayers: Array<{ id: string; name: string; surname: string }>;
  onOpenModal: (playerName: string, playerSurname: string, opponents: Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>) => void;
}

const OpponentsCell: React.FC<OpponentsCellProps> = ({ opponents, playerName, playerSurname, onOpenModal }) => {
  const { t } = useTranslation();
  if (opponents.length === 0) {
    return (
      <span className="text-gray-400 text-sm italic">
        {t('opponentsModal.noOpponentsYet')}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => onOpenModal(playerName, playerSurname, opponents)}
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors duration-200 group"
      >
        <span className="text-sm font-medium">
          {opponents.length} {t('opponentsModal.opponent')}
        </span>
        <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-transform duration-200" />
      </button>
    </div>
  );
};

export default PlayersTable; 