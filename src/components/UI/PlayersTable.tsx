import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '../../types';
import { useTranslation } from 'react-i18next';

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
  className = ""
}) => {
  const { t } = useTranslation();
  const [editingCell, setEditingCell] = useState<{ id: string; column: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isWeightFilterOpen, setIsWeightFilterOpen] = useState(false);
  const [weightFilter, setWeightFilter] = useState<WeightFilter>({ min: null, max: null });
  const [newPlayer, setNewPlayer] = useState<Partial<ExtendedPlayer>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFilter>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setOpenFilter(null);
        setIsWeightFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getUniqueValues = (columnId: string) => {
    let values = players
      .map(player => player[columnId])
      .filter((value): value is string | number => value !== undefined && value !== null)
      .map(String)
      .map(value => value.trim())
      .filter(value => value !== '');
    // Gender için çeviri uygula
    if (columnId === 'gender') {
      values = values.map(value => t(`players.${value}`));
    }
    // HandPreference için çeviri uygula
    if (columnId === 'handPreference') {
      values = values.map(value => t(`players.${value}`));
    }
    return [t('players.all'), ...Array.from(new Set(values))];
  };

  const handleFilterChange = (columnId: string, value: string) => {
    // Gender ve handPreference için ters çeviri
    let filterValue = value;
    if (columnId === 'gender') {
      if (value === t('players.male')) filterValue = 'male';
      if (value === t('players.female')) filterValue = 'female';
    }
    if (columnId === 'handPreference') {
      if (value === t('players.left')) filterValue = 'left';
      if (value === t('players.right')) filterValue = 'right';
      if (value === t('players.both')) filterValue = 'both';
    }
    setColumnFilters(prev => ({
      ...prev,
      [columnId]: filterValue === t('players.all') ? null : filterValue.trim()
    }));
    setOpenFilter(null);
  };

  const handleDeletePlayer = (playerId: string) => {
    if (onDeletePlayer) {
      onDeletePlayer(playerId);
    } else {
      if (window.confirm('Are you sure you want to delete this player?')) {
        onPlayersChange(players.filter(player => player.id !== playerId));
      }
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onColumnsChange(items);
  };

  const handleCellClick = (playerId: string, columnId: string, value: any) => {
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
    
    setEditingCell({ id: playerId, column: columnId });
    setEditingValue(value ? String(value) : '');
  };

  const handleHandPreferenceChange = (playerId: string, hand: 'left' | 'right') => {
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
  };

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

  const filteredPlayers = players.filter(player => {
    const matchesSearch = searchTerm === '' || 
      Object.values(player).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesWeight = 
      (weightFilter.min === null || player.weight >= weightFilter.min) &&
      (weightFilter.max === null || player.weight <= weightFilter.max);

    const matchesColumnFilters = Object.entries(columnFilters).every(([columnId, filterValue]) => {
      if (filterValue === null) return true;
      return String(player[columnId]).trim() === filterValue;
    });

    return matchesSearch && matchesWeight && matchesColumnFilters;
  });

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
              <span>{t('players.left')}</span>
            </button>
            <button
              onClick={() => handleHandPreferenceChange(player.id, 'right')}
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
              <span>{t('players.right')}</span>
            </button>
          </div>
        );
      } else if (column.id === 'gender') {
        displayValue = t(`players.${displayValue}`);
        className += ' cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors';
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

  return (
    <div className={`overflow-x-auto mt-6 ${className}`}>
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns" direction="horizontal">
              {(provided) => (
                <tr
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-white sticky top-0 z-10"
                >
                  <th className="w-4 p-1 font-bold text-gray-900 text-lg bg-white border-b border-r border-gray-100 text-center">#</th>
                  {columns.map((column, index) => (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided) => (
                        <th
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-3 ${column.visible ? 'w-48' : 'w-10'} bg-white border-b border-r border-gray-100`}
                        >
                          {column.visible && (
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-gray-900">
                                  {defaultColumnIds.includes(column.id) ? t(`players.${column.id}`) : column.name}
                                </span>
                                {column.id === 'weight' ? (
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
                                ) : !['name', 'surname'].includes(column.id) && (
                                  <div className="relative" ref={filterRef}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFilter(openFilter === column.id ? null : column.id);
                                      }}
                                      className={`p-1 rounded transition-colors duration-200 ${
                                        columnFilters[column.id] ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-50'
                                      }`}
                                    >
                                      <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${
                                        openFilter === column.id ? 'transform rotate-180' : ''
                                      }`} />
                                    </button>
                                    {openFilter === column.id && (
                                      <div className="absolute right-0 mt-1 w-48 bg-blue-50/30 border border-blue-100 rounded-lg shadow-sm p-2 z-20">
                                        <div className="max-h-48 overflow-y-auto">
                                          {getUniqueValues(column.id).map((value) => (
                                            <button
                                              key={value}
                                              onClick={() => handleFilterChange(column.id, value)}
                                              className={`w-full text-left px-2 py-1 text-sm rounded ${
                                                columnFilters[column.id] === value
                                                  ? 'bg-blue-100 text-blue-600'
                                                  : 'text-blue-500 hover:bg-blue-100/50'
                                              }`}
                                            >
                                              {value}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {column.id === 'weight' && isWeightFilterOpen && (
                                <div className="flex items-center gap-2 mt-1.5 bg-blue-50/30 p-1.5 rounded" ref={filterRef}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={weightFilter.min || ''}
                                    onChange={(e) => handleWeightFilterChange('min', e.target.value)}
                                    className="w-20 px-2 py-1 bg-white border border-gray-100 rounded text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Min"
                                  />
                                  <span className="text-blue-500">-</span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={weightFilter.max || ''}
                                    onChange={(e) => handleWeightFilterChange('max', e.target.value)}
                                    className="w-20 px-2 py-1 bg-white border border-gray-100 rounded text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Max"
                                  />
                                  <button
                                    onClick={handleWeightFilterClear}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                  >
                                    Clear
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </th>
                      )}
                    </Draggable>
                  ))}
                  {showDeleteColumn && (
                    <th className="w-12 p-1 font-bold text-gray-900 text-lg bg-white border-b border-r border-gray-100 text-center">
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
          {filteredPlayers.map((player, index) => (
            <tr key={player.id} className="hover:bg-blue-50/60 transition-all duration-200 rounded-xl shadow-md">
              <td className="w-4 px-1 py-2 text-base font-semibold text-gray-700 bg-white/80 border-r border-gray-100 text-center rounded-l-xl">{index + 1}</td>
              {columns.map((column) => (
                column.visible && (
                  <td 
                    key={column.id} 
                    className="w-48 px-3 py-2 whitespace-nowrap text-base border-r border-gray-100 bg-white/70"
                    onClick={() => handleCellClick(player.id, column.id, player[column.id])}
                  >
                    {renderCellContent(player, column)}
                  </td>
                )
              ))}
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
          ))}
          {showAddRow && (
            <tr className="hover:bg-blue-50/60 transition-all duration-200 rounded-xl shadow">
              <td className="w-4 px-1 py-2 text-base font-semibold text-gray-400 bg-white/80 border-r border-gray-100 text-center rounded-l-xl">
                {filteredPlayers.length + 1}
              </td>
              {columns.map((column) => (
                column.visible && (
                  <td key={column.id} className="w-48 px-3 py-2 whitespace-nowrap text-base border-r border-gray-100 bg-white/70">
                    {renderNewPlayerInput(column)}
                  </td>
                )
              ))}
              {showDeleteColumn && (
                <td className="w-12 px-2 py-2 text-center border-r border-gray-100 bg-white/70 rounded-r-xl"></td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PlayersTable; 