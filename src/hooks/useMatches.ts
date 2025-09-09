import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorage } from '../storage/StorageContext';
import type { Fixture } from '../storage/schemas';
import type { MatchPlayStatus } from '../storage/MatchesRepository';

type MatchesState = {
  fixtureIds: string[];
  fixtures: Record<string, Fixture>;
  activeFixtureId: string | null;
  isLoading: boolean;
};

export function useMatches() {
  const { matches: matchesRepo } = useStorage();
  const [state, setState] = useState<MatchesState>({ fixtureIds: [], fixtures: {}, activeFixtureId: null, isLoading: true });

  useEffect(() => {
    try {
      const ids = matchesRepo.getIndex();
      const active = matchesRepo.getActiveFixtureId();
      const fixtures: Record<string, Fixture> = {};
      ids.forEach((id) => {
        const f = matchesRepo.getFixture(id);
        if (f) fixtures[id] = f as Fixture;
      });
      setState({ fixtureIds: ids, fixtures, activeFixtureId: active, isLoading: false });
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [matchesRepo]);

  // Listen for external fixture updates (e.g., activate on undo) and refresh state
  useEffect(() => {
    const handler = () => {
      try {
        const ids = matchesRepo.getIndex();
        const active = matchesRepo.getActiveFixtureId();
        const fixtures: Record<string, Fixture> = {};
        ids.forEach((id) => {
          const f = matchesRepo.getFixture(id);
          if (f) fixtures[id] = f as Fixture;
        });
        setState(prev => ({ ...prev, fixtureIds: ids, fixtures, activeFixtureId: active }));
      } catch {}
    };
    window.addEventListener('matches:fixture-updated', handler as EventListener);
    return () => window.removeEventListener('matches:fixture-updated', handler as EventListener);
  }, [matchesRepo]);

  const upsertFixture = useCallback((fixture: Fixture) => {
    setState(prev => ({
      ...prev,
      fixtureIds: Array.from(new Set([...prev.fixtureIds, fixture.id])),
      fixtures: { ...prev.fixtures, [fixture.id]: fixture },
    }));
    try { matchesRepo.upsertFixture(fixture); } catch {}
  }, [matchesRepo]);

  const removeFixture = useCallback((id: string) => {
    setState(prev => {
      const nextIds = prev.fixtureIds.filter(x => x !== id);
      const { [id]: _removed, ...rest } = prev.fixtures;
      return { ...prev, fixtureIds: nextIds, fixtures: rest, activeFixtureId: prev.activeFixtureId === id ? null : prev.activeFixtureId };
    });
    try { matchesRepo.removeFixture(id); } catch {}
  }, [matchesRepo]);

  const reorderFixtures = useCallback((nextIds: string[]) => {
    setState(prev => ({ ...prev, fixtureIds: [...nextIds] }));
    try { matchesRepo.setIndex(nextIds); } catch {}
  }, [matchesRepo]);

  const setActiveFixtureId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, activeFixtureId: id }));
    try { matchesRepo.setActiveFixtureId(id); } catch {}
  }, [matchesRepo]);

  const setMatchStatus = useCallback((fixtureId: string, matchId: string, status: MatchPlayStatus) => {
    try { matchesRepo.setStatus(fixtureId, matchId, status); } catch {}
  }, [matchesRepo]);

  const getMatchStatus = useCallback((fixtureId: string, matchId: string): MatchPlayStatus => {
    try {
      const map = matchesRepo.getStatuses(fixtureId);
      return (map[matchId] as MatchPlayStatus) || 'waiting';
    } catch {
      return 'waiting';
    }
  }, [matchesRepo]);

  return useMemo(() => ({
    fixtureIds: state.fixtureIds,
    fixtures: state.fixtures,
    activeFixtureId: state.activeFixtureId,
    isLoading: state.isLoading,
    upsertFixture,
    removeFixture,
    setActiveFixtureId,
    setMatchStatus,
    getMatchStatus,
    reorderFixtures,
  }), [state, upsertFixture, removeFixture, setActiveFixtureId, setMatchStatus, getMatchStatus, reorderFixtures]);
}


