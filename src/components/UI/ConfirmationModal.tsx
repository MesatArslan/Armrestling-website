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
          headerGradient: 'bg-gradient-to-r from-red-600 to-pink-600',
          confirmGradient: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:ring-red-300',
          iconBg: 'bg-white/20',
          iconColor: 'text-white'
        };
      case 'warning':
        return {
          headerGradient: 'bg-gradient-to-r from-amber-500 to-yellow-600',
          confirmGradient: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 focus:ring-amber-300',
          iconBg: 'bg-white/20',
          iconColor: 'text-white'
        };
      case 'info':
        return {
          headerGradient: 'bg-gradient-to-r from-blue-600 to-indigo-600',
          confirmGradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-300',
          iconBg: 'bg-white/20',
          iconColor: 'text-white'
        };
      default:
        return {
          headerGradient: 'bg-gradient-to-r from-red-600 to-pink-600',
          confirmGradient: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 focus:ring-red-300',
          iconBg: 'bg-white/20',
          iconColor: 'text-white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-[95%] sm:max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`${styles.headerGradient} px-4 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`${styles.iconBg} rounded-lg p-2`}>
                <ExclamationTriangleIcon className={`h-5 w-5 ${styles.iconColor}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <p className="text-white/80 text-xs">
                  {type === 'danger' ? t('tournaments.cannotBeUndone') : t('tournaments.areYouSureContinue')}
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
          <div className="space-y-4">
            <div className="text-sm text-gray-700 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            {defaultCancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`inline-flex items-center ${styles.confirmGradient} text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
