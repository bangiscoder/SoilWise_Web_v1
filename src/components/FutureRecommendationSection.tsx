import React from 'react';
import { Sprout, ShieldAlert, Sparkles, CheckCircle2, Award, Calendar, Info, BookOpen } from 'lucide-react';
import { SoilData, RainfallOutlook, SoilTexture, FarmLocation } from '../types/soilwise';
import { CropRecommendationDecision } from '../types/cropRecommendation';
import { 
  normaliseFarmRecommendationInput, 
  generateCropRecommendationDecision 
} from '../services/cropRecommendationService';
import { useLanguage } from '../context/LanguageContext';

interface FutureRecommendationSectionProps {
  soilData?: SoilData;
  rainfallOutlook?: RainfallOutlook;
  soilTexture?: SoilTexture;
  decision?: CropRecommendationDecision;
  location?: FarmLocation;
}

export const FutureRecommendationSection: React.FC<FutureRecommendationSectionProps> = ({
  soilData,
  rainfallOutlook,
  soilTexture,
  decision: propDecision,
  location,
}) => {
  const { t } = useLanguage();

  // If decision was passed directly from FarmAnalysisResult, use it.
  // Otherwise, compute it deterministically on the fly from available inputs.
  const decision: CropRecommendationDecision | null = React.useMemo(() => {
    if (propDecision) return propDecision;
    if (soilData && location) {
      const normalised = normaliseFarmRecommendationInput({
        location,
        soilData,
        rainfallOutlook,
        soilTexture,
      });
      return generateCropRecommendationDecision(normalised);
    }
    return null;
  }, [propDecision, soilData, location, rainfallOutlook, soilTexture]);

  const topRec = decision?.top_recommendation;
  const farmerFacing = decision?.farmer_facing;

  // General agronomic suitability drivers
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

      {/* Primary Agronomic Suitability Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Driver 1: Soil pH & Mineral Profile */}
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

        {/* Driver 2: Seasonal Rainfall Matching */}
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

      {/* Canonical IAR Crop Variety Recommendation Card */}
      {topRec && farmerFacing ? (
        <div className="p-5 sm:p-7 bg-[#f4f7f2] rounded-3xl border border-[#1b4332]/25 space-y-5 shadow-xs">
          {/* Header with IAR Provenance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b4332]/15 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sprout className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#1b4332] bg-white px-2 py-0.5 rounded border border-[#1b4332]/20">
                  Recommended Cultivar Match
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-1">
                  {farmerFacing.variety_name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 font-bold text-xs border border-emerald-300">
                <Award className="w-3.5 h-3.5 text-emerald-700" />
                <span>{farmerFacing.crop_name}</span>
              </span>
              <span className="text-xs font-mono bg-white px-2.5 py-1 rounded-full border border-stone-200 text-stone-700 font-semibold">
                Score: {topRec.score.normalised}/100
              </span>
            </div>
          </div>

          {/* Key Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Attribute 1: Potential Yield */}
            <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                IAR Potential Yield
              </span>
              <p className="text-base font-extrabold text-stone-900">
                {topRec.variety_profile.potential_yield_tha} tonnes/ha
              </p>
              <p className="text-[10px] text-stone-500 leading-tight">
                Documented research station potential under recommended management
              </p>
            </div>

            {/* Attribute 2: Maturity Cycle */}
            <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Maturity Cycle
              </span>
              <p className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>{topRec.variety_profile.maturity_days}</span>
              </p>
              <p className="text-[10px] text-stone-500 leading-tight">
                Class: {topRec.variety_profile.maturity_class}
              </p>
            </div>

            {/* Attribute 3: Agro-Ecological Compatibility */}
            <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Documented Ecologies
              </span>
              <p className="text-xs font-bold text-stone-900 truncate">
                {topRec.variety_profile.ecology.join(', ')}
              </p>
              <p className="text-[10px] text-stone-500 leading-tight">
                Verified compatible with field agro-ecological zone
              </p>
            </div>
          </div>

          {/* Why Recommended: Traceable Agronomic Factors */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Why This Cultivar Matches Your Farm Conditions</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {farmerFacing.key_reasons.map((reason, idx) => (
                <div key={idx} className="p-2.5 bg-white rounded-xl border border-stone-200/70 text-xs text-stone-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Soil & Climate Specific Guidelines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <strong className="text-stone-900 block font-semibold">Soil Consideration:</strong>
              <p className="text-stone-600 leading-relaxed">{farmerFacing.soil_considerations}</p>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
              <strong className="text-stone-900 block font-semibold">Climate Consideration:</strong>
              <p className="text-stone-600 leading-relaxed">{farmerFacing.climate_considerations}</p>
            </div>
          </div>

          {/* Important Agricultural Safety & Limitations Notice */}
          <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-stone-700 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Agronomic Notice & Limitations</span>
            </div>
            <p className="leading-relaxed text-stone-600">
              {farmerFacing.cautionary_statement} {topRec.potential_yield.disclaimer}
            </p>
          </div>

          {/* IAR Knowledge Provenance Footer */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-[#1b4332]/10">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>Source: Institute for Agricultural Research (IAR), Ahmadu Bello University, Zaria</span>
            </div>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">
              Catalogue: iar_crop_varieties_database.json
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
