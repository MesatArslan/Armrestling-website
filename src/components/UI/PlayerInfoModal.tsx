import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExtendedPlayer } from '../../utils/playersStorage';
import { usePlayers } from '../../hooks/usePlayers';

interface PlayerInfoModalProps {
  player: ExtendedPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
  columns?: Array<{ id: string; name: string; visible: boolean }>;
}

const PlayerInfoModal: React.FC<PlayerInfoModalProps> = ({ player, isOpen, onClose, triggerElement, columns = [] }) => {
  useTranslation();
  const { columns: allColumns, players: allPlayers } = usePlayers();
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Get the full player data from storage
  const fullPlayer = player ? allPlayers.find(p => p.id === player.id) || player : null;

  // Positioning function
  const positionTooltip = () => {
    if (!isOpen || !triggerElement || !tooltipRef.current) return;
    
    const rect = triggerElement.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Get tooltip dimensions (use a fixed width for calculation)
    const tooltipWidth = window.innerWidth <= 640 ? Math.min(320, viewportWidth - 16) : 360;
    
    // Always position below the button with 4px gap
    const top = rect.bottom + scrollY + 4;
    let left = rect.left + scrollX + (rect.width / 2) - (tooltipWidth / 2);
    
    // Adjust horizontal position if tooltip goes outside viewport
    if (left < 8) {
      left = 8; // 8px margin from left edge
    } else if (left + tooltipWidth > viewportWidth - 8) {
      left = viewportWidth - tooltipWidth - 8; // 8px margin from right edge
    }
    
    tooltip.style.top = `${top - 90}px`;
    tooltip.style.left = `${left - 115}px`;
    tooltip.style.width = `${tooltipWidth}px`;
  };

  useEffect(() => {
    if (isOpen) {
      // Initial positioning
      setTimeout(positionTooltip, 0);
      
      // Listen for window resize and scroll events
      const handleResize = () => positionTooltip();
      const handleScroll = () => positionTooltip();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
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

  if (!isOpen || !fullPlayer) {
    return null;
  }

  // Helper function to format birthday

  // Helper function to get field icon
  const getFieldIcon = () => {
    return '🔹'; // Modern info icon for all fields
  };

  // Helper function to get field label
  const getFieldLabel = (field: string) => {
    switch (field) {
      case 'opponents': return 'Rakipler';
      default: {
        // Check if it's a custom column
        const columnsToUse = columns.length > 0 ? columns : allColumns;
        const customColumn = columnsToUse.find(col => col.id === field);
        return customColumn ? customColumn.name : field;
      }
    }
  };

  // Helper function to get field value
  const getFieldValue = (field: string) => {
    switch (field) {
      case 'opponents': return fullPlayer.opponents && fullPlayer.opponents.length > 0 
        ? `${fullPlayer.opponents.length} rakip` 
        : null;
      default: {
        // Get value from player object (ExtendedPlayer supports any key)
        const value = fullPlayer[field];
        
        // For custom columns, show even if empty (but show "—" for empty values)
        const columnsToUse = columns.length > 0 ? columns : allColumns;
        const isCustomColumn = columnsToUse.some(col => col.id === field);
        
        if (isCustomColumn) {
          // Show custom columns even if empty
          const result = value !== undefined && value !== null && value !== '' ? value : '—';
          return result;
        }
        
        // For regular fields, hide if empty
        if (value === null || value === undefined || value === '') {
          return null;
        }
        return value;
      }
    }
  };

  // Get all available fields from player object (excluding specified ones)
  const getAllPlayerFields = () => {
    const excludedFields = ['name', 'surname', 'gender', 'handPreference', 'birthday', 'city', 'id', 'fullName', 'weight'];
    const allFields = Object.keys(fullPlayer);
    return allFields.filter(field => !excludedFields.includes(field));
  };

  // Get custom column fields that are visible
  const getCustomColumnFields = () => {
    const columnsToUse = columns.length > 0 ? columns : allColumns;
    return columnsToUse
      .filter(col => col.visible && !['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city', 'id', 'fullName'].includes(col.id))
      .map(col => col.id);
  };

  // Get all fields to display (both player fields and custom columns)
  const getAllDisplayFields = () => {
    const playerFields = getAllPlayerFields();
    const customFields = getCustomColumnFields();
    
    // Combine and remove duplicates - prioritize custom columns
    const allFields = [...new Set([...customFields, ...playerFields])];
    return allFields;
  };

  // Combine player fields and custom column fields
  const displayFields = getAllDisplayFields();
  
  // Debug: Show all player data
  console.log('=== OYUNCU TÜM BİLGİLERİ ===');
  console.log('Oyuncu objesi:', fullPlayer);
  console.log('Oyuncu tüm alanları:', Object.keys(fullPlayer));
  console.log('Mevcut kolonlar:', allColumns);
  console.log('Custom kolonlar:', getCustomColumnFields());
  console.log('Gösterilecek alanlar:', displayFields);
  
  // Her alanın değerini göster
  displayFields.forEach(field => {
    console.log(`${field}:`, fullPlayer[field]);
  });
  console.log('=== OYUNCU BİLGİLERİ SONU ===');

  return (
    <div 
      ref={tooltipRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 sm:p-4"
      style={{ 
        top: '0px', 
        left: '0px',
        animation: 'fadeIn 0.2s ease-out',
        maxWidth: '95vw', // Prevent modal from being wider than viewport
        minWidth: '280px'
      }}
    >
      {/* Arrow pointing up to the button */}
      <div 
        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45"
        style={{ zIndex: -1 }}
      />
      {/* Header with player name */}
      <div className="border-b border-gray-100 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {fullPlayer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-lg truncate">
              {fullPlayer.name}
            </div>
            {fullPlayer.surname && (
              <div className="text-sm text-gray-600 truncate">
                {fullPlayer.surname}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Player details - show all available fields */}
      <div className="space-y-3">
        {displayFields.map((field) => {
          const value = getFieldValue(field);
          
          // Don't hide null/undefined values for custom columns
          const columnsToUse = columns.length > 0 ? columns : allColumns;
          const isCustomColumn = columnsToUse.some(col => col.id === field);
          
          // For custom columns, always show (even if empty)
          // For regular fields, hide if empty
          if (!isCustomColumn && (value === null || value === undefined || value === '')) {
            return null;
          }
          
          return (
            <div key={field} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">{getFieldIcon()}</span>
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
