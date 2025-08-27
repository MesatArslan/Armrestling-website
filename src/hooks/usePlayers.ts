import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorage } from '../storage/StorageContext';
import type { Player } from '../types';
import { defaultColumns, type Column } from '../utils/playersStorage';

export type PlayersState = {
  players: Player[];
  columns: Column[];
  isLoading: boolean;
};

export function usePlayers() {
  const { players: playersRepo } = useStorage();
  const [state, setState] = useState<PlayersState>({ players: [], columns: defaultColumns, isLoading: true });

  useEffect(() => {
    try {
      const players = playersRepo.getAll();
      const columns = playersRepo.getColumns<Column>();
      // Fallback to defaultColumns if not set or empty
      const effectiveColumns = columns && Array.isArray(columns) && columns.length > 0 ? columns : defaultColumns;
      setState({ players, columns: effectiveColumns, isLoading: false });
    } catch {
      setState({ players: [], columns: defaultColumns, isLoading: false });
    }
  }, [playersRepo]);

  const savePlayers = useCallback((next: Player[]) => {
    setState(prev => ({ ...prev, players: next }));
    try { playersRepo.saveAll(next); } catch {}
  }, [playersRepo]);

  const clearPlayers = useCallback(() => {
    setState(prev => ({ ...prev, players: [] }));
    try { playersRepo.clear(); } catch {}
  }, [playersRepo]);

  const saveColumns = useCallback((next: Column[]) => {
    setState(prev => ({ ...prev, columns: next }));
    try { playersRepo.saveColumns(next); } catch {}
  }, [playersRepo]);

  const clearColumns = useCallback(() => {
    setState(prev => ({ ...prev, columns: defaultColumns }));
    try { playersRepo.clearColumns(); } catch {}
  }, [playersRepo]);

  return useMemo(() => ({
    players: state.players,
    columns: state.columns,
    isLoading: state.isLoading,
    savePlayers,
    clearPlayers,
    saveColumns,
    clearColumns,
  }), [state, savePlayers, clearPlayers, saveColumns, clearColumns]);
}


