import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import PlayersTable from '../components/UI/PlayersTable';
import { PlayersStorage, type Column, type ExtendedPlayer, defaultColumns } from '../utils/playersStorage';
import { usePlayers } from '../hooks/usePlayers';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

const Players = () => {
  const { t } = useTranslation();
  const { players, columns, isLoading, savePlayers, saveColumns, clearPlayers, clearColumns } = usePlayers();
  const [playersState, setPlayersState] = useState<ExtendedPlayer[]>([]);
  const [columnsState, setColumnsState] = useState<Column[]>(defaultColumns);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const stableEqual = (a: any, b: any) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
  };

  // Centralized normalized setter to avoid effect ping-pong and persist changes once
  const setColumnsNormalized = (next: Column[] | ((prev: Column[]) => Column[])) => {
    setColumnsState((prev) => {
      const computed = typeof next === 'function' ? (next as (p: Column[]) => Column[])(prev) : next;
      const normalized = normalizeColumns(computed);
      if (!stableEqual(prev, normalized)) {
        saveColumns(normalized);
        return normalized;
      }
      return prev;
    });
  };

  // Sync local UI state with storage-backed hook
  useEffect(() => {
    if (isLoading) return;
    // Only update from repo when repo values truly changed
    if (!stableEqual(playersState, players)) {
      setPlayersState(players as ExtendedPlayer[]);
    }
    if (!stableEqual(columnsState, columns)) {
      setColumnsState(columns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, columns, isLoading]);

  // Utility: normalize columns (dedupe by id, keep first occurrence)
  const normalizeColumns = React.useCallback((cols: Column[]): Column[] => {
    const seen = new Set<string>();
    const result: Column[] = [];
    for (const c of cols) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      result.push(c);
    }
    return result;
  }, []);

  // Note: columns normalization and persistence is handled via setColumnsNormalized to prevent update loops

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newColumn: Column = {
        id: newColumnName.toLowerCase().replace(/\s+/g, '_'),
        name: newColumnName.trim(),
        visible: true,
      };
      const updatedColumns = PlayersStorage.addColumn(columnsState, newColumn);
      setColumnsNormalized(updatedColumns);
      setNewColumnName('');
      setIsAddColumnModalOpen(false);
      
      // Debug: Verify the column was saved
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    if (!columnId) return;
    // Prevent deleting core/default columns
    if (defaultColumns.some((c) => c.id === columnId)) {
      return;
    }
    if (!window.confirm(t('players.confirmDeleteColumn') || 'Sütunu silmek istediğinize emin misiniz?')) return;
    const updatedColumns = normalizeColumns(PlayersStorage.deleteColumn(columnsState, columnId));
    setColumnsNormalized(updatedColumns);
    // Remove this field from all players so that table doesn't render empty cells
    setPlayersState(prev => prev.map((p) => {
      const { [columnId]: _removed, ...rest } = p as any;
      return rest as any;
    }));
    // Persist updated players without the removed field
    setTimeout(() => {
      savePlayers((playersState as unknown as Player[]).map(p => ({ ...p })));
    });
  };

  const handleToggleColumnVisibility = (columnId: string) => {
    const updated = columnsState.map((c) => (c.id === columnId ? { ...c, visible: !c.visible } : c));
    setColumnsNormalized(updated);
  };

  const handleAddTestPlayers = () => {
    const testPlayers = PlayersStorage.createTestPlayers();
    const updatedPlayers = [...playersState, ...testPlayers];
    setPlayersState(updatedPlayers);
    savePlayers(updatedPlayers as unknown as Player[]);
  };

  const handleClearAllData = () => {
    if (window.confirm(t('players.clearAllDataConfirm'))) {
      try { clearPlayers(); } catch {}
      try { clearColumns(); } catch {}
      setPlayersState([]);
      setColumnsState(defaultColumns);
      setSearchTerm('');
    }
  };

  // JSON Export
  const handleExportJSON = () => {
    PlayersStorage.exportPlayersToJSON(playersState);
  };

  // JSON Import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const jsonData = ev.target?.result as string;
        const mergedPlayers = PlayersStorage.importPlayersFromJSON(jsonData, playersState);
        setPlayersState(mergedPlayers);
        savePlayers(mergedPlayers as unknown as Player[]);
        alert(t('players.importSuccess'));
      } catch (err: any) {
        alert(t('players.importError', { error: err.message }));
      }
      // Aynı dosya tekrar yüklenirse de çalışsın diye input'u sıfırla
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const normalize = (text: string): string => {
    return (text || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '');
  };

  const parseGender = (val: any): 'male' | 'female' | undefined => {
    const v = normalize(String(val));
    if (!v) return undefined;
    if (['erkek', 'male', 'm', 'e'].includes(v)) return 'male';
    if (['kadin', 'kadın', 'female', 'f', 'k'].includes(v)) return 'female';
    return undefined;
  };

  const parseHandPreference = (val: any): 'left' | 'right' | 'both' | undefined => {
    const raw = (val ?? '').toString().trim().toLowerCase();
    const v = normalize(raw);
    if (!v) return undefined;
    if (v.includes('sag') || v === 'right' || v === 'r') {
      if (raw.includes('sol') || raw.includes('left')) return 'both';
      return 'right';
    }
    if (v.includes('sol') || v === 'left' || v === 'l') {
      if (raw.includes('sag') || raw.includes('right')) return 'both';
      return 'left';
    }
    if (['both', 'iki', 'ikiside', 'heriki', 'herikisi'].includes(v)) return 'both';
    if (v.includes('sag') && v.includes('sol')) return 'both';
    return undefined;
  };

  const parseWeight = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    return Number.isFinite(num) ? Number(Math.round(num * 10) / 10) : undefined;
  };

  const toISODate = (d: Date): string => d.toISOString().slice(0, 10);
  const excelSerialToDate = (serial: number): Date => {
    const excelEpoch = Date.UTC(1899, 11, 30); // Excel 1900 date system
    const ms = Math.round(serial * 24 * 60 * 60 * 1000);
    return new Date(excelEpoch + ms);
  };

  const parseBirthday = (val: any): string | undefined => {
    if (!val && val !== 0) return undefined;
    if (val instanceof Date && !isNaN(val.getTime())) return toISODate(val);
    // Try excel serial number
    if (typeof val === 'number') {
      const jsDate = excelSerialToDate(val);
      if (!isNaN(jsDate.getTime())) return toISODate(jsDate);
    }
    const s = String(val).trim();
    // Try formats like dd.mm.yyyy, dd/mm/yyyy, yyyy-mm-dd
    const m1 = s.match(/^([0-3]?\d)[./-]([0-1]?\d)[./-](\d{4})$/);
    if (m1) {
      const [_, dd, mm, yyyy] = m1;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d.getTime())) return toISODate(d);
    }
    const m2 = s.match(/^(\d{4})[./-]([0-1]?\d)[./-]([0-3]?\d)$/);
    if (m2) {
      const [_, yyyy, mm, dd] = m2;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (!isNaN(d.getTime())) return toISODate(d);
    }
    // Fallback: return as-is if it looks like a date
    return s;
  };

  const handleImportExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
        if (!rows || rows.length === 0) throw new Error('Boş sayfa');
        // Detect header row between first two rows
        const knownHeaderNorms = new Set([
          'ad', 'soyad', 'kilo', 'koltercihi', 'cinsiyet', 'dogumtarihi', 'dogum', 'sehir',
          // Combined name headers
          'adsoyad', 'advesoyad', 'adivesoyadi',
          // English fallbacks
          'name', 'surname', 'weight', 'handpreference', 'gender', 'birthday', 'city'
        ]);
        const scoreRow = (cells: any[]): number => {
          if (!cells) return 0;
          return cells.reduce((acc, cell) => acc + (knownHeaderNorms.has(normalize(String(cell))) ? 1 : 0), 0);
        };
        const row0 = rows[0] || [];
        const row1 = rows[1] || [];
        const score0 = scoreRow(row0);
        const score1 = scoreRow(row1);
        const headerRowIndex = score1 > score0 ? 1 : 0;
        const headersRaw = (rows[headerRowIndex] || []) as string[];
        const dataRows = rows.slice(headerRowIndex + 1);

        const headerToKeyMap: Record<string, string> = {};
        const knownMap: Record<string, string> = {
          // tr
          ad: 'name',
          soyad: 'surname',
          kilo: 'weight',
          koltercihi: 'handPreference',
          'koltercihi(e%9fer)': 'handPreference',
          cinsiyet: 'gender',
          dogumtarihi: 'birthday',
          dogum: 'birthday',
          sehir: 'city',
          // combined TR headers
          adsoyad: 'fullName',
          advesoyad: 'fullName',
          adivesoyadi: 'fullName',
          // en fallbacks
          name: 'name',
          surname: 'surname',
          weight: 'weight',
          handpreference: 'handPreference',
          gender: 'gender',
          birthday: 'birthday',
          city: 'city',
        };

        const cleanedHeaders = headersRaw.map((h) => ({ original: String(h).trim(), norm: normalize(String(h)) }));

        cleanedHeaders.forEach(({ original, norm }) => {
          headerToKeyMap[original] = knownMap[norm] || '';
        });

        // Create columns for unknown headers
        const currentColumnIds = new Set(columns.map((c) => c.id));
        const currentColumnNames = new Set(columns.map((c) => c.name.trim().toLowerCase()));
        const newColumnsToAdd: Column[] = [];

        cleanedHeaders.forEach(({ original }) => {
          if (headerToKeyMap[original]) return; // already mapped to a known field
          const newId = original.toLowerCase().trim().replace(/\s+/g, '_');
          if (!currentColumnIds.has(newId) && !currentColumnNames.has(original.toLowerCase())) {
            newColumnsToAdd.push({ id: newId, name: original, visible: true });
          }
          headerToKeyMap[original] = newId; // map unknown header to new id
        });

        if (newColumnsToAdd.length > 0) {
          const updated = [...columnsState, ...newColumnsToAdd];
          setColumnsNormalized(updated);
        }

        const importedPlayers = dataRows
          .filter((row) => row.some((cell) => String(cell).trim() !== ''))
          .map((row) => {
            const obj: Record<string, any> = {};
            cleanedHeaders.forEach(({ original }, idx) => {
              const key = headerToKeyMap[original];
              obj[key] = row[idx];
            });

            const parsed: any = {
              id: uuidv4(),
              name: obj['name'] ?? '',
              surname: obj['surname'] ?? '',
              weight: parseWeight(obj['weight']) ?? 0,
              gender: parseGender(obj['gender']) ?? 'male',
              handPreference: parseHandPreference(obj['handPreference']) ?? 'right',
              birthday: parseBirthday(obj['birthday']) ?? '',
              city: obj['city'] ?? '',
            };

            // If a combined full name column exists, split into name and surname
            if (obj['fullName']) {
              const full = String(obj['fullName']).trim();
              if (full.length > 0) {
                const parts = full.split(/\s+/);
                if (parts.length === 1) {
                  if (!parsed.name) parsed.name = parts[0];
                } else {
                  const surname = parts.pop() as string;
                  const name = parts.join(' ');
                  if (!parsed.name) parsed.name = name;
                  if (!parsed.surname) parsed.surname = surname;
                }
              }
            }

            // Attach extra fields
            Object.keys(obj).forEach((k) => {
              if (!['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city'].includes(k)) {
                parsed[k] = obj[k];
              }
            });

            return parsed as ExtendedPlayer;
          });

        const updatedPlayers = [...playersState, ...importedPlayers];
        setPlayersState(updatedPlayers);
        savePlayers(updatedPlayers as unknown as Player[]);
        alert(t('players.importSuccess'));
      } catch (err: any) {
        alert(t('players.importError', { error: err.message || String(err) }));
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
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
                onClick={() => setIsManageColumnsOpen(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-400 to-indigo-600 text-white rounded-lg shadow hover:from-indigo-500 hover:to-indigo-700 transition-all duration-200 text-sm sm:text-base font-semibold"
              >
                {t('players.manageColumns')}
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
              <button
                onClick={() => excelInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-teal-400 to-teal-600 text-white rounded-lg shadow hover:from-teal-500 hover:to-teal-700 transition-all duration-200 text-sm sm:text-base font-semibold"
                title={t('players.importExcelNote')}
              >
                {t('players.importExcel')}
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                style={{ display: 'none' }}
                onChange={handleImportExcelChange}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 italic">{t('players.importExcelNote')}</p>
          </div>

          {/* Players Table */}
          <PlayersTable
            players={playersState}
            onPlayersChange={(next) => {
              setPlayersState(next as ExtendedPlayer[]);
              savePlayers(next as unknown as Player[]);
            }}
            columns={columnsState}
            onColumnsChange={(next) => setColumnsNormalized(next as Column[])}
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
              const next = [...playersState, newPlayer];
              setPlayersState(next);
              savePlayers(next as unknown as Player[]);
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

      {/* Manage Columns Modal */}
      {isManageColumnsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="backdrop-blur-md bg-white/90 p-6 rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-gray-200">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('players.manageColumns')}</h2>
              <p className="mt-1 text-sm text-gray-500">Görünürlüğünü yönetmek istediğin özel sütunları aç/kapat. Satıra tıklayarak da görünürlüğü değiştirebilirsin.</p>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {columns
                .filter((col) => !defaultColumns.some((d) => d.id === col.id))
                .map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleToggleColumnVisibility(col.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      col.visible
                        ? 'border-blue-200 bg-blue-50/60 hover:bg-blue-100'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-gray-900 truncate">{col.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">({col.id})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label
                        className="inline-flex items-center cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={() => handleToggleColumnVisibility(col.id)}
                          className="sr-only"
                        />
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${col.visible ? 'bg-blue-600' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${col.visible ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn(col.id);
                        }}
                        className="text-red-600 hover:text-red-700 px-2 py-1 text-sm"
                        title={t('players.delete')}
                      >
                        {t('players.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              {columns.filter((col) => !defaultColumns.some((d) => d.id === col.id)).length === 0 && (
                <div className="text-sm text-gray-500 p-2">{t('players.noCustomColumns') || 'Özel sütun yok.'}</div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setIsManageColumnsOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-base font-semibold rounded-lg"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Players; 