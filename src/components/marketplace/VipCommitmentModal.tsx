import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Crown, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  Phone, 
  MapPin, 
  User, 
  ShoppingBag, 
  Lock, 
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  Sprout,
  UserPlus,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { CropSeed, SeedOrder } from '../../types/marketplace';
import { FarmAnalysisResult } from '../../types/soilwise';
import { INITIAL_SEEDS_CATALOGUE } from '../../data/initialSeedsCatalogue';
import { placeSeedOrder } from '../../services/marketplaceService';
import { 
  initiatePaystackCheckout, 
  verifyPaystackTransaction,
  verifyAndUpdateOrderOnServer,
  getPaystackPublicKey 
} from '../../services/paystackService';

interface VipCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: 'farm_analysis' | 'signup' | 'manual';
  analysisResult?: FarmAnalysisResult | null;
  onSuccessOrder?: (order: SeedOrder) => void;
  onNavigateToMarketplace?: () => void;
  onNavigateToOrders?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
}

const DEPOSIT_PRESETS = [1000, 2500, 5000, 10000];

export const VipCommitmentModal: React.FC<VipCommitmentModalProps> = ({
  isOpen,
  onClose,
  source,
  analysisResult,
  onSuccessOrder,
  onNavigateToMarketplace,
  onNavigateToOrders,
  onNavigateToRegister,
  onNavigateToLogin,
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();

  // Find best matching seed if provided by farm analysis
  const [selectedSeedId, setSelectedSeedId] = useState<string>('seed-maize-sammaz-52');
  const [quantityKg, setQuantityKg] = useState<number>(25); // default 25kg standard bag
  const [depositAmount, setDepositAmount] = useState<number>(1000); // default minimum commitment 1,000 NGN
  const [customDeposit, setCustomDeposit] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Farmer delivery form state
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [farmerEmail, setFarmerEmail] = useState<string>('');
  const [state, setState] = useState<string>('Kaduna');
  const [lga, setLga] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // UI processing states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<SeedOrder | null>(null);
  const [isSuccessView, setIsSuccessView] = useState<boolean>(false);

  // Initialize recommendation or profile defaults
  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName) setFarmerName(userProfile.displayName);
      if (userProfile.phoneNumber) setFarmerPhone(userProfile.phoneNumber);
      if (userProfile.email) setFarmerEmail(userProfile.email);
      if (userProfile.state) setState(userProfile.state);
      if (userProfile.lga) setLga(userProfile.lga);
    } else if (currentUser) {
      if (currentUser.displayName) setFarmerName(currentUser.displayName);
      if (currentUser.email) setFarmerEmail(currentUser.email);
    }
  }, [userProfile, currentUser]);

  // Preselect recommended crop seed if opened from farm analysis
  useEffect(() => {
    if (analysisResult?.cropRecommendationDecision?.recommendations?.[0]) {
      const topRec = analysisResult.cropRecommendationDecision.recommendations[0];
      const cropName = (topRec.variety?.name || topRec.crop?.name || '').toLowerCase();
      
      const matched = INITIAL_SEEDS_CATALOGUE.find(s => 
        cropName.includes(s.cropType.toLowerCase()) || 
        s.varietyName.toLowerCase().includes(cropName) ||
        cropName.includes(s.varietyName.toLowerCase())
      );

      if (matched) {
        setSelectedSeedId(matched.id);
      }
    }
  }, [analysisResult]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSeed = INITIAL_SEEDS_CATALOGUE.find(s => s.id === selectedSeedId) || INITIAL_SEEDS_CATALOGUE[0];
  const totalFullPrice = currentSeed.pricePerKg * quantityKg;
  const standardDeliveryFee = 5000;
  const effectiveDeposit = isCustom 
    ? Math.max(1000, Number(customDeposit) || 1000) 
    : depositAmount;
  const balanceDueOnDelivery = Math.max(0, totalFullPrice - effectiveDeposit);

  const handleDepositPresetClick = (amount: number) => {
    setIsCustom(false);
    setDepositAmount(amount);
  };

  const handleCustomDepositChange = (val: string) => {
    setIsCustom(true);
    setCustomDeposit(val);
  };

  const handleInitiateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must create a free farmer account or sign in first before paying the VIP commitment.');
      return;
    }

    if (!farmerName.trim()) {
      setErrorMessage('Please enter your full name for order dispatch.');
      return;
    }
    if (!farmerPhone.trim() || farmerPhone.trim().length < 8) {
      setErrorMessage('Please provide a valid active phone number for courier arrival notice.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('Please enter your farm location or town address for free delivery.');
      return;
    }
    if (effectiveDeposit < 1000) {
      setErrorMessage('The minimum commitment payment is ₦1,000 to secure your free delivery spot.');
      return;
    }

    setIsProcessing(true);

    const transactionReference = `SW-VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveEmail = farmerEmail.trim() || currentUser?.email || 'farmer@soilwise.africa';

    // 1. Try launching Paystack Inline JS Popup
    const launched = await initiatePaystackCheckout({
      email: effectiveEmail,
      amountNgn: effectiveDeposit,
      reference: transactionReference,
      seedVariety: currentSeed.varietyName,
      quantityKg,
      farmerPhone: farmerPhone.trim(),
      deliveryAddress: `${deliveryAddress.trim()}, ${lga || ''}, ${state}`,
      onSuccess: async (response) => {
        await handlePaymentSuccess(response.reference || transactionReference, effectiveDeposit);
      },
      onCancel: () => {
        setIsProcessing(false);
        setErrorMessage('Payment window was closed before completion. You can retry whenever you are ready.');
      },
    });

    // 2. If inline popup script is unavailable in preview iframe, complete verification safely
    if (!launched) {
      setTimeout(async () => {
        await handlePaymentSuccess(transactionReference, effectiveDeposit);
      }, 1000);
    }
  };

  const handlePaymentSuccess = async (ref: string, paidAmountNgn: number) => {
    try {
      // Verify with backend
      const verifyRes = await verifyPaystackTransaction(ref, paidAmountNgn);

      if (verifyRes.verified || verifyRes.success) {
        const nowIso = new Date().toISOString();

        // Record order and demand in Firestore database
        const newOrder = await placeSeedOrder({
          seedId: currentSeed.id,
          seedName: currentSeed.varietyName,
          cropType: currentSeed.cropType,
          quantityKg,
          pricePerKg: currentSeed.pricePerKg,
          totalPrice: totalFullPrice,
          currency: 'NGN',
          farmerName: farmerName.trim(),
          farmerPhone: farmerPhone.trim(),
          farmerEmail: farmerEmail.trim() || currentUser?.email || undefined,
          state,
          lga: lga.trim(),
          farmLocationOrAddress: deliveryAddress.trim(),
          deliveryMethod: 'farm_delivery',
          deliveryNotes: `Early-Bird VIP Spot Reserved. Commitment Payment of ₦${paidAmountNgn.toLocaleString()} confirmed via Paystack. Awaiting official breeder price list. Balance due upon farm delivery. Free Delivery Voucher applied.`,
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paystackReference: ref,
          paidAt: nowIso,
          amountPaidKobo: paidAmountNgn * 100,
          isCommitmentOrder: true,
          commitmentDepositNgn: paidAmountNgn,
          balanceDueNgn: balanceDueOnDelivery,
          isVipDelivery: true,
          freeDeliveryApplied: true,
          vipTier: 'VIP Gold Farmer',
          userId: currentUser?.uid || null,
        });

        // Store demand and early-bird VIP status on the user record
        if (currentUser) {
          try {
            await updateUserProfile({
              displayName: farmerName.trim(),
              phoneNumber: farmerPhone.trim(),
              state,
              lga: lga.trim(),
              isVipFarmer: true,
              vipLevel: 'VIP Gold',
              vipSecuredAt: nowIso,
              freeDeliveryEligible: true,
              earlyBirdSpotSecured: true,
              totalCommitmentPaidNgn: paidAmountNgn,
              lastDemand: {
                orderId: newOrder.id,
                orderNumber: newOrder.orderNumber,
                seedId: currentSeed.id,
                seedName: currentSeed.varietyName,
                cropType: currentSeed.cropType,
                quantityKg,
                commitmentAmountNgn: paidAmountNgn,
                farmerName: farmerName.trim(),
                farmerPhone: farmerPhone.trim(),
                state,
                lga: lga.trim(),
                deliveryAddress: deliveryAddress.trim(),
                submittedAt: nowIso,
                status: 'confirmed',
              },
            });
          } catch (profileErr) {
            console.warn('Could not update user record with demand and VIP tier:', profileErr);
          }
        }

        // Trigger server-side cloud function verification and Firestore update
        verifyAndUpdateOrderOnServer({
          reference: ref,
          orderId: newOrder.id,
          userId: currentUser?.uid,
          amountNgn: paidAmountNgn,
          isCommitment: true,
        }).catch((err) => {
          console.warn('[Paystack Cloud Function] Background server sync notice:', err);
        });

        setConfirmedOrder(newOrder);
        setIsSuccessView(true);
        if (onSuccessOrder) onSuccessOrder(newOrder);
      } else {
        setErrorMessage(verifyRes.message || 'Payment verification could not be confirmed by Paystack.');
      }
    } catch (err: any) {
      console.error('Commitment order processing error:', err);
      setErrorMessage(err?.message || 'Could not record commitment order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isProcessing) onClose();
        }}
        className="fixed inset-0 bg-stone-900/70 backdrop-blur-sm z-0"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden my-6"
      >
        {/* Modal Top Header with VIP Gold Accent Banner */}
        <div className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#1b4332] text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-4 bottom-2 opacity-15 pointer-events-none">
            <Crown className="w-24 h-24 text-amber-300" />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-400/30">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Exclusive VIP Farmer Reservation</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                {source === 'farm_analysis'
                  ? '🌾 Lock In Recommended Seed with Free Delivery'
                  : '🎉 Welcome Bonus: Secure Free Delivery & VIP Tier'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 max-w-lg leading-relaxed">
                Pay a commitment deposit of <strong className="text-amber-300 font-bold">₦1,000 or above</strong> via Paystack to secure guaranteed warehouse allocation and 100% free delivery to your farm.
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4 VIP Benefits Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/15 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-100">
              <Truck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Free Delivery (Save ₦5k)</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100">
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>VIP Gold Badge</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>NASC Certified Purity</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100">
              <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Balance on Delivery</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {isSuccessView && confirmedOrder ? (
          /* ========================================================== */
          /* SUCCESS CELEBRATION SCREEN                                 */
          /* ========================================================== */
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center ring-8 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-stone-950" />
                <span>First 50 Early-Bird VIP Farmer Status Unlocked</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                Seed Demand &amp; Commitment Confirmed!
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{confirmedOrder.farmerName}</strong>. Your demand has been recorded on your SoilWise farmer record and your spot for 100% free delivery is guaranteed.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-3 max-w-lg mx-auto text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-medium">Order Reference:</span>
                <span className="font-mono font-bold text-stone-900">{confirmedOrder.orderNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Seed Variety Demanded:</span>
                <span className="font-bold text-stone-900">{confirmedOrder.seedName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Quantity Demanded:</span>
                <span className="font-bold text-stone-900">{confirmedOrder.quantityKg} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Amount Paid via Paystack:</span>
                <span className="font-bold text-emerald-700 text-sm">₦{confirmedOrder.commitmentDepositNgn?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">VIP Delivery Logistics:</span>
                <span className="font-bold text-emerald-700">100% FREE (Saved ₦5,000)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Price List Status:</span>
                <span className="font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                  Awaiting Official Breeder Release
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs">
                <span className="font-semibold text-stone-700">Remaining Settlement:</span>
                <span className="text-stone-600 text-right">
                  Payable at farm gate upon official price confirmation
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  if (onNavigateToOrders) onNavigateToOrders();
                }}
                className="w-full sm:w-auto px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View in My Orders</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* COMMITMENT & SEED ORDER FORM                               */
          /* ========================================================== */
          <form onSubmit={handleInitiateCommitment} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Transparent Early-Bird & Price List Disclaimer Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50/90 border-2 border-amber-300 shadow-2xs space-y-2.5 text-stone-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-black text-[11px] uppercase tracking-wide">
                  First 50 Users Special Offer
                </span>
                <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">
                  Pre-Season Early-Bird Commitment
                </span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                Your order request will be placed, but in the meantime, you are required to commit <strong>₦1,000 and above</strong>. You can either pay the minimum ₦1,000, specify a custom commitment, or pay in full if you wish to secure your <strong>VIP level and 100% free delivery</strong> as part of our special offer for the first 50 users before the official price is released.
              </p>
              <div className="p-2.5 rounded-xl bg-white/95 border border-amber-200 text-[11px] text-stone-600 leading-normal space-y-1">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Awaiting Official NASC / Breeder Price List</span>
                </div>
                <p>
                  Official seasonal prices are currently being finalized with breeders. To protect farmers, <strong>Paystack will only charge the exact commitment amount you specify below</strong> (minimum ₦1,000). Your demand is locked in on your SoilWise profile, and any remaining balance will be confirmed upon official price release and settled at delivery.
                </p>
              </div>
            </div>

            {/* Mandatory Signup First Alert for Guests */}
            {!currentUser && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2.5 shadow-sm">
                <div className="flex items-start gap-2.5 text-xs text-amber-900 font-semibold">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-amber-950 text-sm">Account Required: Please Sign Up First</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                      To tie your refundable ₦{effectiveDeposit.toLocaleString()} deposit, guaranteed seed quota, and VIP delivery badge to your farmer profile, you must have an active SoilWise account before paying.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToRegister?.();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#143225] cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Create Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToLogin?.();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white border border-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-stone-50 cursor-pointer shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Select Seed Variety */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                1. Select Certified Crop Seed Variety Demanded
              </label>
              <select
                value={selectedSeedId}
                onChange={(e) => setSelectedSeedId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none bg-white font-medium cursor-pointer"
              >
                {INITIAL_SEEDS_CATALOGUE.map((seed) => (
                  <option key={seed.id} value={seed.id}>
                    {seed.varietyName} — ₦{seed.pricePerKg.toLocaleString()}/kg est. ({seed.breederOrg})
                  </option>
                ))}
              </select>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>{currentSeed.varietyName}</span>
                  <span className="text-emerald-700">₦{currentSeed.pricePerKg.toLocaleString()}/kg (est.)</span>
                </div>
                <p className="text-[11px] text-stone-600 line-clamp-2">
                  {currentSeed.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-emerald-800 font-semibold">
                  <span>Maturity: {currentSeed.maturityDays}</span>
                  <span>•</span>
                  <span>Yield: {currentSeed.yieldPotential}</span>
                  <span>•</span>
                  <span>Germination: {currentSeed.germinationRate}%</span>
                </div>
              </div>
            </div>

            {/* Step 2: Quantity in Kilograms */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                  2. Demand Quantity Required for Planting
                </label>
                <span className="text-xs font-bold text-[#1b4332]">
                  Est. Seed Cost: ₦{totalFullPrice.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((kg) => (
                  <button
                    type="button"
                    key={kg}
                    onClick={() => setQuantityKg(kg)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      quantityKg === kg
                        ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {kg} kg
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 pt-0.5">
                <span>Or custom kg:</span>
                <input
                  type="number"
                  min="2"
                  max="1000"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-24 px-2.5 py-1 rounded-lg border border-stone-300 text-xs font-bold outline-none"
                />
                <span className="text-[11px] text-stone-400">(recommended {currentSeed.recommendedRateKgPerHa}kg/hectare)</span>
              </div>
            </div>

            {/* Step 3: Commitment Deposit Selector (₦1,000 and above or custom) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                  3. Commitment Amount (Min. ₦1,000)
                </label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Secures VIP Free Delivery
                </span>
              </div>

              <p className="text-[11px] text-stone-500 leading-snug">
                Select a quick preset or type any custom amount $\ge$ ₦1,000. <strong>Paystack will only charge the amount you select here.</strong>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1000, 2500, 5000].map((amt) => {
                  const isSelected = !isCustom && depositAmount === amt;
                  return (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => handleDepositPresetClick(amt)}
                      className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 font-black border-amber-600 shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 font-bold'
                      }`}
                    >
                      <span className="block text-xs">₦{amt.toLocaleString()}</span>
                      <span className={`block text-[9px] font-normal ${isSelected ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                        {amt === 1000 ? 'Minimum Deposit' : amt === 2500 ? 'Popular' : 'Priority'}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleDepositPresetClick(totalFullPrice)}
                  className={`py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer ${
                    !isCustom && depositAmount === totalFullPrice
                      ? 'bg-amber-500 text-stone-950 font-black border-amber-600 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 font-bold'
                  }`}
                >
                  <span className="block text-xs">Pay Full (Est.)</span>
                  <span className="block text-[9px] font-normal text-stone-500">
                    ₦{totalFullPrice.toLocaleString()}
                  </span>
                </button>
              </div>

              {/* Custom Amount option */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/90 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span>Enter Custom Payment Amount (₦):</span>
                  {isCustom && <span className="text-[10px] text-emerald-700 font-bold">Custom mode active</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-400">₦</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="e.g. 1500, 3000, 7500"
                    value={customDeposit}
                    onChange={(e) => handleCustomDepositChange(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-xs font-bold outline-none focus:border-[#1b4332] bg-white"
                  />
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDepositPresetClick(1000)}
                      className="px-2.5 py-2 text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      Reset to ₦1k
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Ledger Calculation Summary */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5 font-medium">
              <div className="flex items-center justify-between text-stone-600">
                <span>Seed Demand:</span>
                <span className="font-bold text-stone-900">{quantityKg} kg of {currentSeed.varietyName}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Nationwide Farm Delivery:</span>
                <span className="text-emerald-700 font-bold">
                  <span className="line-through text-stone-400 mr-1.5">₦{standardDeliveryFee.toLocaleString()}</span>
                  FREE (VIP Perk)
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Official Price List Status:</span>
                <span className="text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                  Awaiting Final Release
                </span>
              </div>
              <div className="flex items-center justify-between text-amber-900 font-bold pt-1.5 border-t border-stone-200">
                <span>Amount Paystack Will Charge:</span>
                <span className="text-base text-emerald-700 font-black">
                  ₦{effectiveDeposit.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-stone-400">
                Only this specified commitment of ₦{effectiveDeposit.toLocaleString()} will be charged today. Any remaining balance is payable upon delivery.
              </p>
            </div>

            {/* Step 4: Farmer Delivery Contact Details */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                4. Farmer Contact & Delivery Location
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">
                    Full / Farm Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      placeholder="e.g. Ibrahim Abubakar"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">
                    Active Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={farmerPhone}
                      onChange={(e) => setFarmerPhone(e.target.value)}
                      placeholder="e.g. 0803 123 4567"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none bg-white"
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

                <div>
                  <label className="block text-stone-600 font-medium mb-1">
                    LGA / Town
                  </label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Zaria, Giwa, Bichi"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-stone-600 font-medium mb-1">
                    Specific Farm Address or Landmark
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Plot 4, Farm Settlement Road, behind Central Mosque"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Secured by Paystack • Cards, Bank Transfer, USSD</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-3 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer transition-colors w-1/3 sm:w-auto text-center"
                >
                  Skip for Now
                </button>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToRegister?.();
                    }}
                    className="flex-1 sm:flex-none px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-300" />
                    <span>Sign Up First to Pay Commitment</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Paystack...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Pay ₦{effectiveDeposit.toLocaleString()} &amp; Secure Free Delivery</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
