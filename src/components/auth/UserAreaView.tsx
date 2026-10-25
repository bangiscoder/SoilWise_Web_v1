import React from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Key, 
  ShieldCheck, 
  LogOut, 
  Sprout, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Archive,
  Compass,
  Globe,
  Settings,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { calculateProfileCompletion } from '../../services/farmService';

interface UserAreaViewProps {
  onNavigateToAnalysis: () => void;
  onNavigateToHistory: () => void;
  onNavigateToProfile: () => void;
  onNavigateToFarms: () => void;
  onLogout: () => void;
  onOpenCommitmentModal?: () => void;
}

export const UserAreaView: React.FC<UserAreaViewProps> = ({
  onNavigateToAnalysis,
  onNavigateToHistory,
  onNavigateToProfile,
  onNavigateToFarms,
  onLogout,
  onOpenCommitmentModal,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || 'SoilWise Farmer';
  const email = userProfile?.email || currentUser?.email || 'N/A';
  const uid = userProfile?.uid || currentUser?.uid || 'N/A';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;
  const role = userProfile?.role || (isAdmin ? 'admin' : 'user');
  const providers = userProfile?.authProviders || currentUser?.providerData?.map(p => p.providerId) || ['password'];

  // Format joined date
  const joinedDate = currentUser?.metadata?.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1b4332]/20 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-2xl shadow-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                {displayName}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                role === 'admin' 
                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {role === 'admin' ? 'Administrator' : 'Farmer Account'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-mono">
              {email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNavigateToProfile}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserIcon className="w-4 h-4 text-[#1b4332]" />
            <span>My Profile</span>
          </button>
          <button
            onClick={onNavigateToFarms}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>My Farms</span>
          </button>
          <button
            onClick={onNavigateToHistory}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Archive className="w-4 h-4 text-emerald-700" />
            <span>My Analyses</span>
          </button>
          <button
            onClick={onNavigateToAnalysis}
            className="px-3.5 py-2 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sprout className="w-4 h-4 text-emerald-300" />
            <span>Farm Assessment</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-stone-500" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Direct VIP Account Upgrade Card (If not yet VIP) */}
      {!userProfile?.isVipFarmer && onOpenCommitmentModal && (
        <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-6 sm:p-7 text-stone-950 shadow-md border border-amber-500/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-stone-950 text-amber-300 px-2.5 py-0.5 rounded-full">
                  Founding VIP Offer
                </span>
                <span className="text-xs font-bold text-stone-900">
                  100% Refundable Commitment
                </span>
              </div>
              <h3 className="text-lg font-black text-stone-950">
                Upgrade Your Account to VIP Gold Farmer
              </h3>
              <p className="text-xs text-stone-900 max-w-xl leading-relaxed font-medium">
                Deposit <strong>₦1,000</strong> to unlock <strong>35% off certified seed varieties</strong> and <strong>100% free nationwide farm delivery</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCommitmentModal}
            className="px-6 py-3 bg-stone-950 hover:bg-stone-900 text-amber-300 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Upgrade Account to VIP (₦1,000)</span>
          </button>
        </div>
      )}

      {/* Stage 3 Personalisation & Farm Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile Preferences & Completion Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-stone-900 font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span>Profile & Personalisation</span>
                <span className="block text-[11px] font-normal text-stone-500">Language, experience & crop interests</span>
              </div>
            </div>
            {(() => {
              const comp = calculateProfileCompletion(userProfile);
              return (
                <span className="text-xs font-extrabold text-[#1b4332] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  {comp.percentage}% Complete
                </span>
              );
            })()}
          </div>

          <div className="space-y-2 text-xs text-stone-600 bg-stone-50/70 p-3.5 rounded-xl border border-stone-100">
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Preferred Language:</span>
              <span className="font-semibold text-stone-800 uppercase">
                {userProfile?.profile?.preferredLanguage || 'English (default)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Farming Experience:</span>
              <span className="font-semibold text-stone-800 capitalize">
                {userProfile?.profile?.farmingExperience?.replace('_', ' ') || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Preferred Crops:</span>
              <span className="font-semibold text-stone-800">
                {userProfile?.profile?.preferredCrops && userProfile.profile.preferredCrops.length > 0
                  ? userProfile.profile.preferredCrops.join(', ')
                  : 'None selected'}
              </span>
            </div>
          </div>

          <button
            onClick={onNavigateToProfile}
            className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Edit Profile & Preferences</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Farm Management Card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-stone-900 font-bold text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span>My Farm Profiles</span>
                <span className="block text-[11px] font-normal text-stone-500">Saved locations & derived agro-ecology</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed bg-stone-50/70 p-3.5 rounded-xl border border-stone-100">
            Save individual farms with GPS coordinates, State, and LGA. SoilWise automatically derives verified agro-ecological classifications and allows 1-click assessment linking.
          </p>

          <button
            onClick={onNavigateToFarms}
            className="w-full py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Manage My Farms</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Account Details & Foundation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Account Identity Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <Key className="w-4 h-4 text-[#1b4332]" />
            <span>Account Identity</span>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Unique User ID (UID)</span>
              <p className="font-mono text-stone-800 break-all text-[11px] bg-stone-50 p-2 rounded-lg border border-stone-200/60 mt-0.5 select-all">
                {uid}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Member Since</span>
              <p className="font-semibold text-stone-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>{joinedDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Security Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Security & Sign-In</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Account Status</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Active</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Sign-In Methods</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {providers.map((p, idx) => (
                  <span key={idx} className="font-mono text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                    {p === 'google.com' ? 'Google' : p === 'password' ? 'Email/Password' : p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account Plan & History Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
            <Archive className="w-4 h-4 text-[#1b4332]" />
            <span>Saved Assessments</span>
          </div>
          <div className="space-y-2 text-xs text-stone-600">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-semibold block">Assessment History</span>
              <button
                onClick={onNavigateToHistory}
                className="font-bold text-[#1b4332] hover:underline flex items-center gap-1 mt-0.5 cursor-pointer text-xs"
              >
                <span>Browse Saved Analyses</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed pt-1 border-t border-stone-100">
              Your field soil properties, seasonal rainfall forecasts, and IAR seed matches are permanently retained in your private subcollection.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch Card */}
      <div className="bg-[#f0f5ee] rounded-3xl p-6 sm:p-7 border border-[#1b4332]/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <h3 className="text-base sm:text-lg font-bold text-stone-900">
            Ready to analyze your farmland?
          </h3>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
            Run a location-based soil assessment, seasonal rainfall forecast, and deterministic IAR crop variety matching.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalysis}
          className="px-5 py-3.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <span>Start Farm Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
