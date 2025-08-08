import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import PlayersTable from '../components/UI/PlayersTable';
import { PlayersStorage, type Column, type ExtendedPlayer, defaultColumns } from '../utils/playersStorage';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

const Players = () => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    
    // Load players using utility
    const loadedPlayers = PlayersStorage.getPlayers();
    setPlayers(loadedPlayers);
    
    // Load columns using utility
    const loadedColumns = PlayersStorage.getColumns();
    setColumns(loadedColumns);
    
    // Mark initial loading as complete after a short delay
    setTimeout(() => {
      setIsInitialLoad(false);
    }, 100);
  }, []);

  // Save players to localStorage whenever players state changes
  useEffect(() => {
    if (!isInitialLoad) {
      PlayersStorage.savePlayers(players);
    }
  }, [players, isInitialLoad]);

  // Save columns to localStorage whenever columns state changes
  useEffect(() => {
    if (!isInitialLoad) {
      PlayersStorage.saveColumns(columns);
    }
  }, [columns, isInitialLoad]);

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newColumn: Column = {
        id: newColumnName.toLowerCase().replace(/\s+/g, '_'),
        name: newColumnName.trim(),
        visible: true,
      };
      const updatedColumns = PlayersStorage.addColumn(columns, newColumn);
      setColumns(updatedColumns);
      setNewColumnName('');
      setIsAddColumnModalOpen(false);
      
      // Debug: Verify the column was saved
    }
  };

  const handleAddTestPlayers = () => {
    const testPlayers = PlayersStorage.createTestPlayers();
    const updatedPlayers = [...players, ...testPlayers];
    setPlayers(updatedPlayers);
  };

  const handleClearAllData = () => {
    if (window.confirm(t('players.clearAllDataConfirm'))) {
      PlayersStorage.clearAllPlayersData();
      setPlayers([]);
      setColumns(defaultColumns);
      setSearchTerm('');
    }
  };

  // JSON Export
  const handleExportJSON = () => {
    PlayersStorage.exportPlayersToJSON(players);
  };

  // JSON Import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const jsonData = ev.target?.result as string;
        const mergedPlayers = PlayersStorage.importPlayersFromJSON(jsonData, players);
        setPlayers(mergedPlayers);
        alert(t('players.importSuccess'));
      } catch (err: any) {
        alert(t('players.importError', { error: err.message }));
      }
      // Aynı dosya tekrar yüklenirse de çalışsın diye input'u sıfırla
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="backdrop-blur-md bg-white/80 rounded-2xl border border-gray-200 shadow-2xl p-2 sm:p-6 transition-all duration-300">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight drop-shadow-sm">{t('players.title')}</h1>
              <p className="text-base text-gray-500 mt-1">{t('players.totalPlayers')}: {players.length}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative shadow-md rounded-lg w-full sm:w-auto">
                <input
                  type="text"
                  placeholder={t('players.searchPlayers')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 px-4 py-2 pl-10 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm sm:text-base text-gray-700 placeholder-gray-400 transition-all duration-200 shadow-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <button
                onClick={handleAddTestPlayers}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg shadow hover:from-green-500 hover:to-green-700 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                <UserPlusIcon className="w-5 h-5" />
                {t('players.addTestPlayers')}
              </button>
              <button
                onClick={handleClearAllData}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                {t('players.clearAllData')}
              </button>
              <button
                onClick={() => setIsAddColumnModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                <PlusIcon className="w-5 h-5" />
                {t('players.addColumn')}
              </button>
              <button
                onClick={handleExportJSON}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg shadow hover:from-purple-500 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                {t('players.exportJSON')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow hover:from-yellow-500 hover:to-yellow-600 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                {t('players.importJSON')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={handleImportJSON}
              />
            </div>
          </div>

          {/* Players Table */}
          <PlayersTable
            players={players}
            onPlayersChange={setPlayers}
            columns={columns}
            onColumnsChange={setColumns}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showAddRow={true}
            showDeleteColumn={true}
          />
        </div>
        
        {/* Add Row Button */}
        <div className="mt-6 flex justify-start">
          <button
            onClick={() => {
              const newPlayer: Player = {
                id: uuidv4(),
                name: '',
                surname: '',
                weight: 0,
                gender: 'male',
                handPreference: 'right',
                birthday: '',
                city: '',
              };
              setPlayers([...players, newPlayer]);
            }}
            className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full hover:from-blue-500 hover:to-blue-700 transition-all duration-200 shadow-lg font-bold text-2xl"
            title={t('players.addRow')}
          >
            <span className="">+</span>
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {isAddColumnModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="backdrop-blur-lg bg-white/90 p-8 rounded-2xl w-full max-w-sm mx-4 shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('players.addNewColumn')}</h2>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder={t('players.columnName')}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base text-gray-700 placeholder-gray-400 transition-all duration-200 mb-4 shadow"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAddColumnModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 text-base font-semibold rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddColumn}
                className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Players; 