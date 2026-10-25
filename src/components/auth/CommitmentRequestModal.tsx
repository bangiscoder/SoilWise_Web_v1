import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Crown, 
  Truck, 
  Tag, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  User, 
  Mail, 
  Phone, 
  Loader2, 
  RotateCcw,
  Heart,
  MessageSquareHeart,
  FileText,
  Lock,
  UserPlus,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { 
  initiatePaystackCheckout, 
  verifyPaystackTransaction, 
  verifyAndUpdateOrderOnServer,
  initializeServerTransaction 
} from '../../services/paystackService';
import { placeSeedOrder } from '../../services/marketplaceService';

interface CommitmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSurvey?: () => void;
  onSuccessUpgrade?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
  initialStep?: 'question' | 'offer';
}

export const CommitmentRequestModal: React.FC<CommitmentRequestModalProps> = ({
  isOpen,
  onClose,
  onOpenSurvey,
  onSuccessUpgrade,
  onNavigateToRegister,
  onNavigateToLogin,
  initialStep = 'offer',
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();

  // Modal Step State: default directly to 'offer' so farmers can make commitment directly without extra steps
  const [step, setStep] = useState<'question' | 'offer' | 'declined' | 'success'>(initialStep || 'offer');

  // Reset to initialStep (default 'offer') whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep || 'offer');
      setErrorMessage(null);
    }
  }, [isOpen, initialStep]);

  // Form State
  const [amountNgn, setAmountNgn] = useState<number>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Sync profile information when available
  useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName) setName(userProfile.displayName);
      if (userProfile.email) setEmail(userProfile.email);
      if (userProfile.phoneNumber) setPhone(userProfile.phoneNumber);
    } else if (currentUser) {
      if (currentUser.displayName) setName(currentUser.displayName);
      if (currentUser.email) setEmail(currentUser.email);
    }
  }, [userProfile, currentUser]);

  // Lock body scroll when active
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (preset: number) => {
    setAmountNgn(preset);
    setCustomAmountStr(preset.toString());
  };

  const handleAmountInputChange = (val: string) => {
    setCustomAmountStr(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      setAmountNgn(parsed);
    }
  };

  const handleDeclineAdvocacy = () => {
    setStep('declined');
  };

  const handleAcceptAdvocacy = () => {
    setStep('offer');
  };

  const handleInitiateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentUser) {
      setErrorMessage('You must create a free farmer account or sign in first before paying the VIP commitment.');
      return;
    }

    const parsedAmount = parseInt(customAmountStr, 10);
    if (isNaN(parsedAmount) || parsedAmount < 1000) {
      setErrorMessage('The minimum commitment payment is ₦1,000 (100% refundable fund).');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please provide your name for your VIP farmer record.');
      return;
    }
    const cleanEmail = email.trim() || currentUser?.email || 'farmer@soilwise.africa';
    if (!cleanEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address for your payment receipt.');
      return;
    }

    setIsProcessing(true);
    const transactionRef = `SW-VIPCOMM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Send user name, email, and amount to Paystack API via server-side initialization
    try {
      await initializeServerTransaction({
        email: cleanEmail,
        amountNgn: parsedAmount,
        reference: transactionRef,
        metadata: {
          farmer_name: name.trim(),
          customer_name: name.trim(),
          name: name.trim(),
          email: cleanEmail,
          amount_ngn: parsedAmount,
          phone: phone.trim() || undefined,
          userId: currentUser?.uid || null,
          isCommitment: true,
          custom_fields: [
            {
              display_name: 'Farmer Full Name',
              variable_name: 'farmer_name',
              value: name.trim(),
            },
            {
              display_name: 'Email Address',
              variable_name: 'email',
              value: cleanEmail,
            },
            {
              display_name: 'Commitment Amount',
              variable_name: 'commitment_amount',
              value: `₦${parsedAmount.toLocaleString()}`,
            },
          ],
        },
      });
    } catch (initErr) {
      console.warn('[Paystack Initialize Notice]:', initErr);
    }

    // 2. Launch Paystack inline checkout popup with user name, email, and amount
    const launched = await initiatePaystackCheckout({
      farmerName: name.trim(),
      email: cleanEmail,
      amountNgn: parsedAmount,
      reference: transactionRef,
      seedVariety: 'VIP Early-Adopter Commitment Fund',
      quantityKg: 1,
      farmerPhone: phone.trim() || '08000000000',
      deliveryAddress: 'VIP Member Farm Account',
      customFields: [
        {
          display_name: 'Farmer Name',
          variable_name: 'farmer_name',
          value: name.trim(),
        },
        {
          display_name: 'Farmer Email',
          variable_name: 'farmer_email',
          value: cleanEmail,
        },
        {
          display_name: 'Commitment Amount',
          variable_name: 'commitment_amount',
          value: `₦${parsedAmount.toLocaleString()}`,
        },
      ],
      onSuccess: async (response) => {
        await handlePaymentCompleted(response.reference || transactionRef, parsedAmount);
      },
      onCancel: () => {
        setIsProcessing(false);
        setErrorMessage('Payment was cancelled. You can retry whenever you are ready.');
      },
    });

    if (!launched) {
      setTimeout(async () => {
        await handlePaymentCompleted(transactionRef, parsedAmount);
      }, 1000);
    }
  };

  const handlePaymentCompleted = async (ref: string, paidAmount: number) => {
    try {
      setPaymentReference(ref);
      await verifyPaystackTransaction(ref, paidAmount);

      const nowIso = new Date().toISOString();

      // Record a placeholder commitment order
      try {
        await placeSeedOrder({
          seedId: 'vip-founding-commitment',
          seedName: 'VIP Founding Farmer Commitment Fund',
          cropType: 'other',
          quantityKg: 1,
          pricePerKg: paidAmount,
          totalPrice: paidAmount,
          currency: 'NGN',
          farmerName: name.trim(),
          farmerPhone: phone.trim() || '08000000000',
          farmerEmail: email.trim() || currentUser?.email || undefined,
          state: userProfile?.state || 'Kaduna',
          lga: userProfile?.lga || '',
          farmLocationOrAddress: 'VIP Farm Registered Account',
          deliveryMethod: 'farm_delivery',
          deliveryNotes: `Founding Member Refundable Commitment Fund of ₦${paidAmount.toLocaleString()} paid via Paystack. Entitled to 35% discount on first seed order and 100% free delivery.`,
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paystackReference: ref,
          paidAt: nowIso,
          amountPaidKobo: paidAmount * 100,
          isCommitmentOrder: true,
          commitmentDepositNgn: paidAmount,
          balanceDueNgn: 0,
          isVipDelivery: true,
          freeDeliveryApplied: true,
          vipTier: 'VIP Gold Farmer',
          userId: currentUser?.uid || null,
        });
      } catch (orderErr) {
        console.warn('Could not record commitment order in marketplace:', orderErr);
      }

      // Upgrade User Profile in Database: VIP Gold, 35% discount, Free Delivery, Never show modal again!
      if (currentUser) {
        try {
          await updateUserProfile({
            displayName: name.trim(),
            phoneNumber: phone.trim() || undefined,
            isVipFarmer: true,
            vipLevel: 'VIP Gold',
            vipSecuredAt: nowIso,
            freeDeliveryEligible: true,
            hasFirstOrderDiscount35: true,
            refundableDepositNgn: paidAmount,
            hasCompletedCommitmentModal: true,
            earlyBirdSpotSecured: true,
            totalCommitmentPaidNgn: paidAmount,
          });
        } catch (profileErr) {
          console.warn('Could not update user record to VIP Gold:', profileErr);
        }
      }

      // Persist permanently in localStorage so modal never pops up again
      try {
        localStorage.setItem('soilwise_vip_commitment_completed', 'true');
        localStorage.setItem('soilwise_vip_deposit_amount', paidAmount.toString());
      } catch (storageErr) {
        console.warn('Could not save commitment state to localStorage:', storageErr);
      }

      // Also trigger cloud function in background to lock in Firestore document
      verifyAndUpdateOrderOnServer({
        reference: ref,
        userId: currentUser?.uid,
        amountNgn: paidAmount,
        isCommitment: true,
      }).catch((err) => {
        console.warn('[Paystack Cloud Function Notice]:', err);
      });

      setIsProcessing(false);
      setStep('success');
      if (onSuccessUpgrade) onSuccessUpgrade();
    } catch (err: any) {
      console.error('Commitment payment error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment confirmation failed. Please contact support.');
    }
  };

  const handleDismissModal = () => {
    // Record snooze timestamp in sessionStorage so user is not interrupted repeatedly in same session
    try {
      sessionStorage.setItem('soilwise_commitment_modal_snoozed_at', Date.now().toString());
    } catch {
      // Ignore storage errors
    }
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismissModal}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden my-6"
      >
        {/* Modal Top Header Strip */}
        <div className="bg-gradient-to-r from-[#1b4332] via-[#245a43] to-[#1b4332] text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-3 bottom-1 opacity-15 pointer-events-none">
            <Crown className="w-20 h-20 text-amber-300" />
          </div>

          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1 pr-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/25 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/35">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Founding Farmer Special Offer</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {step === 'question' && 'Help Shape SoilWise AI'}
                {step === 'offer' && 'Unlock VIP Gold Status & 35% Discount'}
                {step === 'declined' && 'Thank You for Exploring SoilWise'}
                {step === 'success' && 'VIP Status & 35% Discount Activated!'}
              </h2>
            </div>

            <button
              onClick={handleDismissModal}
              disabled={isProcessing}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Switcher */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: ADVOCACY & RECOMMENDATION QUESTION                                */}
          {/* ========================================================================= */}
          {step === 'question' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#1b4332] flex items-center justify-center mx-auto shadow-xs">
                <Heart className="w-7 h-7 text-emerald-700 fill-emerald-600" />
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                  Would you like to use SoilWise AI and recommend it to fellow farmers?
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  We are building agricultural intelligence specifically for Nigerian smallholder farmers. Your perspective helps us provide better soil decisions and seed access.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAdvocacy}
                  className="w-full sm:w-auto px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Yes, I want to use &amp; recommend it!</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeclineAdvocacy}
                  className="w-full sm:w-auto px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Still exploring for now
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: REFUNDABLE COMMITMENT OFFER & VIP 35% DISCOUNT CHECKOUT          */}
          {/* ========================================================================= */}
          {step === 'offer' && (
            <form onSubmit={handleInitiateCommitment} className="space-y-4">
              {/* Value Proposition Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300/80 space-y-2 text-stone-800">
                <div className="flex items-center gap-2 font-black text-amber-950 text-xs sm:text-sm">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Special Founding Farmer Commitment Offer</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Make a commitment payment of <strong>at least ₦1,000 (100% refundable fund)</strong>. As a founding VIP farmer, you unlock:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-white border border-amber-200 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-stone-900">35% Discount on 1st Order</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-200 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-stone-900">100% Free Farm Delivery</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-amber-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-stone-900">100% Refundable Fund</span>
                  </div>
                </div>

                <p className="text-[10px] text-stone-500 pt-1 leading-snug">
                  * Official certified seasonal seed prices are currently being finalized with breeders. Paystack will charge <strong>only the commitment amount you specify</strong> today (minimum ₦1,000). Your fund is safe and applied to your order.
                </p>
              </div>

              {/* Account Requirement Warning (if user is not signed in) */}
              {!currentUser && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400 text-stone-900 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-black shrink-0 mt-0.5 shadow-2xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-stone-950">
                        Farmer Account Required to Claim VIP
                      </h4>
                      <p className="text-[11px] text-stone-700 leading-snug">
                        Please sign up or sign in first before paying. This guarantees your ₦{amountNgn.toLocaleString()} refundable fund, 35% discount, and free farm delivery are linked to your profile.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                        } catch {}
                        onClose();
                        onNavigateToRegister?.();
                      }}
                      className="py-2 px-3 rounded-xl bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer hover:bg-[#143225]"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Create Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                        } catch {}
                        onClose();
                        onNavigateToLogin?.();
                      }}
                      className="py-2 px-3 rounded-xl bg-white border border-stone-300 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-stone-50 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Amount Selection & Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Commitment Fund Amount (Min. ₦1,000)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    100% Refundable
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2500, 5000].map((preset) => {
                    const isSelected = amountNgn === preset && customAmountStr === preset.toString();
                    return (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => handlePresetSelect(preset)}
                        className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 font-black border-amber-600 shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 font-bold text-xs'
                        }`}
                      >
                        <span className="block text-xs">₦{preset.toLocaleString()}</span>
                        <span className="block text-[9px] font-normal text-stone-500">
                          {preset === 1000 ? 'Minimum' : preset === 2500 ? 'Standard' : 'Priority'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input Field */}
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold text-sm">₦</span>
                  <input
                    type="number"
                    min="1000"
                    step="100"
                    required
                    value={customAmountStr}
                    onChange={(e) => handleAmountInputChange(e.target.value)}
                    placeholder="Enter amount (min 1000)"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-sm font-black outline-none bg-white text-stone-900"
                  />
                </div>
              </div>

              {/* User Name, Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Full / Farm Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aliyu Bello"
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Active Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0801 234 5678"
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-stone-600 font-medium mb-1">Email Address for Paystack Receipt</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="farmer@example.com"
                      className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDismissModal}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 text-xs font-semibold cursor-pointer text-center"
                >
                  Maybe Later
                </button>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                      } catch {}
                      onClose();
                      onNavigateToRegister?.();
                    }}
                    className="w-full sm:flex-1 px-5 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-300" />
                    <span>Sign Up First to Claim VIP (₦{amountNgn.toLocaleString()})</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full sm:flex-1 px-5 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Paystack...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Pay ₦{amountNgn.toLocaleString()} &amp; Unlock VIP</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* STEP 3 (DECLINED): ENCOURAGING NOTICE & FEEDBACK SURVEY INVITATION         */}
          {/* ========================================================================= */}
          {step === 'declined' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <MessageSquareHeart className="w-6 h-6 text-amber-700" />
              </div>

              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-stone-900">
                  We Appreciate Your Farming Journey!
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  You can explore your farm soil analysis, crop recommendations, and practical lessons completely free at your own pace.
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-left space-y-2">
                <div className="flex items-center gap-2 font-bold text-stone-800">
                  <FileText className="w-4 h-4 text-[#1b4332]" />
                  <span>Help Us Build SoilWise AI (2-Min Survey)</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-normal">
                  Your feedback tells us which crops and features to build next for your region. Have you submitted your feedback questionnaire yet?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleDismissModal();
                    if (onOpenSurvey) onOpenSurvey();
                  }}
                  className="w-full py-2 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Take Quick Farmer Survey</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleDismissModal}
                  className="text-xs text-stone-500 hover:text-stone-800 underline font-medium cursor-pointer"
                >
                  Continue to App Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: SUCCESS CONFIRMATION                                              */}
          {/* ========================================================================= */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center ring-8 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 text-xs font-black uppercase tracking-wider shadow-2xs">
                  <Crown className="w-3.5 h-3.5 text-stone-950" />
                  <span>VIP Gold Status Activated</span>
                </div>
                <h3 className="text-xl font-black text-stone-900">
                  Commitment Payment Confirmed!
                </h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  Congratulations, <strong>{name}</strong>! Your ₦{amountNgn.toLocaleString()} commitment has been verified. You now enjoy VIP Gold privileges permanently.
                </p>
              </div>

              {/* Perks Unlocked Card */}
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">VIP Tier:</span>
                  <span className="font-black text-amber-800">VIP Gold Farmer</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">1st Order Seed Discount:</span>
                  <span className="font-black text-emerald-700">35% OFF Applied</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">Farm Gate Delivery:</span>
                  <span className="font-bold text-emerald-700">100% Free Nationwide</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600 font-medium">Refundable Fund:</span>
                  <span className="font-bold text-stone-800">₦{amountNgn.toLocaleString()} Secured</span>
                </div>
                {paymentReference && (
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/70 text-[10px] text-stone-500">
                    <span>Paystack Ref:</span>
                    <span className="font-mono">{paymentReference}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Continue with VIP Privileges
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
