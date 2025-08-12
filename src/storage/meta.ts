import { StorageEngine } from './StorageEngine';
import { META_KEY } from './keys';

export interface MetaInfo {
  schemaVersion: number;
  migratedAt?: string;
}

const DEFAULT_META: MetaInfo = {
  schemaVersion: 1,
};

export class MetaRepository {
  constructor(private store = new StorageEngine()) {}

  getMeta(): MetaInfo {
    return this.store.get<MetaInfo>(META_KEY, DEFAULT_META);
  }

  setMeta(meta: MetaInfo): void {
    this.store.set<MetaInfo>(META_KEY, meta);
  }
}


