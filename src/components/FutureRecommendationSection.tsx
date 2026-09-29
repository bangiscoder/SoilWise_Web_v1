import React from 'react';
import { Sprout, ShieldAlert, Sparkles, CheckCircle, Compass, Layers } from 'lucide-react';
import { SoilData, RainfallOutlook, SoilTexture } from '../types/soilwise';
import { useLanguage } from '../context/LanguageContext';

interface FutureRecommendationSectionProps {
  soilData?: SoilData;
  rainfallOutlook?: RainfallOutlook;
  soilTexture?: SoilTexture;
}

export const FutureRecommendationSection: React.FC<FutureRecommendationSectionProps> = ({
  soilData,
  rainfallOutlook,
  soilTexture,
}) => {
  const { t } = useLanguage();
  // Determine primary agronomic suitability drivers
  const ph = soilData?.ph ?? 6.5;
  const isAcidic = ph < 5.8;
  const isAlkaline = ph > 7.5;
  const phClass = isAcidic ? 'Acid-Tolerant Focus' : isAlkaline ? 'Alkaline-Adapted Focus' : 'Wide Agro-Adaptability';

  const seasonDays = rainfallOutlook?.estimatedSeasonDurationDays ?? 120;
  const cycleClass = seasonDays < 100 ? 'Early-Maturing (60–90 days)' : seasonDays < 140 ? 'Medium-Maturing (90–120 days)' : 'Full-Season (120–150+ days)';

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#1b4332]/25 shadow-md space-y-6">
      {/* Visual Highlight Badge & Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b4332] text-white text-xs font-semibold shadow-xs mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
          <span>Core Synthesis &bull; Analysis Outcome</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          {t('results.recommendationsTitle')}
        </h2>
        <p className="text-sm sm:text-base font-semibold text-[#1b4332] mt-1">
          {t('results.recommendationsSubtitle')}
        </p>
      </div>

      {/* Main Crop Suitability Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Suitability Driver 1: Soil pH & Mineral Profile */}
        <div className="p-5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('results.soilDataTitle')}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              {phClass}
            </span>
          </div>
          <p className="text-sm font-bold text-stone-900">
            Soil pH {ph.toFixed(1)} &bull; {soilTexture?.texturalClass || 'Topsoil Matrix'}
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Nutrient uptake is optimal for cereals, legumes, and root crops suited to this chemical range. Sown varieties should match local nutrient retention and water drainage.
          </p>
        </div>

        {/* Suitability Driver 2: Seasonal Rainfall Matching */}
        <div className="p-5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {t('results.plantingWindow')}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              {cycleClass}
            </span>
          </div>
          <p className="text-sm font-bold text-stone-900">
            {seasonDays} Estimated Rain Days ({rainfallOutlook?.expectedOnset || 'Onset'} &ndash; {rainfallOutlook?.expectedCessation || 'Cessation'})
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Select seed varieties whose growth and grain-filling cycle complete comfortably before the projected rain cessation to minimize moisture-stress risk.
          </p>
        </div>
      </div>

      {/* Future Improved Seed-Variety Capability Statement */}
      <div className="p-5 sm:p-6 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/20 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Locally Available Improved Seed
            </h3>
            <span className="text-[10px] text-[#1b4332] font-semibold uppercase tracking-wider">
              Future Capability &bull; In Development
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
          {t('results.futureSeedNotice')}
        </p>

        <div className="p-3.5 bg-white/90 rounded-xl border border-stone-200/80 text-xs text-stone-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-stone-800">Agricultural Safety Principle: </strong>
            These recommendations will be developed with qualified agricultural experts and trusted partners rather than relying on AI-generated assumptions alone. SoilWise AI does not recommend specific commercial varieties without rigorous empirical validation.
          </p>
        </div>
      </div>
    </div>
  );
};
