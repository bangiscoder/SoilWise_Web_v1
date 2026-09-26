import React from 'react';
import { ArrowRight, Compass, CloudRain, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onOpenDocs: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onOpenDocs }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1b4332] bg-[#f0f5ee] px-3 py-1 rounded-full border border-[#1b4332]/15">
            Agricultural Intelligence MVP V1
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 tracking-tight leading-[1.15] text-balance">
            SoilWise AI
          </h1>

          <h2 className="text-xl sm:text-2xl font-medium text-[#1b4332]">
            Welcome to SoilWise AI
          </h2>

          <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
            Understand your farm better with soil, weather and location-based agricultural intelligence.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#1b4332] hover:bg-[#143225] text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group text-base active:scale-[0.99]"
            >
              <span>Try SoilWise AI</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onOpenDocs}
              className="w-full sm:w-auto px-5 py-3.5 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-medium rounded-xl transition-colors text-sm border border-stone-200/80"
            >
              View Modular Architecture
            </button>
          </div>
        </div>

        {/* Hero Visual Banner */}
        <div className="mt-10 sm:mt-14 relative rounded-2xl overflow-hidden border border-stone-200 shadow-sm max-w-4xl mx-auto bg-stone-100 aspect-[16/9] sm:aspect-[21/9]">
          <img
            src="/src/assets/images/hero_soilwise_landscape_1790388000180.jpg"
            alt="Agricultural farmland landscape with healthy soil beds"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback gracefully if image fails
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent flex items-end p-4 sm:p-6">
            <div className="text-white max-w-lg">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                Decision Support Foundation
              </p>
              <p className="text-sm sm:text-base font-medium text-stone-100 mt-1">
                Collect &bull; Enrich &bull; Structure &bull; Understand
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core V1 Workflow Overview */}
      <section className="bg-[#f4f7f2] border-y border-stone-200/70 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-stone-900">
              The 3-Stage V1 Pipeline
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Seamlessly converting your existing soil test and coordinates into a structured farm profile
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                1
              </div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">
                Your Soil Data
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Enter your existing laboratory, device, or extension soil test numbers: pH, Nitrogen (N), Phosphorus (P), Potassium (K), and EC.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                2
              </div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">
                Location & Environment
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                SoilWise AI queries OpenStreetMap for address and nearest landmarks, ISRIC SoilGrids for soil texture, and Open-Meteo for elevation.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                3
              </div>
              <h4 className="font-semibold text-stone-900 text-sm mb-1">
                Seasonal Rainfall Outlook
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Calculates model-based rainy season onset, cessation, duration, peak precipitation month, and days remaining from your analysis date.
              </p>
            </div>
          </div>

          {/* Transparency Callout */}
          <div className="mt-8 bg-white/70 border border-stone-200 rounded-xl p-4 sm:p-5 flex items-start gap-3 text-xs text-stone-600">
            <ShieldCheck className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-stone-800">Agricultural Data Transparency: </span>
              SoilWise AI does not physically test your soil in this MVP. Third-party climate and seasonal data are sourced from verified open models (Open-Meteo, ISRIC SoilGrids, OpenStreetMap) and are strictly separated from physical laboratory results.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 px-4 text-center text-xs text-stone-500 border-t border-stone-200">
        <p>SoilWise AI &mdash; Decision-Support Agricultural Intelligence MVP V1</p>
      </footer>
    </div>
  );
};
