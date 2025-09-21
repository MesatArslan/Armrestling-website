import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger'
}) => {
  const { t } = useTranslation();
  // Set default confirm text based on type
  const defaultConfirmText = type === 'danger' ? t('tournaments.confirm') : t('tournaments.yes');
  const defaultCancelText = cancelText || t('tournaments.cancel');
  const finalConfirmText = confirmText || defaultConfirmText;
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          icon: <ExclamationTriangleIcon className="w-8 h-8" />
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 text-yellow-600',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
          icon: <ExclamationTriangleIcon className="w-8 h-8" />
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100 text-blue-600',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          icon: <ExclamationTriangleIcon className="w-8 h-8" />
        };
      default:
        return {
          iconBg: 'bg-red-100 text-red-600',
          buttonBg: 'bg-red-600 hover:bg-red-700',
          icon: <ExclamationTriangleIcon className="w-8 h-8" />
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-hidden">
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-2 transform transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {type === 'danger' ? t('tournaments.cannotBeUndone') : t('tournaments.areYouSureContinue')}
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

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-semibold"
          >
            {defaultCancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-3 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${styles.buttonBg}`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
