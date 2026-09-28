import React from 'react';
import { CloudSun, AlertCircle, Building2, Droplets, Calendar, Flame, ThermometerSun, Sprout } from 'lucide-react';
import { FarmLocation } from '../types/soilwise';

interface NimetClimateReportProps {
  location: FarmLocation;
}

export const NimetClimateReport: React.FC<NimetClimateReportProps> = ({ location }) => {
  // Determine general agro-ecological zone for Nigerian context if applicable
  const lat = location.latitude;
  const isNorthern = lat >= 9.0;
  const zoneLabel = isNorthern
    ? 'Northern Guinea / Sudan Savanna Zone'
    : 'Southern Rainforest / Derived Savanna Zone';

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">
                Climate Report
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Future Integration Demo
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Climate insights based on available Nigerian Meteorological Agency (NiMet) information.
            </p>
          </div>
        </div>

        {/* Source Badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-md font-mono">
            Model: Open-Meteo
          </span>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium">
            Agency: NiMet
          </span>
        </div>
      </div>

      {/* NiMet Climate Report Connection Notice */}
      <div className="p-4 bg-[#f8f9f6] rounded-xl border border-stone-200 text-xs text-stone-700 space-y-2">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-stone-900">NiMet Climate Report Connection Notice</p>
            <p className="mt-0.5 text-stone-600 leading-relaxed">
              Official NiMet climate information is not currently connected via a live API to this MVP. This section illustrates how official seasonal climate prediction (SCP) information will be incorporated into future SoilWise AI analysis alongside model data.
            </p>
          </div>
        </div>
      </div>

      {/* Consolidated Climate Outlook Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
          <span className="font-semibold text-stone-800">
            NiMet Climate Summary &bull; {zoneLabel}
          </span>
          <span className="text-stone-400 font-mono text-[11px]">
            Seasonal Climate Prediction
          </span>
        </div>

        {/* Single Elegant Visual Information Card */}
        <div className="bg-[#fafaf7] rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-stone-100/70 border-b border-stone-200/80 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-[#1b4332]" />
              <span>Climate Outlook</span>
            </h3>
            <span className="text-[11px] text-stone-500 font-medium">Regional Projection</span>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/80">
            {/* Left Column */}
            <div className="space-y-4 sm:pr-4">
              {/* Statement 1: Rainfall Outlook */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>Rainfall Outlook</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Predicted to be normal to slightly delayed in onset, with concentrated cumulative volume during peak months rather than uniform distribution.
                </p>
              </div>

              {/* Statement 2: Rainfall Timing & Cessation */}
              <div className="space-y-1 pt-3 sm:pt-4 border-t border-stone-200/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Rainfall Timing &amp; Cessation</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Expected onset window typically stabilizes {isNorthern ? 'between late April and mid-May' : 'from late March to early April'}, with normal cessation expected by October.
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 pt-4 sm:pt-0 sm:pl-5">
              {/* Statement 3: Dry-Spell Risk */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-amber-700" />
                  <span>Dry-Spell Risk</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Moderate-to-high risk of 7&ndash;14 day dry spells immediately following initial early rains; farmers are advised against premature planting on first scattered showers.
                </p>
              </div>

              {/* Statement 4: Temperature Outlook */}
              <div className="space-y-1 pt-3 sm:pt-4 border-t border-stone-200/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                  <ThermometerSun className="w-3.5 h-3.5 text-amber-700" />
                  <span>Temperature Outlook</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Daytime and nighttime temperatures are projected to be near normal to warmer than long-term averages, elevating early season evapotranspiration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agricultural Implication (Section 9: Without "5.") */}
        <div className="p-4 sm:p-5 bg-[#f0f5ee] rounded-2xl border border-[#1b4332]/20 space-y-2">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[#1b4332]" />
            <h4 className="font-bold text-[#1b4332] text-xs sm:text-sm uppercase tracking-wide">
              Agricultural Implication
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
            Adopt climate-smart practices: prepare seedbeds early, verify soil moisture depth before sowing, select certified drought-resilient varieties with suitable maturity cycles, and conserve topsoil moisture through mulching.
          </p>
        </div>
      </div>

      {/* Strict Source Attribution & Transparency Footer */}
      <div className="pt-2 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#1b4332]" />
          <span>
            <strong className="text-stone-700">Source: Nigerian Meteorological Agency (NiMet)</strong> &bull; Seasonal Climate Prediction (SCP)
          </span>
        </div>
        <p className="text-[10px] text-stone-400 italic">
          Model-based Open-Meteo forecasts and official NiMet publications remain strictly distinguished.
        </p>
      </div>
    </div>
  );
};
