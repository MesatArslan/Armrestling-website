import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Player, WeightRange, Tournament } from '../types';
import { MatchesStorage, type Fixture } from '../utils/matchesStorage';
import DeleteConfirmationModal from '../components/UI/DeleteConfirmationModal';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ActiveFixturesNav from '../components/UI/ActiveFixturesNav';

// Import all double elimination components
import {
  DoubleElimination1,
  DoubleElimination2,
  DoubleElimination3,
  DoubleElimination4,
  DoubleElimination5,
  DoubleElimination6,
  DoubleElimination7,
  DoubleElimination8,
  DoubleElimination9_11,
  DoubleElimination12_16,
  DoubleElimination17_23,
  DoubleElimination24_32,
  DoubleElimination33_47,
  DoubleElimination48_64,
  DoubleElimination65_95,
  DoubleElimination96_128,
  DoubleElimination129_191,
  DoubleElimination192_256,
  DoubleElimination257_383,
  DoubleElimination384_512,
} from '../components/double elimination';

const Matches = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [activeFixture, setActiveFixture] = useState<Fixture | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [desiredTab, setDesiredTab] = useState<'active' | 'completed' | 'rankings' | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    fixtureId: string | null;
    fixtureName: string;
  }>({
    isOpen: false,
    fixtureId: null,
    fixtureName: ''
  });

  // Use ref to track current fixtures to avoid dependency issues
  const fixturesRef = useRef<Fixture[]>([]);
  fixturesRef.current = fixtures;

  // Load data on component mount
  useEffect(() => {
    // Load players from localStorage
    const savedPlayers = localStorage.getItem('arm-wrestling-players');
    if (savedPlayers) {
      try {
        const parsedPlayers = JSON.parse(savedPlayers);
        setPlayers(parsedPlayers);
      } catch (error) {
        // Error loading players from localStorage
      }
    }

    // Load fixtures from matches storage
    const matchesData = MatchesStorage.getMatchesData();
    setFixtures(matchesData.fixtures);

    // Set active fixture if exists
    if (matchesData.activeFixtureId) {
      const active = matchesData.fixtures.find(f => f.id === matchesData.activeFixtureId);
      setActiveFixture(active || null);
    }

    setIsLoading(false);
  }, []);

  // Handle URL parameters for fixture selection and tab switching
  useEffect(() => {
    if (!isLoading && fixtures.length > 0) {
      const tab = searchParams.get('tab') as 'active' | 'completed' | 'rankings' | null;
      const fixtureId = searchParams.get('fixture');

      if (tab) {
        setDesiredTab(tab);
      }

      if (fixtureId) {
        const targetFixture = fixtures.find(f => f.id === fixtureId);
        if (targetFixture) {
          setActiveFixture(targetFixture);
          MatchesStorage.setActiveFixture(fixtureId);
        }
      }

      // Clear URL parameters after processing
      if (tab || fixtureId) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [isLoading, fixtures, searchParams]);

  // Save fixtures whenever they change
  useEffect(() => {
    if (!isLoading) {
      // Her fixture'ın en güncel tab'ını localStorage'dan oku
      const updatedFixtures = fixtures.map(fixture => ({
        ...fixture,
        activeTab: MatchesStorage.getFixtureActiveTab(fixture.id)
      }));

      const matchesData = {
        fixtures: updatedFixtures,
        activeFixtureId: activeFixture?.id,
        lastUpdated: new Date().toISOString()
      };
      MatchesStorage.saveMatchesData(matchesData);
    }
  }, [fixtures, activeFixture, isLoading]);

  // Handle tournament start from Tournaments page
  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        tournament: Tournament;
        weightRange: WeightRange;
      };

      // Check if fixture already exists for this tournament and weight range
      const existingFixture = fixturesRef.current.find(f =>
        f.tournamentId === state.tournament.id &&
        f.weightRangeId === state.weightRange.id
      );

      if (existingFixture) {
        // If fixture already exists, just set it as active
        setActiveFixture(existingFixture);
        MatchesStorage.setActiveFixture(existingFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        window.history.replaceState({}, document.title);
        return;
      }

      // Create new fixture only if it doesn't exist
      const eligiblePlayers = players.filter(player => {
        const withinWeightRange = player.weight >= state.weightRange.min && player.weight <= state.weightRange.max;
        const notExcluded = !state.weightRange.excludedPlayerIds?.includes(player.id);
        const genderMatch = !state.tournament.genderFilter || player.gender === state.tournament.genderFilter;
        const handMatch = !state.tournament.handPreferenceFilter ||
          player.handPreference === state.tournament.handPreferenceFilter ||
          player.handPreference === 'both';
        let birthYearMatch = true;
        if (player.birthday && (state.tournament.birthYearMin || state.tournament.birthYearMax)) {
          const birthYear = new Date(player.birthday).getFullYear();
          if (state.tournament.birthYearMin && birthYear < state.tournament.birthYearMin) {
            birthYearMatch = false;
          }
          if (state.tournament.birthYearMax && birthYear > state.tournament.birthYearMax) {
            birthYearMatch = false;
          }
        }
        return withinWeightRange && notExcluded && genderMatch && handMatch && birthYearMatch;
      });

      if (eligiblePlayers.length > 0) {
        const newFixture = MatchesStorage.createNewFixture(state.tournament, state.weightRange, eligiblePlayers);
        // Yeni fixture'ın activeTab'ını localStorage'dan oku
        const fixtureWithActiveTab = {
          ...newFixture,
          activeTab: MatchesStorage.getFixtureActiveTab(newFixture.id)
        };
        setFixtures(prev => [...prev, fixtureWithActiveTab]);
        setActiveFixture(fixtureWithActiveTab);
        MatchesStorage.setActiveFixture(newFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, players]);

  const handleFixtureSelect = (fixtureId: string) => {
    const fixture = fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      setActiveFixture(fixture);
      MatchesStorage.setActiveFixture(fixtureId);
      // Clear desired tab when switching fixtures to use saved tab state
      setDesiredTab(null);
    }
  };

  const handleFixtureClose = (fixtureId: string, fixtureName: string) => {
    setDeleteModal({
      isOpen: true,
      fixtureId,
      fixtureName
    });
  };

  const confirmDeleteFixture = () => {
    if (!deleteModal.fixtureId) return;

    // Remove from localStorage
    MatchesStorage.deleteFixture(deleteModal.fixtureId);

    // Remove from state
    setFixtures(prev => prev.filter(f => f.id !== deleteModal.fixtureId));

    // If this was the active fixture, clear it
    if (activeFixture?.id === deleteModal.fixtureId) {
      setActiveFixture(null);
      MatchesStorage.setActiveFixture(null);
    }
  };

  const handleMatchResult = (type: string, winnerId: string, loserId?: string) => {
    if (!activeFixture) return;

    // Add match result to fixture
    const result = {
      matchId: `match-${Date.now()}`,
      winnerId,
      loserId,
      timestamp: new Date().toISOString(),
      type
    };

    MatchesStorage.addMatchResult(activeFixture.id, result);

    // Update fixture in state
    setFixtures(prev => prev.map(f =>
      f.id === activeFixture.id
        ? { 
            ...f, 
            results: [...f.results, result], 
            lastUpdated: new Date().toISOString(),
            activeTab: MatchesStorage.getFixtureActiveTab(f.id) // activeTab'ı localStorage'dan oku
          }
        : f
    ));
  };

  const handleTournamentComplete = (rankings: { first?: string; second?: string; third?: string }) => {
    if (!activeFixture) return;

    // Save rankings to localStorage
    MatchesStorage.completeFixtureWithRankings(activeFixture.id, rankings);

    // Update fixture with completed status and rankings
    const updatedFixture = {
      ...activeFixture,
      status: 'completed' as const,
      rankings,
      completedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      activeTab: MatchesStorage.getFixtureActiveTab(activeFixture.id) // activeTab'ı localStorage'dan oku
    };

    // Update in state
    setFixtures(prev => prev.map(f =>
      f.id === activeFixture.id ? updatedFixture : f
    ));

    // Update active fixture
    setActiveFixture(updatedFixture);
  };


  const getDoubleEliminationComponentWithKey = () => {
    if (!activeFixture || activeFixture.players.length === 0) {
      return <div className="text-center text-gray-600">No players in this fixture</div>;
    }

    const playerCount = activeFixture.players.length;

    // Get the saved tab state for this fixture, or use desired tab, or default
    if (desiredTab) {
    } else {
    }

    const props = {
      players: activeFixture.players,
      onMatchResult: handleMatchResult,
      onTournamentComplete: handleTournamentComplete,
      fixtureId: activeFixture.id
    };

    // Return appropriate component based on player count
    switch (playerCount) {
      case 1:
        return <DoubleElimination1 key={activeFixture.id} {...props} />;
      case 2:
        return <DoubleElimination2 key={activeFixture.id} {...props} />;
      case 3:
        return <DoubleElimination3 key={activeFixture.id} {...props} />;
      case 4:
        return <DoubleElimination4 key={activeFixture.id} {...props} />;
      case 5:
        return <DoubleElimination5 key={activeFixture.id} {...props} />;
      case 6:
        return <DoubleElimination6 key={activeFixture.id} {...props} />;
      case 7:
        return <DoubleElimination7 key={activeFixture.id} {...props} />;
      case 8:
        return <DoubleElimination8 key={activeFixture.id} {...props} />;
      case 9:
      case 10:
      case 11:
        return <DoubleElimination9_11 key={activeFixture.id} {...props} />;
      case 12:
      case 13:
      case 14:
      case 15:
      case 16:
        return <DoubleElimination12_16 key={activeFixture.id} {...props} />;
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 23:
        return <DoubleElimination17_23 key={activeFixture.id} {...props} />;
      case 24:
      case 25:
      case 26:
      case 27:
      case 28:
      case 29:
      case 30:
      case 31:
      case 32:
        return <DoubleElimination24_32 key={activeFixture.id} {...props} />;
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
      case 40:
      case 41:
      case 42:
      case 43:
      case 44:
      case 45:
      case 46:
      case 47:
        return <DoubleElimination33_47 key={activeFixture.id} {...props} />;
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      case 58:
      case 59:
      case 60:
      case 61:
      case 62:
      case 63:
      case 64:
        return <DoubleElimination48_64 key={activeFixture.id} {...props} />;
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 91:
      case 92:
      case 93:
      case 94:
      case 95:
        return <DoubleElimination65_95 key={activeFixture.id} {...props} />;
      case 96:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
      case 123:
      case 124:
      case 125:
      case 126:
      case 127:
      case 128:
        return <DoubleElimination96_128 key={activeFixture.id} {...props} />;
      case 129:
      case 130:
      case 131:
      case 132:
      case 133:
      case 134:
      case 135:
      case 136:
      case 137:
      case 138:
      case 139:
      case 140:
      case 141:
      case 142:
      case 143:
      case 144:
      case 145:
      case 146:
      case 147:
      case 148:
      case 149:
      case 150:
      case 151:
      case 152:
      case 153:
      case 154:
      case 155:
      case 156:
      case 157:
      case 158:
      case 159:
      case 160:
      case 161:
      case 162:
      case 163:
      case 164:
      case 165:
      case 166:
      case 167:
      case 168:
      case 169:
      case 170:
      case 171:
      case 172:
      case 173:
      case 174:
      case 175:
      case 176:
      case 177:
      case 178:
      case 179:
      case 180:
      case 181:
      case 182:
      case 183:
      case 184:
      case 185:
      case 186:
      case 187:
      case 188:
      case 189:
      case 190:
      case 191:
        return <DoubleElimination129_191 key={activeFixture.id} {...props} />;
      case 192:
      case 193:
      case 194:
      case 195:
      case 196:
      case 197:
      case 198:
      case 199:
      case 200:
      case 201:
      case 202:
      case 203:
      case 204:
      case 205:
      case 206:
      case 207:
      case 208:
      case 209:
      case 210:
      case 211:
      case 212:
      case 213:
      case 214:
      case 215:
      case 216:
      case 217:
      case 218:
      case 219:
      case 220:
      case 221:
      case 222:
      case 223:
      case 224:
      case 225:
      case 226:
      case 227:
      case 228:
      case 229:
      case 230:
      case 231:
      case 232:
      case 233:
      case 234:
      case 235:
      case 236:
      case 237:
      case 238:
      case 239:
      case 240:
      case 241:
      case 242:
      case 243:
      case 244:
      case 245:
      case 246:
      case 247:
      case 248:
      case 249:
      case 250:
      case 251:
      case 252:
      case 253:
      case 254:
      case 255:
      case 256:
        return <DoubleElimination192_256 key={activeFixture.id} {...props} />;
      case 257:
      case 258:
      case 259:
      case 260:
      case 261:
      case 262:
      case 263:
      case 264:
      case 265:
      case 266:
      case 267:
      case 268:
      case 269:
      case 270:
      case 271:
      case 272:
      case 273:
      case 274:
      case 275:
      case 276:
      case 277:
      case 278:
      case 279:
      case 280:
      case 281:
      case 282:
      case 283:
      case 284:
      case 285:
      case 286:
      case 287:
      case 288:
      case 289:
      case 290:
      case 291:
      case 292:
      case 293:
      case 294:
      case 295:
      case 296:
      case 297:
      case 298:
      case 299:
      case 300:
      case 301:
      case 302:
      case 303:
      case 304:
      case 305:
      case 306:
      case 307:
      case 308:
      case 309:
      case 310:
      case 311:
      case 312:
      case 313:
      case 314:
      case 315:
      case 316:
      case 317:
      case 318:
      case 319:
      case 320:
      case 321:
      case 322:
      case 323:
      case 324:
      case 325:
      case 326:
      case 327:
      case 328:
      case 329:
      case 330:
      case 331:
      case 332:
      case 333:
      case 334:
      case 335:
      case 336:
      case 337:
      case 338:
      case 339:
      case 340:
      case 341:
      case 342:
      case 343:
      case 344:
      case 345:
      case 346:
      case 347:
      case 348:
      case 349:
      case 350:
      case 351:
      case 352:
      case 353:
      case 354:
      case 355:
      case 356:
      case 357:
      case 358:
      case 359:
      case 360:
      case 361:
      case 362:
      case 363:
      case 364:
      case 365:
      case 366:
      case 367:
      case 368:
      case 369:
      case 370:
      case 371:
      case 372:
      case 373:
      case 374:
      case 375:
      case 376:
      case 377:
      case 378:
      case 379:
      case 380:
      case 381:
      case 382:
      case 383:
        return <DoubleElimination257_383 key={activeFixture.id} {...props} />;
      default:
        return <DoubleElimination384_512 key={activeFixture.id} {...props} />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-6 sm:py-8 px-3 sm:px-2">
      <div className="w-full max-w-7xl px-0 sm:px-6 lg:px-8">
        <div className="transition-all duration-300 bg-transparent p-0 border-0 rounded-none shadow-none sm:backdrop-blur-md sm:bg-white/80 sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl sm:p-6">
          {/* Header removed as requested */}

          {/* Fixtures Navigation */}
          {fixtures.length > 0 && (
            <div className="mb-8">
              <ActiveFixturesNav 
                onFixtureSelect={handleFixtureSelect}
                onFixtureClose={handleFixtureClose}
                activeFixtureId={activeFixture?.id}
              />
            </div>
          )}

          {/* Active Fixture Content */}
          {activeFixture ? (
            <div className="space-y-6">
              <div className="overflow-x-auto px-0 sm:px-2">
              {getDoubleEliminationComponentWithKey()}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('matches.noActiveFixtures')}</h3>
              <p className="text-gray-600 mb-6">{t('matches.startTournamentMessage')}</p>
              <button
                onClick={() => navigate('/tournaments')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
              >
                {t('matches.goToTournaments')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, fixtureId: null, fixtureName: '' })}
        onConfirm={confirmDeleteFixture}
        title={t('matches.deleteFixture')}
        message={t('matches.deleteFixtureMessage', { fixtureName: deleteModal.fixtureName })}
        confirmText={t('matches.deleteFixture')}
        cancelText={t('matches.cancel')}
      />
    </div>
  );
};

export default Matches;