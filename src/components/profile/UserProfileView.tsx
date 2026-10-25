import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Sprout,
  Compass,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  Award,
  ChevronRight,
  Info,
  Archive,
  MapPin,
  Crown,
  Truck,
  ShoppingBag,
  Clock,
  Package,
  Coins,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { calculateProfileCompletion } from '../../services/farmService';
import { fetchUserSeedOrders } from '../../services/marketplaceService';
import { SeedOrder } from '../../types/marketplace';
import { UpdateProfileInput } from '../../types/auth';

interface UserProfileViewProps {
  onNavigateToFarms: () => void;
  onNavigateToHistory: () => void;
  onNavigateToAnalysis: () => void;
  onOpenCommitmentModal?: () => void;
  onNavigateToMarketplace?: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ha', label: 'Hausa', native: 'Harshen Hausa' },
  { code: 'yo', label: 'Yoruba', native: 'Èdè Yorùbá' },
  { code: 'ig', label: 'Igbo', native: 'Asụsụ Igbo' },
];

const FARMING_EXPERIENCE_LEVELS = [
  { value: 'new', label: 'New to farming', description: 'Starting out or planning first planting season' },
  { value: 'some_experience', label: 'Some experience', description: '1–4 seasons of practical field farming' },
  { value: 'experienced', label: 'Experienced', description: '5+ years managing smallholder crops and soil' },
  { value: 'commercial', label: 'Professional / Commercial', description: 'Commercial enterprise, estate or contract farming' },
];

const FARMING_INTERESTS_OPTIONS = [
  'Crop production',
  'Soil health & fertility',
  'Climate-smart agriculture',
  'Irrigation & water harvesting',
  'Livestock integration',
  'Agro-processing & storage',
  'Organic farming',
];

const PREFERRED_CROPS_OPTIONS = [
  'Maize',
  'Sorghum',
  'Cowpea',
  'Groundnut',
  'Soybean',
  'Rice',
  'Cassava',
  'Millet',
  'Sunflower',
  'Sweet Sorghum',
];

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onNavigateToFarms,
  onNavigateToHistory,
  onNavigateToAnalysis,
  onOpenCommitmentModal,
  onNavigateToMarketplace,
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();

  const [displayName, setDisplayName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [state, setState] = useState<string>('Kaduna');
  const [lga, setLga] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [farmSizeHectares, setFarmSizeHectares] = useState<string>('');
  const [primaryCrop, setPrimaryCrop] = useState<string>('');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('en');
  const [farmingExperience, setFarmingExperience] = useState<string>('');
  const [primaryInterest, setPrimaryInterest] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [preferredCrops, setPreferredCrops] = useState<string[]>([]);

  // Seed orders / IAR Pre-orders state
  const [userOrders, setUserOrders] = useState<SeedOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load user seed orders and pre-orders
  useEffect(() => {
    let isMounted = true;
    const loadOrders = async () => {
      if (currentUser?.uid) {
        try {
          setIsLoadingOrders(true);
          const orders = await fetchUserSeedOrders(currentUser.uid);
          if (isMounted) setUserOrders(orders);
        } catch (e) {
          console.warn('Failed to load user seed orders:', e);
        } finally {
          if (isMounted) setIsLoadingOrders(false);
        }
      } else {
        setIsLoadingOrders(false);
      }
    };
    loadOrders();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Initialize form state from loaded profile
  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || currentUser?.displayName || '');
      setPhoneNumber(userProfile.phoneNumber || userProfile.profile?.phoneNumber || '');
      setState(userProfile.state || userProfile.profile?.state || 'Kaduna');
      setLga(userProfile.lga || userProfile.profile?.lga || '');
      setBio(userProfile.bio || userProfile.profile?.bio || '');
      setFarmSizeHectares(
        userProfile.farmSizeHectares !== undefined && userProfile.farmSizeHectares !== null
          ? String(userProfile.farmSizeHectares)
          : (userProfile.profile?.farmSizeHectares ? String(userProfile.profile.farmSizeHectares) : '')
      );
      setPrimaryCrop(userProfile.primaryCrop || userProfile.profile?.primaryCrop || '');

      const prefs = userProfile.profile;
      if (prefs) {
        setPreferredLanguage(prefs.preferredLanguage || 'en');
        setFarmingExperience(prefs.farmingExperience || '');
        setPrimaryInterest(prefs.primaryFarmingInterest || '');
        setSelectedInterests(prefs.farmingInterests || (prefs.primaryFarmingInterest ? [prefs.primaryFarmingInterest] : []));
        setPreferredCrops(prefs.preferredCrops || []);
      }
    }
  }, [userProfile, currentUser]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleCrop = (crop: string) => {
    setPreferredCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    setFeedbackMessage(null);

    const parsedHectares = farmSizeHectares.trim() ? parseFloat(farmSizeHectares.trim()) : undefined;

    const input: UpdateProfileInput = {
      displayName: displayName.trim(),
      phoneNumber: phoneNumber.trim(),
      state: state.trim(),
      lga: lga.trim(),
      bio: bio.trim(),
      farmSizeHectares: !isNaN(parsedHectares as number) ? parsedHectares : undefined,
      primaryCrop: primaryCrop.trim(),
      preferredLanguage,
      farmingExperience,
      primaryFarmingInterest: primaryInterest || (selectedInterests.length > 0 ? selectedInterests[0] : ''),
      farmingInterests: selectedInterests,
      preferredCrops,
    };

    try {
      await updateUserProfile(input);
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setFeedbackMessage({
        type: 'success',
        text: isOnline
          ? 'Your profile and agricultural preferences have been successfully updated in the database.'
          : 'Profile saved locally! Background sync will update your cloud database once connectivity is restored.',
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completion = calculateProfileCompletion(userProfile);
  const email = userProfile?.email || currentUser?.email || 'N/A';
  const uid = userProfile?.uid || currentUser?.uid || 'N/A';
  const role = userProfile?.role || 'user';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 border-b border-stone-200/80 pb-4">
        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
          <button
            onClick={onNavigateToAnalysis}
            className="hover:text-[#1b4332] transition-colors cursor-pointer"
          >
            SoilWise
          </button>
          <span>/</span>
          <span className="text-stone-900 font-bold">My Profile</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToFarms}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-700" />
            <span>My Farms</span>
          </button>
          <button
            onClick={onNavigateToHistory}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-emerald-700" />
            <span>My Analyses</span>
          </button>
        </div>
      </div>

      {/* Header Profile Identity Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName || 'User'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#1b4332]/20 shadow-xs"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-2xl shadow-xs">
              {(displayName || email).charAt(0).toUpperCase()}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                {displayName || 'SoilWise Farmer'}
              </h1>
              {userProfile?.isVipFarmer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-900 border border-amber-500 shadow-2xs">
                  <Crown className="w-3 h-3 text-stone-950" />
                  <span>VIP Gold Farmer</span>
                </span>
              )}
              {userProfile?.freeDeliveryEligible && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Truck className="w-3 h-3 text-emerald-700" />
                  <span>Free Farm Delivery</span>
                </span>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  role === 'admin'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                }`}
              >
                {role === 'admin' ? 'Administrator' : 'Farmer Account'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-stone-400" />
              <span>{email}</span>
            </p>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70 space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700">Profile Completion</span>
            <span className="font-bold text-[#1b4332]">{completion.percentage}%</span>
          </div>
          <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#1b4332] h-full transition-all duration-500"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-500 block">
            {completion.status === 'complete'
              ? 'Profile fully populated'
              : 'Add optional preferences at your own pace'}
          </span>
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
                Deposit <strong>₦1,000</strong> to unlock <strong>35% off your first certified seed order</strong> and <strong>100% free nationwide farm delivery</strong>.
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

      {/* SECTION: Certified Seed Orders & IAR Pre-Orders */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">
                  My Certified Seed Orders &amp; Pre-Orders
                </h2>
                {userOrders.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {userOrders.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Track your seed reservations, IAR official price releases, and guaranteed balance refunds.
              </p>
            </div>
          </div>

          {onNavigateToMarketplace && (
            <button
              type="button"
              onClick={onNavigateToMarketplace}
              className="px-4 py-2 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Sprout className="w-3.5 h-3.5" />
              <span>Pre-Order Seeds</span>
            </button>
          )}
        </div>

        {isLoadingOrders ? (
          <div className="py-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Loading your seed orders &amp; pre-orders...</span>
          </div>
        ) : userOrders.length > 0 ? (
          <div className="space-y-4">
            {userOrders.map((order) => {
              const isPreorder = order.isPreOrder || order.status === 'preorder_awaiting_price';
              const depositPaid = order.depositAmountNgn || order.totalPrice;

              return (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl border border-stone-200/90 bg-[#fcfcfb] space-y-3.5 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1b4332] bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {order.orderNumber}
                      </span>

                      {/* Official Pre-Order / Price Release Status Badge */}
                      {isPreorder ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-800" />
                          <span>Pre-Order &bull; Awaiting Official Price</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 capitalize">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{order.status.replace('_', ' ')}</span>
                        </span>
                      )}

                      {order.freeDeliveryApplied && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Truck className="w-3 h-3 text-emerald-700" />
                          <span>Free Farm Delivery</span>
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 uppercase">
                        {order.paymentStatus === 'paid' ? 'Deposit Paid via Paystack' : 'Pay on Delivery'}
                      </span>
                    </div>

                    <span className="text-[11px] text-stone-400">
                      Booked on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Seed Variety & Quantity */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-stone-200/80 text-xs">
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-bold block">Variety</span>
                      <span className="font-extrabold text-stone-900">{order.seedName}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-bold block">Reserved Quantity</span>
                      <span className="font-black text-stone-900 font-mono text-sm">{order.quantityKg} kg</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-bold block">Deposit Paid</span>
                      <span className="font-black text-emerald-700 font-mono text-sm">
                        ₦{depositPaid.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[10px] uppercase font-bold block">Delivery Location</span>
                      <span className="font-semibold text-stone-800 truncate block">
                        {order.lga}, {order.state}
                      </span>
                    </div>
                  </div>

                  {/* Definitive SoilWise AI Refund Guarantee Notice */}
                  {isPreorder && (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50/90 to-amber-50/90 rounded-xl border border-emerald-300 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <strong className="text-emerald-950 font-bold text-xs">
                          Awaiting Official Price (IAR Partnership) &bull; Definite Refund Guarantee
                        </strong>
                      </div>
                      <p className="text-stone-700 leading-relaxed text-[11px]">
                        As we await official partnership and price release from the <strong>Institute for Agricultural Research (IAR), Samaru / ABU Zaria</strong>, your seed pre-order has been registered with your deposit of <strong>₦{depositPaid.toLocaleString()}</strong>.
                      </p>
                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-200 text-emerald-950 text-[11px] font-semibold leading-relaxed">
                        When the official price is released by IAR, your deposited funds will be aggregated against the actual price of your <strong>{order.quantityKg} kg</strong> order. <strong>If there is an excess balance, SoilWise AI will definitely refund the balance</strong> to you. Any remaining balance due will be settled prior to or upon farm delivery.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Pre-Orders State with Informative IAR Banner */
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
                  <Clock className="w-3 h-3 text-amber-800" />
                  <span>IAR Partnership Pre-Order Season Active</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">
                  You haven't placed any certified seed pre-orders yet
                </h3>
                <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                  Every order is currently placed as a pre-order awaiting official IAR seasonal prices. You can order <strong>any kilogram quantity</strong> of certified seeds with <strong>any deposit of your choice (minimum ₦1,000)</strong>. SoilWise AI guarantees that once prices are released, any excess balance will definitely be refunded to you.
                </p>
              </div>

              {onNavigateToMarketplace && (
                <button
                  type="button"
                  onClick={onNavigateToMarketplace}
                  className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer self-center sm:self-auto"
                >
                  <Sprout className="w-4 h-4 text-emerald-300" />
                  <span>Browse Seeds to Pre-Order</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#1b4332]" />
              <span>Personal Identity</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Your name and primary identity across SoilWise services.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Full / Preferred Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Ibrahim Abubakar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Email Address (Account ID)
              </label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 text-xs sm:text-sm cursor-not-allowed select-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Mobile Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0803 123 4567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Primary Agricultural State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all bg-white"
              >
                {[
                  'Kaduna', 'Kano', 'Katsina', 'Niger', 'Kebbi', 'Sokoto', 'Zamfara', 
                  'Jigawa', 'Borno', 'Yobe', 'Gombe', 'Bauchi', 'Adamawa', 'Taraba', 
                  'Plateau', 'Benue', 'Nasarawa', 'Kogi', 'Kwara', 'Oyo', 'Ogun', 'Ondo', 'Osun', 'Ekiti', 'Edo', 'Abia', 'Enugu', 'Anambra', 'Ebonyi', 'Imo', 'Delta', 'Rivers', 'Cross River', 'Akwa Ibom', 'Bayelsa', 'FCT Abuja'
                ].map(st => (
                  <option key={st} value={st}>{st} State</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Local Government Area (LGA) or Town
              </label>
              <input
                type="text"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder="e.g. Zaria, Giwa, Bichi, Makarfi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Estimated Farm Land Size (Hectares)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={farmSizeHectares}
                onChange={(e) => setFarmSizeHectares(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Primary Cultivated Crop
              </label>
              <input
                type="text"
                value={primaryCrop}
                onChange={(e) => setPrimaryCrop(e.target.value)}
                placeholder="e.g. Maize (SAMMAZ), Soybean, Sorghum"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                Agricultural Bio / Farm Description <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly describe your farming operations, soil management practices, or cooperative affiliation..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Personalisation & Communication Preferences */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1b4332]" />
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Personalisation & Preferences
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              These preferences establish your context for personalized assistance. They are strictly separate from scientific farm evidence.
            </p>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-800">
              Preferred Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => setPreferredLanguage(lang.code)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    preferredLanguage === lang.code
                      ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                  }`}
                >
                  <span className="block text-xs font-bold">{lang.label}</span>
                  <span
                    className={`block text-[10px] mt-0.5 ${
                      preferredLanguage === lang.code ? 'text-emerald-200' : 'text-stone-500'
                    }`}
                  >
                    {lang.native}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Farming Experience Level */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-stone-800">
              Farming Experience Level <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FARMING_EXPERIENCE_LEVELS.map((lvl) => (
                <button
                  type="button"
                  key={lvl.value}
                  onClick={() => setFarmingExperience(lvl.value)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    farmingExperience === lvl.value
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{lvl.label}</span>
                    {farmingExperience === lvl.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-snug">{lvl.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Farming Interests */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-stone-800">
              Primary Farming Interests <span className="text-stone-400 font-normal">(Select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {FARMING_INTERESTS_OPTIONS.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b4332] text-white border-[#1b4332]'
                        : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Crops */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-800">
                Preferred Crops to Cultivate <span className="text-stone-400 font-normal">(Optional interest list)</span>
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
                {preferredCrops.length} selected
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Indicates what crops you are personally interested in growing. The SoilWise deterministic recommendation engine evaluates farm suitability strictly against physical soil evidence and climate data.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {PREFERRED_CROPS_OPTIONS.map((crop) => {
                const isSelected = preferredCrops.includes(crop);
                return (
                  <button
                    type="button"
                    key={crop}
                    onClick={() => toggleCrop(crop)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                        : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    <Sprout className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-stone-400'}`} />
                    <span>{crop}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agronomic Boundary Disclaimer Card (Section 7 & Section 29) */}
        <div className="p-4 sm:p-5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Agronomic Boundary: Preferences vs. Scientific Farm Evidence</span>
          </div>
          <p className="text-stone-600 leading-relaxed text-[11px]">
            In SoilWise AI, personal crop preferences represent farmer curiosity or market intent.
            Farm cultivar recommendations are deterministically computed based on verified location agro-ecology, laboratory soil data, and seasonal rainfall duration.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-[#1b4332] hover:bg-[#143225] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
