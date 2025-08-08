import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import i18n from '../i18n';

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
  playersPerPageCount: number,
  pageNum: number,
  pagePlayers: ExtendedPlayer[],
  startIndex: number,
  totalPages: number,
  availablePDFColumns: Column[],
  isForPDF: boolean = false,
  totalPlayers: number = 0
) => {
  const selectedColumns = availablePDFColumns.filter(col => selectedCols.includes(col.id));
  const t = (key: string, options?: any) => i18n.t(key, options);
  const getLocale = () => (i18n.language && i18n.language.toLowerCase().startsWith('tr') ? 'tr-TR' : 'en-US');
  const translateHeader = (colId: string, fallbackName: string) => {
    const known = ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'];
    if (known.includes(colId)) {
      return t(`players.${colId}`);
    }
    return fallbackName;
  };

  return `
    <div style="height: 297mm !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; !important;">
      <div>
        <div style="text-align: center !important; margin-bottom: 10px !important; border-bottom: 1px solid #1e40af !important; padding-bottom: 4px !important;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6) !important; color: white !important; padding: 10px 10px !important; border-radius: 6px !important; margin-bottom: 8px !important;">
            <h1 style="font-size: 20px !important; !important; font-weight: bold !important; color: #ffffff !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${tournament.name}</div>` : tournament.name}</h1>
            <h2 style="font-size: 14px !important; margin-top: 4px; !important; font-weight: 600 !important; color: #ffffff !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${weightRange.name}</div>` : weightRange.name}</h2>
          </div>

          <div style="display: flex !important; justify-content: space-between !important; margin: 6px 0 !important; padding: 4px 0 !important; border-top: 1px solid #e5e7eb !important; border-bottom: 1px solid #e5e7eb !important;">
            <div style="text-align: center !important; flex: 1 !important;">
              <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: 2px !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${t('tournamentCard.weightRange').toUpperCase()}</div>` : t('tournamentCard.weightRange').toUpperCase()}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${weightRange.min}-${weightRange.max} kg</div>` : `${weightRange.min}-${weightRange.max} kg`}</div>
            </div>
            <div style="text-align: center !important; flex: 1 !important; border-left: 1px solid #e5e7eb !important; border-right: 1px solid #e5e7eb !important;">
              <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: 2px !important;">${isForPDF ? `<div style=\"margin-top: -12px !important;\">${t('players.totalPlayers').toUpperCase()}</div>` : t('players.totalPlayers').toUpperCase()}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${totalPlayers}</div>` : totalPlayers}</div>
            </div>
            <div style="text-align: center !important; flex: 1 !important;">
              <div style="font-size: 9px !important; color: #6b7280 !important; font-weight: 500 !important; margin-bottom: 2px !important;">${isForPDF ? `<div style=\"margin-top: -12px !important;\">${t('tournamentCard.page').toUpperCase()}</div>` : t('tournamentCard.page').toUpperCase()}</div>
              <div style="font-size: 11px !important; color: #111827 !important; font-weight: 600 !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${pageNum + 1}/${totalPages}</div>` : `${pageNum + 1}/${totalPages}`}</div>
            </div>
          </div>
        </div>

        <div style="background: white !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; overflow: hidden !important; flex: 1 !important;">
          <table style="width: 100% !important; border-collapse: collapse !important; margin: 0 !important;">
            <thead>
              <tr style="background: linear-gradient(135deg, #f1f5f9, #e2e8f0) !important;">
                <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: center !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important; width: 35px !important;">${isForPDF ? `<div style="margin-top: -12px !important;">#</div>` : '#'}</th>
                ${selectedColumns.map(col => {
                  const header = translateHeader(col.id, col.name);
                  return `
                  <th style="border: 1px solid #cbd5e1 !important; padding: 6px 4px !important; text-align: left !important; font-weight: bold !important; color: #000000 !important; font-size: 10px !important;">${isForPDF ? `<div style=\"margin-top: -12px !important;\">${header}</div>` : header}</th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${pagePlayers.map((player, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'} !important;">
                  <td style="border: 1px solid #e2e8f0 !important; padding: 4px 4px !important; font-size: 9px !important; color: #000000 !important; font-weight: 500 !important; text-align: center !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${startIndex + index + 1}</div>` : startIndex + index + 1}</td>
                  ${selectedColumns.map(col => {
                    let value = '';
                    switch(col.id) {
                      case 'name': value = player.name || ''; break;
                      case 'surname': value = player.surname || ''; break;
                      case 'weight': value = player.weight ? `${player.weight}kg` : ''; break;
                      case 'gender': value = player.gender ? t(`players.${player.gender}`) : ''; break;
                      case 'handPreference': value = player.handPreference ? t(`players.${player.handPreference}`) : ''; break;
                      case 'birthday': value = player.birthday ? new Date(player.birthday).toLocaleDateString(getLocale()) : ''; break;
                      default: value = player[col.id] || '';
                    }
                    return `<td style="border: 1px solid #e2e8f0 !important; padding: 4px 3px !important; font-size: 9px !important; color: #000000 !important; font-weight: 500 !important;">${isForPDF ? `<div style="margin-top: -12px !important;">${value}</div>` : value}</td>`;
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
            ${t('pdf.footer')}
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
      false,
      filteredPlayers.length
    );
    pages.push(pageContent);
  }

  return pages;
};

export const generatePDF = async (
  tournament: Tournament,
  weightRange: WeightRange,
  selectedPDFColumns: string[],
  playersPerPage: number,
  availablePDFColumns: Column[],
  getFilteredPlayers: (weightRange: WeightRange) => ExtendedPlayer[]
): Promise<{ fileName: string; fileSize: string; totalPages: number }> => {
  // Maksimum 40 oyuncu sınırı
  const maxPlayersPerPage = Math.min(playersPerPage, 40);
  const filteredPlayers = getFilteredPlayers(weightRange);
  const totalPages = Math.ceil(filteredPlayers.length / maxPlayersPerPage);

  try {
    // Fontların yüklenmesini bekle
    await document.fonts.ready;

    const pdf = new jsPDF('p', 'mm', 'a4');

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startIndex = pageNum * maxPlayersPerPage;
      const endIndex = Math.min(startIndex + maxPlayersPerPage, filteredPlayers.length);
      const pagePlayers = filteredPlayers.slice(startIndex, endIndex);

      // 1. Önizleme içeriğini al
      const previewDiv = document.createElement('div');
      previewDiv.style.position = 'absolute';
      previewDiv.style.left = '-9999px';
      previewDiv.style.width = '210mm';
      previewDiv.style.height = '297mm';
      previewDiv.style.padding = '10mm 15mm 15mm 15mm';
      previewDiv.style.boxSizing = 'border-box';
      previewDiv.style.fontFamily = 'Arial, sans-serif';
      previewDiv.style.fontSize = '12px';
      previewDiv.style.lineHeight = '2.7';
      previewDiv.style.color = '#000000';
      previewDiv.style.backgroundColor = '#ffffff';
      previewDiv.style.overflow = 'hidden';
      previewDiv.style.margin = '-40px 0 0 0'; // tüm sayfanın konumunu etkiliyor


      const pageContent = generatePageContent(
        tournament, weightRange, selectedPDFColumns, maxPlayersPerPage, pageNum, pagePlayers, startIndex, totalPages, availablePDFColumns, true, filteredPlayers.length
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

      if (pageNum > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    }

    const pdfBlob = pdf.output('blob');
    const fileSize = pdfBlob.size;
    const sizeInKB = (fileSize / 1024).toFixed(1);
    const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
    const sizeText = fileSize > 1024 * 1024 ? `${sizeInMB} MB` : `${sizeInKB} KB`;

    const fileName = `tournament_${tournament.name}_${weightRange.name}_players.pdf`;
    pdf.save(fileName);

    return { fileName, fileSize: sizeText, totalPages };

  } catch (error) {
    throw new Error(i18n.t('tournamentCard.pdfErrorMessage'));
  }
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
  const maxPlayersPerPage = Math.min(playersPerPage, 40);
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