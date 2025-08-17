import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '../../types';

interface PlayerInfoModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
}

const PlayerInfoModal: React.FC<PlayerInfoModalProps> = ({ player, isOpen, onClose, triggerElement }) => {
  const { t } = useTranslation();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerElement && tooltipRef.current) {
      const rect = triggerElement.getBoundingClientRect();
      const tooltip = tooltipRef.current;
      
      // Position tooltip below the button, centered on the button
      const top = rect.bottom + 8; // 8px below the button
      const left = rect.left + (rect.width / 2) - 140; // Center tooltip on button (280px width / 2)
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }
  }, [isOpen, triggerElement]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        // Add a small delay to prevent accidental closing
        timeoutId = setTimeout(() => {
          onClose();
        }, 150);
      }
    };

    const handleMouseEnter = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (tooltipRef.current) {
        tooltipRef.current.addEventListener('mouseenter', handleMouseEnter);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (tooltipRef.current) {
          tooltipRef.current.removeEventListener('mouseenter', handleMouseEnter);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !player) {
    return null;
  }

  // No arrow needed since tooltip is positioned next to the button

  return (
    <div 
      ref={tooltipRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 max-w-[280px] w-[280px] p-4"
      style={{ 
        top: '0px', 
        left: '0px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* No arrow needed - tooltip is positioned next to the button */}
      
      {/* Header with player name */}
      <div className="border-b border-gray-100 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-lg truncate">
              {player.name}
            </div>
            {player.surname && (
              <div className="text-sm text-gray-600 truncate">
                {player.surname}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Player details */}
      <div className="space-y-3">
        {/* Weight */}
        {player.weight && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">⚖️</span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {t('players.weight')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {player.weight} kg
              </div>
            </div>
          </div>
        )}

        {/* Gender */}
        {player.gender && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">
                {player.gender === 'male' ? '👨' : '👩'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {t('players.gender')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {t(`players.${player.gender}`)}
              </div>
            </div>
          </div>
        )}

        {/* Hand Preference */}
        {player.handPreference && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">
                {player.handPreference === 'left' ? '🤚' : player.handPreference === 'right' ? '✋' : '🤲'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                {t('players.handPreference')}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {t(`players.${player.handPreference}`)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerInfoModal;
