import { StorageEngine } from './StorageEngine';
import { PLAYERS } from './keys';
import { PlayerSchema, type Player } from './schemas';

export class PlayersRepository {
  constructor(private store = new StorageEngine()) { }

  getAll(): Player[] {
    const raw = this.store.get<any>(PLAYERS.LIST, []);
    const result: Player[] = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const parsed = PlayerSchema.safeParse(item);
        if (parsed.success) {
          result.push(parsed.data);
        }
      }
    }
    return result;
  }

  saveAll(players: Player[]): void {
    this.store.set(PLAYERS.LIST, players);
  }

  clear(): void {
    this.store.remove(PLAYERS.LIST);
  }

  // Columns
  getColumns<T = any>(): T[] {
    return this.store.get<T[]>(PLAYERS.COLUMNS, []);
  }
  saveColumns<T = any>(columns: T[]): void {
    this.store.set<T[]>(PLAYERS.COLUMNS, columns);
  }
  clearColumns(): void {
    this.store.remove(PLAYERS.COLUMNS);
  }
}

export default PlayersRepository;


