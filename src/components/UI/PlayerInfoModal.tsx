import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ExtendedPlayer } from '../../utils/playersStorage';
import { usePlayers } from '../../hooks/usePlayers';

export interface PlayerInfoModalProps {
  player: ExtendedPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
  columns?: Array<{ id: string; name: string; visible: boolean }>;
}

const PlayerInfoModalComponent: React.FC<PlayerInfoModalProps> = ({ player, isOpen, onClose, triggerElement, columns = [] }) => {
  useTranslation();
  const { columns: allColumns, players: allPlayers } = usePlayers();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const fullPlayer = player ? allPlayers.find(p => p.id === player.id) || player : null;

  const positionTooltip = () => {
    if (!isOpen || !triggerElement || !tooltipRef.current) return;

    const rect = triggerElement.getBoundingClientRect();
    const tooltip = tooltipRef.current;

    const viewportWidth = window.innerWidth;
    const gap = 8;
    const tooltipWidth = viewportWidth <= 640 ? Math.min(320, viewportWidth - 16) : 360;

    const rawLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    const clampedLeft = Math.max(8, Math.min(rawLeft, viewportWidth - tooltipWidth - 8));
    const top = rect.bottom + gap;

    tooltip.style.left = `${clampedLeft}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.width = `${tooltipWidth}px`;
  };

  useEffect(() => {
    if (!isOpen) return;

    const id = window.requestAnimationFrame(positionTooltip);

    const handleResize = () => positionTooltip();
    const handleScroll = () => positionTooltip();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, triggerElement]);

  useEffect(() => {
    if (!isOpen) return;

    let closeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handlePointerDown = (event: PointerEvent) => {
      const el = tooltipRef.current;
      if (!el) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerElement && triggerElement.contains(target)) return;
      if (!el.contains(target)) {
        closeTimeout = setTimeout(() => onClose(), 120);
      }
    };

    const handleMouseEnter = () => {
      if (closeTimeout) {
        clearTimeout(closeTimeout);
        closeTimeout = null;
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    if (tooltipRef.current) tooltipRef.current.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      if (tooltipRef.current) tooltipRef.current.removeEventListener('mouseenter', handleMouseEnter);
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [isOpen, onClose, triggerElement]);

  if (!isOpen || !fullPlayer) return null;

  const getFieldIcon = () => '🔹';

  const getFieldLabel = (field: string) => {
    const columnsToUse = columns.length > 0 ? columns : allColumns;
    if (field === 'opponents') return 'Rakipler';
    const customColumn = columnsToUse.find(col => col.id === field);
    return customColumn ? customColumn.name : field;
  };

  const getFieldValue = (field: string) => {
    const columnsToUse = columns.length > 0 ? columns : allColumns;
    const isCustomColumn = columnsToUse.some(col => col.id === field);

    if (field === 'opponents') {
      return fullPlayer.opponents && fullPlayer.opponents.length > 0
        ? `${fullPlayer.opponents.length} rakip`
        : null;
    }

    const value = (fullPlayer as any)[field];

    if (isCustomColumn) {
      return value !== undefined && value !== null && value !== '' ? value : '—';
    }

    if (value === null || value === undefined || value === '') return null;
    return value;
  };

  const getAllPlayerFields = () => {
    const excludedFields = ['name', 'surname', 'gender', 'handPreference', 'birthday', 'city', 'id', 'fullName', 'weight'];
    const allFields = Object.keys(fullPlayer as Record<string, unknown>);
    return allFields.filter(field => !excludedFields.includes(field));
  };

  const getCustomColumnFields = () => {
    const columnsToUse = columns.length > 0 ? columns : allColumns;
    return columnsToUse
      .filter(col => col.visible && !['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday', 'city', 'id', 'fullName'].includes(col.id))
      .map(col => col.id);
  };

  const displayFields = Array.from(new Set([...getCustomColumnFields(), ...getAllPlayerFields()]));

  const content = (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-100 p-4 sm:p-4"
      style={{
        top: '0px',
        left: '0px',
        animation: 'fadeIn 0.2s ease-out',
        maxWidth: '95vw',
        minWidth: '280px'
      }}
    >
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 rotate-45" style={{ zIndex: -1 }} />

      <div className="border-b border-gray-100 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {fullPlayer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-lg truncate">{fullPlayer.name}</div>
            {fullPlayer.surname && <div className="text-sm text-gray-600 truncate">{fullPlayer.surname}</div>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {displayFields.map((field) => {
          const value = getFieldValue(field);
          const columnsToUse = columns.length > 0 ? columns : allColumns;
          const isCustomColumn = columnsToUse.some(col => col.id === field);
          if (!isCustomColumn && (value === null || value === undefined || value === '')) return null;

          return (
            <div key={field} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">{getFieldIcon()}</span>
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">{getFieldLabel(field)}</div>
                <div className="text-sm font-semibold text-gray-900">{value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default PlayerInfoModalComponent;
export { PlayerInfoModalComponent as PlayerInfoModal };
