import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface PDFPreviewModalProps {
  isOpen: boolean;
  pages: string[];
  currentPage: number;
  onChangePage: (index: number) => void;
  onClose: () => void;
  onDownloadClick: () => void;
  onBackToSettings?: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  pages,
  currentPage,
  onChangePage,
  onClose,
  onDownloadClick,
  onBackToSettings,
}) => {
  const { t } = useTranslation();
  const previewContainerRef = React.useRef<HTMLDivElement | null>(null);
  const previewContentRef = React.useRef<HTMLDivElement | null>(null);
  const [previewZoom, setPreviewZoom] = React.useState<number>(1);
  const [previewLeftPad, setPreviewLeftPad] = React.useState<number>(0);
  const fitZoomRef = React.useRef<number>(1);

  const computeFitZoom = React.useCallback(() => {
    const container = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!container || !content) return 1;
    const containerWidth = container.clientWidth;
    const contentWidth = content.offsetWidth;
    if (containerWidth > 0 && contentWidth > 0) {
      return Math.max(0.4, Math.min(1, containerWidth / contentWidth));
    }
    return 1;
  }, []);

  // Auto fit-to-width on small screens on open
  React.useEffect(() => {
    if (!isOpen) return;
    const container = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!container || !content) return;
    // Delay to ensure layout is ready
    requestAnimationFrame(() => {
      const fz = computeFitZoom();
      fitZoomRef.current = fz;
      setPreviewZoom(fz);
    });
  }, [isOpen, currentPage, computeFitZoom]);

  // Recompute fit on window resize/orientation change
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      const fz = computeFitZoom();
      fitZoomRef.current = fz;
      setPreviewZoom((z) => (window.innerWidth < 640 ? fz : z));
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler as any);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler as any);
    };
  }, [isOpen, computeFitZoom]);

  React.useEffect(() => {
    const el = previewContainerRef.current as any;
    if (!el || !isOpen) return;

    const clamp = (v: number) => Math.min(2, Math.max(0.5, v));

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const pointerOffsetX = e.clientX - rect.left;
        const pointerOffsetY = e.clientY - rect.top;
        const oldZoom = previewZoom;
        const step = 0.1;
        const nextZoom = clamp(
          Math.round(((e.deltaY < 0 ? oldZoom + step : oldZoom - step)) * 10) / 10
        );
        if (nextZoom === oldZoom) return;
        const ratio = nextZoom / oldZoom;
        const newScrollLeft = (el.scrollLeft + pointerOffsetX) * ratio - pointerOffsetX;
        const newScrollTop = (el.scrollTop + pointerOffsetY) * ratio - pointerOffsetY;
        setPreviewZoom(nextZoom);
        requestAnimationFrame(() => {
          el.scrollLeft = newScrollLeft;
          el.scrollTop = newScrollTop;
        });
      }
    };

    let baseZoom = previewZoom;
    const onGestureStart = (e: any) => { e.preventDefault(); baseZoom = previewZoom; };
    const onGestureChange = (e: any) => { e.preventDefault(); setPreviewZoom(() => clamp(baseZoom * (e.scale || 1))); };

    el.addEventListener('wheel', onWheel as any, { passive: false } as any);
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false } as any);
    el.addEventListener('gesturechange', onGestureChange as any, { passive: false } as any);
    return () => {
      el.removeEventListener('wheel', onWheel as any);
      el.removeEventListener('gesturestart', onGestureStart as any);
      el.removeEventListener('gesturechange', onGestureChange as any);
    };
  }, [previewZoom, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const el = previewContainerRef.current;
    const content = previewContentRef.current;
    if (!el || !content) return;
    requestAnimationFrame(() => {
      const scaledWidth = content.offsetWidth * previewZoom;
      const pad = window.innerWidth < 640 ? 0 : Math.max(0, Math.floor((el.clientWidth - scaledWidth) / 2));
      setPreviewLeftPad(pad);
      if (pad > 0) el.scrollLeft = 0;
    });
  }, [isOpen, currentPage, previewZoom]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-[9999] overflow-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-4xl w-full max-h-[85vh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{t('tournamentCard.pdfPreview')}</h2>
                <p className="text-red-100 mt-1 text-xs sm:text-sm">PDF önizlemesi</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={onDownloadClick}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2 text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('tournamentCard.downloadPDF')}
              </button>
              {onBackToSettings && (
                <button
                  onClick={onBackToSettings}
                  className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2 text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('tournamentCard.returnToColumnSelection')}
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            {/* Mobile button group under header */}
            <div className="sm:hidden mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={onDownloadClick}
                className="col-span-2 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md hover:bg-white/30 transition-all duration-200 text-[11px] font-semibold flex items-center justify-center gap-1 text-white"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('tournamentCard.downloadPDF')}
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md hover:bg-white/30 transition-all duration-200 text-[11px] font-semibold flex items-center justify-center text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              {onBackToSettings && (
                <button
                  onClick={onBackToSettings}
                  className="col-span-3 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-md hover:bg-white/30 transition-all duration-200 text-[11px] font-semibold flex items-center justify-center gap-1 text-white mt-2"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('tournamentCard.returnToColumnSelection')}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="h-[calc(85vh-120px)] sm:h-[calc(85vh-120px)]">
          <div className="p-2 sm:p-6 overflow-y-auto bg-gray-50 h-full overscroll-contain">
            {pages.length > 1 && (
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border border-gray-200 py-2 sm:py-4 mb-3 sm:mb-6 rounded-xl sm:rounded-2xl shadow-lg">
                <div className="grid grid-cols-3 items-center">
                  <div className="flex justify-start pl-2 sm:pl-4">
                    <button
                      onClick={() => onChangePage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="flex px-1.5 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md sm:rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-[10px] sm:text-sm items-center gap-0.5 sm:gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      {t('tournamentCard.previousPage')}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl border border-blue-200">
                      <span className="text-xs sm:text-base font-bold text-blue-800">
                        {t('tournamentCard.page')} {currentPage + 1} / {pages.length}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end pr-2 sm:pr-4">
                    <button
                      onClick={() => onChangePage(Math.min(pages.length - 1, currentPage + 1))}
                      disabled={currentPage === pages.length - 1}
                      className="flex px-1.5 sm:px-6 py-1.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md sm:rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-[10px] sm:text-sm items-center gap-0.5 sm:gap-2"
                    >
                      {t('tournamentCard.nextPage')}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-300 overflow-auto">
              <div className="flex justify-start overflow-auto touch-pan-y" ref={previewContainerRef as any} onDoubleClick={() => setPreviewZoom(z => (Math.abs(z - 1) < 0.05 ? fitZoomRef.current : 1))}>
                <div style={{ width: `${previewLeftPad}px`, flex: '0 0 auto' }} />
                <div
                  className="flex-none"
                  style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left', width: 'fit-content', willChange: 'transform' }}
                >
                  <div className="pdf-preview-content" ref={previewContentRef as any}>
                    <div style={{ width: '794px', maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: pages[currentPage] }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 text-center px-2">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm sm:text-base text-blue-800 leading-relaxed font-medium">
                  Bu, PDF'inizin nasıl görüneceğinin önizlemesidir. PDF'i indirmek için üstteki "PDF İndir" butonunu kullanabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;


