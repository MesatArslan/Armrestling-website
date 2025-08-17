import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import i18n from '../i18n';
import type { Fixture } from '../storage/schemas';
import { ROUND_DESCRIPTIONS } from './roundDescriptions';
import MatchesRepository from '../storage/MatchesRepository';
import DoubleEliminationRepository from '../storage/DoubleEliminationRepository';

export interface WeightRange {
  id: string;
  name: string;
  min: number;
  max: number;
  excludedPlayerIds?: string[];
}

export interface ExtendedPlayer {
  id: string;
  name: string;
  surname: string;
  weight: number;
  gender: 'male' | 'female';
  handPreference: 'left' | 'right' | 'both';
  birthday?: string;
  city?: string;
  [key: string]: any;
}

export interface Tournament {
  id: string;
  name: string;
  weightRanges: WeightRange[];
  isExpanded: boolean;
  genderFilter?: 'male' | 'female' | null;
  handPreferenceFilter?: 'left' | 'right' | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
}

export interface Column {
  id: string;
  name: string;
  visible: boolean;
}

export const generatePageContent = (
  tournament: Tournament,
  weightRange: WeightRange,
  selectedCols: string[],
  _playersPerPageCount: number,
  pageNum: number,
  pagePlayers: ExtendedPlayer[],
  startIndex: number,
  totalPages: number,
  availablePDFColumns: Column[],
  totalPlayers: number = 0,
  isForPDF: boolean = false
) => {
  const selectedColumns = availablePDFColumns.filter(col => selectedCols.includes(col.id));
  const t = (key: string, options?: any) => String(i18n.t(key, options));
  const getLocale = () => (i18n.language && i18n.language.toLowerCase().startsWith('tr') ? 'tr-TR' : 'en-US');
  const translateHeader = (colId: string, fallbackName: string) => {
    const known = ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'];
    if (known.includes(colId)) {
      return t(`players.${colId}`);
    }
    return fallbackName;
  };
  const wrapForPDF = (content: string) => {
    if (!isForPDF) return content;
    return `<div style="display: inline-block !important; transform: translateY(-5px) !important;">${content}</div>`;
  };

  return `
    <div style="height: 297mm !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important;">
      <div>
          <div style="text-align: center !important; margin-bottom: 10px !important; border-bottom: 1px solid #1e40af !important; padding-bottom: 4px !important;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6) !important; color: white !important; padding: 10px 10px !important; border-radius: 6px !important; margin-bottom: 8px !important;">
            <h1 style="font-size: 20px !important; font-weight: bold !important; color: #ffffff !important;">${wrapForPDF(String(tournament.name))}</h1>
            <h2 style="font-size: 14px !important; margin-top: 4px !important; font-weight: 600 !important; color: #ffffff !important;">${wrapForPDF(String(weightRange.name))}</h2>
          </div>

          <div style="display: flex !important; justify-content: space-between !important; margin: 6px 0 !important; padding: 4px 0 !important; border-top: 1px solid #e5e7eb !important; border-bottom: 1px solid #e5e7eb !important;">
            <div style="text-align: center !important; flex: 1 !important;">
               <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF(String(t('tournamentCard.weightRange')).toUpperCase())}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(`${weightRange.min}-${weightRange.max} kg`)}</div>
            </div>
            <div style="text-align: center !important; flex: 1 !important; border-left: 1px solid #e5e7eb !important; border-right: 1px solid #e5e7eb !important;">
               <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF(String(t('players.totalPlayers')).toUpperCase())}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(String(totalPlayers))}</div>
            </div>
            <div style="text-align: center !important; flex: 1 !important;">
               <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF(String(t('tournamentCard.page')).toUpperCase())}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(`${pageNum + 1}/${totalPages}`)}</div>
            </div>
          </div>
        </div>

        <div style="background: white !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; flex: 1 !important;">
          <table style="width: 100% !important; border-collapse: collapse !important; margin: 0 !important;">
            <thead>
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0) !important;">
                <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: center !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; line-height: 1.3 !important; width: 35px !important; white-space: nowrap !important; height: 16px !important;">${wrapForPDF('#')}</th>
                ${selectedColumns.map(col => {
                  const header = translateHeader(col.id, col.name);
                  return `
                  <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: left !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; line-height: 1.3 !important; white-space: nowrap !important; height: 16px !important;">${wrapForPDF(String(header))}</th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${pagePlayers.map((player, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'} !important;">
                  <td style="border: 1px solid #e2e8f0 !important; padding: 4px 4px !important; font-size: 9px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important; text-align: center !important; white-space: nowrap !important; height: 14px !important;">${wrapForPDF(String(startIndex + index + 1))}</td>
                  ${selectedColumns.map(col => {
                    let value = '';
                    switch(col.id) {
                      case 'name': value = player.name || ''; break;
                      case 'surname': value = player.surname || ''; break;
                      case 'weight': value = player.weight ? `${player.weight} kg` : ''; break;
                       case 'gender': value = player.gender ? String(t(`players.${player.gender}`)) : ''; break;
                       case 'handPreference': value = player.handPreference ? String(t(`players.${player.handPreference}`)) : ''; break;
                      case 'birthday': value = player.birthday ? new Date(player.birthday).toLocaleDateString(getLocale()) : ''; break;
                      default: value = player[col.id] || '';
                    }
                    return `<td style=\"border: 1px solid #e2e8f0 !important; padding: 4px 3px !important; font-size: 9px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important; white-space: nowrap !important; height: 14px !important; overflow: hidden !important; text-overflow: ellipsis !important;\">${wrapForPDF(String(value))}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${pageNum === totalPages - 1 ? `
        <div style="margin-top: 10px !important; text-align: center !important; padding: 8px !important; background: #f8fafc !important; border-radius: 4px !important; border-top: 2px solid #1e40af !important;">
          <p style="margin: 0 !important; color: #374151 !important; font-size: 9px !important; font-weight: 500 !important;">
            ${wrapForPDF(String(t('pdf.footer')))}
          </p>
        </div>
      ` : ''}
    </div>
  `;
};

export const generatePreviewContent = (
  tournament: Tournament,
  weightRange: WeightRange,
  selectedCols: string[],
  playersPerPageCount: number = 33,
  availablePDFColumns: Column[],
  getFilteredPlayers: (weightRange: WeightRange) => ExtendedPlayer[]
) => {
  const filteredPlayers = getFilteredPlayers(weightRange);
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPageCount);

  const pages: string[] = [];

  // Generate content for each page
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIndex = pageNum * playersPerPageCount;
    const endIndex = Math.min(startIndex + playersPerPageCount, filteredPlayers.length);
    const pagePlayers = filteredPlayers.slice(startIndex, endIndex);

    const pageContent = generatePageContent(
      tournament,
      weightRange,
      selectedCols,
      playersPerPageCount,
      pageNum,
      pagePlayers,
      startIndex,
      totalPages,
      availablePDFColumns,
      filteredPlayers.length
    );
    pages.push(`<div class="a4-page">${pageContent}</div>`);
  }

  return pages;
};


const savePdfFile = (pdf: any, fileName: string, blob?: Blob) => {
  try {
    // Primary: built-in save
    pdf.save(fileName);
    return;
  } catch {}
  try {
    const dataBlob = blob || pdf.output('blob');
    // IE/Edge legacy
    const navAny = (window.navigator as any);
    if (navAny && typeof navAny.msSaveOrOpenBlob === 'function') {
      navAny.msSaveOrOpenBlob(dataBlob, fileName);
      return;
    }
    const url = URL.createObjectURL(dataBlob);
    // Best effort: open in new tab for Safari/iOS (download attr often ignored)
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch {
    // Last resort: open a blank window
    try {
      const dataUrl = typeof pdf.output === 'function' ? pdf.output('dataurlstring') : '';
      if (dataUrl) window.open(dataUrl, '_blank');
    } catch {}
  }
};

export const generatePDF = async (
  tournament: Tournament,
  weightRange: WeightRange,
  selectedPDFColumns: string[],
  playersPerPage: number,
  availablePDFColumns: Column[],
  getFilteredPlayers: (weightRange: WeightRange) => ExtendedPlayer[],
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; fileSize: string; totalPages: number }> => {
  // Maksimum 40 oyuncu sınırı
  const safePlayersPerPage = Math.max(1, playersPerPage || 0);
  const maxPlayersPerPage = Math.min(safePlayersPerPage, 40);
  const filteredPlayers = getFilteredPlayers(weightRange);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / maxPlayersPerPage));

  try {
    // Fontların yüklenmesini bekle
    await document.fonts.ready;

    const pdf = new jsPDF('p', 'mm', 'a4');

    if (onProgress) onProgress(0);
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startIndex = pageNum * maxPlayersPerPage;
      const endIndex = Math.min(startIndex + maxPlayersPerPage, filteredPlayers.length);
      const pagePlayers = filteredPlayers.slice(startIndex, endIndex);

      // 1. Önizleme içeriğini al
      const previewDiv = document.createElement('div');
      previewDiv.style.position = 'absolute';
      previewDiv.style.left = '-9999px';
      previewDiv.className = 'a4-page';


      const pageContent = generatePageContent(
        tournament, weightRange, selectedPDFColumns, maxPlayersPerPage, pageNum, pagePlayers, startIndex, totalPages, availablePDFColumns, filteredPlayers.length, true
      );

      // 2. Önizleme içeriğini kopyala
      previewDiv.innerHTML = pageContent;
      document.body.appendChild(previewDiv);

      // 3. Resimlerin yüklenmesini bekle
      await Promise.all(Array.from(previewDiv.querySelectorAll('img')).map(img => {
        if (!img.complete) {
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
        }
        return Promise.resolve();
      }));

      // 4. Yüksek kaliteli PDF için ayarlar
      const options = {
        scale: 4, // Yüksek çözünürlük
        logging: false,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        width: previewDiv.offsetWidth,
        height: previewDiv.offsetHeight,
        windowWidth: previewDiv.scrollWidth,
        windowHeight: previewDiv.scrollHeight
      };

      // 5. Canvas oluştur
      const canvas = await html2canvas(previewDiv, options);
      document.body.removeChild(previewDiv);

      // 6. PDF'e dönüştür
      const imgData = canvas.toDataURL('image/jpeg',0.9);
      const imgWidth = 210; // A4 genişlik (mm)
      const imgHeight = 297;
      // Uniform text baseline correction (~5px) converted to mm
      const mmPerPx = imgWidth / canvas.width;
      const yOffsetMm = 5 * mmPerPx;

      if (pageNum > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, -yOffsetMm, imgWidth, imgHeight);

      if (onProgress) {
        const percent = Math.min(100, Math.round(((pageNum + 1) / totalPages) * 100));
        onProgress(percent);
      }
    }

    const pdfBlob = pdf.output('blob');
    const fileSize = pdfBlob.size;
    const sizeInKB = (fileSize / 1024).toFixed(1);
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
    const sizeText = fileSize > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const fileName = `tournament_${sanitize(tournament.name)}_${sanitize(weightRange.name)}_players.pdf`;
    savePdfFile(pdf as any, fileName, pdfBlob);

    if (onProgress) onProgress(100);
    return { fileName, fileSize: sizeText, totalPages };

  } catch (error) {
    throw new Error(i18n.t('tournamentCard.pdfErrorMessage'));
  }
};

export const generateCombinedTournamentPDF = async (
  tournament: Tournament,
  rangesToInclude: WeightRange[],
  selectedPDFColumns: string[],
  playersPerPage: number,
  availablePDFColumns: Column[],
  getFilteredPlayersForRange: (weightRange: WeightRange) => ExtendedPlayer[],
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; fileSize: string; totalPages: number }> => {
  const safePlayersPerPage = Math.max(1, playersPerPage || 0);
  const maxPlayersPerPage = Math.min(safePlayersPerPage, 40);
  try {
    await document.fonts.ready;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let globalPageIndex = 0;
    // Precompute players and total pages for accurate progress
    const perRangePlayers = rangesToInclude.map((wr) => getFilteredPlayersForRange(wr));
    const totalPagesOverall = perRangePlayers
      .map((list) => Math.ceil(list.length / maxPlayersPerPage) || 1)
      .reduce((a, b) => a + b, 0);
    if (onProgress) onProgress(0);

    for (let rIndex = 0; rIndex < rangesToInclude.length; rIndex++) {
      const weightRange = rangesToInclude[rIndex];
      const filteredPlayers = perRangePlayers[rIndex];
      const totalPagesForRange = Math.ceil(filteredPlayers.length / maxPlayersPerPage) || 1;

      for (let pageNum = 0; pageNum < totalPagesForRange; pageNum++) {
        const startIndex = pageNum * maxPlayersPerPage;
        const endIndex = Math.min(startIndex + maxPlayersPerPage, filteredPlayers.length);
        const pagePlayers = filteredPlayers.slice(startIndex, endIndex);

        const previewDiv = document.createElement('div');
        previewDiv.style.position = 'absolute';
        previewDiv.style.left = '-9999px';
        previewDiv.className = 'a4-page';

        const pageContent = generatePageContent(
          tournament,
          weightRange,
          selectedPDFColumns,
          maxPlayersPerPage,
          pageNum,
          pagePlayers,
          startIndex,
          totalPagesForRange,
          availablePDFColumns,
          filteredPlayers.length,
          true
        );

        previewDiv.innerHTML = pageContent;
        document.body.appendChild(previewDiv);

        await Promise.all(
          Array.from(previewDiv.querySelectorAll('img')).map((img) => {
            if (!img.complete) {
              return new Promise((resolve, reject) => {
                img.onload = resolve as any;
                img.onerror = reject as any;
              });
            }
            return Promise.resolve();
          })
        );

        const options = {
          scale: 4,
          logging: false,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          width: previewDiv.offsetWidth,
          height: previewDiv.offsetHeight,
          windowWidth: previewDiv.scrollWidth,
          windowHeight: previewDiv.scrollHeight,
        } as const;

        const canvas = await html2canvas(previewDiv, options as any);
        document.body.removeChild(previewDiv);

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgWidth = 210;
        const imgHeight = 297;
        const mmPerPx = imgWidth / canvas.width;
        const yOffsetMm = 5 * mmPerPx;

        if (globalPageIndex > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, -yOffsetMm, imgWidth, imgHeight);
        globalPageIndex += 1;

        if (onProgress) {
          const percent = Math.min(100, Math.round((globalPageIndex / Math.max(1, totalPagesOverall)) * 100));
          onProgress(percent);
        }
      }
    }

    const pdfBlob = pdf.output('blob');
    const fileSize = pdfBlob.size;
    const sizeInKB = (fileSize / 1024).toFixed(1);
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
    const sizeText = fileSize > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const fileName = `tournament_${sanitize(tournament.name)}_selected_fixtures.pdf`;
    savePdfFile(pdf as any, fileName, pdfBlob);
    if (onProgress) onProgress(100);
    return { fileName, fileSize: sizeText, totalPages: globalPageIndex };
  } catch (error) {
    throw new Error(i18n.t('tournamentCard.pdfErrorMessage'));
  }
};

export const generateCombinedPreviewPages = (
  tournament: Tournament,
  rangesToInclude: WeightRange[],
  selectedCols: string[],
  playersPerPageCount: number,
  availablePDFColumns: Column[],
  getFilteredPlayersForRange: (weightRange: WeightRange) => ExtendedPlayer[]
) => {
  const pages: string[] = [];
  rangesToInclude.forEach((wr) => {
    const filteredPlayers = getFilteredPlayersForRange(wr);
    const safeCount = Math.min(Math.max(1, playersPerPageCount || 0), 40);
    const totalPagesForRange = Math.ceil(filteredPlayers.length / safeCount) || 1;
    for (let pageNum = 0; pageNum < totalPagesForRange; pageNum++) {
      const startIndex = pageNum * safeCount;
      const endIndex = Math.min(startIndex + safeCount, filteredPlayers.length);
      const pagePlayers = filteredPlayers.slice(startIndex, endIndex);
      const pageContent = generatePageContent(
        tournament,
        wr,
        selectedCols,
        safeCount,
        pageNum,
        pagePlayers,
        startIndex,
        totalPagesForRange,
        availablePDFColumns,
        filteredPlayers.length
      );
      pages.push(`<div class="a4-page">${pageContent}</div>`);
    }
  });
  return pages;
};

export const openPreviewModal = (
  tournament: Tournament,
  weightRange: WeightRange,
  selectedPDFColumns: string[],
  playersPerPage: number,
  availablePDFColumns: Column[],
  getFilteredPlayers: (weightRange: WeightRange) => ExtendedPlayer[]
) => {
  // Maksimum 40 oyuncu sınırı
  const maxPlayersPerPage = Math.min(Math.max(1, playersPerPage || 0), 40);
  const pages = generatePreviewContent(
    tournament,
    weightRange,
    selectedPDFColumns,
    maxPlayersPerPage,
    availablePDFColumns,
    getFilteredPlayers
  );

  return {
    pages,
    currentPage: 0
  };
}; 

// ===== Matches (Fixture) PDF generation =====

type FixtureLike = Pick<Fixture, 'id' | 'name' | 'tournamentName' | 'weightRangeName' | 'players' | 'rankings'>;
interface MatchLike {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  bracket: 'winner' | 'loser' | 'placement';
  round: number;
  matchNumber: number;
  isBye: boolean;
  description?: string;
}

const getPlayerNameFromFixture = (fixture: FixtureLike, playerId?: string) => {
  if (!playerId) return '';
  const p = fixture.players.find(pp => pp.id === playerId);
  const full = [p?.name, p?.surname].filter(Boolean).join(' ');
  return full || (p ? String(p.id) : '');
};

const getFreshFixture = (fixtureId: string): any | null => {
  try {
    const repo = new MatchesRepository();
    return repo.getFixture(fixtureId);
  } catch {
    return null;
  }
};

const getDEState = (fixtureId: string): any | null => {
  try {
    const deRepo = new DoubleEliminationRepository<any>();
    const state = deRepo.getState(fixtureId);
    if (state) return state;
  } catch {}
  try {
    const legacy = window.localStorage.getItem(`double-elimination-fixture-${fixtureId}`);
    return legacy ? JSON.parse(legacy) : null;
  } catch {
    return null;
  }
};

const mergeFixtureWithDEState = (fixture: any): any => {
  const state = getDEState(fixture.id);
  if (!state) return fixture;
  const merged = { ...fixture } as any;
  if (state.rankings && typeof state.rankings === 'object') merged.rankings = state.rankings;
  return merged;
};

const buildFixtureHeader = (fixture: FixtureLike, pageNum: number, totalPages: number, isForPDF: boolean) => {
  const t = (key: string, options?: any) => String(i18n.t(key, options));
  const wrap = (content: string) => (isForPDF ? `<div style="display:inline-block !important; transform: translateY(-5px) !important;">${content}</div>` : content);
  return `
    <div style="text-align: center !important; margin-bottom: 10px !important; border-bottom: 1px solid #1e40af !important; padding-bottom: 4px !important;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6) !important; color: white !important; padding: 10px 10px !important; border-radius: 6px !important; margin-bottom: 8px !important;">
        <h1 style="font-size: 20px !important; font-weight: bold !important; color: #ffffff !important;">${wrap(String(fixture.tournamentName || ''))}</h1>
        <div style="font-size: 12px !important; font-weight: 500 !important; opacity: 0.9 !important;">${wrap(String(fixture.weightRangeName || ''))}</div>
      </div>
      <div style="display:flex !important; justify-content: center !important; gap: 24px !important;">
        <div style="font-size: 10px !important; color: #111827 !important; font-weight: 600 !important;">${wrap(`${t('tournamentCard.page')} ${pageNum + 1}/${totalPages}`)}</div>
      </div>
    </div>
  `;
};

const buildRankingsSection = (fixture: FixtureLike, isForPDF: boolean) => {
  const t = (key: string) => String(i18n.t(key));
  const wrap = (content: string) => (isForPDF ? `<div style="display:inline-block !important; transform: translateY(-3px) !important;">${content}</div>` : content);
  const entries: Array<{ key: keyof NonNullable<FixtureLike['rankings']> | 'fifth' | 'sixth' | 'seventh' | 'eighth'; label: string; icon: string }> = [
    { key: 'first', label: t('rankings.first'), icon: '🥇' },
    { key: 'second', label: t('rankings.second'), icon: '🥈' },
    { key: 'third', label: t('rankings.third'), icon: '🥉' },
    { key: 'fourth', label: t('rankings.fourth'), icon: '🏅' },
    { key: 'fifth', label: t('rankings.fifth'), icon: '🎖️' },
    { key: 'sixth', label: t('rankings.sixth'), icon: '6️⃣' },
    { key: 'seventh', label: t('rankings.seventh'), icon: '7️⃣' },
    { key: 'eighth', label: t('rankings.eighth'), icon: '8️⃣' },
  ];
  const playersLen = Array.isArray((fixture as any).players) ? (fixture as any).players.length : 0;
  const maxPlaces = Math.max(0, Math.min(playersLen, entries.length));
  const rows = entries.slice(0, maxPlaces).map(({ key, label, icon }) => {
    const playerId = (fixture as any).rankings?.[key as any];
    const playerName = getPlayerNameFromFixture(fixture, playerId);
    return `
      <tr>
        <td style=\"border:1px solid #e5e7eb !important; padding:6px 8px !important; font-size: 10px !important;\">${wrap(`${icon} ${label}`)}</td>
        <td style=\"border:1px solid #e5e7eb !important; padding:6px 8px !important; font-size: 10px !important; font-weight:600 !important;\">${wrap(playerName || '—')}</td>
      </tr>
    `;
  }).join('');
  return `
    <div style="margin-bottom: 10px !important;">
      <h3 style="font-size: 14px !important; font-weight: bold !important; color: #111827 !important; margin-bottom: 6px !important;">${wrap(String(i18n.t('rankings.title')))}</h3>
      <table style="width:100% !important; border-collapse: collapse !important;">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

const getLocalizedBracketLabel = (raw?: string): string => {
  if (!raw) return '';
  const withoutBye = raw.replace(/\s*-\s*Bye.*/i, '').trim();
  const matchSuffix = /^(.*?)(?:\s*-\s*Match\s*(\d+))?$/i.exec(withoutBye);
  let base = withoutBye;
  let number: string | undefined;
  if (matchSuffix) {
    base = matchSuffix[1].trim();
    number = matchSuffix[2];
  }
  const key = Object.keys(ROUND_DESCRIPTIONS).find(k => {
    const info = (ROUND_DESCRIPTIONS as any)[k];
    return info && (info.description === base || info.displayName === base || info.shortName === base);
  });
  const localizedBase = key ? String(i18n.t(`rounds.${key}`)) : String(i18n.t(base, { defaultValue: base }));
  return number ? `${localizedBase} - ${i18n.t('matches.match')} ${number}` : localizedBase;
};

const buildCompletedMatchesTable = (fixture: FixtureLike, matches: MatchLike[], startIndex: number, endIndex: number, isForPDF: boolean) => {
  const t = (key: string) => String(i18n.t(key));
  const wrap = (content: string) => (isForPDF ? `<div style=\"display:inline-block !important; transform: translateY(-3px) !important;\">${content}</div>` : content);
  const header = `
    <thead>
      <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0) !important;">
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('completedMatches.headers.matchNo'))}</th>
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('completedMatches.headers.bracket'))}</th>
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('matches.rightTable'))}</th>
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('matches.leftTable'))}</th>
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('matches.winner'))}</th>
        <th style="border:1px solid #cbd5e1 !important; padding:6px 4px !important; font-size:10px !important;">${wrap(t('matches.loser'))}</th>
      </tr>
    </thead>
  `;
  const bodyRows = matches.slice(startIndex, endIndex).map((m, idx) => {
    const globalIndex = startIndex + idx + 1;
    const winnerId = m.winnerId;
    const loserId = m.player1Id === winnerId ? m.player2Id : m.player1Id;
    // Map left/right columns using tablePosition when available
    let leftId: string | undefined;
    let rightId: string | undefined;
    const tablePos = (m as any).tablePosition as Record<string, 'left' | 'right'> | undefined;
    if (tablePos && typeof tablePos === 'object') {
      for (const pid of Object.keys(tablePos)) {
        if (tablePos[pid] === 'left') leftId = pid;
        if (tablePos[pid] === 'right') rightId = pid;
      }
    }
    if (!leftId) leftId = m.player1Id;
    if (!rightId) rightId = m.player2Id;
    // For BYE matches: left table shows BYE, right shows actual player name, winner shows player's name, loser shows BYE
    const rightPlayer = m.isBye ? (getPlayerNameFromFixture(fixture, winnerId) || t('matches.bye')) : (getPlayerNameFromFixture(fixture, rightId) || '—');
    const leftPlayer = m.isBye ? t('matches.bye') : (getPlayerNameFromFixture(fixture, leftId) || '—');
    const winner = m.isBye ? (getPlayerNameFromFixture(fixture, winnerId) || t('matches.bye')) : getPlayerNameFromFixture(fixture, winnerId);
    const loser = m.isBye ? t('matches.bye') : getPlayerNameFromFixture(fixture, loserId);
    let bracketDisplay = '';
    if (m.description && m.description.toLowerCase() !== 'result') {
      bracketDisplay = getLocalizedBracketLabel(m.description);
    }
    if (!bracketDisplay) {
      if (m.bracket === 'winner' && m.round) {
        const key = `WB${m.round}`;
        bracketDisplay = ROUND_DESCRIPTIONS[key] ? `${String(i18n.t(`rounds.${key}`))} - ${t('matches.match')} ${m.matchNumber}` : `${t('matches.match')} ${m.matchNumber}`;
      } else if (m.bracket === 'loser' && m.round) {
        const key = `LB${m.round}`;
        bracketDisplay = ROUND_DESCRIPTIONS[key] ? `${String(i18n.t(`rounds.${key}`))} - ${t('matches.match')} ${m.matchNumber}` : `${t('matches.match')} ${m.matchNumber}`;
      } else {
        bracketDisplay = m.description && m.description !== 'Result' ? m.description : `${t('matches.match')} ${m.matchNumber}`;
      }
    }
    return `
      <tr style="background-color: ${globalIndex % 2 === 0 ? '#ffffff' : '#f8fafc'} !important;">
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important; text-align:center !important;">${wrap(String(globalIndex))}</td>
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important;">${wrap(String(bracketDisplay))}</td>
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important;">${wrap(String(rightPlayer))}</td>
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important;">${wrap(String(leftPlayer))}</td>
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important; font-weight:600 !important; color:#065f46 !important;">${wrap(String(winner))}</td>
        <td style="border:1px solid #e2e8f0 !important; padding:4px 4px !important; font-size:9px !important; font-weight:600 !important; color:#7f1d1d !important;">${wrap(String(loser))}</td>
      </tr>
    `;
  }).join('');
  return `
    <div style="background: white !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.08) !important; overflow: hidden !important;">
      <table style="width:100% !important; border-collapse: collapse !important;">
        ${header}
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
};

const getCompletedMatchesForFixture = (fixture: any): MatchLike[] => {
  // No results array anymore, return empty array
  return [];
};

export const generateFixturePreviewPages = (
  fixture: FixtureLike,
  includeRankings: boolean,
  includeCompletedMatches: boolean,
  rowsPerPage: number = 18
) => {
  const fresh = mergeFixtureWithDEState(getFreshFixture(fixture.id) || fixture);
  const completed = includeCompletedMatches ? getCompletedMatchesForFixture(fresh) : [];
  const totalRows = completed.length;
  
  // Dynamic per-page sizing when showing 8 placements: first page 16, subsequent pages 25
  // Determine if 8 placements are being shown (based on players count, not only stored rankings)
  const playersLen = Array.isArray((fresh as any).players) ? (fresh as any).players.length : 0;
  const hasEightPlacements = includeRankings && playersLen >= 4;

  const pages: string[] = [];

  if (hasEightPlacements) {
    const firstPageRows = 16;
    const subsequentPageRows = 25;
    const totalPages = (() => {
      if (totalRows === 0) return 1; // show rankings on first page
      const remainingAfterFirst = Math.max(0, totalRows - firstPageRows);
      const extraPages = remainingAfterFirst > 0 ? Math.ceil(remainingAfterFirst / subsequentPageRows) : 0;
      return 1 + extraPages;
    })();

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startIndex = pageNum === 0 ? 0 : Math.min(firstPageRows + (pageNum - 1) * subsequentPageRows, totalRows);
      const perPage = pageNum === 0 ? firstPageRows : subsequentPageRows;
      const endIndex = Math.min(startIndex + perPage, totalRows);
      let content = '';
      content += buildFixtureHeader(fresh, pageNum, totalPages, false);
      if (pageNum === 0 && includeRankings) {
        content += buildRankingsSection(fresh, false);
      }
      if (includeCompletedMatches && totalRows > 0) {
        content += buildCompletedMatchesTable(fresh, completed as any, startIndex, endIndex, false);
      }
      if (pageNum === totalPages - 1) {
        content += `
          <div style="margin-top: 10px !important; text-align: center !important; padding: 8px !important; background: #f8fafc !important; border-radius: 4px !important; border-top: 2px solid #1e40af !important;">
            <p style="margin: 0 !important; color: #374151 !important; font-size: 9px !important; font-weight: 500 !important;">${String(i18n.t('pdf.footer'))}</p>
          </div>
        `;
      }
      pages.push(`<div class="a4-page">${content}</div>`);
    }
  } else {
    // Default fixed rows per page
    const effectiveRowsPerPage = Math.max(1, rowsPerPage);
    const totalPages = Math.max(1, Math.ceil(totalRows / effectiveRowsPerPage) || (includeRankings ? 1 : 0));
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startIndex = pageNum * effectiveRowsPerPage;
      const endIndex = Math.min(startIndex + effectiveRowsPerPage, totalRows);
      let content = '';
      content += buildFixtureHeader(fresh, pageNum, totalPages, false);
      if (pageNum === 0 && includeRankings) {
        content += buildRankingsSection(fresh, false);
      }
      if (includeCompletedMatches) {
        content += buildCompletedMatchesTable(fresh, completed as any, startIndex, endIndex, false);
      }
      if (pageNum === totalPages - 1) {
        content += `
          <div style="margin-top: 10px !important; text-align: center !important; padding: 8px !important; background: #f8fafc !important; border-radius: 4px !important; border-top: 2px solid #1e40af !important;">
            <p style="margin: 0 !important; color: #374151 !important; font-size: 9px !important; font-weight: 500 !important;">${String(i18n.t('pdf.footer'))}</p>
          </div>
        `;
      }
      pages.push(`<div class="a4-page">${content}</div>`);
    }
  }

  return pages;
};

export const openFixturePreviewModal = (
  fixture: FixtureLike,
  includeRankings: boolean,
  includeCompletedMatches: boolean,
  rowsPerPage: number = 18
) => {
  const pages = generateFixturePreviewPages(fixture, includeRankings, includeCompletedMatches, rowsPerPage);
  return { pages, currentPage: 0 };
};

// ===== Scoring PDF generation =====

interface ScoringData {
  group: string;
  total: number;
}

interface ScoringConfig {
  points: Record<string, number>;
  groupBy: string;
  selectedTournamentIds: string[];
}

export const generateScoringPreviewContent = (
  aggregatedScores: ScoringData[],
  config: ScoringConfig,
  groupFieldName: string,
  isForPDF: boolean = false
): string[] => {
  const t = (key: string, options?: any) => String(i18n.t(key, options));
  const getLocale = () => (i18n.language && i18n.language.toLowerCase().startsWith('tr') ? 'tr-TR' : 'en-US');
  
  // Helper function to wrap text for PDF (moves text slightly upward)
  const wrapForPDF = (content: string) => {
    if (!isForPDF) return content;
    return `<div style="display: inline-block !important; transform: translateY(-5px) !important;">${content}</div>`;
  };
  
  // Calculate how many scores fit per page (approximately 15-20 per page)
  const scoresPerPage = 18;
  const totalPages = Math.ceil(aggregatedScores.length / scoresPerPage);
  
  const pages: string[] = [];
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIndex = pageNum * scoresPerPage;
    const endIndex = Math.min(startIndex + scoresPerPage, aggregatedScores.length);
    const pageScores = aggregatedScores.slice(startIndex, endIndex);
    
    const pageContent = `
      <div style="height: 297mm !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important;">
        <div>
          <div style="text-align: center !important; margin-bottom: 10px !important; border-bottom: 1px solid #1e40af !important; padding-bottom: 4px !important;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6) !important; color: white !important; padding: 10px 10px !important; border-radius: 6px !important; margin-bottom: 8px !important;">
              <h1 style="font-size: 20px !important; font-weight: bold !important; color: #ffffff !important;">${wrapForPDF('Puanlama Sistemi')}</h1>
              <h2 style="font-size: 14px !important; margin-top: 4px !important; font-weight: 600 !important; color: #ffffff !important;">${wrapForPDF('Toplam Puanlar')}</h2>
            </div>
            
            <div style="display: flex !important; justify-content: space-between !important; margin: 6px 0 !important; padding: 4px 0 !important; border-top: 1px solid #e5e7eb !important; border-bottom: 1px solid #e5e7eb !important;">
              <div style="text-align: center !important; flex: 1 !important;">
                <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF('SIRALAMA KRİTERİ')}</div>
                <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(groupFieldName)}</div>
              </div>
              <div style="text-align: center !important; flex: 1 !important; border-left: 1px solid #e5e7eb !important; border-right: 1px solid #e5e7eb !important;">
                <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF('TOPLAM KAYIT')}</div>
                <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(String(aggregatedScores.length))}</div>
              </div>
              <div style="text-align: center !important; flex: 1 !important;">
                <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: -8px !important;">${wrapForPDF('SAYFA')}</div>
                <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${wrapForPDF(`${pageNum + 1}/${totalPages}`)}</div>
              </div>
            </div>
          </div>
          
          <div style="background: white !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; flex: 1 !important;">
            <table style="width: 100% !important; border-collapse: collapse !important; margin: 0 !important;">
              <thead>
                <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0) !important;">
                  <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: center !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; line-height: 1.3 !important; width: 35px !important; white-space: nowrap !important; height: 16px !important;">${wrapForPDF('#')}</th>
                  <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: left !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; line-height: 1.3 !important; white-space: nowrap !important; height: 16px !important;">${wrapForPDF(groupFieldName)}</th>
                  <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: center !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; line-height: 1.3 !important; white-space: nowrap !important; height: 16px !important;">${wrapForPDF('Toplam Puan')}</th>
                </tr>
              </thead>
              <tbody>
                ${pageScores.map((score, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'} !important;">
                    <td style="border: 1px solid #e2e8f0 !important; padding: 4px 4px !important; font-size: 9px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important; text-align: center !important; white-space: nowrap !important; height: 14px !important;">${wrapForPDF(String(startIndex + index + 1))}</td>
                    <td style="border: 1px solid #e2e8f0 !important; padding: 4px 3px !important; font-size: 9px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important; white-space: nowrap !important; height: 14px !important; overflow: hidden !important; text-overflow: ellipsis !important;">${wrapForPDF(score.group)}</td>
                    <td style="border: 1px solid #e2e8f0 !important; padding: 4px 3px !important; font-size: 9px !important; line-height: 1.3 !important; color: #000000 !important; font-weight: 500 !important; white-space: nowrap !important; height: 14px !important; text-align: center !important; font-weight: 600 !important;">${wrapForPDF(String(score.total))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        ${pageNum === totalPages - 1 ? `
          <div style="margin-top: 10px !important; text-align: center !important; padding: 8px !important; background: #f8fafc !important; border-radius: 4px !important; border-top: 2px solid #1e40af !important;">
            <p style="margin: 0 !important; color: #374151 !important; font-size: 9px !important; font-weight: 500 !important;">
              ${wrapForPDF(String(i18n.t('pdf.footer')))}
            </p>
          </div>
        ` : ''}
      </div>
    `;
    
    pages.push(`<div class="a4-page">${pageContent}</div>`);
  }
  
  return pages;
};

export const openScoringPreviewModal = (
  aggregatedScores: ScoringData[],
  config: ScoringConfig,
  groupFieldName: string
) => {
  const pages = generateScoringPreviewContent(aggregatedScores, config, groupFieldName, false);
  return { pages, currentPage: 0 };
};

export const generateScoringPDF = async (
  aggregatedScores: ScoringData[],
  config: ScoringConfig,
  groupFieldName: string,
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; fileSize: string; totalPages: number }> => {
  try {
    await document.fonts.ready;
    const pages = generateScoringPreviewContent(aggregatedScores, config, groupFieldName, true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    if (onProgress) onProgress(0);
    
    for (let i = 0; i < pages.length; i++) {
      const previewDiv = document.createElement('div');
      previewDiv.style.position = 'absolute';
      previewDiv.style.left = '-9999px';
      previewDiv.className = 'a4-page';
      
      // Remove the a4-page wrapper div
      previewDiv.innerHTML = pages[i].replace(/<div class=\"a4-page\">|<\/div>$/g, '');
      document.body.appendChild(previewDiv);
      
      // Render
      const options = { 
        scale: 4, 
        logging: false, 
        useCORS: true, 
        allowTaint: true, 
        letterRendering: true, 
        backgroundColor: '#ffffff', 
        width: previewDiv.offsetWidth, 
        height: previewDiv.offsetHeight, 
        windowWidth: previewDiv.scrollWidth, 
        windowHeight: previewDiv.scrollHeight 
      } as const;
      
      const canvas = await html2canvas(previewDiv, options as any);
      document.body.removeChild(previewDiv);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const imgWidth = 210;
      const mmPerPx = imgWidth / canvas.width;
      const yOffsetMm = 5 * mmPerPx;
      
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yOffsetMm, imgWidth, 297);
      
      if (onProgress) {
        onProgress(Math.min(100, Math.round(((i + 1) / Math.max(1, pages.length)) * 100)));
      }
    }
    
    const pdfBlob = pdf.output('blob');
    const sizeInKB = (pdfBlob.size / 1024).toFixed(1);
    const sizeInMB = (pdfBlob.size / (1024 * 1024)).toFixed(2);
    const sizeText = pdfBlob.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const fileName = `scoring_${sanitize(groupFieldName)}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    savePdfFile(pdf as any, fileName, pdfBlob);
    
    if (onProgress) onProgress(100);
    return { fileName, fileSize: sizeText, totalPages: pages.length };
    
  } catch (error) {
    throw new Error(i18n.t('scoring.pdfErrorMessage'));
  }
};

export const generateFixturePDF = async (
  fixture: FixtureLike,
  includeRankings: boolean,
  includeCompletedMatches: boolean,
  rowsPerPage: number = 18,
  onProgress?: (percent: number) => void
): Promise<{ fileName: string; fileSize: string; totalPages: number }> => {
  try {
    await document.fonts.ready;
    const pages = generateFixturePreviewPages(fixture, includeRankings, includeCompletedMatches, rowsPerPage);
    const pdf = new jsPDF('p', 'mm', 'a4');
    if (onProgress) onProgress(0);
    for (let i = 0; i < pages.length; i++) {
      const previewDiv = document.createElement('div');
      previewDiv.style.position = 'absolute';
      previewDiv.style.left = '-9999px';
      previewDiv.className = 'a4-page';
      // Ensure consistent baseline alignment via PDF mode renders
      previewDiv.innerHTML = pages[i].replace(/<div class=\"a4-page\">|<\/div>$/g, '');
      document.body.appendChild(previewDiv);
      // Render
      const options = { scale: 4, logging: false, useCORS: true, allowTaint: true, letterRendering: true, backgroundColor: '#ffffff', width: previewDiv.offsetWidth, height: previewDiv.offsetHeight, windowWidth: previewDiv.scrollWidth, windowHeight: previewDiv.scrollHeight } as const;
      const canvas = await html2canvas(previewDiv, options as any);
      document.body.removeChild(previewDiv);
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const imgWidth = 210;
      const mmPerPx = imgWidth / canvas.width;
      const yOffsetMm = 5 * mmPerPx;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -yOffsetMm, imgWidth, 297);
      if (onProgress) onProgress(Math.min(100, Math.round(((i + 1) / Math.max(1, pages.length)) * 100)));
    }
    const pdfBlob = pdf.output('blob');
    const sizeInKB = (pdfBlob.size / 1024).toFixed(1);
    const sizeInMB = (pdfBlob.size / (1024 * 1024)).toFixed(2);
    const sizeText = pdfBlob.size > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    const fileName = `fixture_${sanitize(fixture.tournamentName || '')}_${sanitize(fixture.weightRangeName || '')}_results.pdf`;
    savePdfFile(pdf as any, fileName, pdfBlob);
    if (onProgress) onProgress(100);
    return { fileName, fileSize: sizeText, totalPages: pages.length };
  } catch (error) {
    throw new Error(i18n.t('tournamentCard.pdfErrorMessage'));
  }
};