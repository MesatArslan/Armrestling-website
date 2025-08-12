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
    // Also clear any legacy keys like 'double-elimination-fixture-<fixtureId>'
    try {
      const prefix = `${this['store']['prefix']}/${this['store']['version']}/`;
      const legacyKey = `double-elimination-fixture-${fixtureId}`;
      // Remove raw legacy key if exists
      window.localStorage.removeItem(legacyKey);
      // Remove namespaced legacy key if exists
      window.localStorage.removeItem(`${prefix}${legacyKey}`);
    } catch {}
  }
}

export default DoubleEliminationRepository;


