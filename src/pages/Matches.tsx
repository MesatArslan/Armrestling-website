import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Player as UIPlayer } from '../types';
import type { Fixture, Tournament, WeightRange } from '../storage/schemas';
import DeleteConfirmationModal from '../components/UI/DeleteConfirmationModal';
import { PlayersStorage } from '../utils/playersStorage';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ActiveFixturesNav from '../components/UI/ActiveFixturesNav';
import { useMatches } from '../hooks/useMatches';
import { MatchesStorage } from '../utils/matchesStorage';
import { openFixturePreviewModal, generateFixturePDF } from '../utils/pdfGenerator';

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
  const processedSearchRef = useRef<string | null>(null);
  const [players, setPlayers] = useState<UIPlayer[]>([]);
  const { fixtureIds, fixtures: fixturesMap, activeFixtureId, isLoading, upsertFixture, removeFixture, setActiveFixtureId } = useMatches();
  const fixtures: Fixture[] = fixtureIds.map(id => fixturesMap[id]).filter(Boolean) as Fixture[];
  const activeFixture: Fixture | null = activeFixtureId ? (fixturesMap[activeFixtureId] as Fixture) : null;
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

  // PDF modal states for Matches page
  const [isMatchPDFModalOpen, setIsMatchPDFModalOpen] = useState(false);
  const [includeRankingsForPDF, setIncludeRankingsForPDF] = useState<boolean>(true);
  const [includeCompletedForPDF, setIncludeCompletedForPDF] = useState<boolean>(true);
  const [rowsPerPageForPDF] = useState<number>(18);
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const hideProgressTimer = useRef<number | null>(null);

  // Use ref to track current fixtures to avoid dependency issues
  const fixturesRef = useRef<Fixture[]>([]);
  fixturesRef.current = fixtures;

  // Load players on mount
  useEffect(() => {
    try {
      const loadedPlayers = PlayersStorage.getPlayers();
      setPlayers(loadedPlayers);
    } catch { }
  }, []);

  // Handle URL parameters for fixture selection and tab switching (process once per search change)
  useEffect(() => {
    if (isLoading || fixtures.length === 0) return;
    const currentSearch = location.search || '';
    if (!currentSearch || processedSearchRef.current === currentSearch) return;

    const tab = searchParams.get('tab') as 'active' | 'completed' | 'rankings' | null;
    const fixtureId = searchParams.get('fixture');

    if (tab) setDesiredTab(tab);
    if (fixtureId) setActiveFixtureId(fixtureId);

    processedSearchRef.current = currentSearch;
    // Clear URL parameters via router to prevent re-processing
    navigate({ pathname: location.pathname }, { replace: true });
  }, [isLoading, fixtures.length, location.search]);

  // Save fixtures whenever they change
  useEffect(() => {
    if (!isLoading) {
      // Read saved tab state from repo and persist
      fixtures.forEach(fixture => {
        const current = fixturesMap[fixture.id];
        const activeTab = current?.activeTab;
        if (activeTab && fixture.activeTab !== activeTab) upsertFixture({ ...fixture, activeTab });
      });
    }
  }, [fixtures, activeFixture, isLoading, upsertFixture]);

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
        setActiveFixtureId(existingFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        navigate({ pathname: location.pathname }, { replace: true, state: null });
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
        const existingForTournament = fixtures.filter(f => f.tournamentId === state.tournament.id);
        const fixtureNumber = existingForTournament.length + 1;
        const weightRangeName = state.weightRange.name || `${state.weightRange.min}-${state.weightRange.max} kg`;
        const now = new Date().toISOString();
        const newFixture = {
          id: `${state.tournament.id}-${state.weightRange.id}-${fixtureNumber}`,
          name: `${state.tournament.name} - ${weightRangeName}`,
          tournamentId: state.tournament.id,
          tournamentName: state.tournament.name,
          weightRangeId: state.weightRange.id,
          weightRangeName,
          weightRange: { min: state.weightRange.min, max: state.weightRange.max },
          players: eligiblePlayers.map(p => ({ id: p.id, name: p.name, surname: p.surname, weight: p.weight, gender: p.gender, handPreference: p.handPreference, birthday: p.birthday, city: p.city, opponents: [] })),
          playerCount: eligiblePlayers.length,
          status: 'active' as const,
          createdAt: now,
          lastUpdated: now,
          activeTab: 'active' as const,
        };
        upsertFixture(newFixture);
        setActiveFixtureId(newFixture.id);
        // Clear location state to prevent duplicate creation on page refresh
        navigate({ pathname: location.pathname }, { replace: true, state: null });
      }
    }
  }, [location.state, players, upsertFixture, setActiveFixtureId, navigate, location.pathname]);

  const handleFixtureSelect = (fixtureId: string) => {
    setActiveFixtureId(fixtureId);
    setDesiredTab(null);
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

    removeFixture(deleteModal.fixtureId);

    // If this was the active fixture, clear it
    if (activeFixture?.id === deleteModal.fixtureId) setActiveFixtureId(null);
  };

  const handleMatchResult = () => {
    if (!activeFixture) return;

    // Update fixture timestamp only
    const next = {
      ...activeFixture,
      lastUpdated: new Date().toISOString(),
      activeTab: MatchesStorage.getFixtureActiveTab(activeFixture.id),
    };
    upsertFixture(next);
  };

  const handleTournamentComplete = () => {
    if (!activeFixture) return;

    // Read latest fixture to avoid overwriting recent opponents updates
    const latest = MatchesStorage.getFixtureById(activeFixture.id) as Fixture | null;
    const base = latest || activeFixture;

    const updatedFixture = {
      ...base,
      status: 'completed' as const,
      // Rankings are already saved in double elimination storage, no need to duplicate here
      completedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      activeTab: MatchesStorage.getFixtureActiveTab(activeFixture.id) // activeTab'ı localStorage'dan oku
    };

    upsertFixture(updatedFixture);
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

    const uiPlayers: UIPlayer[] = activeFixture.players.map(p => ({
      id: p.id,
      name: p.name ?? '',
      surname: p.surname ?? '',
      weight: p.weight ?? 0,
      gender: (p.gender as 'male' | 'female') ?? 'male',
      handPreference: (p.handPreference as 'left' | 'right' | 'both') ?? 'right',
      birthday: p.birthday,
      city: p.city,
      opponents: (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>,
    }));

    const props = {
      players: uiPlayers,
      onMatchResult: handleMatchResult,
      onTournamentComplete: handleTournamentComplete,
      onUpdateOpponents: (player1Id: string, player2Id: string, matchDescription: string, winnerId: string) => {
        // Maç sonrası opponents güncelleme - maç açıklaması ve sonuç ile
        const updatedPlayers = activeFixture.players.map(p => {
          if (p.id === player1Id) {
            const existingOpponents = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            const newOpponent: { playerId: string; matchDescription: string; result: 'win' | 'loss' } = {
              playerId: player2Id,
              matchDescription: matchDescription,
              result: p.id === winnerId ? 'win' : 'loss'
            };
            return { ...p, opponents: [...existingOpponents, newOpponent] };
          }
          if (p.id === player2Id) {
            const existingOpponents = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            const newOpponent: { playerId: string; matchDescription: string; result: 'win' | 'loss' } = {
              playerId: player1Id,
              matchDescription: matchDescription,
              result: p.id === winnerId ? 'win' : 'loss'
            };
            return { ...p, opponents: [...existingOpponents, newOpponent] };
          }
          return p;
        });

        const updatedFixture = { ...activeFixture, players: updatedPlayers };
        upsertFixture(updatedFixture);
      },
      onRemoveOpponents: (player1Id: string, player2Id: string, matchDescription: string) => {
        const updatedPlayers = activeFixture.players.map(p => {
          if (p.id === player1Id) {
            const list = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            let idx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
              const o = list[i];
              if (o.playerId === player2Id && o.matchDescription === matchDescription) { idx = i; break; }
            }
            if (idx !== -1) {
              const newList = [...list.slice(0, idx), ...list.slice(idx + 1)];
              return { ...p, opponents: newList };
            }
          }
          if (p.id === player2Id) {
            const list = (p.opponents || []) as Array<{ playerId: string; matchDescription: string; result: 'win' | 'loss' }>;
            let idx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
              const o = list[i];
              if (o.playerId === player1Id && o.matchDescription === matchDescription) { idx = i; break; }
            }
            if (idx !== -1) {
              const newList = [...list.slice(0, idx), ...list.slice(idx + 1)];
              return { ...p, opponents: newList };
            }
          }
          return p;
        });
        const updatedFixture = { ...activeFixture, players: updatedPlayers } as Fixture;
        upsertFixture(updatedFixture);
      },
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
                fixtures={fixtures}
                onFixtureSelect={handleFixtureSelect}
                onFixtureClose={handleFixtureClose}
                activeFixtureId={activeFixture?.id}
              />
              {activeFixture && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setIsMatchPDFModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-sm sm:text-base font-semibold"
                  >
                    {t('tournamentCard.createPDF')}
                  </button>
                </div>
              )}
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

      {/* Matches PDF Create Modal */}
      {isMatchPDFModalOpen && activeFixture && (
        <div
          className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[9998] overflow-hidden"
          onClick={() => setIsMatchPDFModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tournamentCard.pdfColumnSelection')}</h3>
                <p className="text-sm text-gray-600">{activeFixture.name}</p>
              </div>
              <button
                onClick={() => setIsMatchPDFModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={includeRankingsForPDF}
                  onChange={(e) => setIncludeRankingsForPDF(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">{t('matches.tabRankings')}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                <input
                  type="checkbox"
                  checked={includeCompletedForPDF}
                  onChange={(e) => setIncludeCompletedForPDF(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">{t('matches.tabCompleted')}</span>
              </label>

              {/* Removed players-per-page control per request */}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsMatchPDFModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-sm font-semibold rounded-lg"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  const { pages, currentPage } = openFixturePreviewModal(
                    activeFixture,
                    includeRankingsForPDF,
                    includeCompletedForPDF,
                    rowsPerPageForPDF
                  );
                  setPreviewPages(pages);
                  setCurrentPreviewPage(currentPage);
                  setIsMatchPDFModalOpen(false);
                  setIsPDFPreviewModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
              >
                {t('tournamentCard.openPreview')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal for Matches */}
      {isPDFPreviewModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999] overflow-hidden"
          onClick={() => {
            setIsPDFPreviewModalOpen(false);
            setPreviewPages([]);
            setCurrentPreviewPage(0);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('tournamentCard.pdfPreview')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setIsPDFPreviewModalOpen(false);
                    if (!activeFixture) return;
                    try {
                      setIsExporting(true);
                      setPdfProgress(0);
                      await generateFixturePDF(
                        activeFixture,
                        includeRankingsForPDF,
                        includeCompletedForPDF,
                        rowsPerPageForPDF,
                        (p) => setPdfProgress(p)
                      );
                    } catch (e) {
                    } finally {
                      if (pdfProgress < 100) setPdfProgress(100);
                      if (hideProgressTimer.current) window.clearTimeout(hideProgressTimer.current);
                      hideProgressTimer.current = window.setTimeout(() => {
                        setIsExporting(false);
                        setPdfProgress(0);
                      }, 800);
                    }
                  }}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
                >
                  {t('tournamentCard.downloadPDF')}
                </button>
                <button
                  onClick={() => {
                    setIsPDFPreviewModalOpen(false);
                    setIsMatchPDFModalOpen(true);
                  }}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
                >
                  {t('tournamentCard.returnToColumnSelection')}
                </button>
                <button
                  onClick={() => setIsPDFPreviewModalOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-xl border-2 border-dashed border-gray-300">
              {previewPages.length > 1 && (
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 mb-4 rounded-t-lg">
                  <div className="flex justify-center items-center gap-4">
                    <button
                      onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                      disabled={currentPreviewPage === 0}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                    >
                      ← {t('tournamentCard.previousPage')}
                    </button>
                    <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                      {t('tournamentCard.page')} {currentPreviewPage + 1} / {previewPages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPreviewPage(Math.min(previewPages.length - 1, currentPreviewPage + 1))}
                      disabled={currentPreviewPage === previewPages.length - 1}
                      className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                    >
                      {t('tournamentCard.nextPage')} →
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <div dangerouslySetInnerHTML={{ __html: previewPages[currentPreviewPage] }} />
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Bu, PDF'inizin nasıl görüneceğinin önizlemesidir. PDF'i indirmek için üstteki "PDF İndir" butonunu kullanabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {isExporting && (
        <div className="fixed top-4 right-4 z-[10000] transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{t('tournamentCard.downloadPDF')}</div>
              <div className="mt-1 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${pdfProgress}%` }} />
              </div>
            </div>
            <div className="text-xs font-semibold text-gray-700 w-10 text-right">{pdfProgress}%</div>
          </div>
        </div>
      )}

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