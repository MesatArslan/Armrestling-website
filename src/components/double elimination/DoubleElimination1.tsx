import * as React from 'react';
import { useState } from 'react';
import type { DoubleEliminationProps } from '../../types';
import { generateFixturePDF } from '../../utils/pdfGenerator';

const DoubleElimination1: React.FC<DoubleEliminationProps> = ({ players, onMatchResult, onTournamentComplete, onUpdateOpponents, onRemoveOpponents, fixtureId }) => {
  if (players.length !== 1) {
    return (
      <div className="p-4 text-center text-gray-600">
        This component is designed for exactly 1 player only.
      </div>
    );
  }

  const winner = players[0];

  const [hasAutoCompleted, setHasAutoCompleted] = React.useState(false);
  
  // PDF functionality states
  const [isExporting, setIsExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  React.useEffect(() => {
    if (!hasAutoCompleted) {
      // Automatically declare the single player as winner
      onMatchResult('auto-win', winner.id);
      
      // Complete tournament with rankings
      if (onTournamentComplete) {
        onTournamentComplete({
          first: winner.id
        });
      }
      
      setHasAutoCompleted(true);
    }
  }, [winner.id, onMatchResult, onTournamentComplete, hasAutoCompleted]);

  // Persist rankings for 1-player case immediately
  React.useEffect(() => {
    try {
      // No fixtureId prop in this component; persistence handled by parent Matches flow if needed
    } catch {}
  }, []);

  // PDF generation function for single player tournament
  const handleGeneratePDF = async () => {
    try {
      setIsExporting(true);
      setPdfProgress(0);
      
      // Create a mock fixture object for PDF generation
      const mockFixture = {
        id: 'single-player-tournament',
        name: 'Single Player Tournament',
        tournamentName: 'Single Player Tournament',
        weightRangeName: `${winner.weight} kg`,
        players: [winner],
        matches: [],
        rankings: {
          first: winner.id
        }
      };
      
      await generateFixturePDF(
        mockFixture,
        true, // includeRankings
        false, // includeCompletedMatches (none for single player)
        18, // rowsPerPage
        (p) => setPdfProgress(p)
      );
      
      // Show success message
      alert('PDF başarıyla oluşturuldu!');
      
    } catch (error) {
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
      setPdfProgress(0);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-500">
        Single Player Tournament
      </h2>
      
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-green-300">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-green-700 mb-2">CHAMPION</h3>
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
              <div className="text-lg font-semibold text-gray-800">
                {winner.name} {winner.surname}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Weight: {winner.weight} kg
              </div>
              <div className="text-sm text-gray-600">
                {winner.gender === 'male' ? 'Male' : 'Female'} • {winner.handPreference} hand
              </div>
              {winner.birthday && (
                <div className="text-sm text-gray-600">
                  Born: {new Date(winner.birthday).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Automatic winner by default
            </div>
            
            {/* PDF Download Button */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleGeneratePDF}
                disabled={isExporting}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    PDF Oluşturuluyor... {pdfProgress}%
                  </>
                ) : (
                  <>
                    📄 PDF İndir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubleElimination1; 