import React, { useState, useEffect } from 'react';
import { 
  Sprout, 
  Calendar, 
  MapPin, 
  Award, 
  Trash2, 
  ArrowRight, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  ShieldAlert,
  Archive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getUserAnalysisHistory, 
  deleteAnalysisSnapshot 
} from '../../services/analysisHistoryService';
import { SavedAnalysisSummary } from '../../types/analysisHistory';

interface AnalysisHistoryViewProps {
  onOpenAnalysis: (analysisId: string) => void;
  onNewAnalysis: () => void;
}

export const AnalysisHistoryView: React.FC<AnalysisHistoryViewProps> = ({
  onOpenAnalysis,
  onNewAnalysis,
}) => {
  const { currentUser } = useAuth();
  const [historyList, setHistoryList] = useState<SavedAnalysisSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const records = await getUserAnalysisHistory(currentUser.uid);
      setHistoryList(records);
    } catch (err: any) {
      console.error('Failed to load history:', err);
      setErrorMessage('Could not load your saved analyses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const handleDelete = async (analysisId: string) => {
    if (!currentUser) return;
    setDeletingId(analysisId);
    try {
      const res = await deleteAnalysisSnapshot(currentUser.uid, analysisId);
      if (res.success) {
        setHistoryList((prev) => prev.filter((item) => item.analysisId !== analysisId));
        setConfirmDeleteId(null);
      } else {
        setErrorMessage(res.error || 'Could not delete the selected analysis.');
      }
    } catch (err) {
      setErrorMessage('Failed to delete analysis record.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-semibold mb-2">
            <Archive className="w-3.5 h-3.5 text-emerald-700" />
            <span>User Account &bull; Stage 2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            My Saved Farm Analyses
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Access your immutable historical soil evaluations, seasonal rainfall records, and crop cultivar matches.
          </p>
        </div>

        <button
          onClick={onNewAnalysis}
          className="px-4 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Sprout className="w-4 h-4 text-emerald-300" />
          <span>New Farm Assessment</span>
        </button>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="flex-1">{errorMessage}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-stone-200/80 p-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#1b4332] mx-auto" />
          <p className="text-sm font-semibold text-stone-700">
            Loading your saved analyses...
          </p>
          <p className="text-xs text-stone-400">
            Retrieving historical records from your SoilWise account
          </p>
        </div>
      ) : historyList.length === 0 ? (
        /* Empty State */
        <div className="py-16 text-center space-y-5 bg-white rounded-3xl border border-dashed border-stone-300 p-8 sm:p-12 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-[#1b4332]/10 text-[#1b4332] flex items-center justify-center mx-auto">
            <Archive className="w-8 h-8 text-[#1b4332]" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-stone-900">
              No saved farm analyses yet
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              When you complete a farm analysis while logged in, your assessment snapshot and recommended seed varieties will be permanently stored here.
            </p>
          </div>
          <button
            onClick={onNewAnalysis}
            className="px-5 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Start Your First Farm Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* History List */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>{historyList.length} {historyList.length === 1 ? 'assessment' : 'assessments'} recorded</span>
            <span>Ordered by date (newest first)</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {historyList.map((item) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              const locationText = [item.lga, item.state].filter(Boolean).join(', ') || 'Nigeria';

              return (
                <div
                  key={item.analysisId}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-2xs hover:border-[#1b4332]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
                >
                  {/* Left Column: Details */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{formattedDate}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1b4332] bg-[#f4f7f2] px-2.5 py-0.5 rounded-md border border-[#1b4332]/15">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>{locationText}</span>
                      </span>

                      <span className="text-[10px] uppercase font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                        {item.ecology}
                      </span>
                    </div>

                    {/* Recommendation Highlight */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-extrabold text-stone-900 group-hover:text-[#1b4332] transition-colors">
                          {item.topVariety}
                        </h3>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.topCrop}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        IAR Potential Yield: <strong className="text-stone-700">{item.potentialYield} t/ha</strong> &bull; Suitability Score: <strong className="text-[#1b4332]">{item.score}/100</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onOpenAnalysis(item.analysisId)}
                      className="px-4 py-2 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>View Analysis</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === item.analysisId ? (
                      <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-xl border border-red-200 animate-in fade-in">
                        <button
                          onClick={() => handleDelete(item.analysisId)}
                          disabled={deletingId === item.analysisId}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === item.analysisId ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.analysisId)}
                        title="Delete saved analysis"
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
