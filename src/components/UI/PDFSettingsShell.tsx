import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface PDFSettingsShellProps {
  isOpen: boolean;
  titleSuffix?: string;
  onClose: () => void;
  onOpenPreview: () => void;
  children: React.ReactNode;
}

const PDFSettingsShell: React.FC<PDFSettingsShellProps> = ({ isOpen, titleSuffix, onClose, onOpenPreview, children }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{t('tournamentCard.pdfPreview')}</h2>
                {titleSuffix && <p className="text-red-100 mt-1 text-xs sm:text-sm">{titleSuffix}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPreview}
                className="px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all duration-200 text-sm font-semibold flex items-center gap-2 text-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {t('tournamentCard.openPreview')}
              </button>
              <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-[calc(85vh-120px)]">
          <div className="p-3 sm:p-6 overflow-y-auto bg-gray-50 h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFSettingsShell;


