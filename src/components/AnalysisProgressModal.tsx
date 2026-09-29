import React from 'react';
import { Loader2, CheckCircle2, Sprout } from 'lucide-react';
import { AnalysisStep } from '../types/soilwise';
import { useLanguage } from '../context/LanguageContext';

interface AnalysisProgressModalProps {
  currentStep: AnalysisStep;
}

export const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({ currentStep }) => {
  const { t } = useLanguage();

  const stages: { key: AnalysisStep; label: string }[] = [
    { key: 'preparing_data', label: t('progress.step1') },
    { key: 'retrieving_environmental', label: t('progress.step2') },
    { key: 'retrieving_rainfall', label: t('progress.step3') },
    { key: 'finding_location', label: t('progress.step4') },
    { key: 'combining_data', label: t('progress.step5') },
    { key: 'preparing_analysis', label: t('progress.step6') },
  ];

  const currentStageIndex = stages.findIndex((s) => s.key === currentStep);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
        {/* Brand header in progress */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shadow-sm">
            <Sprout className="w-6 h-6 text-emerald-300" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">
            {t('progress.title')}
          </h3>
          <p className="text-xs text-stone-500 max-w-xs">
            {t('progress.subtitle')}
          </p>
        </div>

        {/* Progress List */}
        <div className="space-y-3 py-2">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex || currentStep === 'completed';
            const isCurrent = idx === currentStageIndex;

            return (
              <div
                key={stage.key}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                  isCurrent
                    ? 'bg-[#f0f5ee] text-[#1b4332] font-semibold border border-[#1b4332]/20'
                    : isCompleted
                    ? 'text-stone-700'
                    : 'text-stone-400 opacity-60'
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1b4332]" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-stone-300" />
                  )}
                </div>
                <span className="text-xs sm:text-sm">{stage.label}</span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 text-center text-[11px] text-stone-400">
          OpenStreetMap &bull; ISRIC SoilGrids &bull; Open-Meteo
        </div>
      </div>
    </div>
  );
};

