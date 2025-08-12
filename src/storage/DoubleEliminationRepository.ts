import { StorageEngine } from './StorageEngine';
import { DOUBLE_ELIMINATION } from './keys';

export class DoubleEliminationRepository<TState = any> {
  constructor(private store = new StorageEngine()) {}

  getState(fixtureId: string): TState | null {
    return this.store.get<TState | null>(DOUBLE_ELIMINATION.STATE(fixtureId), null);
  }

  saveState(fixtureId: string, state: TState): void {
    this.store.set<TState>(DOUBLE_ELIMINATION.STATE(fixtureId), state);
  }

  clearState(fixtureId: string): void {
    this.store.remove(DOUBLE_ELIMINATION.STATE(fixtureId));
  }
}

export default DoubleEliminationRepository;


