/*
 * Centralized, safe localStorage adapter with namespacing and versioning
 */

export class StorageEngine {
  private readonly prefix: string;
  private readonly version: string;
  private availableCache: boolean | null = null;

  constructor(prefix: string = 'aw', version: string = 'v1') {
    this.prefix = prefix;
    this.version = version;
  }

  private buildKey(path: string): string {
    return `${this.prefix}/${this.version}/${path}`;
  }

  private isAvailable(): boolean {
    if (this.availableCache !== null) return this.availableCache;
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      this.availableCache = true;
    } catch {
      this.availableCache = false;
    }
    return this.availableCache;
  }

  get<T>(path: string, fallback: T): T {
    if (!this.isAvailable()) return fallback;
    try {
      const key = this.buildKey(path);
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  set<T>(path: string, value: T): void {
    if (!this.isAvailable()) return;
    try {
      const key = this.buildKey(path);
      const json = JSON.stringify(value);
      window.localStorage.setItem(key, json);
    } catch {
      // silently ignore quota or serialization errors
    }
  }

  remove(path: string): void {
    if (!this.isAvailable()) return;
    try {
      const key = this.buildKey(path);
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export default StorageEngine;


