import { StorageEngine } from './StorageEngine';
import { MATCHES } from './keys';
import { FixtureSchema, type Fixture, safeParseOrDefault } from './schemas';

export type MatchPlayStatus = 'waiting' | 'active' | 'completed';

export class MatchesRepository {
  constructor(private store = new StorageEngine()) {}

  // Index
  getIndex(): string[] {
    return this.store.get<string[]>(MATCHES.INDEX, []);
  }
  setIndex(ids: string[]): void {
    this.store.set<string[]>(MATCHES.INDEX, ids);
  }

  // Active fixture id
  getActiveFixtureId(): string | null {
    return this.store.get<string | null>(MATCHES.ACTIVE_ID, null);
  }
  setActiveFixtureId(id: string | null): void {
    if (id) this.store.set<string>(MATCHES.ACTIVE_ID, id);
    else this.store.remove(MATCHES.ACTIVE_ID);
  }

  // Fixture
  getFixture(id: string): Fixture | null {
    const raw = this.store.get<any>(MATCHES.FIXTURE(id), null);
    if (!raw) return null;
    return safeParseOrDefault<Fixture | null>(FixtureSchema, raw, null);
  }

  upsertFixture(fixture: Fixture): void {
    this.store.set(MATCHES.FIXTURE(fixture.id), {
      ...fixture,
      lastUpdated: new Date().toISOString(),
    });
    const idx = new Set(this.getIndex());
    idx.add(fixture.id);
    this.setIndex([...idx]);
  }

  removeFixture(id: string): void {
    this.store.remove(MATCHES.FIXTURE(id));
    const next = this.getIndex().filter((x) => x !== id);
    this.setIndex(next);
    // statuses and other feature-specific keys cleaned by their own repos
  }

  // Per-fixture match statuses
  getStatuses(fixtureId: string): Record<string, MatchPlayStatus> {
    return this.store.get<Record<string, MatchPlayStatus>>(MATCHES.STATUSES(fixtureId), {});
  }
  setStatus(fixtureId: string, matchId: string, status: MatchPlayStatus) {
    const map = this.getStatuses(fixtureId);
    map[matchId] = status;
    this.store.set(MATCHES.STATUSES(fixtureId), map);
  }
  setStatuses(fixtureId: string, statuses: Record<string, MatchPlayStatus>): void {
    this.store.set(MATCHES.STATUSES(fixtureId), statuses);
  }
  clearStatus(fixtureId: string, matchId: string): void {
    const map = this.getStatuses(fixtureId);
    if (matchId in map) {
      delete map[matchId];
      this.store.set(MATCHES.STATUSES(fixtureId), map);
    }
  }
}

export default MatchesRepository;


