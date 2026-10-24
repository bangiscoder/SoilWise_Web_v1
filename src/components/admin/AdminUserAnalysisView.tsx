import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Crown, 
  DollarSign, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Eye, 
  Mail, 
  Phone, 
  ArrowUpRight, 
  Sparkles, 
  RefreshCw,
  X,
  Copy,
  Check,
  TrendingUp,
  Truck,
  Award,
  UserPlus,
  Clock,
  AlertCircle,
  FileCheck,
  Tag
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SoilWiseUserProfile, PendingVipCredit } from '../../types/auth';

export const AdminUserAnalysisView: React.FC = () => {
  const [users, setUsers] = useState<SoilWiseUserProfile[]>([]);
  const [pendingCredits, setPendingCredits] = useState<PendingVipCredit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'offline_credits'>('users');
  
  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vip' | 'standard' | 'free_delivery'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  
  // Modals
  const [selectedUser, setSelectedUser] = useState<SoilWiseUserProfile | null>(null);
  const [upgradeTargetUser, setUpgradeTargetUser] = useState<SoilWiseUserProfile | null>(null);
  const [isOfflineCreditModalOpen, setIsOfflineCreditModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upgrade user form state
  const [upgradeAmountNgn, setUpgradeAmountNgn] = useState<number>(1000);
  const [upgradeCustomAmount, setUpgradeCustomAmount] = useState<string>('1000');
  const [upgradeVipLevel, setUpgradeVipLevel] = useState<string>('gold');
  const [upgradeFreeDelivery, setUpgradeFreeDelivery] = useState<boolean>(true);
  const [upgradeNote, setUpgradeNote] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  // Offline credit form state
  const [offlineEmail, setOfflineEmail] = useState<string>('');
  const [offlineName, setOfflineName] = useState<string>('');
  const [offlinePhone, setOfflinePhone] = useState<string>('');
  const [offlineAmountNgn, setOfflineAmountNgn] = useState<number>(1000);
  const [offlineCustomAmount, setOfflineCustomAmount] = useState<string>('1000');
  const [offlineRef, setOfflineRef] = useState<string>('');
  const [offlineNote, setOfflineNote] = useState<string>('');
  const [isSubmittingOffline, setIsSubmittingOffline] = useState<boolean>(false);

  // 1. Real-time Firestore sync with 'users' collection
  useEffect(() => {
    if (!db) {
      setErrorMessage('Firestore is not initialized.');
      setIsLoading(false);
      return;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: SoilWiseUserProfile[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              uid: docSnap.id,
              ...data,
            } as SoilWiseUserProfile);
          });

          // Sort by creation date descending
          list.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          setUsers(list);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error fetching users in admin:', err);
          setErrorMessage('Unable to load users. Verify Firestore administrative privileges.');
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error subscribing to users.');
      setIsLoading(false);
    }
  }, []);

  // 2. Real-time Firestore sync with 'soilwise_pending_vip_credits'
  useEffect(() => {
    if (!db) return;

    try {
      const creditsRef = collection(db, 'soilwise_pending_vip_credits');
      const q = query(creditsRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: PendingVipCredit[] = [];
          snapshot.forEach((docSnap) => {
            list.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as PendingVipCredit);
          });

          list.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          setPendingCredits(list);
        },
        (err) => {
          console.warn('Could not subscribe to pending VIP credits:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up credits listener:', err);
    }
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Computed Key Performance Indicators (KPIs)
  const analytics = useMemo(() => {
    const totalCount = users.length;
    const vipUsers = users.filter(u => Boolean(u.isVipFarmer || u.earlyBirdSpotSecured || u.vipLevel === 'gold'));
    const vipCount = vipUsers.length;
    const vipConversionRate = totalCount > 0 ? ((vipCount / totalCount) * 100).toFixed(1) : '0';
    
    // Total commitments collected
    const totalCommitmentRevenue = vipUsers.reduce((sum, u) => {
      const amount = u.totalCommitmentPaidNgn || u.refundableDepositNgn || 1000;
      return sum + amount;
    }, 0);

    const pendingOfflineCreditsCount = pendingCredits.filter(c => c.status === 'pending').length;
    const pendingOfflineTotalNgn = pendingCredits
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.amountNgn || 1000), 0);

    const freeDeliveryCount = users.filter(u => Boolean(u.freeDeliveryEligible || u.isVipFarmer)).length;

    // Geographic distribution
    const stateCounts: Record<string, number> = {};
    users.forEach(u => {
      const st = u.state || u.profile?.state || 'Unspecified';
      stateCounts[st] = (stateCounts[st] || 0) + 1;
    });

    const topStates = Object.entries(stateCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCount,
      vipCount,
      vipConversionRate,
      totalCommitmentRevenue,
      freeDeliveryCount,
      pendingOfflineCreditsCount,
      pendingOfflineTotalNgn,
      topStates,
      stateList: Array.from(new Set(users.map(u => u.state || u.profile?.state).filter(Boolean))) as string[]
    };
  }, [users, pendingCredits]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Status Filter
      const isVip = Boolean(user.isVipFarmer || user.earlyBirdSpotSecured || user.vipLevel === 'gold');
      if (statusFilter === 'vip' && !isVip) return false;
      if (statusFilter === 'standard' && isVip) return false;
      if (statusFilter === 'free_delivery' && !user.freeDeliveryEligible && !isVip) return false;

      // State Filter
      const userState = user.state || user.profile?.state || '';
      if (stateFilter !== 'all' && userState !== stateFilter) return false;

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phoneNumber || user.profile?.phoneNumber || '').toLowerCase();
      const lga = (user.lga || user.profile?.lga || '').toLowerCase();
      const uid = (user.uid || '').toLowerCase();

      return name.includes(q) || email.includes(q) || phone.includes(q) || userState.toLowerCase().includes(q) || lga.includes(q) || uid.includes(q);
    });
  }, [users, statusFilter, stateFilter, searchQuery]);

  // Open Upgrade Modal for a specific user
  const handleOpenUpgradeModal = (user: SoilWiseUserProfile) => {
    setUpgradeTargetUser(user);
    const existingAmt = user.totalCommitmentPaidNgn || user.refundableDepositNgn || 1000;
    setUpgradeAmountNgn(existingAmt);
    setUpgradeCustomAmount(existingAmt.toString());
    setUpgradeVipLevel(user.vipLevel || 'gold');
    setUpgradeFreeDelivery(user.freeDeliveryEligible ?? true);
    setUpgradeNote(user.vipUpgradeNote || 'Upgraded by Administrator based on verified Paystack payment.');
  };

  // Submit User Upgrade to VIP
  const handleConfirmUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeTargetUser || !db) return;

    const parsedAmount = parseInt(upgradeCustomAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      alert('The refundable commitment amount must be at least ₦1,000.');
      return;
    }

    setIsUpgrading(true);
    setErrorMessage(null);

    try {
      const nowIso = new Date().toISOString();
      const userRef = doc(db, 'users', upgradeTargetUser.uid);

      await updateDoc(userRef, {
        isVipFarmer: true,
        vipLevel: upgradeVipLevel,
        refundableDepositNgn: parsedAmount,
        totalCommitmentPaidNgn: parsedAmount,
        freeDeliveryEligible: upgradeFreeDelivery,
        earlyBirdSpotSecured: true,
        vipSecuredAt: upgradeTargetUser.vipSecuredAt || nowIso,
        vipUpgradeNote: upgradeNote.trim(),
        adminUpgradedBy: 'admin',
        updatedAt: serverTimestamp(),
      });

      setSuccessMessage(`Successfully upgraded ${upgradeTargetUser.displayName || upgradeTargetUser.email} to VIP Gold Farmer with ₦${parsedAmount.toLocaleString()} refundable deposit!`);
      setTimeout(() => setSuccessMessage(null), 6000);
      setUpgradeTargetUser(null);
      if (selectedUser?.uid === upgradeTargetUser.uid) {
        setSelectedUser(null);
      }
    } catch (err: any) {
      console.error('Error upgrading user to VIP:', err);
      alert(`Failed to upgrade user: ${err.message || 'Please check admin permissions.'}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Submit Offline / Pre-Signup Payment Credit
  const handleConfirmOfflineCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineEmail.trim() || !db) return;

    const cleanEmail = offlineEmail.trim().toLowerCase();
    const parsedAmount = parseInt(offlineCustomAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      alert('The commitment amount must be at least ₦1,000.');
      return;
    }

    setIsSubmittingOffline(true);
    setErrorMessage(null);

    try {
      const nowIso = new Date().toISOString();

      // Check if user already registered with this email
      const matchedUser = users.find(u => (u.email || '').toLowerCase() === cleanEmail);

      if (matchedUser) {
        // Upgrade existing registered user immediately!
        const userRef = doc(db, 'users', matchedUser.uid);
        await updateDoc(userRef, {
          isVipFarmer: true,
          vipLevel: 'gold',
          refundableDepositNgn: parsedAmount,
          totalCommitmentPaidNgn: parsedAmount,
          freeDeliveryEligible: true,
          earlyBirdSpotSecured: true,
          vipSecuredAt: nowIso,
          vipUpgradeNote: `Pre-signup payment matched & applied: ${offlineNote || offlineRef || 'Verified offline transaction'}`,
          adminUpgradedBy: 'admin',
          updatedAt: serverTimestamp(),
        });

        // Also record in credits collection as claimed
        await addDoc(collection(db, 'soilwise_pending_vip_credits'), {
          email: cleanEmail,
          name: offlineName.trim() || matchedUser.displayName || null,
          phone: offlinePhone.trim() || matchedUser.phoneNumber || null,
          amountNgn: parsedAmount,
          reference: offlineRef.trim() || `OFFLINE-${Date.now().toString(36).toUpperCase()}`,
          note: offlineNote.trim(),
          status: 'claimed',
          claimedByUid: matchedUser.uid,
          claimedAt: nowIso,
          createdAt: nowIso,
          createdByAdmin: true
        });

        setSuccessMessage(`User "${matchedUser.displayName || cleanEmail}" is already registered and was upgraded immediately to VIP with ₦${parsedAmount.toLocaleString()} credit!`);
      } else {
        // Store in pending credits so it auto-applies when they sign up!
        await addDoc(collection(db, 'soilwise_pending_vip_credits'), {
          email: cleanEmail,
          name: offlineName.trim() || null,
          phone: offlinePhone.trim() || null,
          amountNgn: parsedAmount,
          reference: offlineRef.trim() || `OFFLINE-${Date.now().toString(36).toUpperCase()}`,
          note: offlineNote.trim(),
          status: 'pending',
          createdAt: nowIso,
          createdByAdmin: true
        });

        setSuccessMessage(`Offline payment of ₦${parsedAmount.toLocaleString()} credited for ${cleanEmail}. When this farmer signs up, their VIP status and free delivery badge will activate automatically!`);
      }

      setTimeout(() => setSuccessMessage(null), 7000);
      setIsOfflineCreditModalOpen(false);
      setOfflineEmail('');
      setOfflineName('');
      setOfflinePhone('');
      setOfflineRef('');
      setOfflineNote('');
      setOfflineAmountNgn(1000);
      setOfflineCustomAmount('1000');
    } catch (err: any) {
      console.error('Error saving offline credit:', err);
      alert(`Failed to save offline credit: ${err.message || 'Please try again.'}`);
    } finally {
      setIsSubmittingOffline(false);
    }
  };

  // Export Users CSV
  const handleExportCsv = () => {
    if (users.length === 0) return;

    const headers = [
      'UID',
      'Name',
      'Email',
      'Phone',
      'Role',
      'VIP Status',
      'VIP Level',
      'Commitment Paid (NGN)',
      'Free Delivery Eligible',
      'State',
      'LGA',
      'Primary Crop',
      'Farm Size (Ha)',
      'Account Status',
      'Created At'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = users.map((u) => {
      const isVip = Boolean(u.isVipFarmer || u.earlyBirdSpotSecured);
      return [
        escapeCsv(u.uid),
        escapeCsv(u.displayName || 'Unnamed Farmer'),
        escapeCsv(u.email || ''),
        escapeCsv(u.phoneNumber || u.profile?.phoneNumber || ''),
        escapeCsv(u.role || 'user'),
        escapeCsv(isVip ? 'VIP' : 'Standard'),
        escapeCsv(u.vipLevel || (isVip ? 'Gold' : 'None')),
        escapeCsv(isVip ? (u.totalCommitmentPaidNgn || u.refundableDepositNgn || 1000) : 0),
        escapeCsv(u.freeDeliveryEligible || isVip ? 'Yes' : 'No'),
        escapeCsv(u.state || u.profile?.state || ''),
        escapeCsv(u.lga || u.profile?.lga || ''),
        escapeCsv(u.primaryCrop || u.profile?.primaryCrop || ''),
        escapeCsv(u.farmSizeHectares || u.profile?.farmSizeHectares || ''),
        escapeCsv(u.accountStatus || 'active'),
        escapeCsv(u.createdAt ? new Date(u.createdAt).toISOString() : '')
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `soilwise_users_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1b4332]" />
            <span>User &amp; VIP Farmer Analysis Dashboard</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time telemetry on registered farmers, VIP commitments, and offline payment account upgrades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsOfflineCreditModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Credit Pre-Signup / Offline Payer</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={users.length === 0}
            className="px-4 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800">
          {errorMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Signup Users */}
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Signup Users</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1b4332] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono block">
              {isLoading ? '...' : analytics.totalCount}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              Registered farmer accounts
            </span>
          </div>
        </div>

        {/* KPI 2: VIP Users */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-yellow-50/70 rounded-3xl border border-amber-300/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-900">
            <span className="text-xs font-black uppercase tracking-wider">VIP Founding Farmers</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono block">
              {isLoading ? '...' : analytics.vipCount}
            </span>
            <span className="text-[11px] text-amber-800 font-semibold">
              {analytics.vipConversionRate}% Conversion Rate
            </span>
          </div>
        </div>

        {/* KPI 3: Total Commitment Revenue */}
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Refundable Commitments</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-[#1b4332] font-mono block">
              ₦{isLoading ? '...' : analytics.totalCommitmentRevenue.toLocaleString()}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              100% Secured in Escrow
            </span>
          </div>
        </div>

        {/* KPI 4: Pending Offline Credits / Free Delivery */}
        <div className="p-4 sm:p-5 bg-white rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Offline Credits</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl sm:text-3xl font-black text-purple-950 font-mono block">
              {analytics.pendingOfflineCreditsCount}
            </span>
            <span className="text-[11px] text-purple-800 font-semibold">
              ₦{analytics.pendingOfflineTotalNgn.toLocaleString()} awaiting signup
            </span>
          </div>
        </div>
      </div>

      {/* Top States Distribution Mini Cards */}
      {analytics.topStates.length > 0 && (
        <div className="p-4 sm:p-5 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>Top States by Farmer Enrollment</span>
            </span>
            <span className="text-[11px] text-stone-400 font-normal">Based on farmer profile data</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {analytics.topStates.map((st) => (
              <div key={st.name} className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 truncate">{st.name}</span>
                <span className="text-xs font-black text-[#1b4332] bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                  {st.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All Registered Farmers ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('offline_credits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'offline_credits'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pre-Signup &amp; Offline Credits ({pendingCredits.length})</span>
          {analytics.pendingOfflineCreditsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black">
              {analytics.pendingOfflineCreditsCount} pending
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL REGISTERED FARMERS                                             */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search farmers by name, email, phone, state, or UID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332] outline-none text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium outline-none cursor-pointer text-xs"
              >
                <option value="all">All Tiers ({users.length})</option>
                <option value="vip">VIP Farmers Only ({analytics.vipCount})</option>
                <option value="standard">Standard Free Tier ({analytics.totalCount - analytics.vipCount})</option>
                <option value="free_delivery">Free Delivery Eligible ({analytics.freeDeliveryCount})</option>
              </select>

              {/* State Filter */}
              {analytics.stateList.length > 0 && (
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-stone-200 bg-white font-medium outline-none cursor-pointer text-xs"
                >
                  <option value="all">All States</option>
                  {analytics.stateList.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                  Registered Farmers List
                </span>
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {filteredUsers.length} shown
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-xs text-stone-500 space-y-2">
                <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto" />
                <p>Loading farmer profiles from Firestore...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-stone-500 text-xs space-y-1">
                <p className="font-bold text-stone-700">No matching users found.</p>
                <p>Try clearing your search query or adjusting your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Farmer</th>
                      <th className="py-3 px-4">Tier &amp; Status</th>
                      <th className="py-3 px-4">Commitment</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Farm Info</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.map((user) => {
                      const isVip = Boolean(user.isVipFarmer || user.earlyBirdSpotSecured || user.vipLevel === 'gold');
                      const commitmentAmt = user.totalCommitmentPaidNgn || user.refundableDepositNgn || (isVip ? 1000 : 0);
                      const state = user.state || user.profile?.state || '—';
                      const lga = user.lga || user.profile?.lga || '';
                      const primaryCrop = user.primaryCrop || user.profile?.primaryCrop || '—';
                      const farmSize = user.farmSizeHectares || user.profile?.farmSizeHectares;

                      return (
                        <tr key={user.uid} className="hover:bg-stone-50/70 transition-colors">
                          {/* Farmer Identity */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-stone-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#1b4332] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'F'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-stone-900 block truncate">
                                  {user.displayName || 'Unnamed Farmer'}
                                </span>
                                <span className="text-[10px] text-stone-500 block truncate font-mono">
                                  {user.email || 'No email registered'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Tier & VIP Badge */}
                          <td className="py-3 px-4">
                            {isVip ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-amber-950 bg-amber-200 border border-amber-400">
                                <Crown className="w-3 h-3 text-amber-700 fill-amber-500" />
                                <span>VIP Gold</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200">
                                Standard Free
                              </span>
                            )}
                            {user.freeDeliveryEligible && (
                              <span className="ml-1 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Free Delivery
                              </span>
                            )}
                          </td>

                          {/* Commitment Amount */}
                          <td className="py-3 px-4 font-mono font-bold">
                            {isVip ? (
                              <span className="text-emerald-700 font-extrabold">
                                ₦{commitmentAmt.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-stone-400 font-normal">₦0</span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-3 px-4 text-stone-600">
                            <span className="font-semibold text-stone-800 block truncate">{state}</span>
                            {lga && <span className="text-[10px] text-stone-400 block truncate">{lga}</span>}
                          </td>

                          {/* Farm Info */}
                          <td className="py-3 px-4 text-stone-600">
                            <span className="font-medium text-stone-900 block truncate">{primaryCrop}</span>
                            {farmSize && <span className="text-[10px] text-stone-400 block">{farmSize} Hectares</span>}
                          </td>

                          {/* Joined Date */}
                          <td className="py-3 px-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                            {user.createdAt 
                              ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenUpgradeModal(user)}
                                className={`px-2.5 py-1 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] ${
                                  isVip
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                }`}
                              >
                                <Crown className="w-3 h-3" />
                                <span>{isVip ? 'Edit VIP' : 'Upgrade to VIP'}</span>
                              </button>

                              <button
                                onClick={() => setSelectedUser(user)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                              >
                                <Eye className="w-3 h-3 text-stone-500" />
                                <span>View</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRE-SIGNUP & OFFLINE CREDITS LIST                                  */}
      {/* ========================================================================= */}
      {activeTab === 'offline_credits' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl flex items-start justify-between gap-4">
            <div className="space-y-1 text-xs text-amber-950">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Pre-Signup &amp; Offline Payment Matching</span>
              </div>
              <p className="text-amber-900 leading-relaxed max-w-2xl">
                When farmers pay via external Paystack links or bank transfer before creating their SoilWise account, register their credit here. As soon as the user registers with that matching email address, their account will automatically be upgraded to VIP Gold with the full refundable amount!
              </p>
            </div>

            <button
              onClick={() => setIsOfflineCreditModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shrink-0 cursor-pointer shadow-xs"
            >
              + Add Offline Payer
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-stone-800">
                Offline Payer Ledger ({pendingCredits.length})
              </span>
            </div>

            {pendingCredits.length === 0 ? (
              <div className="py-16 text-center text-stone-500 text-xs space-y-2">
                <p className="font-bold text-stone-700">No offline payments recorded yet.</p>
                <p>Click "Credit Pre-Signup / Offline Payer" above to add farmers who paid before creating an account.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50/80 text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Payer Email / Contact</th>
                      <th className="py-3 px-4">Refundable Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Payment Reference</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pendingCredits.map((credit) => (
                      <tr key={credit.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-900 block">{credit.name || 'Anonymous Payer'}</span>
                          <span className="text-[10px] text-stone-500 font-mono block">{credit.email}</span>
                          {credit.phone && <span className="text-[10px] text-stone-400 block">{credit.phone}</span>}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">
                          ₦{(credit.amountNgn || 1000).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          {credit.status === 'claimed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Claimed by User</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Signup</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-stone-600">
                          {credit.reference || '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px] font-mono">
                          {credit.createdAt ? new Date(credit.createdAt).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-500 text-[11px] max-w-xs truncate">
                          {credit.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPGRADE REGISTERED USER ACCOUNT TO VIP                           */}
      {/* ========================================================================= */}
      {upgradeTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-xs">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Upgrade Farmer Account to VIP
                  </h3>
                  <p className="text-xs text-stone-500">
                    Assign VIP tier and record refundable commitment amount paid.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUpgradeTargetUser(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUpgrade} className="space-y-4 text-xs">
              {/* Target User Info */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-900 block">
                    {upgradeTargetUser.displayName || 'Unnamed Farmer'}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    {upgradeTargetUser.email || upgradeTargetUser.phoneNumber || upgradeTargetUser.uid}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-stone-500 bg-white px-2.5 py-1 rounded-md border border-stone-200">
                  UID: {upgradeTargetUser.uid.slice(0, 8)}...
                </span>
              </div>

              {/* Refundable Commitment Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                    Refundable Commitment Amount Paid (₦)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    100% Refundable
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => {
                        setUpgradeAmountNgn(amt);
                        setUpgradeCustomAmount(amt.toString());
                      }}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        upgradeCustomAmount === amt.toString()
                          ? 'bg-amber-500 text-stone-950 border-amber-600'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">₦</span>
                  <input
                    type="number"
                    min="1000"
                    step="100"
                    value={upgradeCustomAmount}
                    onChange={(e) => setUpgradeCustomAmount(e.target.value)}
                    placeholder="Enter amount paid"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none font-bold text-xs"
                    required
                  />
                </div>
              </div>

              {/* VIP Tier Level */}
              <div>
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                  VIP Tier Assignment
                </label>
                <select
                  value={upgradeVipLevel}
                  onChange={(e) => setUpgradeVipLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none bg-white font-medium cursor-pointer"
                >
                  <option value="gold">VIP Gold Farmer (Standard 35% discount &amp; free delivery)</option>
                  <option value="diamond">VIP Diamond Farmer (Early-Bird Priority Partner)</option>
                </select>
              </div>

              {/* Free Delivery Toggle */}
              <label className="flex items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upgradeFreeDelivery}
                  onChange={(e) => setUpgradeFreeDelivery(e.target.checked)}
                  className="w-4 h-4 text-[#1b4332] rounded border-stone-300 cursor-pointer"
                />
                <span className="font-semibold text-stone-800">
                  Grant 100% Free Nationwide Farm Delivery Voucher
                </span>
              </label>

              {/* Upgrade Note / Receipt Reference */}
              <div>
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                  Payment Reference / Admin Narration
                </label>
                <input
                  type="text"
                  value={upgradeNote}
                  onChange={(e) => setUpgradeNote(e.target.value)}
                  placeholder="e.g. Paid ₦1,000 via Paystack ref SW-PAY-9872 before signup"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUpgradeTargetUser(null)}
                  disabled={isUpgrading}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUpgrading}
                  className="px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#143225] text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isUpgrading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Upgrading...</span>
                    </>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      <span>Confirm VIP Upgrade</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREDIT PRE-SIGNUP / OFFLINE PAYER                                */}
      {/* ========================================================================= */}
      {isOfflineCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center font-black shadow-xs">
                  <UserPlus className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Credit Pre-Signup / Offline Payment
                  </h3>
                  <p className="text-xs text-stone-500">
                    For farmers who paid their commitment before registering an account.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOfflineCreditModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOfflineCredit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-[11px] leading-relaxed">
                If the farmer with this email is already registered, their account will be upgraded immediately. If they have not yet signed up, SoilWise will auto-credit their VIP status when they create an account.
              </div>

              <div>
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                  Farmer Email (Required for Account Matching) *
                </label>
                <input
                  type="email"
                  required
                  value={offlineEmail}
                  onChange={(e) => setOfflineEmail(e.target.value)}
                  placeholder="e.g. farmer@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                    Farmer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    placeholder="e.g. Musa Danladi"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                    Farmer Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={offlinePhone}
                    onChange={(e) => setOfflinePhone(e.target.value)}
                    placeholder="e.g. 0803 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                  Refundable Amount Paid (Min. ₦1,000) *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => {
                        setOfflineAmountNgn(amt);
                        setOfflineCustomAmount(amt.toString());
                      }}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                        offlineCustomAmount === amt.toString()
                          ? 'bg-amber-500 text-stone-950 border-amber-600'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      ₦{amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-xs">₦</span>
                  <input
                    type="number"
                    min="1000"
                    step="100"
                    value={offlineCustomAmount}
                    onChange={(e) => setOfflineCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none font-bold text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                    Paystack Ref / Bank Slip
                  </label>
                  <input
                    type="text"
                    value={offlineRef}
                    onChange={(e) => setOfflineRef(e.target.value)}
                    placeholder="e.g. T123456789 or TX-OFFLINE"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={offlineNote}
                    onChange={(e) => setOfflineNote(e.target.value)}
                    placeholder="e.g. Paid in Kaduna coop office"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOfflineCreditModalOpen(false)}
                  disabled={isSubmittingOffline}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingOffline}
                  className="px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#143225] text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingOffline ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Credit...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Save &amp; Credit Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW USER RECORD DETAIL                                          */}
      {/* ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover border border-emerald-700/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center font-black text-lg">
                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : 'F'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-stone-900">
                      {selectedUser.displayName || 'Unnamed Farmer'}
                    </h3>
                    {Boolean(selectedUser.isVipFarmer || selectedUser.earlyBirdSpotSecured) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-amber-950 bg-amber-200 border border-amber-400">
                        <Crown className="w-3 h-3 text-amber-700 fill-amber-500" />
                        <span>VIP Gold</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-500 font-mono">{selectedUser.email}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Fields Breakdown */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Phone Number</span>
                <span className="font-semibold text-stone-800 block">{selectedUser.phoneNumber || selectedUser.profile?.phoneNumber || 'Not provided'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Account Role</span>
                <span className="font-semibold text-stone-800 capitalize block">{selectedUser.role || 'user'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">State &amp; LGA</span>
                <span className="font-semibold text-stone-800 block">
                  {selectedUser.state || selectedUser.profile?.state || '—'}, {selectedUser.lga || selectedUser.profile?.lga || ''}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Primary Crop</span>
                <span className="font-semibold text-stone-800 block">{selectedUser.primaryCrop || selectedUser.profile?.primaryCrop || 'Not specified'}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Farm Acreage</span>
                <span className="font-semibold text-stone-800 block">
                  {selectedUser.farmSizeHectares || selectedUser.profile?.farmSizeHectares ? `${selectedUser.farmSizeHectares || selectedUser.profile?.farmSizeHectares} Ha` : 'Not recorded'}
                </span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Commitment Deposit</span>
                <span className="font-black text-emerald-700 block font-mono">
                  ₦{(selectedUser.totalCommitmentPaidNgn || selectedUser.refundableDepositNgn || (selectedUser.isVipFarmer ? 1000 : 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* VIP Upgrade Note if present */}
            {selectedUser.vipUpgradeNote && (
              <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Admin / Payment Note</span>
                <span className="text-amber-950 font-medium block">{selectedUser.vipUpgradeNote}</span>
              </div>
            )}

            {/* UID and Identifiers */}
            <div className="p-3 bg-stone-50 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between text-stone-400 font-bold text-[10px] uppercase">
                <span>Firebase Auth UID</span>
                <button
                  onClick={() => copyToClipboard(selectedUser.uid, 'uid')}
                  className="flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold cursor-pointer"
                >
                  {copiedId === 'uid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'uid' ? 'Copied' : 'Copy UID'}</span>
                </button>
              </div>
              <span className="font-mono text-[11px] text-stone-700 block truncate">{selectedUser.uid}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const target = selectedUser;
                  setSelectedUser(null);
                  handleOpenUpgradeModal(target);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>{selectedUser.isVipFarmer ? 'Adjust VIP Commitment' : 'Upgrade this Farmer to VIP'}</span>
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
