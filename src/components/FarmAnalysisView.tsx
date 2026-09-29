import React, { useState } from 'react';
import { 
  MapPin, 
  FlaskConical, 
  CloudRain, 
  Layers, 
  Compass, 
  Info, 
  Printer, 
  RotateCcw, 
  Pencil, 
  ShieldAlert, 
  Mountain,
  ThermometerSun,
  Bot,
  UserCheck,
  AlertCircle,
  Sparkles,
  MapPinCheck
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';
import { FarmMapPreview } from './FarmMapPreview';
import { NimetClimateReport } from './NimetClimateReport';
import { FutureRecommendationSection } from './FutureRecommendationSection';
import { SoilwiseAiAssistant } from './SoilwiseAiAssistant';
import { AgronomistConsultationModal } from './AgronomistConsultationModal';
import { FarmerFeedbackSection } from './FarmerFeedbackSection';
import { useLanguage } from '../context/LanguageContext';
import resultHeroBg from '../assets/images/result_hero_bg_1790608469988.jpg';

interface FarmAnalysisViewProps {
  analysis: FarmAnalysisResult;
  onEdit: () => void;
  onNewAnalysis: () => void;
  onOpenDocs: () => void;
  isAdmin?: boolean;
}

export const FarmAnalysisView: React.FC<FarmAnalysisViewProps> = ({
  analysis,
  onEdit,
  onNewAnalysis,
  onOpenDocs,
  isAdmin,
}) => {
  const { t } = useLanguage();
  const { 
    soilData, 
    location, 
    soilTexture, 
    rainfallOutlook, 
    environmentalInfo, 
    analysisDate,
    selectedState,
    selectedLga
  } = analysis;

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // Natural integrated location statement
  const fullAddress = location.address?.fullAddress || 'Farm Coordinates';
  const latFormatted = location.latitude.toFixed(6);
  const lonFormatted = location.longitude.toFixed(6);
  const elevationFormatted = location.elevationMeters !== null && location.elevationMeters !== undefined
    ? `${location.elevationMeters} m`
    : 'N/A';

  const stateToDisplay = selectedState || location.state || location.address?.state || null;
  const lgaToDisplay = selectedLga || location.lga || location.address?.county || null;

  return (
    <div className="w-full pb-16 space-y-10 sm:space-y-14">
      {/* 1. RESULT HERO (~50vh) */}
      <section className="relative h-[48vh] sm:h-[50vh] min-h-[390px] w-full flex items-center justify-center overflow-hidden bg-stone-950">
        <img
          src={resultHeroBg}
          alt="Farmland analysis report landscape"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Dark contrast gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/70 to-stone-950/55" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-3.5">
          <span className="inline-block text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-4 py-1 rounded-full border border-emerald-500/30 backdrop-blur-xs">
            {t('results.heroEyebrow')}
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t('results.heroTitle')}
          </h1>

          <p className="text-sm sm:text-lg text-stone-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-xs">
            {t('results.heroCaption')}
          </p>

          {/* Caution Statement */}
          <div className="max-w-2xl mx-auto p-3 sm:p-3.5 bg-stone-900/80 backdrop-blur-md rounded-2xl border border-amber-500/40 text-left flex items-start gap-2.5 text-xs text-amber-100 shadow-lg">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {t('results.caution')}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Quick Report Actions Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <span className="font-semibold text-stone-800">Analysis Date:</span>
            <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-700">{analysisDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3.5 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors border border-stone-200/80 flex items-center gap-1.5 cursor-pointer font-medium"
              title="Edit soil or location inputs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t('results.editDataButton')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors border border-stone-200/80 flex items-center gap-1.5 cursor-pointer font-medium"
              title="Print report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onNewAnalysis}
              className="px-3.5 py-2 text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('results.newAnalysisButton')}</span>
            </button>
          </div>
        </div>

        {/* 2. FARM LOCATION */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {t('results.locationTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                {t('hero.caption')}
              </p>
            </div>
          </div>

          {/* Integrated Location Statement Card */}
          <div className="p-5 bg-[#fafaf7] rounded-2xl border border-stone-200/90 text-stone-800 text-sm sm:text-base leading-relaxed">
            <p>
              {t('results.locationSummary', {
                latitude: `${latFormatted}°`,
                longitude: `${lonFormatted}°`,
                address: fullAddress,
                elevation: elevationFormatted,
              })}
            </p>
          </div>

          {/* Map Preview */}
          <div className="pt-2">
            <span className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2.5">
              {t('results.mapView')}
            </span>
            <FarmMapPreview
              latitude={location.latitude}
              longitude={location.longitude}
              label={location.address?.road || location.address?.village || 'Farm Coordinates'}
              elevationMeters={location.elevationMeters}
            />
          </div>
        </section>

        {/* 3. SOIL DATA (Merged "Your Soil Data" and "Soil Texture") */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {t('results.soilDataTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                {t('form.soilDataExplanation')}
              </p>
            </div>
          </div>

          {/* User-Provided Soil Profile */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
              <h3 className="text-sm font-bold text-stone-900">
                {t('results.soilDataTitle')}
              </h3>

              {/* State and LGA contextual badges if available */}
              {(stateToDisplay || lgaToDisplay) && (
                <div className="flex items-center gap-2 text-xs">
                  {stateToDisplay && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f0f5ee] text-[#1b4332] font-semibold border border-[#1b4332]/20">
                      <MapPinCheck className="w-3 h-3" />
                      <span>{t('results.state')}: {stateToDisplay}</span>
                    </span>
                  )}
                  {lgaToDisplay && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 font-medium border border-stone-200">
                      <span>{t('results.lga')}: {lgaToDisplay}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              {/* pH */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center">
                <span className="text-xs font-semibold text-stone-500 block">{t('form.phLabel')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-1 block">
                  {soilData.ph.toFixed(1)}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">pH</span>
              </div>

              {/* N */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center">
                <span className="text-xs font-semibold text-stone-500 block">{t('form.nLabel')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-1 block">
                  {soilData.nitrogen}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">mg/kg</span>
              </div>

              {/* P */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center">
                <span className="text-xs font-semibold text-stone-500 block">{t('form.pLabel')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-1 block">
                  {soilData.phosphorus}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">mg/kg</span>
              </div>

              {/* K */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center">
                <span className="text-xs font-semibold text-stone-500 block">{t('form.kLabel')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-1 block">
                  {soilData.potassium}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">mg/kg</span>
              </div>

              {/* EC */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-center col-span-2 sm:col-span-1">
                <span className="text-xs font-semibold text-stone-500 block">{t('form.ecLabel')}</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-1 block">
                  {soilData.ec.toFixed(2)}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">dS/m</span>
              </div>
            </div>
          </div>

          {/* Conditional Soil Texture Display (ISRIC SoilGrids 2.0) */}
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1b4332]" />
                <h3 className="text-sm font-bold text-stone-900">
                  {t('results.soilTextureTitle')} &mdash; ISRIC SoilGrids
                </h3>
              </div>

              {soilTexture.isAvailable && soilTexture.texturalClass && (
                <span className="text-xs font-semibold text-[#1b4332] bg-[#f0f5ee] px-3 py-1 rounded-full border border-[#1b4332]/20">
                  {soilTexture.texturalClass}
                </span>
              )}
            </div>

            {soilTexture.isAvailable && soilTexture.clayPercent !== null ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-3">
                  {/* Clay */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                      <span>{t('results.clay')}</span>
                      <span className="font-mono font-semibold">{soilTexture.clayPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-800 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, soilTexture.clayPercent))}%` }}
                      />
                    </div>
                  </div>

                  {/* Sand */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                      <span>{t('results.sand')}</span>
                      <span className="font-mono font-semibold">{soilTexture.sandPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, soilTexture.sandPercent || 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Silt */}
                  <div>
                    <div className="flex justify-between text-xs font-medium text-stone-700 mb-1">
                      <span>{t('results.silt')}</span>
                      <span className="font-mono font-semibold">{soilTexture.siltPercent}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, soilTexture.siltPercent || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center justify-between">
                  <span>Source: {soilTexture.source}</span>
                  <span className="text-[11px] text-stone-400">0&ndash;5cm Topsoil Depth</span>
                </div>
              </div>
            ) : (
              /* Fallback statement when soil texture data is unavailable */
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/90 text-xs sm:text-sm text-stone-700 space-y-1.5">
                <p className="font-bold text-stone-900">{t('results.soilTextureTitle')}</p>
                <p className="leading-relaxed text-stone-600">
                  {t('results.soilTextureSubtitle')}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 4. RAINFALL OUTLOOK */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Rainfall Outlook
                </h2>
                <p className="text-xs sm:text-sm text-stone-600">
                  Model-based precipitation outlook &amp; remaining rainy-season days
                </p>
              </div>
            </div>

            {rainfallOutlook.totalSeasonalRainfallMm !== null && (
              <div className="text-right">
                <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-semibold">
                  Expected Rainfall
                </span>
                <span className="text-lg sm:text-xl font-extrabold font-mono text-[#1b4332]">
                  {rainfallOutlook.totalSeasonalRainfallMm.toLocaleString()} mm
                </span>
              </div>
            )}
          </div>

          {rainfallOutlook.isAvailable ? (
            <>
              {/* Highlighted Remaining Rainy-Season Days */}
              <div className="p-5 bg-[#f0f5ee] rounded-2xl border border-[#1b4332]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#1b4332] uppercase tracking-wider block">
                    Estimated Remaining Rainy Season
                  </span>
                  <p className="text-xl sm:text-2xl font-extrabold text-stone-900 mt-0.5">
                    {rainfallOutlook.estimatedRemainingDaysText}
                  </p>
                  <p className="text-xs text-stone-600 mt-1">
                    Calculated from analysis date ({analysisDate}) relative to approximate cessation.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-stone-500 block">Season Duration</span>
                  <span className="text-sm sm:text-base font-semibold font-mono text-stone-800">
                    {rainfallOutlook.estimatedSeasonDurationDays !== null
                      ? `${rainfallOutlook.estimatedSeasonDurationDays} days`
                      : 'Duration not determined'}
                  </span>
                </div>
              </div>

              {/* Structured Grid of Rainfall Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {/* Expected Onset */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                      Expected Onset
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      Estimate
                    </span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1">
                    {rainfallOutlook.expectedOnset || 'Onset not available'}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Approximate SoilWise estimate
                  </p>
                </div>

                {/* Expected Cessation */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                      Expected Cessation
                    </span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                      Estimate
                    </span>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mt-1">
                    {rainfallOutlook.expectedCessation || 'Cessation not available'}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Approximate SoilWise estimate
                  </p>
                </div>

                {/* Approximate Peak Period */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Approximate Peak Period
                  </span>
                  <p className="text-sm font-bold text-stone-900 mt-1">
                    {rainfallOutlook.approximatePeakPeriod}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Derived from monthly distribution
                  </p>
                </div>

                {/* Rainfall Onset Status */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Rainfall Onset Status
                  </span>
                  <p className="text-sm font-bold text-stone-900 mt-1">
                    {rainfallOutlook.rainfallOnsetStatus}
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Requires multi-year climatological baseline
                  </p>
                </div>

                {/* Seasonal Outlook Summary */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Seasonal Outlook
                  </span>
                  <p className="text-xs sm:text-sm text-stone-800 mt-1 leading-relaxed">
                    {rainfallOutlook.seasonalOutlook}
                  </p>
                </div>
              </div>

              {/* Monthly Precipitation Graph / Bars */}
              {rainfallOutlook.monthlyPrecipitation && rainfallOutlook.monthlyPrecipitation.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-700">
                      Monthly Precipitation Distribution (mm)
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Total: {rainfallOutlook.totalSeasonalRainfallMm?.toLocaleString()} mm
                    </span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                    {rainfallOutlook.monthlyPrecipitation.map((m) => {
                      const maxVal = Math.max(...rainfallOutlook.monthlyPrecipitation!.map((p) => p.precipitationMm), 100);
                      const heightPct = Math.round((m.precipitationMm / maxVal) * 100);
                      return (
                        <div key={m.month} className="flex flex-col items-center">
                          <div className="w-full h-24 bg-stone-100 rounded-md flex items-end p-1">
                            <div
                              className="w-full bg-[#1b4332] rounded-xs transition-all hover:bg-emerald-600"
                              style={{ height: `${Math.max(6, heightPct)}%` }}
                              title={`${m.month}: ${m.precipitationMm} mm`}
                            />
                          </div>
                          <span className="text-[10px] text-stone-500 font-medium mt-1 truncate max-w-full">
                            {m.month.slice(0, 3)}
                          </span>
                          <span className="text-[9px] font-mono text-stone-400">
                            {Math.round(m.precipitationMm)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mean Annual Temperature & Climate Classification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-stone-100">
                {/* Mean Annual Temperature Card */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
                    <ThermometerSun className="w-4 h-4 text-amber-700" />
                    <span>Mean Annual Temperature</span>
                  </div>
                  <p className="text-lg font-bold text-stone-900">
                    {environmentalInfo.meanAnnualTemperatureC !== null && environmentalInfo.meanAnnualTemperatureC !== undefined
                      ? `${environmentalInfo.meanAnnualTemperatureC}°C`
                      : 'Data unavailable'}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Calculated from full-year daily climatological normals
                  </p>
                </div>

                {/* Climate Classification (Köppen-Geiger) Card */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-[#1b4332]" />
                    <span>Climate Classification (Köppen-Geiger)</span>
                  </div>
                  <p className="text-sm sm:text-base font-bold text-stone-900">
                    {environmentalInfo.climateZone || 'Climate classification unavailable'}
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {environmentalInfo.climateClassificationExplanation || 'Requires verified historical meteorological observation series.'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 bg-stone-50 rounded-xl text-center text-xs text-stone-500 border border-stone-200 space-y-1">
              <p className="font-semibold text-stone-700">Rainfall outlook unavailable</p>
              <p className="text-[11px] text-stone-500">
                {rainfallOutlook.unavailabilityReason || 'We could not retrieve sufficient precipitation data for this location.'}
              </p>
            </div>
          )}

          {/* Source Note */}
          <div className="text-[11px] text-stone-500 border-t border-stone-200 pt-3">
            <span className="font-semibold text-stone-700">Source: </span>
            {rainfallOutlook.source}. Open-Meteo seasonal forecasts are model-based and not described as official NiMet predictions.
          </div>
        </section>

        {/* 5. CLIMATE REPORT — FUTURE INTEGRATION DEMO (Includes consolidated Climate Outlook & Agricultural Implication) */}
        <NimetClimateReport location={location} />

        {/* 6. RECOMMENDATION (Major visual highlight) */}
        <FutureRecommendationSection
          soilData={soilData}
          rainfallOutlook={rainfallOutlook}
          soilTexture={soilTexture}
        />

        {/* 7. SOILWISE ASSISTANT CALLOUT */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#1b4332]" />
              <h3 className="text-lg font-bold text-stone-900">
                {t('results.assistantTitle')}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {t('results.assistantSubtitle')}
            </p>
          </div>

          <button
            onClick={() => setIsAssistantModalOpen(true)}
            className="px-5 py-3.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <Bot className="w-4 h-4 text-emerald-300" />
            <span>{t('results.assistantButton')}</span>
          </button>
        </section>

        {/* 8. TALK TO A CERTIFIED AGRONOMIST DEMO */}
        <section className="p-6 sm:p-7 bg-[#f0f5ee] rounded-3xl border border-[#1b4332]/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#1b4332]" />
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                {t('results.agronomistTitle')}
              </h3>
              <span className="text-[10px] bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded font-medium">
                Demo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              {t('results.agronomistSubtitle')}
            </p>
          </div>

          <button
            onClick={() => setIsConsultationModalOpen(true)}
            className="px-5 py-3.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <UserCheck className="w-4 h-4" />
            <span>{t('results.agronomistButton')}</span>
          </button>
        </section>

        {/* 9. HELP US BUILD SOILWISE AI (Interactive Multi-Step Feedback Questionnaire) */}
        <FarmerFeedbackSection location={location} />
      </div>

      {/* MODALS */}
      {/* 1. SoilWise AI Assistant Modal */}
      {isAssistantModalOpen && (
        <SoilwiseAiAssistant
          analysis={analysis}
          isOpen={isAssistantModalOpen}
          onClose={() => setIsAssistantModalOpen(false)}
          onRequestConsultation={() => {
            setIsAssistantModalOpen(false);
            setIsConsultationModalOpen(true);
          }}
        />
      )}

      {/* 2. Agronomist Consultation Demo Modal */}
      <AgronomistConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        location={location}
      />
    </div>
  );
};
