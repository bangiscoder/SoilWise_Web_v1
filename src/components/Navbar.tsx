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
  Crown
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
  onOpenCommitmentModal?: () => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigate, 
  onOpenDocs, 
  onOpenCommitmentModal, 
  isAdmin 
}) => {
  const { t } = useLanguage();
  const { currentUser, userProfile, logout } = useAuth();
  const { isOnline, pendingCount } = useBackgroundSync();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Lock body scroll and listen for Escape key when mobile menu is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const displayName = userProfile?.displayName || currentUser?.displayName || (currentUser ? 'Farmer' : 'Guest Farmer');
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;

  const handleNavClick = (view: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  const handleDocsClick = () => {
    setIsMobileMenuOpen(false);
    onOpenDocs();
  };

  // Reusable Nav Item Component for Sidebar & Mobile Drawer
  const NavItem = ({
    view,
    label,
    icon: Icon,
    badge,
    description,
    onClick,
  }: {
    view?: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    description?: string;
    onClick?: () => void;
  }) => {
    const isActive = view ? currentView === view : false;
    const handleClick = () => {
      if (onClick) {
        onClick();
      } else if (view) {
        handleNavClick(view);
      }
    };

    return (
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left group ${
          isActive
            ? 'bg-[#1b4332] text-white shadow-xs'
            : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/90'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isActive 
              ? 'bg-white/15 text-emerald-300' 
              : 'bg-stone-100 text-stone-600 group-hover:text-[#1b4332] group-hover:bg-emerald-50'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate">{label}</span>
              {badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                  isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <span className={`text-[10px] block truncate font-normal ${
                isActive ? 'text-emerald-200/90' : 'text-stone-400 group-hover:text-stone-500'
              }`}>
                {description}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
          isActive ? 'text-emerald-300 opacity-80' : 'text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5'
        }`} />
      </button>
    );
  };

  // Common Nav Content Shared Between Desktop Sidebar and Mobile Drawer
  const renderNavGroups = (isDrawer = false) => (
    <div className="space-y-4">
      {/* VIP Commitment Callout Card (If farmer hasn't committed yet) */}
      {!userProfile?.isVipFarmer && onOpenCommitmentModal && (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/70 to-yellow-50 border border-amber-300/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-lg bg-amber-500 text-stone-950 shadow-2xs">
              <Crown className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-black text-amber-950 uppercase tracking-wide">
              Founding VIP Farmer
            </span>
          </div>
          <p className="text-[11px] text-stone-700 leading-snug">
            Commit <strong>₦1,000 (100% refundable)</strong> to unlock 35% off your 1st seed order and free delivery.
          </p>
          <button
            onClick={() => {
              if (isDrawer) setIsMobileMenuOpen(false);
              if (!currentUser) {
                try {
                  sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                } catch {}
                onNavigate('register');
              } else {
                onOpenCommitmentModal();
              }
            }}
            className="w-full py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition-all shadow-xs active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{currentUser ? 'Upgrade Account (₦1,000)' : 'Sign Up to Upgrade (₦1,000)'}</span>
          </button>
        </div>
      )}

      {/* Section 1: Farm Intelligence */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-3 block">
          Farm Intelligence
        </span>
        <NavItem
          view="farm-data"
          label={t('nav.newAnalysis') || "New Soil Assessment"}
          icon={FlaskConical}
          description="30m iSDAsoil mapping & nutrients"
        />
        {currentView === 'analysis' && (
          <NavItem
            view="analysis"
            label="Analysis Report"
            icon={Sprout}
            badge="Live"
            description="Active field diagnosis & recommendations"
          />
        )}
        <NavItem
          view="my-farms"
          label="My Saved Farms"
          icon={Compass}
          description="GPS boundaries, crop history & acreage"
        />
        <NavItem
          view="my-analyses"
          label="Past Analyses & History"
          icon={Archive}
          description="Historical reports & PDF records"
        />
      </div>

      {/* Section 2: Marketplace & Knowledge */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-3 block">
          Marketplace &amp; Learning
        </span>
        <NavItem
          view="marketplace"
          label="Seed Marketplace"
          icon={ShoppingBag}
          badge="Verified"
          description="Certified seed varieties & delivery"
        />
        <NavItem
          view="learning-hub"
          label="Learning Hub"
          icon={GraduationCap}
          description="Agronomy lessons & soil health guides"
        />
      </div>

      {/* Section 3: Farmer Account & Management */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-3 block">
          Farmer Account
        </span>
        <NavItem
          view={currentUser ? 'profile' : 'login'}
          label="Dashboard &amp; Profile"
          icon={LayoutDashboard}
          description="Farms overview & personal profile"
        />
        <NavItem
          view={currentUser ? 'account' : 'login'}
          label="Settings &amp; Preferences"
          icon={Settings}
          description="Units, GPS location & credentials"
        />
      </div>

      {/* Section 4: Architecture & Admin */}
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-3 block">
          System &amp; Science
        </span>
        <NavItem
          label="Data Architecture"
          icon={Layers}
          description="NiMet climate & pedology docs"
          onClick={handleDocsClick}
        />
        {isAdmin && (
          <NavItem
            view="admin-dashboard"
            label="Admin Seed &amp; Hub Portal"
            icon={ShieldAlert}
            badge="Admin"
            description="Manage catalogue, stock & curricula"
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP PERMANENT LEFT SIDEBAR (md:flex, hidden on mobile)            */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 shrink-0 bg-white border-r border-stone-200/80 z-30 shadow-2xs select-none">
        {/* Sidebar Brand Header */}
        <div className="p-4 lg:p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-[#fbfbf9]">
          <button
            onClick={() => onNavigate('farm-data')}
            className="flex items-center gap-2.5 text-left group focus-visible:outline-none rounded-lg cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-base lg:text-lg font-black tracking-tight text-[#1b4332] block leading-tight">
                SoilWise AI
              </span>
              <span className="text-[10px] font-bold text-emerald-800 tracking-wider uppercase block">
                Agroecology Platform
              </span>
            </div>
          </button>
        </div>

        {/* Farmer Profile Status Card */}
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/70 shrink-0">
          <button
            onClick={() => onNavigate(currentUser ? 'profile' : 'login')}
            className="w-full flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          >
            <div className="relative shrink-0">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="w-10 h-10 rounded-xl object-cover border border-emerald-700/30 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-emerald-300" />}
                </div>
              )}
              {/* Online / Offline Dot */}
              <span 
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-black text-stone-900 truncate leading-snug group-hover:text-[#1b4332] transition-colors">
                  {displayName}
                </span>
                {userProfile?.isVipFarmer ? (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-black text-amber-950 bg-amber-200 px-1.5 py-0.2 rounded-full border border-amber-400">
                    <Crown className="w-2.5 h-2.5 text-amber-700 fill-amber-500" />
                    <span>VIP</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!currentUser) {
                        try {
                          sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                        } catch {}
                        onNavigate('register');
                      } else if (onOpenCommitmentModal) {
                        onOpenCommitmentModal();
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-black text-amber-950 bg-amber-400 hover:bg-amber-300 px-2 py-0.5 rounded-full border border-amber-500 shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Crown className="w-2.5 h-2.5 text-stone-900" />
                    <span>Upgrade</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-stone-500 font-medium truncate block">
                {currentUser 
                  ? (userProfile?.isVipFarmer ? 'VIP Gold • Free Delivery' : isOnline ? 'Verified Farmer • Tap to Upgrade' : 'Offline Mode') 
                  : 'Tap to sign in'}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
          </button>

          {/* Sync status widget */}
          <div className="mt-2.5 pt-2 border-t border-stone-200/50">
            <SyncStatusIndicator showDetailsOnClick={true} className="w-full" />
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 min-h-0 overscroll-contain">
          {renderNavGroups(false)}
        </div>

        {/* Sidebar Footer: Language & Auth Actions */}
        <div className="p-3 lg:p-4 border-t border-stone-200/80 bg-stone-50/90 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider">Language</span>
            <LanguageSwitcher />
          </div>

          {currentUser ? (
            <button
              onClick={async () => {
                await logout();
                onNavigate('farm-data');
              }}
              className="w-full py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="py-2 px-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="py-2 px-2.5 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center hover:bg-[#143225] shadow-xs cursor-pointer flex items-center justify-center"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOP HEADER (md:hidden only, NO HAMBURGER ICON ON DESKTOP!)      */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 bg-[#fbfbf9]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="px-4 h-14 flex items-center justify-between">
          {/* Left: Mobile Menu Trigger (Hamburger) & Brand */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open left navigation menu"
              className="p-2 -ml-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <Menu className="w-5 h-5 text-stone-900" />
            </button>

            <button
              onClick={() => onNavigate('farm-data')}
              className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#1b4332] text-white flex items-center justify-center shadow-2xs">
                <Sprout className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="font-black text-sm text-[#1b4332] tracking-tight">
                SoilWise AI
              </span>
            </button>
          </div>

          {/* Right: User Profile Quick Access / Upgrade / Sync Status */}
          <div className="flex items-center gap-2">
            {!userProfile?.isVipFarmer && (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    try {
                      sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                    } catch {}
                    onNavigate('register');
                  } else if (onOpenCommitmentModal) {
                    onOpenCommitmentModal();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-stone-950 border border-amber-500 shadow-2xs cursor-pointer active:scale-95"
              >
                <Crown className="w-3 h-3 text-stone-900" />
                <span>Upgrade</span>
              </button>
            )}

            {pendingCount > 0 && (
              <span 
                onClick={() => setIsMobileMenuOpen(true)}
                title={`${pendingCount} offline update(s) queued`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold cursor-pointer"
              >
                <span>{pendingCount}</span>
              </span>
            )}

            <button
              onClick={() => handleNavClick(currentUser ? 'profile' : 'login')}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <div className="relative shrink-0">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-emerald-700/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1b4332] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-4 h-4 text-emerald-300" />}
                  </div>
                )}
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE SLIDE-OVER DRAWER (SLIDES IN FROM THE LEFT SIDE)                */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden flex justify-start">
              {/* Backdrop Blur Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs cursor-pointer z-0"
              />

              {/* Sliding Drawer Container from the LEFT */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative z-10 w-[84%] max-w-xs h-full max-h-[100dvh] bg-white shadow-2xl flex flex-col overflow-hidden"
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
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Drawer Profile Card */}
                <div className="p-3.5 border-b border-stone-100 bg-stone-50/70 shrink-0">
                  <div 
                    onClick={() => handleNavClick(currentUser ? 'profile' : 'login')}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-emerald-600/30 shadow-xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                        {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-5 h-5 text-emerald-300" />}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-black text-stone-900 truncate group-hover:text-[#1b4332] transition-colors">
                          {displayName}
                        </h3>
                        {userProfile?.isVipFarmer && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.2 rounded-full border border-amber-400">
                            <Crown className="w-2.5 h-2.5 text-amber-700 fill-amber-500" />
                            <span>VIP</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 truncate font-medium">
                        {currentUser?.email || (currentUser ? 'Authenticated Farmer' : 'Offline Guest Account')}
                      </p>
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 transition-colors shrink-0" />
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-200/50">
                    <SyncStatusIndicator showDetailsOnClick={true} className="w-full" />
                  </div>
                </div>

                {/* Mobile Drawer Navigation Links */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0 overscroll-contain">
                  {renderNavGroups(true)}
                </div>

                {/* Drawer Bottom Bar: Language & Auth Action */}
                <div className="p-3 border-t border-stone-200 bg-stone-50 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-semibold text-[11px]">Language</span>
                    <LanguageSwitcher />
                  </div>

                  {currentUser ? (
                    <button
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await logout();
                        onNavigate('farm-data');
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleNavClick('login')}
                        className="py-2 px-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                      <button
                        onClick={() => handleNavClick('register')}
                        className="py-2 px-2.5 rounded-xl bg-[#1b4332] text-white text-xs font-bold text-center hover:bg-[#143225] shadow-xs cursor-pointer flex items-center justify-center"
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
    </>
  );
};
