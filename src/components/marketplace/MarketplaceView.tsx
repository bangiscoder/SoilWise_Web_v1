import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Sprout, 
  Search, 
  Filter, 
  Scale, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Tag, 
  MapPin, 
  Sparkles, 
  Package, 
  ArrowRight, 
  Plus, 
  RotateCcw,
  Layers,
  Wheat,
  SlidersHorizontal,
  Check,
  Crown,
  Truck
} from 'lucide-react';
import { CropSeed, CropCategory, SeedOrder } from '../../types/marketplace';
import { fetchAllMarketplaceSeeds, fetchUserSeedOrders } from '../../services/marketplaceService';
import { SeedOrderModal } from './SeedOrderModal';
import { useAuth } from '../../context/AuthContext';
import { FarmAnalysisResult } from '../../types/soilwise';

interface MarketplaceViewProps {
  currentAnalysis?: FarmAnalysisResult | null;
  onNavigateToAnalysis?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToPaymentSuccess?: (order: SeedOrder) => void;
  initialCropFilter?: string | null;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  currentAnalysis,
  onNavigateToAnalysis,
  onNavigateToAdmin,
  onNavigateToPaymentSuccess,
  initialCropFilter,
}) => {
  const { currentUser, isAdmin } = useAuth();

  const [seeds, setSeeds] = useState<CropSeed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CropCategory | 'all'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Selected seed for order modal
  const [selectedSeedForOrder, setSelectedSeedForOrder] = useState<CropSeed | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // User orders state
  const [userOrders, setUserOrders] = useState<SeedOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-orders'>('browse');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load seeds and user orders
  const loadData = async () => {
    setIsLoading(true);
    try {
      const allSeeds = await fetchAllMarketplaceSeeds();
      setSeeds(allSeeds);

      const orders = await fetchUserSeedOrders(currentUser?.uid);
      setUserOrders(orders);
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.uid]);

  // Set initial crop filter if passed from Farm Analysis
  useEffect(() => {
    if (initialCropFilter) {
      setSearchQuery(initialCropFilter);
    }
  }, [initialCropFilter]);

  // Filtered seeds
  const filteredSeeds = useMemo(() => {
    return seeds.filter(seed => {
      // Category filter
      if (selectedCategory !== 'all' && seed.category !== selectedCategory) {
        return false;
      }

      // In stock only filter
      if (inStockOnly && (seed.stockKg <= 0 || !seed.inStock)) {
        return false;
      }

      // Zone filter
      if (selectedZone !== 'all') {
        const matchesZone = seed.suitableAgroZone.some(z => 
          z.toLowerCase().includes(selectedZone.toLowerCase())
        );
        if (!matchesZone) return false;
      }

      // Search query filter (crop variety, crop type, tags, breeder)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = seed.varietyName.toLowerCase().includes(q);
        const matchesType = seed.cropType.toLowerCase().includes(q);
        const matchesBreeder = seed.breederOrg.toLowerCase().includes(q);
        const matchesTags = seed.tags.some(t => t.toLowerCase().includes(q));
        const matchesDesc = seed.description.toLowerCase().includes(q);
        return matchesName || matchesType || matchesBreeder || matchesTags || matchesDesc;
      }

      return true;
    });
  }, [seeds, selectedCategory, inStockOnly, selectedZone, searchQuery]);

  const handleOpenOrderModal = (seed: CropSeed) => {
    setSelectedSeedForOrder(seed);
    setIsOrderModalOpen(true);
  };

  const handleOrderSuccess = (order: SeedOrder) => {
    setUserOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
    // Update local stock in list
    setSeeds(prev => prev.map(s => {
      if (s.id === order.seedId) {
        const newStock = Math.max(0, s.stockKg - order.quantityKg);
        return {
          ...s,
          stockKg: newStock,
          inStock: newStock > 0,
        };
      }
      return s;
    }));

    if (order.paymentStatus === 'paid' && onNavigateToPaymentSuccess) {
      setIsOrderModalOpen(false);
      onNavigateToPaymentSuccess(order);
    } else {
      setSuccessToast(`Order ${order.orderNumber} for ${order.quantityKg} kg placed successfully!`);
      setTimeout(() => setSuccessToast(null), 6000);
    }
  };

  const categories: { id: CropCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Crops' },
    { id: 'cereals', label: 'Cereals (Maize, Sorghum, Rice, Millet)' },
    { id: 'legumes', label: 'Legumes (Cowpea, Soybean, Groundnut)' },
    { id: 'roots-tubers', label: 'Roots & Tubers (Cassava)' },
    { id: 'vegetables', label: 'Vegetables (Tomato, Pepper)' },
  ];

  const agroZones = [
    { id: 'all', label: 'All Agro-Zones' },
    { id: 'sudan', label: 'Sudan Savanna' },
    { id: 'northern guinea', label: 'Northern Guinea Savanna' },
    { id: 'southern guinea', label: 'Southern Guinea Savanna' },
    { id: 'sahel', label: 'Sahel' },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbf9] pb-24 text-stone-900">
      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1b4332] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-400/30 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#1b4332] to-[#143225] text-white pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle patterned overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-6xl mx-auto space-y-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
                <Sprout className="w-3.5 h-3.5" />
                <span>Certified Crop Inputs &amp; Seed Marketplace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Find &amp; Order Certified Crop Seeds
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 max-w-2xl leading-relaxed">
                Source authenticated, climate-resilient seeds tailored for savanna agroecological zones. Select high-yielding crop varieties and calculate exact kilograms for your farm size.
              </p>
            </div>

            {/* Quick Navigation Tabs: Browse vs My Orders */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
              <div className="flex p-1 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'browse'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  Browse Seeds ({seeds.length})
                </button>
                <button
                  onClick={() => setActiveTab('my-orders')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'my-orders'
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>My Seed Orders</span>
                  {userOrders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      {userOrders.length}
                    </span>
                  )}
                </button>
              </div>

              {isAdmin && onNavigateToAdmin && (
                <button
                  onClick={onNavigateToAdmin}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Scale className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Admin Stock Manager</span>
                </button>
              )}
            </div>
          </div>

          {/* Contextual Soil Analysis Crop Recommendation Alert */}
          {currentAnalysis && currentAnalysis.cropRecommendationDecision?.recommendations && currentAnalysis.cropRecommendationDecision.recommendations.length > 0 && (
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-white">
                  <strong>Recommended for your farm:</strong>{' '}
                  {currentAnalysis.cropRecommendationDecision.recommendations.slice(0, 3).map((c: any) => c.variety?.name || c.crop?.name || c.variety_name || c.crop_name || 'Crop').join(', ')}.
                  We have certified seed stock matching your soil pH and moisture profile.
                </span>
              </div>
              {onNavigateToAnalysis && (
                <button
                  onClick={onNavigateToAnalysis}
                  className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold whitespace-nowrap transition-colors cursor-pointer text-[11px]"
                >
                  View Soil Analysis
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {activeTab === 'browse' ? (
          <>
            {/* Search & Filters Bar */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by variety name, crop (e.g. Maize, Sorghum), traits (e.g. Drought-Tolerant), or breeder..."
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#1b4332]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Agro-Zone Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:border-[#1b4332] cursor-pointer"
                  >
                    {agroZones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.label}</option>
                    ))}
                  </select>

                  {/* In-Stock Toggle */}
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#1b4332] accent-[#1b4332]"
                    />
                    <span>In-Stock Only</span>
                  </label>
                </div>
              </div>

              {/* Category Segmented Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Header Count */}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                Showing <strong>{filteredSeeds.length}</strong> certified crop seed varieties
              </span>
              <span className="text-[11px] text-stone-400">
                All seeds tested &amp; verified by National Agricultural Seeds Council (NASC) accredited breeders
              </span>
            </div>

            {/* Seeds Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-72 bg-white rounded-2xl border border-stone-200 animate-pulse p-5 space-y-4">
                    <div className="w-1/3 h-4 bg-stone-200 rounded" />
                    <div className="w-3/4 h-6 bg-stone-200 rounded" />
                    <div className="w-full h-12 bg-stone-100 rounded" />
                    <div className="w-1/2 h-8 bg-stone-200 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredSeeds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSeeds.map(seed => {
                  const isOutOfStock = seed.stockKg <= 0 || !seed.inStock;
                  const isLowStock = seed.stockKg > 0 && seed.stockKg < 50;

                  return (
                    <div
                      key={seed.id}
                      className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                    >
                      {/* Top Header Card */}
                      <div className="p-5 space-y-3.5">
                        {/* Badges Bar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {seed.cropType}
                          </span>

                          {isOutOfStock ? (
                            <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                              Low Stock: {seed.stockKg} kg
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {seed.stockKg} kg Available
                            </span>
                          )}
                        </div>

                        {/* Variety Title */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug group-hover:text-[#1b4332] transition-colors">
                            {seed.varietyName}
                          </h3>
                          <span className="text-xs text-stone-500 font-medium block mt-0.5 truncate" title={seed.breederOrg}>
                            {seed.breederOrg}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {seed.description}
                        </p>

                        {/* Agronomic Quick Metrics */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-xs">
                          <div className="bg-stone-50 p-2 rounded-xl">
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Maturity</span>
                            <span className="font-semibold text-stone-800">{seed.maturityDays}</span>
                          </div>
                          <div className="bg-stone-50 p-2 rounded-xl">
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Potential Yield</span>
                            <span className="font-semibold text-stone-800">{seed.yieldPotential}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {seed.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] font-medium bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer: Pricing and Kilograms Order Action */}
                      <div className="px-5 py-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Price per kg</span>
                          <span className="text-lg font-black text-[#1b4332] font-mono">
                            ₦{seed.pricePerKg.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-stone-500 block">Rate: ~{seed.recommendedRateKgPerHa} kg/ha</span>
                        </div>

                        <button
                          onClick={() => handleOpenOrderModal(seed)}
                          disabled={isOutOfStock}
                          className="px-4 py-2 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Select &amp; Order (kg)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-3">
                <Sprout className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">No matching seed varieties found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Try adjusting your search query, selecting "All Crops", or toggling off the in-stock filter.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedZone('all');
                    setInStockOnly(false);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </>
        ) : (
          /* My Orders Tab */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">My Seed Orders &amp; Reservations</h2>
                <p className="text-xs text-stone-500">Track your crop seed bookings, quantities, and pickup status.</p>
              </div>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Order More Seeds</span>
              </button>
            </div>

            {userOrders.length > 0 ? (
              <div className="space-y-3">
                {userOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#1b4332] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {order.orderNumber}
                        </span>
                        {order.isCommitmentOrder && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 px-2 py-0.5 rounded-full shadow-2xs">
                            <Crown className="w-3 h-3 text-stone-950" />
                            <span>VIP Gold Order</span>
                          </span>
                        )}
                        {order.freeDeliveryApplied && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Truck className="w-3 h-3 text-emerald-700" />
                            <span>Free Farm Delivery</span>
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          order.status === 'confirmed' || order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'ready_for_pickup'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}>
                          {order.paymentStatus === 'paid' ? 'Paid via Paystack' : 'Pay on Delivery'}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-stone-900">
                        {order.quantityKg} kg of {order.seedName}
                      </h4>
                      <p className="text-xs text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Recipient: {order.farmerName} ({order.farmerPhone})</span>
                        <span>•</span>
                        <span>Location: {order.lga}, {order.state}</span>
                      </p>

                      {order.isCommitmentOrder && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-amber-900 font-semibold">
                              Commitment Deposit Paid:
                            </span>
                            <span className="font-bold text-emerald-700">
                              ₦{(order.commitmentDepositNgn || 1000).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-amber-900 font-semibold">
                              Balance Due on Delivery:
                            </span>
                            <span className="font-extrabold text-[#1b4332]">
                              ₦{(order.balanceDueNgn !== undefined ? order.balanceDueNgn : Math.max(0, order.totalPrice - (order.commitmentDepositNgn || 1000))).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-stone-100 flex sm:flex-col justify-between items-center sm:items-end">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Total Order Value</span>
                        <span className="text-base sm:text-lg font-black text-[#1b4332] font-mono">
                          ₦{order.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 mt-1 block">
                        Ordered on {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center space-y-3">
                <Package className="w-10 h-10 text-stone-400 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">You haven't placed any seed orders yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Browse our certified crop seed catalogue, choose a variety, and specify the kilograms required for your farm.
                </p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Browse Available Seeds
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Interactive Seed Order & Kilograms Modal */}
      <SeedOrderModal
        seed={selectedSeedForOrder}
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedSeedForOrder(null);
        }}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
};
