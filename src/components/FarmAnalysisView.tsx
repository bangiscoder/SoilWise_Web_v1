import React, { useState, useRef } from 'react';
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
  MapPinCheck,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';
import { FarmMapPreview } from './FarmMapPreview';
import { NimetClimateReport } from './NimetClimateReport';
import { FutureRecommendationSection } from './FutureRecommendationSection';
import { SoilwiseAiAssistant } from './SoilwiseAiAssistant';
import { FloatingAiAssistantBar } from './FloatingAiAssistantBar';
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
    selectedLga,
    hasSoilTest,
    soilDataProvenance,
    soilPhoto,
    photoAnalysisResult
  } = analysis;

  const isUserMeasured = soilDataProvenance === 'user_measured' || (hasSoilTest !== false && soilDataProvenance !== 'location_estimated');

  const [activeDepthTab, setActiveDepthTab] = useState<'0-20' | '20-50' | 'landscape'>('0-20');
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string>('');
  const savedScrollPositionRef = useRef<number>(0);

  const handleOpenAssistant = (query?: string) => {
    // Record the farmer's exact vertical scroll position before opening the assistant modal
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    savedScrollPositionRef.current = currentScrollY;

    if (query && query.trim()) {
      setPendingQuery(query.trim());
    } else {
      setPendingQuery('');
    }
    setIsAssistantModalOpen(true);
  };

  const handleCloseAssistant = () => {
    setIsAssistantModalOpen(false);
    setPendingQuery('');

    // Restore the exact previous scroll position so the farmer returns to exactly where they were
    const targetY = savedScrollPositionRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({
        top: targetY,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
    });
  };

  // Helper to format uncertainty confidence intervals
  const formatEstimatedRange = (uncertainty?: any, unit?: string | null): string | null => {
    if (!uncertainty) return null;
    const interval = uncertainty.confidence_68 || uncertainty.confidence_50 || uncertainty.confidence_90;
    if (interval && interval.lower !== undefined && interval.upper !== undefined && interval.lower !== null && interval.upper !== null) {
      return `${interval.lower} – ${interval.upper} ${unit || ''}`.trim();
    }
    if (uncertainty.lower !== undefined && uncertainty.upper !== undefined && uncertainty.lower !== null && uncertainty.upper !== null) {
      return `${uncertainty.lower} – ${uncertainty.upper} ${unit || ''}`.trim();
    }
    return null;
  };

  // Helper to retrieve farmer-measured soil test value if provided
  const getUserMeasuredProp = (key: string): { value: number; unit: string } | null => {
    if (!isUserMeasured) return null;
    const um = analysis.soilEvidence?.user_measurements;
    if (key === 'ph' && (um?.ph !== null && um?.ph !== undefined)) {
      return { value: um.ph, unit: 'pH' };
    }
    if (key === 'nitrogen_total' && (um?.nitrogen !== null && um?.nitrogen !== undefined)) {
      return { value: um.nitrogen, unit: 'mg/kg' };
    }
    if ((key === 'phosphorous_extractable' || key === 'phosphorus_extractable') && (um?.phosphorus !== null && um?.phosphorus !== undefined)) {
      return { value: um.phosphorus, unit: 'mg/kg' };
    }
    if (key === 'potassium_extractable' && (um?.potassium !== null && um?.potassium !== undefined)) {
      return { value: um.potassium, unit: 'mg/kg' };
    }
    if (key === 'ec' && (um?.ec !== null && um?.ec !== undefined)) {
      return { value: um.ec, unit: 'dS/m' };
    }
    return null;
  };

  const isdaLocationAvailable = Boolean(analysis.soilEvidence?.location_estimate?.available);

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
    <div className="w-full pb-28 sm:pb-32 space-y-10 sm:space-y-14">
      {/* Fixed / Floating AI Assistant Entry Bar (Fixed near bottom across all scroll positions) */}
      <FloatingAiAssistantBar onOpen={handleOpenAssistant} />

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

          {/* Soil Chemistry Profile & Complete iSDAsoil Multi-Depth Evidence */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  {t('results.soilDataTitle')}
                </h3>
                {isUserMeasured ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Your soil test</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    <Info className="w-3.5 h-3.5" />
                    <span>Location estimate</span>
                  </span>
                )}

                {isdaLocationAvailable && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Location-based soil information available</span>
                  </span>
                )}
              </div>

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

            {/* Primary Overview Cards (Key Soil Properties) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* pH Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">{t('form.phLabel')}</span>
                    {isUserMeasured ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                        Your soil test
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                        Location estimate
                      </span>
                    )}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-2 block">
                    {isUserMeasured
                      ? soilData.ph.toFixed(1)
                      : (analysis.soilEvidence?.location_estimate?.profile?.ph.value ?? soilData.ph.toFixed(1))}
                  </span>
                  <span className="text-[10px] text-stone-400 block">pH (1:5 H2O)</span>
                </div>
                {isUserMeasured && analysis.soilEvidence?.location_estimate?.profile?.ph.value && (
                  <div className="pt-2 border-t border-stone-200/70 mt-2 text-[10px] text-stone-500 flex justify-between">
                    <span>Location estimate:</span>
                    <span className="font-mono font-bold text-stone-700">
                      {analysis.soilEvidence.location_estimate.profile.ph.value} pH
                    </span>
                  </div>
                )}
              </div>

              {/* Total Nitrogen Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">{t('form.nLabel')}</span>
                    {isUserMeasured ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                        Your soil test
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                        Location estimate
                      </span>
                    )}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-2 block">
                    {isUserMeasured
                      ? soilData.nitrogen
                      : (analysis.soilEvidence?.location_estimate?.profile?.nitrogen_total.value ?? soilData.nitrogen)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">
                    {isUserMeasured ? 'mg/kg (ppm)' : (analysis.soilEvidence?.location_estimate?.profile?.nitrogen_total.unit || 'g/kg')}
                  </span>
                </div>
                {isUserMeasured && analysis.soilEvidence?.location_estimate?.profile?.nitrogen_total.value && (
                  <div className="pt-2 border-t border-stone-200/70 mt-2 text-[10px] text-stone-500 flex justify-between">
                    <span>Location estimate:</span>
                    <span className="font-mono font-bold text-stone-700">
                      {analysis.soilEvidence.location_estimate.profile.nitrogen_total.value} {analysis.soilEvidence.location_estimate.profile.nitrogen_total.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Extractable Phosphorus Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">{t('form.pLabel')}</span>
                    {isUserMeasured ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                        Your soil test
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                        Location estimate
                      </span>
                    )}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-2 block">
                    {isUserMeasured
                      ? soilData.phosphorus
                      : (analysis.soilEvidence?.location_estimate?.profile?.phosphorus_extractable.value ?? soilData.phosphorus)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">mg/kg (Mehlich-3)</span>
                </div>
                {isUserMeasured && analysis.soilEvidence?.location_estimate?.profile?.phosphorus_extractable.value && (
                  <div className="pt-2 border-t border-stone-200/70 mt-2 text-[10px] text-stone-500 flex justify-between">
                    <span>Location estimate:</span>
                    <span className="font-mono font-bold text-stone-700">
                      {analysis.soilEvidence.location_estimate.profile.phosphorus_extractable.value} mg/kg
                    </span>
                  </div>
                )}
              </div>

              {/* Extractable Potassium Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">{t('form.kLabel')}</span>
                    {isUserMeasured ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                        Your soil test
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                        Location estimate
                      </span>
                    )}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-2 block">
                    {isUserMeasured
                      ? soilData.potassium
                      : (analysis.soilEvidence?.location_estimate?.profile?.potassium_extractable.value ?? soilData.potassium)}
                  </span>
                  <span className="text-[10px] text-stone-400 block">mg/kg (Mehlich-3)</span>
                </div>
                {isUserMeasured && analysis.soilEvidence?.location_estimate?.profile?.potassium_extractable.value && (
                  <div className="pt-2 border-t border-stone-200/70 mt-2 text-[10px] text-stone-500 flex justify-between">
                    <span>Location estimate:</span>
                    <span className="font-mono font-bold text-stone-700">
                      {analysis.soilEvidence.location_estimate.profile.potassium_extractable.value} mg/kg
                    </span>
                  </div>
                )}
              </div>

              {/* Electrical Conductivity (EC) Card */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 col-span-2 sm:col-span-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">{t('form.ecLabel')}</span>
                    {isUserMeasured ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                        Your soil test
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded-full">
                        Location estimate
                      </span>
                    )}
                  </div>
                  {isUserMeasured ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 mt-2 block">
                        {soilData.ec.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 block">dS/m (Measured)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-stone-500 mt-3 block">
                        Unavailable
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">Not in iSDAsoil dataset</span>
                    </>
                  )}
                </div>
                <div className="pt-2 border-t border-stone-200/70 mt-2 text-[10px] text-stone-500 flex justify-between">
                  <span>Location EC:</span>
                  <span className="font-mono text-stone-500">Unavailable</span>
                </div>
              </div>
            </div>

            {/* Complete iSDAsoil Soil Profile (Multi-Depth) */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1b4332]" />
                    <span>Complete Digital Soil Profile &mdash; iSDAsoil</span>
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    High-resolution (30m) location-derived estimates covering chemical, physical, and nutrient properties by depth.
                  </p>
                </div>

                {/* Depth Selection Tabs (Responsive equal-width grid on mobile, flex on desktop) */}
                <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveDepthTab('0-20')}
                    className={`w-full sm:w-auto text-center px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-[10px] sm:text-xs leading-snug flex items-center justify-center font-semibold ${
                      activeDepthTab === '0-20'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    0–20 cm (Topsoil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDepthTab('20-50')}
                    className={`w-full sm:w-auto text-center px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-[10px] sm:text-xs leading-snug flex items-center justify-center font-semibold ${
                      activeDepthTab === '20-50'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    20–50 cm (Subsoil)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDepthTab('landscape')}
                    className={`w-full sm:w-auto text-center px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg transition-all cursor-pointer text-[10px] sm:text-xs leading-snug flex items-center justify-center font-semibold ${
                      activeDepthTab === 'landscape'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Site & Landscape
                  </button>
                </div>
              </div>

              {/* Complete Multi-Depth Table (Responsive horizontally scrollable container with min-width to ensure all results remain visible and readable on mobile) */}
              {isdaLocationAvailable ? (
                <div className="overflow-x-auto rounded-2xl border border-stone-200/90 shadow-2xs">
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Soil Property</th>
                        <th className="py-3 px-4">Depth</th>
                        <th className="py-3 px-4 text-right">Value</th>
                        <th className="py-3 px-4 text-right">Estimated Range</th>
                        <th className="py-3 px-4">Data Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {/* Render all properties for the active depth */}
                      {(() => {
                        const isdaProps = analysis.soilEvidence?.location_estimate?.properties || {};
                        const rows: React.ReactNode[] = [];

                        for (const [key, prop] of Object.entries(isdaProps)) {
                          if (key === 'status' || key === 'error') continue;

                          if (activeDepthTab === '0-20') {
                            const layer = prop.layers.find((l) => l.depthValue === '0-20' || l.depth === '0-20cm') ||
                              (prop.topsoilLayer && prop.topsoilLayer.depthValue === '0-20' ? prop.topsoilLayer : null);

                            if (layer) {
                              const range = formatEstimatedRange(layer.uncertainty, layer.unit);
                              const userTest = getUserMeasuredProp(key);
                              rows.push(
                                <tr key={`0-20-${key}`} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-semibold text-stone-900">
                                    {prop.name}
                                  </td>
                                  <td className="py-2.5 px-4 text-stone-500 font-mono text-[11px]">
                                    0–20 cm
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-800">
                                    {layer.value !== null ? `${layer.value} ${layer.unit || ''}` : 'Unavailable'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-stone-500 font-mono text-[11px]">
                                    {range ? range : '—'}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200">
                                        Location estimate
                                      </span>
                                      {userTest && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300">
                                          Your soil test: {userTest.value} {userTest.unit}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            } else if (key === 'ec') {
                              const userTest = getUserMeasuredProp('ec');
                              rows.push(
                                <tr key="0-20-ec" className="hover:bg-stone-50/70 transition-colors bg-stone-50/30">
                                  <td className="py-2.5 px-4 font-semibold text-stone-900">
                                    Electrical Conductivity (EC)
                                  </td>
                                  <td className="py-2.5 px-4 text-stone-500 font-mono text-[11px]">
                                    0–20 cm
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-stone-400 font-mono text-xs">
                                    Unavailable
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-stone-400 font-mono text-[11px]">
                                    —
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200">
                                        Location estimate
                                      </span>
                                      {userTest && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300">
                                          Your soil test: {userTest.value} {userTest.unit}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          } else if (activeDepthTab === '20-50') {
                            const layer = prop.layers.find((l) => l.depthValue === '20-50' || l.depth === '20-50cm') || prop.subsoilLayer;
                            if (layer) {
                              const range = formatEstimatedRange(layer.uncertainty, layer.unit);
                              rows.push(
                                <tr key={`20-50-${key}`} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-semibold text-stone-900">
                                    {prop.name}
                                  </td>
                                  <td className="py-2.5 px-4 text-stone-500 font-mono text-[11px]">
                                    20–50 cm
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-800">
                                    {layer.value !== null ? `${layer.value} ${layer.unit || ''}` : 'Unavailable'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-stone-500 font-mono text-[11px]">
                                    {range ? range : '—'}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200">
                                      Location estimate
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          } else {
                            // Landscape / Site Attributes
                            const otherLayers = prop.layers.filter(
                              (l) => l.depthValue !== '0-20' && l.depthValue !== '20-50' && l.depth !== '0-20cm' && l.depth !== '20-50cm'
                            );
                            for (const layer of otherLayers) {
                              const range = formatEstimatedRange(layer.uncertainty, layer.unit);
                              rows.push(
                                <tr key={`other-${key}-${layer.depth}`} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2.5 px-4 font-semibold text-stone-900">
                                    {prop.name}
                                  </td>
                                  <td className="py-2.5 px-4 text-stone-500 font-mono text-[11px]">
                                    {layer.depth || 'Landscape'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-stone-800">
                                    {layer.value !== null ? `${layer.value} ${layer.unit || ''}` : 'Unavailable'}
                                  </td>
                                  <td className="py-2.5 px-4 text-right text-stone-500 font-mono text-[11px]">
                                    {range ? range : '—'}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200">
                                      Location estimate
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          }
                        }

                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-stone-500 text-xs">
                                No properties available for this depth increment.
                              </td>
                            </tr>
                          );
                        }

                        return rows;
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-600 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                  <p>
                    Location-based soil data is temporarily unavailable for these coordinates. Regional agro-ecological baselines were used for analysis.
                  </p>
                </div>
              )}

              {/* Mandatory Laboratory Soil Testing Awareness Message */}
              <div className="p-4 sm:p-5 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs sm:text-sm text-stone-700 space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Laboratory Soil Testing Recommendation</span>
                </div>
                <p className="leading-relaxed">
                  The location-based soil information shown above is an estimate derived from digital soil data for your area. It may not represent the current condition of your specific field because soil properties can change over time through cultivation, fertiliser use, erosion, organic matter management and other factors.
                </p>
                <p className="leading-relaxed">
                  For a more accurate picture of your farm&apos;s current soil condition, we recommend laboratory soil testing. SoilWise AI&apos;s location-based estimates should not be interpreted as a laboratory analysis of your farm&apos;s soil.
                </p>
                <p className="text-[11px] text-stone-500 font-medium pt-1">
                  Data source: iSDAsoil.
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Soil Photograph (Visual Preliminary Assessment Only) */}
          {soilPhoto && (
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#1b4332]" />
                  <h3 className="text-sm font-bold text-stone-900">
                    {t('results.soilPhotoCardTitle')}
                  </h3>
                </div>
                {photoAnalysisResult?.estimatedTextureClass && (
                  <span className="text-xs font-semibold text-[#1b4332] bg-[#f0f5ee] px-3 py-1 rounded-full border border-[#1b4332]/20">
                    {photoAnalysisResult.estimatedTextureClass}
                  </span>
                )}
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center gap-4">
                <img
                  src={soilPhoto}
                  alt="Farm soil sample"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-stone-300 shadow-xs shrink-0"
                />
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {t('results.soilPhotoVisualEstimateTitle')}:
                    </span>
                    <span className="font-semibold text-[#1b4332]">
                      {photoAnalysisResult?.estimatedTextureClass || 'Visual Texture Analyzed'}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    {t('results.soilPhotoVisualNotice')}
                  </p>
                </div>
              </div>
            </div>
          )}

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

        {/* 7. TALK TO A CERTIFIED AGRONOMIST DEMO */}
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
          onClose={handleCloseAssistant}
          initialQuery={pendingQuery}
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
