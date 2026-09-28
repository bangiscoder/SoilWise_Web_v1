import React from 'react';
import { Sprout } from 'lucide-react';

interface NavbarProps {
  currentView: 'landing' | 'farm-data' | 'analysis';
  onNavigate: (view: 'landing' | 'farm-data') => void;
  onOpenDocs: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenDocs, isAdmin }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark (Single element) */}
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4332] rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1b4332] flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-4 h-4 text-emerald-300" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#1b4332]">
            SoilWise AI
          </span>
        </button>

        {/* Zone 2: 3-4 clean text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors hover:text-[#1b4332] ${
              currentView === 'landing' ? 'text-[#1b4332] font-semibold' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onNavigate('farm-data')}
            className={`transition-colors hover:text-[#1b4332] ${
              currentView === 'farm-data' ? 'text-[#1b4332] font-semibold' : ''
            }`}
          >
            Farm Data
          </button>
          {isAdmin && (
            <button
              onClick={onOpenDocs}
              className="transition-colors hover:text-[#1b4332] flex items-center gap-1.5 cursor-pointer"
            >
              Data Architecture &amp; API
            </button>
          )}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          {currentView !== 'farm-data' ? (
            <button
              onClick={() => onNavigate('farm-data')}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#1b4332] hover:bg-[#143225] rounded-lg transition-colors shadow-xs active:scale-[0.98] whitespace-nowrap"
            >
              Analyze Farm
            </button>
          ) : (
            <button
              onClick={() => onNavigate('landing')}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-stone-700 hover:text-stone-900 border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors whitespace-nowrap"
            >
              Back to Overview
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
