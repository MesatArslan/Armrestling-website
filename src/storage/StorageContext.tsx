import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PlayersRepository } from './PlayersRepository';
import { TournamentsRepository } from './TournamentsRepository';
import { MatchesRepository } from './MatchesRepository';

type StorageContextValue = {
  players: PlayersRepository;
  tournaments: TournamentsRepository;
  matches: MatchesRepository;
};

const StorageContext = createContext<StorageContextValue | null>(null);

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo<StorageContextValue>(() => ({
    players: new PlayersRepository(),
    tournaments: new TournamentsRepository(),
    matches: new MatchesRepository(),
  }), []);

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextValue => {
  const ctx = useContext(StorageContext);
  if (!ctx) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return ctx;
};

export default StorageContext;


