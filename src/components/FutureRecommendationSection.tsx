import React from 'react';
import { Sparkles, Sprout, Users, ShieldAlert, Handshake, ArrowRight } from 'lucide-react';

interface FutureRecommendationSectionProps {
  onOpenPartnerModal: () => void;
}

export const FutureRecommendationSection: React.FC<FutureRecommendationSectionProps> = ({
  onOpenPartnerModal,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
            Future Recommendation Engine
          </span>
          <span className="text-stone-300">&bull;</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Roadmap
          </span>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
          Recommendation
        </h2>
        <p className="text-sm font-semibold text-[#1b4332] mt-0.5">
          From farm data to locally relevant agricultural decisions
        </p>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
          SoilWise AI is being designed to combine your farm data, climate information and validated local agricultural knowledge to help identify relevant crop and seed options for your farm.
        </p>
      </div>

      {/* Highlighted Future Recommendation Card */}
      <div className="p-5 sm:p-6 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/20 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center">
            <Sprout className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Locally Improved Seed
            </h3>
            <span className="text-[10px] text-[#1b4332] font-semibold uppercase tracking-wider">
              Future Capability &bull; In Development
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
          In future versions, SoilWise AI will help identify locally improved seed varieties that may be suitable for your farm based on your farm data, relevant NiMet climate information and validated recommendations from local agronomists, agricultural research institutions and certified seed producers.
        </p>

        <div className="p-3.5 bg-white/80 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-stone-800">Agricultural Safety Principle: </strong>
            These recommendations will be developed with qualified agricultural experts and trusted partners rather than relying on AI-generated assumptions alone. SoilWise AI does not recommend specific commercial varieties without rigorous empirical validation.
          </p>
        </div>
      </div>

      {/* Building the Recommendation Network (Partnership Callout) */}
      <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-[#1b4332]" />
            <h4 className="text-sm font-bold text-stone-900">
              Building the recommendation network
            </h4>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            SoilWise AI aims to work with agronomists, agricultural research institutions, certified seed producers and other agricultural experts to make localized recommendations more relevant and trustworthy.
          </p>
        </div>

        <button
          onClick={onOpenPartnerModal}
          className="px-4 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
        >
          <span>Partner With SoilWise AI</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
