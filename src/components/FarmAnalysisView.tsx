import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  FlaskConical, 
  CloudRain, 
  Layers, 
  Compass, 
  Info, 
  Printer, 
  RotateCcw, 
  Pencil, 
  CheckCircle2, 
  ShieldAlert, 
  Code2,
  Mountain,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';
import { FarmMapPreview } from './FarmMapPreview';
import { NimetClimateReport } from './NimetClimateReport';
import { FutureRecommendationSection } from './FutureRecommendationSection';
import { SoilwiseAiAssistant } from './SoilwiseAiAssistant';
import { AgronomistConsultationModal } from './AgronomistConsultationModal';
import { PartnershipModal } from './PartnershipModal';
import { FarmerFeedbackSection } from './FarmerFeedbackSection';

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
  const { soilData, location, soilTexture, rainfallOutlook, environmentalInfo, analysisDate } = analysis;

  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* 22. FARM ANALYSIS HEADER */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
              SoilWise AI
            </span>
            <span className="text-stone-300">·</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Analysis completed</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
            Farm Analysis
          </h1>

          <div className="flex items-center gap-2 mt-2 text-xs text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Analysis Date:</span>
            <span className="font-semibold text-stone-800 font-mono">{analysisDate}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors border border-stone-200/80 flex items-center gap-1.5 cursor-pointer"
            title="Edit input parameters"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Data</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors border border-stone-200/80 flex items-center gap-1.5 cursor-pointer"
            title="Print or export report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={onNewAnalysis}
            className="px-3.5 py-2 text-xs font-medium text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* 23. FARM LOCATION CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Farm Location
            </h2>
            <p className="text-xs text-stone-500">
              Geographic coordinates and mapped environmental context
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3.5">
            {/* Address */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Address (OpenStreetMap / Nominatim)
              </span>
              <p className="text-sm font-medium text-stone-900 leading-snug">
                {location.address?.fullAddress || 'Address not resolved'}
              </p>
            </div>

            {/* Coordinates */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Coordinates
              </span>
              <div className="flex items-center gap-4 text-xs font-mono text-stone-800">
                <div>
                  <span className="text-stone-400 mr-1">Latitude:</span>
                  <span className="font-semibold">{location.latitude.toFixed(6)}°</span>
                </div>
                <div>
                  <span className="text-stone-400 mr-1">Longitude:</span>
                  <span className="font-semibold">{location.longitude.toFixed(6)}°</span>
                </div>
              </div>
            </div>

            {/* Nearest Mapped Landmark */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Nearest Mapped Landmark
              </span>
              <p className="text-xs sm:text-sm text-stone-800">
                {location.landmark ? (
                  <span>
                    <strong className="font-semibold text-stone-900">{location.landmark.name}</strong>
                    {location.landmark.distanceKm !== undefined && (
                      <span className="text-stone-500 ml-1.5">
                        (approx. {location.landmark.distanceKm} km away)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-stone-500 italic">No nearby mapped landmark found</span>
                )}
              </p>
            </div>

            {/* Elevation */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Elevation (Open-Meteo)
                </span>
                <p className="text-sm font-semibold text-stone-900 mt-0.5">
                  {location.elevationMeters !== null && location.elevationMeters !== undefined
                    ? `${location.elevationMeters} metres`
                    : 'Elevation unavailable'}
                </p>
              </div>
              <Mountain className="w-5 h-5 text-stone-400" />
            </div>
          </div>

          {/* Leaflet + OpenStreetMap Preview */}
          <div className="flex flex-col">
            <span className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Satellite & Terrain Map Preview
            </span>
            <FarmMapPreview
              latitude={location.latitude}
              longitude={location.longitude}
              label={location.address?.road || location.address?.village || 'Farm Coordinates'}
              elevationMeters={location.elevationMeters}
            />
          </div>
        </div>
      </div>

      {/* 24. YOUR SOIL DATA CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Your Soil Data
              </h2>
              <p className="text-xs text-stone-500">
                User-provided chemical analysis parameters
              </p>
            </div>
          </div>
          <span className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md">
            Manual Entry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {/* pH */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="text-[11px] font-medium text-stone-500 block">pH Level</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1 block">
              {soilData.ph.toFixed(1)}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">0–14 scale</span>
          </div>

          {/* N */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="text-[11px] font-medium text-stone-500 block">Nitrogen (N)</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1 block">
              {soilData.nitrogen}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">mg/kg</span>
          </div>

          {/* P */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="text-[11px] font-medium text-stone-500 block">Phosphorus (P)</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1 block">
              {soilData.phosphorus}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">mg/kg</span>
          </div>

          {/* K */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="text-[11px] font-medium text-stone-500 block">Potassium (K)</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1 block">
              {soilData.potassium}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">mg/kg</span>
          </div>

          {/* EC */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-stone-500 block">Cond. (EC)</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-1 block">
              {soilData.ec.toFixed(2)}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5 block">dS/m</span>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 pt-1">
          * SoilWise AI does not make automated agronomic or fertiliser judgements in this V1 MVP.
        </p>
      </div>

      {/* 25. SOIL TEXTURE CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Soil Texture
              </h2>
              <p className="text-xs text-stone-500">
                Soil mineral fractions (ISRIC SoilGrids 2.0 250m model)
              </p>
            </div>
          </div>

          {soilTexture.texturalClass && (
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
                  <span>Clay</span>
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
                  <span>Sand</span>
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
                  <span>Silt</span>
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
              <span className="text-[11px] text-stone-400">0–5cm Topsoil Depth</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-stone-50 rounded-xl text-center text-xs text-stone-500 border border-stone-200 space-y-1">
            <p className="font-semibold text-stone-700">Soil texture data unavailable</p>
            <p className="text-[11px] text-stone-500">
              {soilTexture.unavailabilityReason || 'ISRIC SoilGrids data could not be retrieved for these coordinates.'}
            </p>
          </div>
        )}
      </div>

      {/* 26. RAINFALL OUTLOOK CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Rainfall Outlook
              </h2>
              <p className="text-xs text-stone-500">
                Model-based precipitation outlook & remaining rainy-season days
              </p>
            </div>
          </div>

          {rainfallOutlook.totalSeasonalRainfallMm !== null && (
            <div className="text-right">
              <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-semibold">
                Expected Rainfall
              </span>
              <span className="text-base sm:text-lg font-extrabold font-mono text-[#1b4332]">
                {rainfallOutlook.totalSeasonalRainfallMm.toLocaleString()} mm
              </span>
            </div>
          )}
        </div>

        {rainfallOutlook.isAvailable ? (
          <>
            {/* Highlighted Remaining Rainy-Season Days */}
            <div className="p-4 sm:p-5 bg-[#f0f5ee] rounded-2xl border border-[#1b4332]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#1b4332] uppercase tracking-wider block">
                  Estimated Remaining Rainy Season
                </span>
                <p className="text-lg sm:text-xl font-extrabold text-stone-900 mt-0.5">
                  {rainfallOutlook.estimatedRemainingDaysText}
                </p>
                <p className="text-xs text-stone-600 mt-1">
                  Calculated from analysis date ({analysisDate}) relative to approximate cessation.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-stone-500 block">Season Duration</span>
                <span className="text-sm font-semibold font-mono text-stone-800">
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
                    SoilWise estimate
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
                    SoilWise estimate
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
      </div>

      {/* NEW SECTION 1: NIMET CLIMATE REPORT (Immediately after Monthly Precipitation Distribution) */}
      <NimetClimateReport location={location} />

      {/* NEW SECTION 2: RECOMMENDATION (From farm data to locally relevant agricultural decisions) */}
      <FutureRecommendationSection onOpenPartnerModal={() => setIsPartnerModalOpen(true)} />

      {/* NEW SECTION 3: SOILWISE AI ASSISTANT (Interactive chat context) */}
      <SoilwiseAiAssistant
        analysis={analysis}
        onRequestConsultation={() => setIsConsultationModalOpen(true)}
      />

      {/* 27. ENVIRONMENTAL INFORMATION */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Environmental Information
            </h2>
            <p className="text-xs text-stone-500">
              Calculated climatological normals and Köppen-Geiger classification
            </p>
          </div>
        </div>

        {environmentalInfo.isAvailable ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Mean Annual Temperature */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Mean Annual Temperature
                </span>
                <p className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                  {environmentalInfo.meanAnnualTemperatureC !== null && environmentalInfo.meanAnnualTemperatureC !== undefined
                    ? `${environmentalInfo.meanAnnualTemperatureC}°C`
                    : 'Data unavailable'}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Based on available climate data
                </p>
              </div>

              {/* Total Annual Precipitation */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Total Annual Precipitation
                </span>
                <p className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                  {environmentalInfo.annualPrecipitationMm !== null && environmentalInfo.annualPrecipitationMm !== undefined
                    ? `${environmentalInfo.annualPrecipitationMm.toLocaleString()} mm/year`
                    : 'Annual precipitation unavailable'}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Full-year cumulative series
                </p>
              </div>

              {/* Elevation */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Elevation
                </span>
                <p className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                  {environmentalInfo.elevationMeters !== null && environmentalInfo.elevationMeters !== undefined
                    ? `${environmentalInfo.elevationMeters} m`
                    : 'Elevation unavailable'}
                </p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Open-Meteo elevation model
                </p>
              </div>
            </div>

            {/* Climate Classification */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Climate Classification (Köppen-Geiger)
              </span>
              <p className="text-sm sm:text-base font-bold text-stone-900 mt-1">
                {environmentalInfo.climateZone || 'Climate classification unavailable'}
              </p>
              {environmentalInfo.climateClassificationExplanation && (
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {environmentalInfo.climateClassificationExplanation}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-stone-50 rounded-xl text-center text-xs text-stone-500 border border-stone-200 space-y-1">
            <p className="font-semibold text-stone-700">Environmental data unavailable</p>
            <p className="text-[11px] text-stone-500">
              {environmentalInfo.unavailabilityReason || 'Additional long-term climate data is required to calculate annual metrics.'}
            </p>
          </div>
        )}
      </div>

      {/* 28. WHAT SOILWISE ANALYSED & 29. DATA SOURCES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 28 */}
        <div className="bg-[#fafaf6] rounded-2xl p-5 border border-stone-200/80 space-y-2">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#1b4332]" />
            What SoilWise AI Analysed
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            This Farm Analysis profile was generated by combining:
          </p>
          <ul className="text-xs text-stone-600 space-y-1 list-disc list-inside">
            <li>User-provided soil-test results (pH, N, P, K, EC)</li>
            <li>Farm geographic coordinates (Latitude & Longitude)</li>
            <li>Soil texture composition (Clay, Sand, Silt from ISRIC SoilGrids)</li>
            <li>Elevation profile from Open-Meteo elevation model</li>
            <li>Seasonal rainfall and meteorological outlook models from Open-Meteo</li>
          </ul>
        </div>

        {/* Section 29 */}
        <div className="bg-[#fafaf6] rounded-2xl p-5 border border-stone-200/80 space-y-2">
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#1b4332]" />
            Data Sources & Transparency
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            All environmental and seasonal figures are derived from open public scientific APIs:
          </p>
          <ul className="text-xs text-stone-600 space-y-1">
            <li>&bull; <strong className="text-stone-800">Open-Meteo:</strong> Climate models & daily precipitation series.</li>
            <li>&bull; <strong className="text-stone-800">ISRIC SoilGrids:</strong> Modelled gridded 250m soil layers (not a laboratory test of your exact physical soil sample).</li>
            <li>&bull; <strong className="text-stone-800">OpenStreetMap / Nominatim:</strong> Geocoding and spatial landmarks.</li>
          </ul>
          <p className="text-[11px] text-stone-500 pt-1">
            Third-party model data is not attributed to the Nigerian Meteorological Agency (NiMet).
          </p>
        </div>
      </div>

      {/* Developer Contract Callout (Admin Only) */}
      {isAdmin && (
        <div className="p-4 bg-stone-100 rounded-xl border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-700">
            <Code2 className="w-4 h-4 text-[#1b4332]" />
            <span>
              Modular data contract ready for seamless future AI recommendation engine integration.
            </span>
          </div>
          <button
            onClick={onOpenDocs}
            className="text-[#1b4332] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Inspect JSON Schema &rarr;
          </button>
        </div>
      )}

      {/* NEW SECTION 5: FEEDBACK & EARLY ACCESS (Final section of the result page) */}
      <FarmerFeedbackSection location={location} />

      {/* NEW SECTION 4 MODALS */}
      <AgronomistConsultationModal
        isOpen={isConsultationModalOpen}
        onClose={() => setIsConsultationModalOpen(false)}
        location={location}
      />

      <PartnershipModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
      />
    </div>
  );
};
