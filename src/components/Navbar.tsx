import React from 'react';
import { Sprout, RotateCcw, User, LogOut, LogIn, Archive } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onOpenDocs: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenDocs, isAdmin }) => {
  const { t } = useLanguage();
  const { currentUser, userProfile, logout } = useAuth();

  const displayName = userProfile?.displayName || currentUser?.displayName || 'My Account';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;

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
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin-only Navigation item */}
          {isAdmin && (
            <button
              onClick={onOpenDocs}
              className="hidden md:inline-block text-xs sm:text-sm font-medium text-stone-600 hover:text-[#1b4332] transition-colors cursor-pointer"
            >
              {t('nav.dataArchitecture')}
            </button>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Primary Action Button (New Analysis on Result page) */}
          {currentView === 'analysis' && (
            <button
              onClick={() => onNavigate('farm-data')}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#1b4332] hover:bg-[#143225] rounded-lg transition-colors shadow-xs active:scale-[0.98] whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{t('nav.newAnalysis')}</span>
            </button>
          )}

          {/* User Authentication & History Navigation */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* My Analyses History Button */}
              <button
                onClick={() => onNavigate('my-analyses')}
                title="View your saved farm analyses"
                className={`hidden xs:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'my-analyses'
                    ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <Archive className={`w-3.5 h-3.5 ${currentView === 'my-analyses' ? 'text-emerald-300' : 'text-emerald-700'}`} />
                <span>My Analyses</span>
              </button>

              {/* Account Button */}
              <button
                onClick={() => onNavigate('account')}
                title="View your personal account"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'account'
                    ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-stone-500" />
                )}
                <span className="max-w-[90px] truncate hidden sm:inline">
                  {displayName}
                </span>
                <span className="sm:hidden text-[11px]">Account</span>
              </button>

              <button
                onClick={async () => {
                  await logout();
                  onNavigate('farm-data');
                }}
                title="Log out"
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onNavigate('login')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'login'
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                onClick={() => onNavigate('register')}
                className="hidden sm:flex px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-[#1b4332] hover:bg-[#143225] rounded-lg transition-all shadow-xs active:scale-[0.98] items-center gap-1.5 cursor-pointer"
              >
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
