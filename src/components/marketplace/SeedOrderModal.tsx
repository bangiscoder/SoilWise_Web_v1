import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  Calculator, 
  MapPin, 
  Phone, 
  User, 
  Truck, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Sprout, 
  ChevronRight, 
  Check, 
  Info,
  Scale,
  CreditCard,
  Lock,
  Printer,
  ExternalLink,
  RefreshCw,
  FileText,
  ArrowRight,
  ShieldAlert,
  Coins
} from 'lucide-react';
import { CropSeed, SeedOrder, DeliveryMethod, PaymentMethod, PaymentStatus } from '../../types/marketplace';
import { placeSeedOrder } from '../../services/marketplaceService';
import { initiatePaystackCheckout, verifyPaystackTransaction, getPaystackPublicKey } from '../../services/paystackService';
import { useAuth } from '../../context/AuthContext';

interface SeedOrderModalProps {
  seed: CropSeed | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: SeedOrder) => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export const SeedOrderModal: React.FC<SeedOrderModalProps> = ({
  seed,
  isOpen,
  onClose,
  onOrderSuccess,
  onNavigateToLogin,
  onNavigateToRegister,
}) => {
  const { currentUser } = useAuth();

  // Kilograms & calculator state (any kilogram quantity allowed)
  const [quantityKg, setQuantityKg] = useState<number>(seed?.minOrderKg || 5);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [farmArea, setFarmArea] = useState<string>('1.0');
  const [areaUnit, setAreaUnit] = useState<'hectares' | 'acres'>('hectares');

  // Flexible Deposit state (Minimum ₦1,000)
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [customDepositInput, setCustomDepositInput] = useState<string>('1000');

  // Farmer details state
  const [farmerName, setFarmerName] = useState<string>(currentUser?.displayName || '');
  const [farmerPhone, setFarmerPhone] = useState<string>('');
  const [farmerEmail, setFarmerEmail] = useState<string>(currentUser?.email || '');
  const [state, setState] = useState<string>('Kaduna');
  const [lga, setLga] = useState<string>('');
  const [farmLocation, setFarmLocation] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup_depot');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');

  // Payment method & Paystack state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paystack');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'popup_open' | 'verifying' | 'completed'>('idle');
  const [paystackKey, setPaystackKey] = useState<string>('');
  const [useSimulatedTestPay, setUseSimulatedTestPay] = useState<boolean>(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<SeedOrder | null>(null);

  // Sync min order and fetch Paystack public key
  useEffect(() => {
    if (seed) {
      setQuantityKg(seed.minOrderKg || 5);
      setDepositAmount(1000);
      setCustomDepositInput('1000');
      setSubmittedOrder(null);
      setErrorMessage(null);
      setIsProcessingPayment(false);
      setPaymentStep('idle');
    }
    getPaystackPublicKey().then((k) => setPaystackKey(k));
  }, [seed?.id]);

  useEffect(() => {
    if (currentUser) {
      if (!farmerName && currentUser.displayName) setFarmerName(currentUser.displayName);
      if (!farmerEmail && currentUser.email) setFarmerEmail(currentUser.email);
    }
  }, [currentUser]);

  if (!isOpen || !seed) return null;

  const estimatedPricePerKg = seed.pricePerKg || 1500;
  const estimatedTotalPrice = quantityKg * estimatedPricePerKg;

  // Farm Area calculation helper
  const areaValue = parseFloat(farmArea) || 0;
  const convertedHectares = areaUnit === 'acres' ? areaValue * 0.404686 : areaValue;
  const calculatedRecommendedKg = Math.max(
    1,
    Math.round(convertedHectares * (seed.recommendedRateKgPerHa || 20))
  );

  const applyCalculatedKg = () => {
    if (calculatedRecommendedKg > 0) {
      setQuantityKg(calculatedRecommendedKg);
      setShowCalculator(false);
    }
  };

  const handleKgChange = (newVal: number) => {
    const validVal = isNaN(newVal) ? 1 : Math.max(1, newVal);
    setQuantityKg(validVal);
    if (errorMessage) setErrorMessage(null);
  };

  const handleDepositChange = (amount: number) => {
    setDepositAmount(amount);
    setCustomDepositInput(amount.toString());
    if (errorMessage) setErrorMessage(null);
  };

  const handleCustomDepositInput = (val: string) => {
    setCustomDepositInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setDepositAmount(num);
    }
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    if (!currentUser) {
      setErrorMessage('You must be signed in to your SoilWise account to place an IAR seed pre-order.');
      return false;
    }
    if (quantityKg < 1) {
      setErrorMessage('Please enter at least 1 kilogram of seed.');
      return false;
    }
    if (depositAmount < 1000) {
      setErrorMessage('Minimum pre-order deposit is ₦1,000. Please adjust your deposit amount.');
      return false;
    }
    if (!farmerName.trim()) {
      setErrorMessage('Please provide your name or farm business name.');
      return false;
    }
    if (!farmerPhone.trim()) {
      setErrorMessage('Please enter your mobile phone number for order verification & dispatch notifications.');
      return false;
    }
    if (!lga.trim()) {
      setErrorMessage('Please enter your Local Government Area (LGA) or town.');
      return false;
    }
    return true;
  };

  // Execute Order Creation after payment or POD selection
  const executeOrderCreation = async (paymentDetails: {
    paymentStatus: PaymentStatus;
    paymentMethod: PaymentMethod;
    paystackReference?: string;
    amountPaidKobo?: number;
  }) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const order = await placeSeedOrder({
        seedId: seed.id,
        seedName: seed.varietyName,
        cropType: seed.cropType,
        quantityKg,
        pricePerKg: estimatedPricePerKg,
        totalPrice: estimatedTotalPrice,
        currency: 'NGN',
        farmerName: farmerName.trim(),
        farmerPhone: farmerPhone.trim(),
        farmerEmail: farmerEmail.trim() || undefined,
        state: state.trim(),
        lga: lga.trim(),
        farmLocationOrAddress: farmLocation.trim() || `${lga}, ${state}`,
        deliveryMethod,
        deliveryNotes: deliveryNotes.trim() || undefined,
        userId: currentUser?.uid || null,
        status: 'preorder_awaiting_price',
        isPreOrder: true,
        isAwaitingOfficialPrice: true,
        depositAmountNgn: depositAmount,
        excessRefundGuaranteed: true,
        refundPolicyNotice: 'When official partnership seed prices are released by IAR, your deposit will be aggregated against the actual price of your ordered kilograms. If there is an excess balance, SoilWise AI will definitely refund the balance.',
        iarPartnershipStatus: 'Awaiting Official Price Release',
        paymentStatus: paymentDetails.paymentStatus,
        paymentMethod: paymentDetails.paymentMethod,
        paystackReference: paymentDetails.paystackReference,
        paidAt: paymentDetails.paymentStatus === 'paid' ? new Date().toISOString() : undefined,
        amountPaidKobo: paymentDetails.amountPaidKobo,
      });

      setSubmittedOrder(order);
      setPaymentStep('completed');
      onOrderSuccess(order);
    } catch (err: any) {
      console.error('Failed to place pre-order:', err);
      setErrorMessage(err.message || 'Failed to place seed pre-order. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  // Handle Form Submission with Paystack Checkout
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    // Option A: Pay on Delivery / Depot collection deposit
    if (paymentMethod === 'pay_on_delivery') {
      await executeOrderCreation({
        paymentStatus: 'unpaid',
        paymentMethod: 'pay_on_delivery',
      });
      return;
    }

    // Option B: Paystack Payment Gateway charging the chosen DEPOSIT amount
    setIsProcessingPayment(true);
    setPaymentStep('popup_open');

    const orderRef = `SW-PRE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sanitizedEmail = farmerEmail.trim() || `${farmerPhone.replace(/\D/g, '') || 'farmer'}@soilwise.ng`;

    // Check if user requested simulated test payment
    if (useSimulatedTestPay) {
      setPaymentStep('verifying');
      setTimeout(async () => {
        const verifyRes = await verifyPaystackTransaction(orderRef, depositAmount);
        await executeOrderCreation({
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paystackReference: orderRef,
          amountPaidKobo: Math.round(depositAmount * 100),
        });
      }, 1200);
      return;
    }

    // Attempt live Paystack popup with the user's chosen deposit amount
    const popupOpened = await initiatePaystackCheckout({
      email: sanitizedEmail,
      amountNgn: depositAmount,
      reference: orderRef,
      seedVariety: `${seed.varietyName} (Pre-Order Deposit)`,
      quantityKg,
      farmerPhone: farmerPhone.trim(),
      deliveryAddress: `${farmLocation.trim() || lga}, ${state}`,
      onSuccess: async (response) => {
        setPaymentStep('verifying');
        try {
          const verifyRes = await verifyPaystackTransaction(response.reference || orderRef, depositAmount);
          if (verifyRes.verified && verifyRes.data?.status === 'success') {
            await executeOrderCreation({
              paymentStatus: 'paid',
              paymentMethod: 'paystack',
              paystackReference: response.reference || orderRef,
              amountPaidKobo: Math.round(depositAmount * 100),
            });
          } else {
            setIsProcessingPayment(false);
            setPaymentStep('idle');
            setErrorMessage(
              verifyRes.message || 
              'Deposit could not be confirmed by Paystack. Your card was not charged or payment was declined.'
            );
          }
        } catch (err: any) {
          console.warn('[Paystack Verification Error]:', err);
          setIsProcessingPayment(false);
          setPaymentStep('idle');
          setErrorMessage('Could not reach Paystack verification service. Please verify your internet connection.');
        }
      },
      onCancel: () => {
        setIsProcessingPayment(false);
        setPaymentStep('idle');
        setErrorMessage('Paystack payment was closed before completion. You can retry or switch payment method.');
      },
    });

    if (!popupOpened && !useSimulatedTestPay) {
      setIsProcessingPayment(false);
      setPaymentStep('idle');
      setErrorMessage(
        'Could not initialize Paystack popup. Please check your browser popup settings, or enable Test Payment Simulation mode below.'
      );
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // Flexible kilogram presets
  const kgPresets = [5, 10, 25, 50, 100, 250, 500, 1000];

  // Deposit presets (min ₦1,000)
  const depositPresets = [1000, 2500, 5000, 10000, 25000, 50000];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-seed-modal-title"
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 flex items-center justify-between bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800/80 text-emerald-200 border border-emerald-700 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                  IAR Partnership Pre-Order
                </span>
                <span className="text-[11px] text-emerald-200 hidden sm:inline">
                  Samaru / ABU Zaria
                </span>
              </div>
              <h2 id="order-seed-modal-title" className="text-base sm:text-lg font-extrabold text-white truncate max-w-md mt-0.5">
                {seed.varietyName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-900 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-5 sm:px-7 py-5 sm:py-6 space-y-6">
          {submittedOrder ? (
            /* Pre-Order Success View with Receipt */
            <div className="py-4 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-95">
                <CheckCircle2 className="w-9 h-9 text-emerald-700" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-800" />
                  <span>Pre-Order Registered &bull; Awaiting Official IAR Price</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                  Certified Seed Pre-Order Successful!
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                  Your seed allocation has been logged in the priority queue for official IAR breeder release.
                </p>
              </div>

              {/* Definitive Refund & Price Aggregation Assurance Box */}
              <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-300 text-left space-y-2 max-w-lg mx-auto">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                    SoilWise AI 100% Guaranteed Balance Refund Policy
                  </h4>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  As we finalize official partnership with the <strong>Institute for Agricultural Research (IAR), Samaru</strong>, your deposit of <strong>₦{(submittedOrder.depositAmountNgn || depositAmount).toLocaleString()}</strong> is securely logged against your <strong>{submittedOrder.quantityKg} kg</strong> order.
                </p>
                <p className="text-xs font-semibold text-emerald-950 bg-white/80 p-2.5 rounded-xl border border-emerald-200">
                  When official prices are released, your money will be aggregated. <strong>If there is an excess balance, SoilWise AI will definitely refund the balance</strong> to you. Any balance due will be settled at farm delivery.
                </p>
              </div>

              {/* Order Receipt Card */}
              <div className="bg-[#fbfbf9] p-5 sm:p-6 rounded-2xl border border-stone-200/90 text-left space-y-4 max-w-lg mx-auto shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Pre-Order Tracking No.</span>
                    <span className="text-sm sm:text-base font-extrabold font-mono text-stone-900">
                      {submittedOrder.orderNumber}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                    PRE-ORDER
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Variety</span>
                    <span className="font-bold text-stone-900">{submittedOrder.seedName}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Reserved Kilograms</span>
                    <span className="font-extrabold text-stone-900 font-mono text-sm">{submittedOrder.quantityKg} kg</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Deposit Paid</span>
                    <span className="font-black text-[#1b4332] font-mono text-sm">
                      ₦{(submittedOrder.depositAmountNgn || depositAmount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Farmer Name</span>
                    <span className="font-bold text-stone-900 truncate block">{submittedOrder.farmerName}</span>
                  </div>
                </div>

                {submittedOrder.paystackReference && (
                  <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
                    <span>Paystack Reference:</span>
                    <span className="font-mono font-bold text-stone-700">{submittedOrder.paystackReference}</span>
                  </div>
                )}

                <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-stone-800">
                      {submittedOrder.deliveryMethod === 'pickup_depot' 
                        ? `Agro-Dealer Depot Collection in ${submittedOrder.lga}, ${submittedOrder.state}`
                        : `Direct Farm Delivery to: ${submittedOrder.farmLocationOrAddress}`}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      You will receive an SMS and email notification on {submittedOrder.farmerPhone} immediately once IAR releases official partnership prices and dispatch begins.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Pre-Order Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Return to Seed Marketplace
                </button>
              </div>
            </div>
          ) : (
            /* Pre-Order Form */
            <form onSubmit={handleProceedToPayment} className="space-y-6">
              {/* Institutional Notice & Refund Guarantee Banner */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-emerald-50/70 border-2 border-amber-300 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-tight">
                    IAR Partnership Pre-Order Period &bull; Samaru, Zaria
                  </h3>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  As we await official partnership formalization and seasonal price releases with the <strong>Institute for Agricultural Research (IAR)</strong>, all orders are placed as priority <strong>Pre-Orders</strong>.
                </p>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-200/80 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-stone-900 block font-bold">
                        Guaranteed Balance Refund &amp; Aggregation Assurance:
                      </strong>
                      <span className="text-stone-600 leading-relaxed block text-[11px] mt-0.5">
                        Order <strong>any kilogram quantity</strong> of certified seed you desire and make <strong>any deposit of your choice (minimum ₦1,000)</strong>. When the official price is released by IAR, your money will be aggregated against your order. <strong>If there is an excess balance, SoilWise AI will definitely refund the balance</strong>.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication Requirement Check */}
              {!currentUser && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl space-y-2.5 animate-in shake">
                  <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                    <span>Account Required to Place an IAR Seed Pre-Order</span>
                  </div>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Only farmers with an authenticated SoilWise account can place pre-orders so your allocation is tracked and eligible for refund processing.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {onNavigateToRegister && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToRegister();
                        }}
                        className="px-3.5 py-1.5 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#143225] transition-all cursor-pointer"
                      >
                        Create Free Account
                      </button>
                    )}
                    {onNavigateToLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToLogin();
                        }}
                        className="px-3.5 py-1.5 bg-white text-stone-800 border border-stone-300 text-xs font-bold rounded-lg hover:bg-stone-50 transition-all cursor-pointer"
                      >
                        Sign In
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Seed Summary Strip */}
              <div className="bg-[#fbfbf9] p-4 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {seed.category}
                    </span>
                    <span className="text-xs font-bold text-stone-700">
                      Maturity: {seed.maturityDays}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Breeder / Institutional Origin: <strong className="text-stone-700">{seed.breederOrg}</strong>
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-stone-200 sm:pl-4">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Official Status</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 inline-block">
                    Awaiting Official IAR Price
                  </span>
                </div>
              </div>

              {/* SECTION 1: KILOGRAM SELECTION (ANY KILOGRAM OF SEED) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="seedQuantityKgInput" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-[#1b4332]" />
                    <span>1. How Many Kilograms (kg) Do You Want to Pre-Order? *</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="text-xs font-semibold text-[#1b4332] hover:text-[#143225] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showCalculator ? 'Close Calculator' : 'Farm Area Calculator'}</span>
                  </button>
                </div>

                {/* Farm Area Seeding Rate Calculator Drawer */}
                {showCalculator && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-bold text-emerald-950">
                          Farm Area Seed Rate Calculator
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-800 font-medium">
                        Standard rate: {seed.recommendedRateKgPerHa} kg / hectare
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="sm:col-span-2 flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="1000"
                          value={farmArea}
                          onChange={(e) => setFarmArea(e.target.value)}
                          placeholder="Enter area"
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                        <select
                          value={areaUnit}
                          onChange={(e) => setAreaUnit(e.target.value as any)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-stone-900 font-medium focus:outline-none"
                        >
                          <option value="hectares">Hectares (ha)</option>
                          <option value="acres">Acres</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={applyCalculatedKg}
                        className="w-full py-1.5 px-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Apply {calculatedRecommendedKg} kg</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Kilogram Stepper & Number Input */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-stone-200 rounded-2xl bg-stone-50 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleKgChange(quantityKg - (quantityKg > 10 ? 5 : 1))}
                      disabled={quantityKg <= 1}
                      className="px-4 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer text-base font-bold"
                    >
                      &minus;
                    </button>
                    <input
                      id="seedQuantityKgInput"
                      type="number"
                      min={1}
                      value={quantityKg}
                      onChange={(e) => handleKgChange(parseInt(e.target.value, 10))}
                      className="w-24 text-center py-2 bg-transparent text-sm sm:text-base font-black text-stone-900 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleKgChange(quantityKg + (quantityKg >= 10 ? 5 : 1))}
                      className="px-4 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer text-base font-bold"
                    >
                      &#43;
                    </button>
                  </div>

                  <span className="text-xs text-stone-500 font-medium">
                    Kilograms (Order <strong>any amount</strong> required for your farm)
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400 font-medium mr-1">Quick Presets:</span>
                  {kgPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleKgChange(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        quantityKg === preset
                          ? 'bg-[#1b4332] text-white shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000} tonne` : `${preset} kg`}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: DEPOSIT AMOUNT SELECTION (MINIMUM ₦1,000) */}
              <div className="space-y-3 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#1b4332]" />
                    <span>2. Choose Your Pre-Order Deposit (Minimum ₦1,000) *</span>
                  </label>
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    Paystack charges only this deposit
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-snug">
                  You can make <strong>any deposit of your choice (min. ₦1,000)</strong>. Once IAR officially releases seasonal pricing, your deposit will be aggregated and any excess balance will be definitely refunded.
                </p>

                {/* Deposit Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {depositPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleDepositChange(preset)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        depositAmount === preset
                          ? 'bg-[#1b4332] text-white border-[#1b4332] font-black shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800 font-semibold text-xs'
                      }`}
                    >
                      <span className="text-[11px] block">₦{preset.toLocaleString()}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Deposit Input */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-stone-700">
                    Or Enter Any Custom Deposit Amount:
                  </span>
                  <div className="relative w-full sm:w-48">
                    <span className="absolute left-3 top-2 text-stone-500 font-bold text-sm">₦</span>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      value={customDepositInput}
                      onChange={(e) => handleCustomDepositInput(e.target.value)}
                      placeholder="1000"
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 font-mono focus:outline-none focus:border-[#1b4332]"
                    />
                  </div>
                </div>

                {depositAmount < 1000 && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Minimum deposit allowed is ₦1,000.</span>
                  </p>
                )}
              </div>

              {/* SECTION 3: FARMER CONTACT & LOCATION */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  3. Farmer Contact &amp; Dispatch Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Farmer or Farm Business Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={farmerName}
                        onChange={(e) => setFarmerName(e.target.value)}
                        placeholder="e.g. Ibrahim Aliyu"
                        className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone Number (For IAR Price Alert SMS) *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        required
                        value={farmerPhone}
                        onChange={(e) => setFarmerPhone(e.target.value)}
                        placeholder="e.g. 0803 123 4567"
                        className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      State *
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
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
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Local Government Area (LGA) or Town *
                    </label>
                    <input
                      type="text"
                      required
                      value={lga}
                      onChange={(e) => setLga(e.target.value)}
                      placeholder="e.g. Zaria, Giwa, Bichi, Makarfi"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address (For Paystack Pre-Order Receipt)
                  </label>
                  <input
                    type="email"
                    value={farmerEmail}
                    onChange={(e) => setFarmerEmail(e.target.value)}
                    placeholder="e.g. farmer@example.com"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                {/* Delivery Option */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Preferred Collection Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup_depot')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        deliveryMethod === 'pickup_depot'
                          ? 'border-emerald-800 bg-emerald-50/50 shadow-2xs'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${deliveryMethod === 'pickup_depot' ? 'text-emerald-800' : 'text-stone-400'}`} />
                      <div>
                        <span className="font-bold text-stone-900 block">Agro-Dealer Depot Collection</span>
                        <span className="text-[11px] text-stone-500">Pick up at designated NASC-certified hub in your LGA</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('farm_delivery')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        deliveryMethod === 'farm_delivery'
                          ? 'border-emerald-800 bg-emerald-50/50 shadow-2xs'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <Truck className={`w-4 h-4 shrink-0 mt-0.5 ${deliveryMethod === 'farm_delivery' ? 'text-emerald-800' : 'text-stone-400'}`} />
                      <div>
                        <span className="font-bold text-stone-900 block">Direct Farm Gate Delivery</span>
                        <span className="text-[11px] text-stone-500">Delivered directly to farm site on seasonal dispatch</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Specific Farm Location or Delivery Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={farmLocation}
                    onChange={(e) => setFarmLocation(e.target.value)}
                    placeholder="e.g. Near Zaria-Kaduna Expressway km 12, or Central Market Depot"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {/* SECTION 4: PAYMENT METHOD (PAYSTACK INTEGRATION) */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#1b4332]" />
                    <span>4. Choose Deposit Payment Method *</span>
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Lock className="w-3 h-3 text-emerald-700" />
                    <span>Paystack 256-Bit Secure</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Paystack Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paystack')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      paymentMethod === 'paystack'
                        ? 'border-[#1b4332] bg-emerald-50/70 shadow-xs ring-1 ring-[#1b4332]'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-xl bg-[#0BA4DB]/15 text-[#0BA4DB] flex items-center justify-center shrink-0 mt-0.5 font-black text-xs">
                      P
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-stone-900">Pay Deposit with Paystack</span>
                        <span className="text-[10px] font-bold bg-[#0BA4DB]/10 text-[#0BA4DB] px-1.5 py-0.5 rounded">
                          Instant
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Debit Card, Bank Transfer, USSD, or Bank Account. Instant pre-order confirmation.
                      </p>
                    </div>
                  </button>

                  {/* Pay on Delivery / Depot Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_on_delivery')}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      paymentMethod === 'pay_on_delivery'
                        ? 'border-[#1b4332] bg-emerald-50/70 shadow-xs ring-1 ring-[#1b4332]'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Truck className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <span className="font-extrabold text-stone-900 block">Deposit on Depot Verification</span>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Log pre-order now and deposit cash/transfer upon seasonal depot inspection.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Paystack Test / Simulation Helper Banner */}
                {paymentMethod === 'paystack' && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs text-stone-600">
                    <span className="text-[11px]">
                      Test payment simulation mode:
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-[#1b4332]">
                      <input
                        type="checkbox"
                        checked={useSimulatedTestPay}
                        onChange={(e) => setUseSimulatedTestPay(e.target.checked)}
                        className="rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span>Simulate Instant Success (Testing)</span>
                    </label>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit / Pay Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
                <div className="text-left w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                      Deposit Due Today ({quantityKg} kg booked)
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Refund Guaranteed
                    </span>
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-[#1b4332] font-mono">
                    ₦{depositAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isProcessingPayment || isSubmitting}
                    className="w-1/3 sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isProcessingPayment || depositAmount < 1000 || !currentUser}
                    className="w-2/3 sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isProcessingPayment || isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>
                          {paymentStep === 'verifying' ? 'Verifying with Paystack...' : 'Opening Paystack...'}
                        </span>
                      </>
                    ) : !currentUser ? (
                      <span>Sign In to Pre-Order</span>
                    ) : paymentMethod === 'paystack' ? (
                      <>
                        <Lock className="w-4 h-4 text-emerald-300" />
                        <span>Pay ₦{depositAmount.toLocaleString()} Deposit</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Reserve Pre-Order ({quantityKg} kg)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
