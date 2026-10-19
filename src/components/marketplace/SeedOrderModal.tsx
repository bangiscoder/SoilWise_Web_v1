import React, { useState } from 'react';
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
  Scale
} from 'lucide-react';
import { CropSeed, SeedOrder, DeliveryMethod } from '../../types/marketplace';
import { placeSeedOrder } from '../../services/marketplaceService';
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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<SeedOrder | null>(null);

  // Sync min order when seed changes
  React.useEffect(() => {
    if (seed) {
      setQuantityKg(seed.minOrderKg || 5);
      setSubmittedOrder(null);
      setErrorMessage(null);
    }
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

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (quantityKg < seed.minOrderKg) {
      setErrorMessage(`Minimum order quantity for this seed is ${seed.minOrderKg} kg.`);
      return;
    }

    if (quantityKg > seed.stockKg) {
      setErrorMessage(`Only ${seed.stockKg} kg currently available in stock. Please adjust your quantity.`);
      return;
    }

    if (!farmerName.trim()) {
      setErrorMessage('Please provide your name or farm business name.');
      return;
    }

    if (!farmerPhone.trim()) {
      setErrorMessage('Please enter your mobile phone number for order verification & delivery.');
      return;
    }

    if (!lga.trim()) {
      setErrorMessage('Please enter your Local Government Area (LGA) or town.');
      return;
    }

    setIsSubmitting(true);
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
      });

      setSubmittedOrder(order);
      onOrderSuccess(order);
    } catch (err: any) {
      console.error('Failed to place seed order:', err);
      setErrorMessage(err.message || 'Failed to place seed order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPresets = [2, 5, 10, 20, 50, 100].filter(kg => kg >= seed.minOrderKg && kg <= (seed.stockKg || 1000));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-seed-modal-title"
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                Certified Seed Order
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
            /* Order Success View */
            <div className="py-6 space-y-6 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-inner animate-in zoom-in-95">
                <CheckCircle2 className="w-9 h-9 text-emerald-700" />
              </div>

              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Order Successfully Placed
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                  {submittedOrder.quantityKg} kg {seed.varietyName}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                  Your seed reservation reference number is{' '}
                  <span className="font-mono font-bold text-[#1b4332] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {submittedOrder.orderNumber}
                  </span>
                  . Our agronomy team will contact your phone number to coordinate pickup or delivery.
                </p>
              </div>

              {/* Order Receipt Summary Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 text-left text-xs space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between text-stone-600">
                  <span>Quantity Ordered:</span>
                  <span className="font-bold text-stone-900">{submittedOrder.quantityKg} kg</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Unit Price:</span>
                  <span className="font-mono">₦{submittedOrder.pricePerKg.toLocaleString()} / kg</span>
                </div>
                <div className="flex justify-between text-stone-600 pt-2 border-t border-stone-200 text-sm">
                  <span className="font-bold text-stone-800">Total Price:</span>
                  <span className="font-bold font-mono text-[#1b4332] text-base">
                    ₦{submittedOrder.totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 pt-2 border-t border-stone-200">
                  <span>Recipient:</span>
                  <span className="font-semibold text-stone-800">{submittedOrder.farmerName}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Phone Number:</span>
                  <span className="font-mono text-stone-800">{submittedOrder.farmerPhone}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Fulfillment Location:</span>
                  <span className="text-stone-800">{submittedOrder.lga}, {submittedOrder.state}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            /* Order Placement Form */
            <form onSubmit={handleSubmitOrder} className="space-y-6">
              {/* Seed Quick Specs Summary */}
              <div className="bg-[#f4f7f2] border border-[#1b4332]/15 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1b4332] text-white uppercase tracking-wider">
                      {seed.cropType}
                    </span>
                    <span className="text-xs text-stone-600 font-medium">
                      {seed.breederOrg}
                    </span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed max-w-lg">
                    {seed.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Maturity: {seed.maturityDays}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Germination: {seed.germinationRate}%
                    </span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 bg-white/80 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto border sm:border-0 border-stone-200">
                  <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Price per Kilogram</span>
                  <span className="text-xl sm:text-2xl font-black text-[#1b4332] font-mono">
                    ₦{pricePerKg.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-stone-500 block">/ kg certified seed</span>
                </div>
              </div>

              {/* Stock Status Banner */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-700" />
                  <span className="text-stone-700 font-semibold">Available Library Stock:</span>
                  <span className={`font-mono font-bold ${seed.stockKg < 50 ? 'text-amber-700' : 'text-emerald-800'}`}>
                    {seed.stockKg} kilograms
                  </span>
                </div>
                {seed.stockKg < 50 && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Low Stock Alert
                  </span>
                )}
              </div>

              {/* Kilograms Selector (User specifies how many kilograms) */}
              <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-700/20 shadow-xs">
                <div className="flex items-center justify-between">
                  <label htmlFor="quantity-kg-input" className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-800" />
                    <span>How many kilograms do you need?</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(!showCalculator)}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{showCalculator ? 'Hide Seed Calculator' : 'Calculate by Farm Size'}</span>
                  </button>
                </div>

                {/* Farm Size Calculator Helper */}
                {showCalculator && (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex items-start gap-2 text-stone-700">
                      <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Recommended sowing rate for {seed.varietyName} is{' '}
                        <span className="font-bold text-emerald-900 font-mono">{seed.recommendedRateKgPerHa} kg per hectare</span>.
                        Enter your farm area below to calculate exact kilograms needed.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-700">Farm Area:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="500"
                          value={farmArea}
                          onChange={(e) => setFarmArea(e.target.value)}
                          className="w-20 px-2.5 py-1 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-700"
                        />
                      </div>

                      <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setAreaUnit('hectares')}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                            areaUnit === 'hectares' ? 'bg-[#1b4332] text-white' : 'text-stone-600'
                          }`}
                        >
                          Hectares
                        </button>
                        <button
                          type="button"
                          onClick={() => setAreaUnit('acres')}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                            areaUnit === 'acres' ? 'bg-[#1b4332] text-white' : 'text-stone-600'
                          }`}
                        >
                          Acres
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={applyCalculatedKg}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply {calculatedRecommendedKg} kg</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Stepper & Numeric Input */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center border-2 border-stone-200 rounded-xl bg-stone-50 p-1">
                    <button
                      type="button"
                      onClick={() => handleKgChange(quantityKg - (quantityKg > 20 ? 5 : 1))}
                      disabled={quantityKg <= seed.minOrderKg}
                      className="w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>

                    <div className="relative px-3">
                      <input
                        id="quantity-kg-input"
                        type="number"
                        min={seed.minOrderKg}
                        max={seed.stockKg || 1000}
                        value={quantityKg}
                        onChange={(e) => handleKgChange(parseInt(e.target.value, 10))}
                        className="w-20 text-center font-black text-lg sm:text-xl text-stone-900 bg-transparent focus:outline-none"
                      />
                      <span className="text-xs text-stone-500 font-semibold block text-center">kg</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleKgChange(quantityKg + (quantityKg >= 20 ? 5 : 1))}
                      disabled={quantityKg >= seed.stockKg}
                      className="w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {quickPresets.map(presetKg => (
                      <button
                        key={presetKg}
                        type="button"
                        onClick={() => handleKgChange(presetKg)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          quantityKg === presetKg
                            ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        {presetKg} kg
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validation and Stock warnings */}
                {exceedsStock && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Requested quantity ({quantityKg} kg) exceeds available stock of {seed.stockKg} kg.</span>
                  </p>
                )}

                {/* Live Price Estimation */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-stone-600 font-medium">Estimated Order Total:</span>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-[#1b4332] font-mono">
                      ₦{totalPrice.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      ({quantityKg} kg × ₦{pricePerKg.toLocaleString()}/kg)
                    </span>
                  </div>
                </div>
              </div>

              {/* Farmer Contact & Fulfillment Details */}
              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-800" />
                  <span>Farmer Delivery &amp; Contact Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Full Name / Farm Enterprise *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={farmerName}
                        onChange={(e) => setFarmerName(e.target.value)}
                        placeholder="e.g. Ibrahim Danladi Farms"
                        className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone Number (for SMS &amp; Dispatch) *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
                        <span className="text-[11px] text-stone-500">Delivered directly to farm site for orders over 20 kg</span>
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

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-[11px] text-stone-500 uppercase tracking-wider block">Total To Pay</span>
                  <span className="text-xl sm:text-2xl font-black text-[#1b4332] font-mono">
                    ₦{totalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isOutOfStock || exceedsStock}
                    className="w-2/3 sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <span>Processing Order...</span>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order {quantityKg} kg Seed</span>
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
