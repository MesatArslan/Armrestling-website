import { StorageEngine } from './StorageEngine';
import { TOURNAMENTS } from './keys';
import { TournamentSchema, safeParseOrDefault } from './schemas';

export class TournamentsRepository {
  constructor(private store = new StorageEngine()) {}

  private stableStringify(value: unknown): string {
    const normalize = (v: any): any => {
      if (Array.isArray(v)) return v.map(normalize);
      if (v && typeof v === 'object') {
        const keys = Object.keys(v).sort();
        const out: Record<string, any> = {};
        for (const k of keys) out[k] = normalize(v[k]);
        return out;
      }
      return v;
    };
    try {
      return JSON.stringify(normalize(value));
    } catch {
      return '';
    }
  }

  getAll(): any[] {
    const raw = this.store.get<any>(TOURNAMENTS.LIST, []);
    return Array.isArray(raw)
      ? raw.map((t) => safeParseOrDefault(TournamentSchema, t, null)).filter(Boolean)
      : [];
  }

  saveAll(tournaments: any[]): void {
    // Avoid unnecessary writes
    const existing = this.getAll();
    if (this.stableStringify(existing) === this.stableStringify(tournaments)) return;
    this.store.set(TOURNAMENTS.LIST, tournaments as any);
  }

  clear(): void {
    this.store.remove(TOURNAMENTS.LIST);
  }

  getSelectedTournament(): string | null {
    return this.store.get<string | null>(TOURNAMENTS.SELECTED_TOURNAMENT, null);
  }
  setSelectedTournament(tournamentId: string | null): void {
    const current = this.getSelectedTournament();
    if (current === (tournamentId ?? null)) return;
    if (tournamentId) this.store.set(TOURNAMENTS.SELECTED_TOURNAMENT, tournamentId);
    else this.store.remove(TOURNAMENTS.SELECTED_TOURNAMENT);
  }

  getSelectedWeightRange(): string | null {
    return this.store.get<string | null>(TOURNAMENTS.SELECTED_WEIGHT_RANGE, null);
  }
  setSelectedWeightRange(weightRangeId: string | null): void {
    const current = this.getSelectedWeightRange();
    if (current === (weightRangeId ?? null)) return;
    if (weightRangeId) this.store.set(TOURNAMENTS.SELECTED_WEIGHT_RANGE, weightRangeId);
    else this.store.remove(TOURNAMENTS.SELECTED_WEIGHT_RANGE);
  }

  getPlayerFilters(): any {
    return this.store.get<any>(TOURNAMENTS.PLAYER_FILTERS, {
      gender: null,
      handPreference: null,
      weightMin: null,
      weightMax: null,
    });
  }
  savePlayerFilters(filters: any): void {
    // Avoid unnecessary writes
    const existing = this.getPlayerFilters();
    if (this.stableStringify(existing) === this.stableStringify(filters)) return;
    this.store.set(TOURNAMENTS.PLAYER_FILTERS, filters);
  }
  clearPlayerFilters(): void {
    this.store.remove(TOURNAMENTS.PLAYER_FILTERS);
  }
}

export default TournamentsRepository;


