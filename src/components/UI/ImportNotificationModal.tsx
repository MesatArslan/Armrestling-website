import React from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ImportNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const ImportNotificationModal: React.FC<ImportNotificationModalProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message
}) => {
  if (!isOpen) return null;

  const headerGradient = type === 'success'
    ? 'bg-gradient-to-r from-green-600 to-emerald-600'
    : 'bg-gradient-to-r from-red-600 to-pink-600'
  const confirmGradient = type === 'success'
    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-300'
    : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:ring-red-300'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient background */}
        <div className={`${headerGradient} px-4 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                {type === 'success' ? (
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <p className="text-white/80 text-xs">
                  {type === 'success' ? 'Excel dosyası başarıyla işlendi' : 'Bir hata oluştu'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/90 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 bg-gray-50">
          <div className="text-sm text-gray-700 leading-relaxed">
            {message}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className={`inline-flex items-center ${confirmGradient} text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 transition-all duration-200`}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportNotificationModal;
