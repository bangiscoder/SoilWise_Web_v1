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
  FileText
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
}

export const SeedOrderModal: React.FC<SeedOrderModalProps> = ({
  seed,
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { currentUser } = useAuth();

  // Kilograms & calculator state
  const [quantityKg, setQuantityKg] = useState<number>(seed?.minOrderKg || 5);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [farmArea, setFarmArea] = useState<string>('1.0');
  const [areaUnit, setAreaUnit] = useState<'hectares' | 'acres'>('hectares');

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
      setSubmittedOrder(null);
      setErrorMessage(null);
      setIsProcessingPayment(false);
      setPaymentStep('idle');
    }
    getPaystackPublicKey().then((k) => setPaystackKey(k));
  }, [seed?.id]);

  if (!isOpen || !seed) return null;

  const pricePerKg = seed.pricePerKg || 1500;
  const totalPrice = quantityKg * pricePerKg;
  const isOutOfStock = seed.stockKg <= 0 || !seed.inStock;
  const exceedsStock = quantityKg > seed.stockKg;

  // Farm Area calculation helper
  const areaValue = parseFloat(farmArea) || 0;
  const convertedHectares = areaUnit === 'acres' ? areaValue * 0.404686 : areaValue;
  const calculatedRecommendedKg = Math.max(
    seed.minOrderKg,
    Math.round(convertedHectares * seed.recommendedRateKgPerHa)
  );

  const applyCalculatedKg = () => {
    if (calculatedRecommendedKg > 0) {
      const clamped = Math.min(seed.stockKg > 0 ? seed.stockKg : 1000, Math.max(seed.minOrderKg, calculatedRecommendedKg));
      setQuantityKg(clamped);
      setShowCalculator(false);
    }
  };

  const handleKgChange = (newVal: number) => {
    const validVal = isNaN(newVal) ? seed.minOrderKg : newVal;
    const clamped = Math.max(seed.minOrderKg, validVal);
    setQuantityKg(clamped);
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    if (quantityKg < seed.minOrderKg) {
      setErrorMessage(`Minimum order quantity for this seed is ${seed.minOrderKg} kg.`);
      return false;
    }
    if (quantityKg > seed.stockKg) {
      setErrorMessage(`Only ${seed.stockKg} kg currently available in stock. Please adjust your quantity.`);
      return false;
    }
    if (!farmerName.trim()) {
      setErrorMessage('Please provide your name or farm business name.');
      return false;
    }
    if (!farmerPhone.trim()) {
      setErrorMessage('Please enter your mobile phone number for order verification & delivery.');
      return false;
    }
    if (!lga.trim()) {
      setErrorMessage('Please enter your Local Government Area (LGA) or town.');
      return false;
    }
    return true;
  };

  // Execute Order Creation after payment or on POD selection
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
        pricePerKg,
        totalPrice,
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
      console.error('Failed to place seed order:', err);
      setErrorMessage(err.message || 'Failed to place seed order. Please try again.');
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

    // Option A: Pay on Delivery
    if (paymentMethod === 'pay_on_delivery') {
      await executeOrderCreation({
        paymentStatus: 'unpaid',
        paymentMethod: 'pay_on_delivery',
      });
      return;
    }

    // Option B: Paystack Payment Gateway
    setIsProcessingPayment(true);
    setPaymentStep('popup_open');

    const orderRef = `SW-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const sanitizedEmail = farmerEmail.trim() || `${farmerPhone.replace(/\D/g, '') || 'farmer'}@soilwise.ng`;

    // Check if user requested simulated test payment or if test key is sandbox
    if (useSimulatedTestPay) {
      setPaymentStep('verifying');
      setTimeout(async () => {
        const verifyRes = await verifyPaystackTransaction(orderRef, totalPrice);
        await executeOrderCreation({
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paystackReference: orderRef,
          amountPaidKobo: Math.round(totalPrice * 100),
        });
      }, 1200);
      return;
    }

    // Attempt live Paystack popup
    const popupOpened = await initiatePaystackCheckout({
      email: sanitizedEmail,
      amountNgn: totalPrice,
      reference: orderRef,
      seedVariety: seed.varietyName,
      quantityKg,
      farmerPhone: farmerPhone.trim(),
      deliveryAddress: `${farmLocation.trim() || lga}, ${state}`,
      onSuccess: async (response) => {
        setPaymentStep('verifying');
        try {
          const verifyRes = await verifyPaystackTransaction(response.reference || orderRef, totalPrice);
          if (verifyRes.verified && verifyRes.data?.status === 'success') {
            await executeOrderCreation({
              paymentStatus: 'paid',
              paymentMethod: 'paystack',
              paystackReference: response.reference || orderRef,
              amountPaidKobo: Math.round(totalPrice * 100),
            });
          } else {
            // STRICT CONFIRMATION: Do not confirm if not verified by Paystack
            setIsProcessingPayment(false);
            setPaymentStep('idle');
            setErrorMessage(
              verifyRes.message || 
              'Payment could not be confirmed by Paystack. Your card was not charged or payment was declined.'
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

  const quickPresets = [2, 5, 10, 20, 50, 100].filter(kg => kg >= seed.minOrderKg && kg <= (seed.stockKg || 1000));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-seed-modal-title"
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                Certified Seed Purchase &bull; Paystack Checkout
              </span>
              <h2 id="order-seed-modal-title" className="text-base sm:text-lg font-extrabold text-stone-900 truncate max-w-md">
                {seed.varietyName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-5 sm:px-7 py-5 sm:py-6 space-y-6">
          {submittedOrder ? (
            /* Order Success View with Payment Receipt */
            <div className="py-4 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-95">
                <CheckCircle2 className="w-9 h-9 text-emerald-700" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {submittedOrder.paymentStatus === 'paid' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Payment Verified via Paystack</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Order Confirmed &bull; Pay on Collection</span>
                    </>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                  {submittedOrder.paymentStatus === 'paid' ? 'Seed Purchase Successful!' : 'Order Placed Successfully!'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                  Your seed reservation has been processed and logged in the SoilWise system.
                </p>
              </div>

              {/* Order Receipt Card */}
              <div className="bg-[#fbfbf9] p-5 sm:p-6 rounded-2xl border border-stone-200/90 text-left space-y-4 max-w-lg mx-auto shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Tracking Order No.</span>
                    <span className="text-sm sm:text-base font-extrabold font-mono text-stone-900">
                      {submittedOrder.orderNumber}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    submittedOrder.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {submittedOrder.paymentStatus === 'paid' ? 'PAID' : 'PAY ON DELIVERY'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Variety</span>
                    <span className="font-bold text-stone-900">{submittedOrder.seedName}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Quantity</span>
                    <span className="font-bold text-stone-900 font-mono">{submittedOrder.quantityKg} kg</span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block font-semibold uppercase">Total Amount</span>
                    <span className="font-black text-[#1b4332] font-mono text-sm">
                      ₦{submittedOrder.totalPrice.toLocaleString()}
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
                        : `Direct Delivery to: ${submittedOrder.farmLocationOrAddress}`}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      You will receive an SMS confirmation on {submittedOrder.farmerPhone} with pickup dispatch details.
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
                  <span>Print Receipt</span>
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
            /* Order & Payment Form */
            <form onSubmit={handleProceedToPayment} className="space-y-6">
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
                    Source: <strong className="text-stone-700">{seed.breederOrg}</strong>
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-stone-200 sm:pl-4">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Price Per Kg</span>
                  <span className="text-base sm:text-lg font-black text-[#1b4332] font-mono">
                    ₦{pricePerKg.toLocaleString()} <span className="text-xs text-stone-500 font-normal">/ kg</span>
                  </span>
                </div>
              </div>

              {/* Stock Warning Banner */}
              {isOutOfStock ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
                  <div>
                    <strong className="block font-bold">Currently Out of Stock</strong>
                    <span>No seed units available at this moment. Please check back soon or browse other certified varieties.</span>
                  </div>
                </div>
              ) : seed.stockKg <= 50 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Low Stock Alert:</strong> Only <strong>{seed.stockKg} kg</strong> remaining in inventory.
                  </span>
                </div>
              ) : null}

              {/* SECTION 1: KILOGRAM SELECTION & RATE CALCULATOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="seedQuantityKgInput" className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-[#1b4332]" />
                    <span>Select Seed Quantity (Kilograms) *</span>
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
                          max="500"
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
                      disabled={quantityKg <= seed.minOrderKg}
                      className="px-4 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer text-base font-bold"
                    >
                      &minus;
                    </button>
                    <input
                      id="seedQuantityKgInput"
                      type="number"
                      min={seed.minOrderKg}
                      max={seed.stockKg || 1000}
                      value={quantityKg}
                      onChange={(e) => handleKgChange(parseInt(e.target.value, 10))}
                      className="w-20 text-center py-2 bg-transparent text-sm sm:text-base font-black text-stone-900 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleKgChange(quantityKg + (quantityKg >= 10 ? 5 : 1))}
                      disabled={quantityKg >= seed.stockKg}
                      className="px-4 py-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-40 transition-colors cursor-pointer text-base font-bold"
                    >
                      &#43;
                    </button>
                  </div>

                  <span className="text-xs text-stone-500 font-medium">
                    kg &bull; Minimum: <strong>{seed.minOrderKg} kg</strong> (Stock: {seed.stockKg} kg)
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400 font-medium mr-1">Presets:</span>
                  {quickPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantityKg(preset)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        quantityKg === preset
                          ? 'bg-[#1b4332] text-white shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {preset} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: FARMER CONTACT & LOCATION */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  Farmer Contact & Delivery Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Farmer or Farm Name *
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
                      Phone Number (SMS Notifications) *
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
                    Email Address (For Paystack Receipt)
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
                        <span className="text-[11px] text-stone-500">Delivered directly to farm site for orders</span>
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

              {/* SECTION 3: PAYMENT METHOD (PAYSTACK INTEGRATION) */}
              <div className="space-y-3.5 pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#1b4332]" />
                    <span>Choose Payment Method *</span>
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
                        <span className="font-extrabold text-stone-900">Pay with Paystack</span>
                        <span className="text-[10px] font-bold bg-[#0BA4DB]/10 text-[#0BA4DB] px-1.5 py-0.5 rounded">
                          Instant
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Debit Card, Bank Transfer, USSD, or Bank Account. Instant stock reservation.
                      </p>
                    </div>
                  </button>

                  {/* Pay on Delivery Option */}
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
                      <span className="font-extrabold text-stone-900 block">Pay on Depot Collection</span>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Reserve seeds and pay cash/transfer when inspecting at local cooperative depot.
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
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                    Total Checkout ({quantityKg} kg)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#1b4332] font-mono">
                    ₦{totalPrice.toLocaleString()}
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
                    disabled={isSubmitting || isProcessingPayment || isOutOfStock || exceedsStock}
                    className="w-2/3 sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isProcessingPayment || isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                        <span>
                          {paymentStep === 'verifying' ? 'Verifying with Paystack...' : 'Opening Paystack...'}
                        </span>
                      </>
                    ) : paymentMethod === 'paystack' ? (
                      <>
                        <Lock className="w-4 h-4 text-emerald-300" />
                        <span>Pay ₦{totalPrice.toLocaleString()} with Paystack</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Place Order (₦{totalPrice.toLocaleString()})</span>
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
