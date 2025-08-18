import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { RoundDescriptionUtils } from '../../utils/roundDescriptions';

interface MatchCounterProps {
  playerCount: number;
  completedMatches: number;
  hasGrandFinal?: boolean; // Whether grand final is actually played
  className?: string;
}

const MatchCounter: React.FC<MatchCounterProps> = ({ 
  playerCount, 
  completedMatches, 
  hasGrandFinal = false,
  className = '' 
}) => {
  const baseTotalMatches = RoundDescriptionUtils.calculateTotalMatches(playerCount);
  const totalMatches = hasGrandFinal ? baseTotalMatches + 1 : baseTotalMatches;
  const remainingMatches = RoundDescriptionUtils.calculateRemainingMatches(totalMatches, completedMatches);
  const progressPercentage = RoundDescriptionUtils.getMatchProgress(totalMatches, completedMatches);
  
  if (playerCount <= 1) {
    return null; // No matches needed for single player
  }

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <ChartBarIcon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Maç Sayısı</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Matches */}
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{totalMatches}</div>
          <div className="text-sm text-blue-700 font-medium">Toplam Maç</div>
          {playerCount > 7 && hasGrandFinal && (
            <div className="text-xs text-blue-600 mt-1">Grand Final Dahil</div>
          )}
        </div>
        
        {/* Completed Matches */}
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{completedMatches}</div>
          <div className="text-sm text-green-700 font-medium">Tamamlanan</div>
        </div>
        
        {/* Remaining Matches */}
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{remainingMatches}</div>
          <div className="text-sm text-orange-700 font-medium">Kalan</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>İlerleme</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchCounter;
