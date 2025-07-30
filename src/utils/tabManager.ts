import { MatchesStorage } from './matchesStorage';

export const TabManager = {
  // Create a tab change handler that saves to storage
  createTabChangeHandler: (
    setActiveTab: (tab: 'active' | 'completed' | 'rankings') => void,
    fixtureId?: string
  ) => {
    return (tab: 'active' | 'completed' | 'rankings') => {
      setActiveTab(tab);
      if (fixtureId) {
        MatchesStorage.updateFixtureActiveTab(fixtureId, tab);
      }
    };
  },

  // Get the initial tab for a fixture
  getInitialTab: (
    fixtureId?: string,
    initialTab?: 'active' | 'completed' | 'rankings'
  ): 'active' | 'completed' | 'rankings' => {
    if (initialTab) {
      return initialTab;
    }
    if (fixtureId) {
      return MatchesStorage.getFixtureActiveTab(fixtureId);
    }
    return 'active';
  }
}; 