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
      const left = rect.left + (rect.width / 2) - 180; // Center tooltip on button (360px width / 2)
      
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

  // Helper function to format birthday
  const formatBirthday = (birthday?: string) => {
    if (!birthday) return null;
    try {
      const date = new Date(birthday);
      return date.toLocaleDateString('tr-TR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return birthday;
    }
  };

  // Helper function to get field icon
  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'name': return '👤';
      case 'surname': return '📝';
      case 'weight': return '⚖️';
      case 'gender': return player.gender === 'male' ? '👨' : '👩';
      case 'handPreference': 
        return player.handPreference === 'left' ? '🤚' : 
               player.handPreference === 'right' ? '✋' : '🤲';
      case 'birthday': return '🎂';
      case 'city': return '🏙️';
      default: return 'ℹ️';
    }
  };

  // Helper function to get field label
  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'name': return t('players.name');
      case 'surname': return t('players.surname');
      case 'weight': return t('players.weight');
      case 'gender': return t('players.gender');
      case 'handPreference': return t('players.handPreference');
      case 'birthday': return t('players.birthday');
      case 'city': return t('players.city');
      default: return field;
    }
  };

  // Helper function to get field value
  const getFieldValue = (field: string) => {
    switch (field) {
      case 'name': return player.name;
      case 'surname': return player.surname;
      case 'weight': return player.weight ? `${player.weight} kg` : null;
      case 'gender': return player.gender ? t(`players.${player.gender}`) : null;
      case 'handPreference': return player.handPreference ? t(`players.${player.handPreference}`) : null;
      case 'birthday': return formatBirthday(player.birthday);
      case 'city': return player.city;
      default: return (player as any)[field];
    }
  };

  // Define all fields to display
  const displayFields = ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city'];

  return (
    <div 
      ref={tooltipRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 max-w-[360px] w-[360px] p-4"
      style={{ 
        top: '0px', 
        left: '0px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
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
      
      {/* Player details - show all available fields */}
      <div className="space-y-3">
        {displayFields.map((field) => {
          const value = getFieldValue(field);
          if (value === null || value === undefined || value === '') return null;
          
          return (
            <div key={field} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">{getFieldIcon(field)}</span>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  {getFieldLabel(field)}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  {value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerInfoModal;
