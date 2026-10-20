import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sprout, 
  RotateCcw, 
  User, 
  LogOut, 
  LogIn, 
  Archive, 
  Compass, 
  GraduationCap, 
  ShoppingBag,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  FlaskConical,
  Layers,
  ShieldAlert,
  ChevronRight,
  Info,
  MapPin,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBackgroundSync } from '../hooks/useBackgroundSync';
import { SyncStatusIndicator } from './sync/SyncStatusIndicator';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: any) => void;
  onOpenDocs: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenDocs, isAdmin }) => {
  const { t } = useLanguage();
  const { currentUser, userProfile, logout } = useAuth();
  const { isOnline, pendingCount } = useBackgroundSync();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Lock body scroll and listen for Escape key when mobile menu is open
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const displayName = userProfile?.displayName || currentUser?.displayName || (currentUser ? 'Farmer' : 'Guest Farmer');
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;

  const handleNavClick = (view: string) => {
    setIsMenuOpen(false);
    onNavigate(view);
  };

  const handleDocsClick = () => {
    setIsMenuOpen(false);
    onOpenDocs();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#fbfbf9]/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* ========================================================================= */}
        {/* MOBILE HEADER: STRICTLY ONLY Profile Picture, Username, and Menu Icon     */}
        {/* ========================================================================= */}
        <div className="flex sm:hidden items-center justify-between w-full h-full">
          {/* Left: User Profile Picture & Username */}
          <button
            onClick={() => handleNavClick(currentUser ? 'profile' : 'login')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
          >
            <div className="relative shrink-0">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-emerald-700/30 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#1b4332] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-4 h-4 text-emerald-300" />}
                </div>
              )}
              {/* Online / Offline Status Dot */}
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>

            <div className="flex flex-col min-w-0 max-w-[180px]">
              <span className="text-xs font-extrabold text-stone-900 truncate leading-snug group-hover:text-[#1b4332] transition-colors">
                {displayName}
              </span>
              <span className="text-[10px] text-stone-500 font-medium truncate">
                {currentUser ? (isOnline ? 'Active Farmer' : 'Offline Mode') : 'Tap to sign in'}
              </span>
            </div>
          </button>

          {/* Right: Modern Menu Icon Button */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span 
                onClick={() => setIsMenuOpen(true)}
                title={`${pendingCount} offline update(s) queued`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold cursor-pointer"
              >
                <span>{pendingCount}</span>
              </span>
            )}

            <button
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <Menu className="w-5 h-5 text-stone-900" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP HEADER: Full Brand Wordmark & Extended Navigation Bar             */}
        {/* ========================================================================= */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {/* Brand Wordmark */}
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

          {/* Desktop Navigation Actions */}
          <div className="flex items-center gap-2.5">
            {/* Background Sync Status Indicator */}
            <SyncStatusIndicator showDetailsOnClick={true} />

            {/* Seed Marketplace Navigation Button */}
            <button
              onClick={() => onNavigate('marketplace')}
              title="Browse certified crop seeds and order kilograms for your farm"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'marketplace'
                  ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <ShoppingBag className={`w-3.5 h-3.5 ${currentView === 'marketplace' ? 'text-emerald-300' : 'text-emerald-700'}`} />
              <span>Seed Marketplace</span>
            </button>

            {/* Learning Hub Navigation Button */}
            <button
              onClick={() => onNavigate('learning-hub')}
              title="Explore agricultural lessons and practical guides in SoilWise Learning Hub"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'learning-hub'
                  ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <GraduationCap className={`w-3.5 h-3.5 ${currentView === 'learning-hub' ? 'text-emerald-300' : 'text-emerald-700'}`} />
              <span>Learning Hub</span>
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Primary Action Button (New Analysis on Result page) */}
            {currentView === 'analysis' && (
              <button
                onClick={() => onNavigate('farm-data')}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#1b4332] hover:bg-[#143225] rounded-lg transition-colors shadow-xs active:scale-[0.98] whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('nav.newAnalysis')}</span>
              </button>
            )}

            {/* User Profile / Account Quick Button */}
            {currentUser ? (
              <button
                onClick={() => onNavigate('profile')}
                title="View your personal farmer profile"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'profile' || currentView === 'account'
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
                <span className="max-w-[90px] truncate">
                  {displayName}
                </span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Desktop Full Menu Trigger */}
            <button
              onClick={() => setIsMenuOpen(true)}
              title="Open full menu"
              aria-label="Open navigation drawer"
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Menu className="w-4 h-4 text-stone-800" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE-OVER DRAWER MENU WITH COMPREHENSIVE MENU ITEMS & SMOOTH ANIMATION   */}
      {/* Rendered via createPortal directly into document.body to break out of      */}
      {/* header backdrop-filter containing block and ensure full viewport height    */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMenuOpen && (
            <div className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden flex justify-end">
              {/* Backdrop Blur Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs cursor-pointer z-0"
              />

              {/* Sliding Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative z-10 w-[88%] sm:w-[380px] max-w-md h-full max-h-[100dvh] bg-white shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Drawer Top Header */}
                <div className="p-4 border-b border-stone-100 bg-[#fbfbf9] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1b4332] text-white flex items-center justify-center shadow-2xs">
                    <Sprout className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="font-extrabold text-sm text-[#1b4332] tracking-tight">SoilWise Menu</span>
                </div>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="p-4 border-b border-stone-100 bg-stone-50/70 shrink-0">
                <div 
                  onClick={() => handleNavClick(currentUser ? 'profile' : 'login')}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-600/30 shadow-xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                      {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-6 h-6 text-emerald-300" />}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-stone-900 truncate group-hover:text-[#1b4332] transition-colors">
                      {displayName}
                    </h3>
                    <p className="text-[11px] text-stone-500 truncate font-medium">
                      {currentUser?.email || (currentUser ? 'Authenticated Farmer' : 'Offline Guest Account')}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                        {isOnline ? 'Connected' : 'Offline Mode'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
                </div>

                {/* Background Sync Status Indicator */}
                <div className="mt-3">
                  <SyncStatusIndicator showDetailsOnClick={true} className="w-full" />
                </div>
              </div>

              {/* Drawer Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 overscroll-contain">
                {/* SECTION 1: ACCOUNT & DASHBOARD (FIRST!) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 px-3 block mb-1.5">
                    Account &amp; Management
                  </span>

                  {/* 1. Dashboard / Profile (FIRST ITEM) */}
                  <button
                    onClick={() => handleNavClick(currentUser ? 'profile' : 'login')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'profile'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'profile' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-[#1b4332]'
                      }`}>
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Dashboard &amp; Profile</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'profile' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Overview of farms, health &amp; personal profile
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>

                  {/* 2. Settings & Preferences */}
                  <button
                    onClick={() => handleNavClick(currentUser ? 'account' : 'login')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'account'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'account' ? 'bg-white/10 text-emerald-300' : 'bg-stone-100 text-stone-700'
                      }`}>
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Settings &amp; Preferences</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'account' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Units, GPS preferences &amp; credentials
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                </div>

                {/* SECTION 2: FARM INTELLIGENCE */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 px-3 block mb-1.5">
                    Farm Intelligence &amp; Analysis
                  </span>

                  {/* 3. New Farm Soil Analysis */}
                  <button
                    onClick={() => handleNavClick('farm-data')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'farm-data'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'farm-data' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-[#1b4332]'
                      }`}>
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">New Soil Assessment</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'farm-data' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          iSDAsoil 30m digital mapping &amp; nutrients
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>

                  {/* 4. My Saved Farms */}
                  <button
                    onClick={() => handleNavClick(currentUser ? 'my-farms' : 'login')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'my-farms'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'my-farms' ? 'bg-white/10 text-emerald-300' : 'bg-stone-100 text-[#1b4332]'
                      }`}>
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">My Saved Farms</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'my-farms' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Manage acreage, boundaries &amp; GPS locations
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>

                  {/* 5. Past Analyses & History */}
                  <button
                    onClick={() => handleNavClick(currentUser ? 'my-analyses' : 'login')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'my-analyses'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'my-analyses' ? 'bg-white/10 text-emerald-300' : 'bg-stone-100 text-stone-700'
                      }`}>
                        <Archive className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Past Analyses &amp; Reports</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'my-analyses' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Historical soil reports, PDF export &amp; trends
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                </div>

                {/* SECTION 3: MARKETPLACE & LEARNING */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 px-3 block mb-1.5">
                    Inputs &amp; Agricultural Knowledge
                  </span>

                  {/* 6. Seed Marketplace */}
                  <button
                    onClick={() => handleNavClick('marketplace')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'marketplace'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'marketplace' ? 'bg-white/10 text-emerald-300' : 'bg-emerald-50 text-[#1b4332]'
                      }`}>
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Seed Marketplace &amp; Inputs</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'marketplace' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Purchase NASC certified seeds via Paystack
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>

                  {/* 7. Learning Hub */}
                  <button
                    onClick={() => handleNavClick('learning-hub')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      currentView === 'learning-hub'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        currentView === 'learning-hub' ? 'bg-white/10 text-emerald-300' : 'bg-blue-50 text-blue-700'
                      }`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Learning Hub ("My Journey")</span>
                        <span className={`text-[10px] font-normal block ${currentView === 'learning-hub' ? 'text-emerald-200' : 'text-stone-500'}`}>
                          Agronomy modules, soil health &amp; video lessons
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>

                  {/* 8. Technical Architecture Docs */}
                  <button
                    onClick={handleDocsClick}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-stone-800 hover:bg-stone-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">Data Architecture &amp; Methodology</span>
                        <span className="text-[10px] text-stone-500 font-normal block">
                          iSDAsoil 30m, NiMet climate &amp; pedology docs
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                </div>

                {/* SECTION 4: ADMINISTRATION (IF ADMIN) */}
                {isAdmin && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 px-3 block mb-1.5">
                      System Administration
                    </span>

                    <button
                      onClick={() => handleNavClick('admin-dashboard')}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                        currentView === 'admin-dashboard'
                          ? 'bg-[#1b4332] text-white shadow-xs'
                          : 'text-stone-800 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block font-bold">Admin Seed &amp; Hub Portal</span>
                          <span className="text-[10px] text-stone-500 font-normal block">
                            Manage seed stocks, farmer orders &amp; curricula
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Bar: Language & Auth Action */}
              <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 font-semibold">Language</span>
                  <LanguageSwitcher />
                </div>

                {currentUser ? (
                  <button
                    onClick={async () => {
                      setIsMenuOpen(false);
                      await logout();
                      onNavigate('farm-data');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out of Account</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleNavClick('login')}
                      className="py-2.5 px-3 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('register')}
                      className="py-2.5 px-3 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center hover:bg-[#143225] shadow-xs cursor-pointer flex items-center justify-center"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </header>
  );
};
