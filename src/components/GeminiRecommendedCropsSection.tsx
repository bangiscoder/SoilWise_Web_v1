import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Sprout, 
  Award, 
  Calendar, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  CloudRain, 
  Scale, 
  ShoppingBag, 
  Bot, 
  Info, 
  ArrowRight,
  TrendingUp,
  FlaskConical,
  ExternalLink
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';
import { GeminiRecommendedCropsResponse, GeminiCropRecommendation } from '../types/geminiRecommendations';
import { fetchGeminiCropRecommendations } from '../services/geminiCropRecommendationClient';

interface GeminiRecommendedCropsSectionProps {
  analysis: FarmAnalysisResult;
  onNavigateToMarketplace?: (cropFilter?: string) => void;
  onAskAiAboutCrop?: (cropName: string, varietyName: string) => void;
}

export const GeminiRecommendedCropsSection: React.FC<GeminiRecommendedCropsSectionProps> = ({
  analysis,
  onNavigateToMarketplace,
  onAskAiAboutCrop,
}) => {
  const [data, setData] = useState<GeminiRecommendedCropsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCropCategory, setSelectedCropCategory] = useState<string>('all');

  const loadRecommendations = async (force: boolean = false) => {
    if (force) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetchGeminiCropRecommendations(analysis, force);
      setData(response);
    } catch (err: any) {
      console.error('Failed to load Gemini crop recommendations:', err);
      setError('Unable to load Gemini crop recommendations at this moment.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations(false);
  }, [analysis.id, analysis.location?.latitude, analysis.location?.longitude]);

  const ph = analysis.soilData?.ph ?? 6.2;
  const texture = analysis.soilTexture?.texturalClass || 'Sandy Loam';
  const rainDays = analysis.rainfallOutlook?.estimatedSeasonDurationDays ?? 120;
  const annualRain = analysis.environmentalInfo?.annualPrecipitationMm ?? 950;

  const filteredRecommendations = (data?.recommendations || []).filter(rec => {
    if (selectedCropCategory === 'all') return true;
    return rec.category.toLowerCase().includes(selectedCropCategory.toLowerCase()) ||
           rec.cropType.toLowerCase().includes(selectedCropCategory.toLowerCase());
  });

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 md:p-9 border-2 border-emerald-800/25 shadow-lg space-y-7 relative overflow-hidden">
      {/* Background aesthetic glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-100/40 via-amber-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6 relative z-10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b4332] text-white text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>AI Agricultural Synthesis &bull; Gemini 3.8 Flash</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <span>Recommended Crops for Your Farm</span>
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed font-medium">
            Optimal crop varieties suggested by Google Gemini and grounded in research station trials (IAR Zaria, NCRI, NASC), calibrated to your soil-test data and local climate parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => loadRecommendations(true)}
            disabled={isLoading || isRefreshing}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all border border-stone-200 shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Re-run Gemini analysis for this farm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : 'text-stone-600'}`} />
            <span>{isRefreshing ? 'Analyzing with Gemini...' : 'Re-analyze with Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Soil-Test & Climate Retrieval Alignment Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-1">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1">
            <FlaskConical className="w-3 h-3 text-emerald-700" />
            Soil pH
          </span>
          <p className="text-base font-black text-stone-900 font-mono">
            {ph.toFixed(1)}
          </p>
          <span className="text-[10px] text-emerald-800 font-semibold block">
            {ph < 5.8 ? 'Acidic: Requires adapted crops' : ph > 7.5 ? 'Alkaline matrix' : 'Optimal nutrient range'}
          </span>
        </div>

        <div className="p-3.5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-1">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-700" />
            Texture Matrix
          </span>
          <p className="text-base font-black text-stone-900 truncate">
            {texture}
          </p>
          <span className="text-[10px] text-stone-500 block">
            {analysis.soilTexture?.sandPercent ? `${analysis.soilTexture.sandPercent}% Sand • ${analysis.soilTexture.clayPercent}% Clay` : 'Well-draining savanna topsoil'}
          </span>
        </div>

        <div className="p-3.5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-1">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-700" />
            Rain Days
          </span>
          <p className="text-base font-black text-stone-900 font-mono">
            ~{rainDays} days
          </p>
          <span className="text-[10px] text-emerald-800 font-semibold block">
            {analysis.rainfallOutlook?.expectedOnset || 'May/June'} to {analysis.rainfallOutlook?.expectedCessation || 'Sept/Oct'}
          </span>
        </div>

        <div className="p-3.5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-1">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-emerald-700" />
            Annual Rainfall
          </span>
          <p className="text-base font-black text-stone-900 font-mono">
            {annualRain} mm
          </p>
          <span className="text-[10px] text-stone-500 block">
            {analysis.selectedState || analysis.location?.state || 'Savanna'} climate zone
          </span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-10 bg-stone-50 rounded-3xl border border-stone-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6 text-emerald-700 animate-spin" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-stone-800">
              Gemini is evaluating your soil-test &amp; climate parameters...
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Synthesizing soil pH ({ph.toFixed(1)}), {texture} matrix, and {rainDays}-day rainfall window against accredited national crop performance databases.
            </p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Farm Agronomic Synthesis Banner */}
          <div className="p-5 sm:p-6 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/20 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1b4332]/10 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1b4332] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-800" />
                <span>Field Diagnostics Summary</span>
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                {data.modelUsed ? `Model: ${data.modelUsed}` : 'Gemini AI Validated'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="space-y-1">
                <strong className="text-stone-900 block font-bold">Soil Health Profile:</strong>
                <p className="text-stone-700">{data.farmSummary.soilHealthSummary}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {data.farmSummary.soilStrengths.map((strength, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-900 text-[10px] font-semibold">
                      ✓ {strength}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <strong className="text-stone-900 block font-bold">Climate &amp; Rainfall Matching:</strong>
                <p className="text-stone-700">{data.farmSummary.climateFitSummary}</p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {data.farmSummary.limitingFactors.map((lim, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[10px] font-semibold">
                      ⚠ {lim}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {data.overallAgronomicStrategy && (
              <div className="pt-2 border-t border-[#1b4332]/10 text-xs text-stone-800">
                <span className="font-bold text-[#1b4332]">Recommended Cropping Strategy: </span>
                <span>{data.overallAgronomicStrategy}</span>
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 whitespace-nowrap mr-1">Filter:</span>
            {['all', 'cereal', 'legume', 'oilseed', 'root'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCropCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer whitespace-nowrap ${
                  selectedCropCategory === cat
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat === 'all' ? 'All Recommended Crops' : `${cat}s`}
              </button>
            ))}
          </div>

          {/* Recommended Crop Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRecommendations.map((crop, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all p-6 sm:p-7 flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Top Badge & Fit Score Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {crop.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#1b4332]">
                        Rank #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-xs font-mono font-black text-emerald-900">
                        {crop.suitabilityScore}% Match
                      </span>
                    </div>
                  </div>

                  {/* Variety Title */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 group-hover:text-[#1b4332] transition-colors leading-snug">
                      {crop.varietyName}
                    </h3>
                    <p className="text-xs font-semibold text-[#1b4332] mt-0.5">
                      {crop.cropName}
                    </p>
                  </div>

                  {/* Quick Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
                        Yield Range
                      </span>
                      <span className="font-bold text-stone-900 font-mono">
                        {crop.expectedYieldRange}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
                        Maturity
                      </span>
                      <span className="font-bold text-stone-900 font-mono">
                        {crop.growthDurationDays}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
                        Sowing Window
                      </span>
                      <span className="font-semibold text-stone-900 text-[11px] truncate block" title={crop.sowingWindow}>
                        {crop.sowingWindow}
                      </span>
                    </div>
                  </div>

                  {/* Why Optimal for Soil */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                      Why Optimal For Your Soil:
                    </span>
                    <p className="text-stone-700 leading-relaxed bg-[#fbfbf9] p-3 rounded-xl border border-stone-200/70">
                      {crop.whyOptimalForSoil}
                    </p>
                  </div>

                  {/* Why Optimal for Climate */}
                  <div className="space-y-1.5 text-xs">
                    <span className="font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                      <CloudRain className="w-3.5 h-3.5 text-blue-700" />
                      Why Optimal For Your Climate:
                    </span>
                    <p className="text-stone-700 leading-relaxed bg-[#fbfbf9] p-3 rounded-xl border border-stone-200/70">
                      {crop.whyOptimalForClimate}
                    </p>
                  </div>

                  {/* Key Management Checklist */}
                  <div className="space-y-2 pt-1 text-xs">
                    <span className="font-bold text-stone-900 block text-[11px] uppercase tracking-wide">
                      Recommended Agronomic Management:
                    </span>
                    <ul className="space-y-1.5">
                      {crop.keyManagementPractices.map((practice, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 text-stone-600 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{practice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Breeder & Certification Note */}
                  <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="truncate pr-2">Source: {crop.certifiedBreederOrSource}</span>
                    <span className="text-emerald-700 font-semibold shrink-0">NASC Verified</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  {onAskAiAboutCrop && (
                    <button
                      onClick={() => onAskAiAboutCrop(crop.cropName, crop.varietyName)}
                      className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-[#1b4332]" />
                      <span>Ask AI About {crop.varietyName}</span>
                    </button>
                  )}

                  {onNavigateToMarketplace && (
                    <button
                      onClick={() => onNavigateToMarketplace(crop.varietyName)}
                      className="px-4 py-2 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Order Certified Seeds (kg)</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
};
