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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-hidden">
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-2 transform transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              type === 'success' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {type === 'success' ? (
                <CheckCircleIcon className="w-8 h-8" />
              ) : (
                <XCircleIcon className="w-8 h-8" />
              )}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {type === 'success' ? 'Excel dosyası başarıyla işlendi' : 'Bir hata oluştu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              type === 'success'
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                : 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
            }`}
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportNotificationModal;
