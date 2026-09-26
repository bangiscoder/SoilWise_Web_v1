import React from 'react';
import { CloudSun, AlertCircle, Building2, ExternalLink, ShieldCheck } from 'lucide-react';
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
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-5">
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

      {/* Honest MVP Connection State */}
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

      {/* Structured Farmer-Friendly NiMet Summary (3–5 concise points) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-2">
          <span className="font-semibold text-stone-800">
            NiMet Climate Summary &bull; {zoneLabel}
          </span>
          <span className="text-stone-400 font-mono text-[11px]">
            Reference Period: Seasonal Climate Prediction
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Point 1: Rainfall Outlook */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[10px] block text-[#1b4332]">
              1. Rainfall Outlook
            </span>
            <p className="text-stone-700 leading-relaxed">
              Predicted to be normal to slightly delayed in onset, with concentrated cumulative volume during peak months rather than uniform distribution.
            </p>
          </div>

          {/* Point 2: Rainfall Timing */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[10px] block text-[#1b4332]">
              2. Rainfall Timing & Cessation
            </span>
            <p className="text-stone-700 leading-relaxed">
              Expected onset window typically stabilizes {isNorthern ? 'between late April and mid-May' : 'from late March to early April'}, with normal cessation expected by October.
            </p>
          </div>

          {/* Point 3: Dry-Spell Risk */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[10px] block text-[#1b4332]">
              3. Dry-Spell Risk
            </span>
            <p className="text-stone-700 leading-relaxed">
              Moderate-to-high risk of 7–14 day dry spells immediately following initial early rains; farmers are advised against premature planting on first scattered showers.
            </p>
          </div>

          {/* Point 4: Temperature Outlook */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-800 uppercase tracking-wide text-[10px] block text-[#1b4332]">
              4. Temperature Outlook
            </span>
            <p className="text-stone-700 leading-relaxed">
              Daytime and nighttime temperatures are projected to be near normal to warmer than long-term averages, elevating early season evapotranspiration.
            </p>
          </div>

          {/* Point 5: Agricultural Implication */}
          <div className="p-3 bg-[#f0f5ee] rounded-xl border border-[#1b4332]/20 space-y-1 md:col-span-2">
            <span className="font-bold text-[#1b4332] uppercase tracking-wide text-[10px] block">
              5. Agricultural Implication
            </span>
            <p className="text-stone-800 leading-relaxed">
              Adopt climate-smart practices: prepare seedbeds early, verify soil moisture depth before sowing, select certified drought-resilient varieties with suitable maturity cycles, and conserve topsoil moisture through mulching.
            </p>
          </div>
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
