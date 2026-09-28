import React from 'react';
import { Sprout, RotateCcw } from 'lucide-react';

interface NavbarProps {
  currentView: 'farm-data' | 'analysis';
  onNavigate: (view: 'farm-data') => void;
  onOpenDocs: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenDocs, isAdmin }) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Wordmark (Single element) */}
        <button
          onClick={() => onNavigate('farm-data')}
          className="flex items-center gap-2 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4332] rounded-md cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1b4332] flex items-center justify-center text-white shadow-xs">
            <Sprout className="w-4 h-4 text-emerald-300" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#1b4332]">
            SoilWise AI
          </span>
        </button>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {/* Admin-only Navigation item */}
          {isAdmin && (
            <button
              onClick={onOpenDocs}
              className="text-xs sm:text-sm font-medium text-stone-600 hover:text-[#1b4332] transition-colors cursor-pointer"
            >
              Data Architecture &amp; API
            </button>
          )}

          {/* Primary Action Button */}
          {currentView === 'analysis' && (
            <button
              onClick={() => onNavigate('farm-data')}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#1b4332] hover:bg-[#143225] rounded-lg transition-colors shadow-xs active:scale-[0.98] whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
