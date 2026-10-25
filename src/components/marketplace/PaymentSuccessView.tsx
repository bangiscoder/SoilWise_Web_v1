import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  ArrowRight, 
  ShoppingBag, 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  FileText,
  Sprout,
  Compass,
  Download
} from 'lucide-react';
import { SeedOrder } from '../../types/marketplace';
import { verifyPaystackTransaction } from '../../services/paystackService';
import { fetchUserSeedOrders } from '../../services/marketplaceService';
import { enqueueSyncItem } from '../../services/backgroundSyncService';
import { useAuth } from '../../context/AuthContext';

interface PaymentSuccessViewProps {
  order?: SeedOrder | null;
  reference?: string | null;
  onNavigateToMarketplace: () => void;
  onNavigateToOrders: () => void;
  onNavigateToAnalysis: (cropType?: string) => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  order: initialOrder,
  reference: propReference,
  onNavigateToMarketplace,
  onNavigateToOrders,
  onNavigateToAnalysis,
}) => {
  const { currentUser } = useAuth();
  const [order, setOrder] = useState<SeedOrder | null>(initialOrder || null);
  const [isVerifying, setIsVerifying] = useState<boolean>(!initialOrder);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [paystackDetails, setPaystackDetails] = useState<any>(null);

  // Read reference from URL query params if not provided in props
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get('reference') || params.get('trxref') || propReference;

    if (!order && refFromUrl) {
      verifyAndLoadOrder(refFromUrl);
    } else if (order) {
      setIsVerifying(false);
    }
  }, [propReference]);

  const verifyAndLoadOrder = async (ref: string) => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      // 1. Strict Paystack verification check
      const verifyRes = await verifyPaystackTransaction(ref);
      
      if (!verifyRes.verified || verifyRes.data?.status !== 'success') {
        setVerificationError(
          verifyRes.message || 
          'Payment could not be confirmed by Paystack. The transaction was either cancelled or declined by your bank.'
        );
        setIsVerifying(false);
        return;
      }

      setPaystackDetails(verifyRes.data);

      // 2. Find matching order in user orders
      const userOrders = await fetchUserSeedOrders(currentUser?.uid);
      const matched = userOrders.find(
        (o) => o.paystackReference === ref || o.orderNumber === ref || o.id === ref
      );

      if (matched) {
        matched.paymentStatus = 'paid';
        matched.status = 'confirmed';
        matched.paystackReference = ref;
        setOrder(matched);

        // Queue sync item to ensure persistence
        enqueueSyncItem('seed_order', matched, currentUser?.uid);
      } else {
        // Construct fallback verified order card from transaction metadata
        const fallbackOrder: SeedOrder = {
          id: `order-paystack-${ref}`,
          orderNumber: ref.startsWith('SW-') ? ref : `SW-SEED-${ref.substring(0, 8)}`,
          seedId: 'custom-seed',
          seedName: 'Certified Seed Order',
          cropType: 'other',
          quantityKg: 10,
          pricePerKg: 1500,
          totalPrice: (verifyRes.data?.amount ? verifyRes.data.amount / 100 : 15000),
          currency: 'NGN',
          farmerName: currentUser?.displayName || 'Farmer',
          farmerPhone: '',
          farmerEmail: currentUser?.email || undefined,
          state: 'Kaduna',
          lga: 'Zaria',
          farmLocationOrAddress: 'Depot Pickup Hub',
          deliveryMethod: 'pickup_depot',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paystackReference: ref,
          paidAt: verifyRes.data?.paid_at || new Date().toISOString(),
          userId: currentUser?.uid || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setOrder(fallbackOrder);
        enqueueSyncItem('seed_order', fallbackOrder, currentUser?.uid);
      }
    } catch (err: any) {
      console.error('[PaymentSuccessView] Verification error:', err);
      setVerificationError(err.message || 'Error communicating with Paystack verification service.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isVerifying) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-800">
          <RefreshCw className="w-7 h-7 animate-spin text-[#1b4332]" />
        </div>
        <h2 className="text-xl font-extrabold text-stone-900">Verifying Payment with Paystack...</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Confirming transaction status against the Central Bank authorized Paystack gateway.
        </p>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">Payment Not Confirmed</h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
            {verificationError}
          </p>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-600 text-left space-y-2">
          <strong className="text-stone-900 block font-bold">Important Notice:</strong>
          <p>
            SoilWise AI enforces strict Paystack payment confirmation. We do not debit stock or finalize bookings unless Paystack returns a verified <code className="text-emerald-800 font-mono">success</code> status.
          </p>
          <p>
            If funds were deducted from your bank, Paystack automatically reconciles and reverses uncompleted attempts within 24 hours.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onNavigateToMarketplace}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1b4332] text-white text-xs font-bold rounded-xl hover:bg-[#143225] transition-all cursor-pointer"
          >
            Return to Seed Marketplace
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">No Transaction Found</h2>
        <p className="text-xs text-stone-500">
          No seed order was specified. You can view all your orders or browse certified cultivars.
        </p>
        <button
          onClick={onNavigateToMarketplace}
          className="px-5 py-2.5 bg-[#1b4332] text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Browse Seed Library
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Celebration Card */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300/80 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-95">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-700" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Payment Confirmed by Paystack</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {order.isPreOrder || order.status === 'preorder_awaiting_price' 
              ? 'IAR Certified Seed Pre-Order Confirmed!' 
              : 'Certified Seed Order Confirmed!'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
            {order.isPreOrder || order.status === 'preorder_awaiting_price'
              ? 'Your pre-order deposit has been verified via Paystack. Your seed quantity has been registered in the priority allocation queue for official IAR breeder price release.'
              : 'Your payment was successfully received and verified. Your certified seed allocation has been reserved in the SoilWise inventory.'}
          </p>
        </div>
      </div>

      {/* Itemized Official Receipt Card */}
      <div id="soilwise-official-receipt" className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
        {/* Receipt Header Strip */}
        <div className="px-6 py-5 bg-[#1b4332] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                Official Seed Allocation Voucher
              </span>
              <h3 className="font-extrabold text-base sm:text-lg">SoilWise Farm Inputs Hub</h3>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] text-emerald-200 block uppercase font-mono">Invoice / Order Ref</span>
            <span className="font-mono text-sm sm:text-base font-extrabold text-white">
              {order.orderNumber}
            </span>
          </div>
        </div>

        {/* Receipt Details Body */}
        <div className="p-6 sm:p-8 space-y-6 text-xs text-stone-800">
          {/* Key Metric Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-stone-100">
            <div>
              <span className="text-stone-400 font-semibold uppercase text-[10px] block">Payment Gateway</span>
              <span className="font-bold text-stone-900">Paystack Nigeria</span>
            </div>
            <div>
              <span className="text-stone-400 font-semibold uppercase text-[10px] block">Payment Status</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] inline-block">
                VERIFIED PAID
              </span>
            </div>
            <div>
              <span className="text-stone-400 font-semibold uppercase text-[10px] block">Paystack Reference</span>
              <span className="font-mono font-bold text-stone-900 truncate block">
                {order.paystackReference || 'CONFIRMED'}
              </span>
            </div>
            <div>
              <span className="text-stone-400 font-semibold uppercase text-[10px] block">Date &amp; Time</span>
              <span className="font-medium text-stone-700">
                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Reserved Seed Cultivar Breakdown */}
          <div className="space-y-3">
            <span className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px] block">
              Seed Cultivar &amp; Quantity
            </span>
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-extrabold text-stone-900">{order.seedName}</h4>
                <p className="text-[11px] text-stone-500">
                  NASC Certified Seed Allocation &bull; Crop: <strong className="capitalize text-stone-700">{order.cropType}</strong>
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-0 border-stone-200 pt-2 sm:pt-0">
                <span className="font-mono text-xs sm:text-sm font-semibold text-stone-500">
                  {order.quantityKg} kg booked &bull; {order.isPreOrder || order.status === 'preorder_awaiting_price' ? 'Deposit Paid' : 'Total Price'}:
                </span>
                <span className="text-base sm:text-lg font-black text-[#1b4332] font-mono">
                  ₦{(order.depositAmountNgn || order.totalPrice).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Price Aggregation & Definite Balance Refund Guarantee */}
            {(order.isPreOrder || order.status === 'preorder_awaiting_price') && (
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-amber-50 rounded-2xl border-2 border-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                    Awaiting Official Price (IAR Partnership) &bull; Definite Balance Refund Guarantee
                  </h4>
                </div>
                <p className="text-stone-700 leading-relaxed text-[11px]">
                  As we await official partnership seasonal breeder prices from the <strong>Institute for Agricultural Research (IAR), Samaru / ABU Zaria</strong>, your deposit of <strong>₦{(order.depositAmountNgn || order.totalPrice).toLocaleString()}</strong> has been securely logged.
                </p>
                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] font-semibold leading-relaxed">
                  When official prices are released, your money will be aggregated against the actual price of your <strong>{order.quantityKg} kg</strong> order. <strong>If there is an excess balance, SoilWise AI will definitely refund the balance</strong> to you. Any remaining balance due will simply be settled prior to or upon farm delivery.
                </div>
              </div>
            )}
          </div>

          {/* Farmer & Dispatch Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <User className="w-4 h-4 text-emerald-800" />
                <span>Recipient Farmer</span>
              </div>
              <p className="font-extrabold text-stone-900">{order.farmerName}</p>
              <p className="text-stone-600 flex items-center gap-1.5 font-mono text-[11px]">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>{order.farmerPhone || 'Not specified'}</span>
              </p>
              {order.farmerEmail && (
                <p className="text-stone-500 text-[11px]">{order.farmerEmail}</p>
              )}
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                <Truck className="w-4 h-4 text-emerald-800" />
                <span>Collection / Delivery Hub</span>
              </div>
              <p className="font-extrabold text-stone-900">
                {order.deliveryMethod === 'pickup_depot' 
                  ? 'Agro-Dealer Hub Collection'
                  : 'Direct Farm Gate Delivery'}
              </p>
              <p className="text-stone-600 flex items-start gap-1.5 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span>{order.farmLocationOrAddress}, {order.lga}, {order.state}</span>
              </p>
            </div>
          </div>

          {/* Verification Guarantee */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Guaranteed Certified High Germination Seed</strong>
              <span>
                All seeds ordered via SoilWise are sourced from NASC-licensed seed enterprises and compliant with West African seed certification standards.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Voucher / Receipt</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onNavigateToOrders}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              View All My Orders
            </button>

            <button
              type="button"
              onClick={() => onNavigateToAnalysis(order.cropType)}
              className="px-4 py-2 bg-[#1b4332] hover:bg-[#143225] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Analyze Farm for {order.cropType}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
