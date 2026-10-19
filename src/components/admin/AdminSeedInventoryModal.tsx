import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sprout, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Tag, 
  Clock, 
  DollarSign 
} from 'lucide-react';
import { CropSeed, CropType, CropCategory } from '../../types/marketplace';
import { createAdminCropSeed, updateSeedStock } from '../../services/marketplaceService';

interface AdminAddSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeedCreated: (newSeed: CropSeed) => void;
  existingSeedToEdit?: CropSeed | null;
}

export const AdminAddSeedModal: React.FC<AdminAddSeedModalProps> = ({
  isOpen,
  onClose,
  onSeedCreated,
  existingSeedToEdit,
}) => {
  // Form fields
  const [varietyName, setVarietyName] = useState<string>(existingSeedToEdit?.varietyName || '');
  const [cropType, setCropType] = useState<CropType>(existingSeedToEdit?.cropType || 'maize');
  const [category, setCategory] = useState<CropCategory>(existingSeedToEdit?.category || 'cereals');
  const [description, setDescription] = useState<string>(existingSeedToEdit?.description || '');
  const [maturityDays, setMaturityDays] = useState<string>(existingSeedToEdit?.maturityDays || '90-95 days');
  const [yieldPotential, setYieldPotential] = useState<string>(existingSeedToEdit?.yieldPotential || '4.5 - 6.0 t/ha');
  const [germinationRate, setGerminationRate] = useState<number>(existingSeedToEdit?.germinationRate || 95);
  const [pricePerKg, setPricePerKg] = useState<number>(existingSeedToEdit?.pricePerKg || 1500);
  const [stockKg, setStockKg] = useState<number>(existingSeedToEdit?.stockKg || 100);
  const [minOrderKg, setMinOrderKg] = useState<number>(existingSeedToEdit?.minOrderKg || 2);
  const [recommendedRateKgPerHa, setRecommendedRateKgPerHa] = useState<number>(existingSeedToEdit?.recommendedRateKgPerHa || 20);
  const [breederOrg, setBreederOrg] = useState<string>(existingSeedToEdit?.breederOrg || 'IAR Zaria (NASC Certified)');
  const [suitableAgroZoneStr, setSuitableAgroZoneStr] = useState<string>(
    existingSeedToEdit?.suitableAgroZone ? existingSeedToEdit.suitableAgroZone.join(', ') : 'Sudan Savanna, Northern Guinea Savanna'
  );
  const [tagsStr, setTagsStr] = useState<string>(
    existingSeedToEdit?.tags ? existingSeedToEdit.tags.join(', ') : 'Drought-Tolerant, Certified'
  );
  const [plantingSeason, setPlantingSeason] = useState<string>(existingSeedToEdit?.plantingSeason || 'May to July');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (existingSeedToEdit) {
      setVarietyName(existingSeedToEdit.varietyName);
      setCropType(existingSeedToEdit.cropType);
      setCategory(existingSeedToEdit.category);
      setDescription(existingSeedToEdit.description);
      setMaturityDays(existingSeedToEdit.maturityDays);
      setYieldPotential(existingSeedToEdit.yieldPotential);
      setGerminationRate(existingSeedToEdit.germinationRate);
      setPricePerKg(existingSeedToEdit.pricePerKg);
      setStockKg(existingSeedToEdit.stockKg);
      setMinOrderKg(existingSeedToEdit.minOrderKg);
      setRecommendedRateKgPerHa(existingSeedToEdit.recommendedRateKgPerHa);
      setBreederOrg(existingSeedToEdit.breederOrg);
      setSuitableAgroZoneStr(existingSeedToEdit.suitableAgroZone.join(', '));
      setTagsStr(existingSeedToEdit.tags.join(', '));
      setPlantingSeason(existingSeedToEdit.plantingSeason || 'May to July');
    } else {
      setVarietyName('');
      setCropType('maize');
      setCategory('cereals');
      setDescription('');
      setMaturityDays('90-95 days');
      setYieldPotential('4.5 - 6.0 t/ha');
      setGerminationRate(95);
      setPricePerKg(1500);
      setStockKg(100);
      setMinOrderKg(2);
      setRecommendedRateKgPerHa(20);
      setBreederOrg('IAR Zaria (NASC Certified)');
      setSuitableAgroZoneStr('Sudan Savanna, Northern Guinea Savanna');
      setTagsStr('Drought-Tolerant, Certified');
      setPlantingSeason('May to July');
    }
  }, [existingSeedToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!varietyName.trim()) {
      setErrorMessage('Please enter the crop variety name (e.g. SAMMAZ-52).');
      return;
    }

    if (stockKg < 0) {
      setErrorMessage('Stock quantity in kilograms cannot be negative.');
      return;
    }

    if (pricePerKg <= 0) {
      setErrorMessage('Price per kilogram must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const suitableAgroZone = suitableAgroZoneStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const tags = tagsStr
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (existingSeedToEdit) {
        // Update existing seed stock & parameters
        await updateSeedStock(existingSeedToEdit.id, stockKg, pricePerKg, stockKg > 0);
        const updatedSeed: CropSeed = {
          ...existingSeedToEdit,
          varietyName: varietyName.trim(),
          cropType,
          category,
          description: description.trim(),
          maturityDays: maturityDays.trim(),
          yieldPotential: yieldPotential.trim(),
          germinationRate,
          pricePerKg,
          stockKg,
          minOrderKg,
          recommendedRateKgPerHa,
          breederOrg: breederOrg.trim(),
          suitableAgroZone,
          tags,
          plantingSeason: plantingSeason.trim(),
          inStock: stockKg > 0,
          updatedAt: new Date().toISOString(),
        };
        onSeedCreated(updatedSeed);
      } else {
        // Create new seed
        const newSeed = await createAdminCropSeed({
          varietyName: varietyName.trim(),
          cropType,
          category,
          description: description.trim() || `${varietyName} certified crop seed for high yield.`,
          maturityDays: maturityDays.trim(),
          yieldPotential: yieldPotential.trim(),
          germinationRate,
          suitableAgroZone: suitableAgroZone.length ? suitableAgroZone : ['Savanna'],
          pricePerKg,
          stockKg,
          minOrderKg,
          recommendedRateKgPerHa,
          breederOrg: breederOrg.trim(),
          packagingOptions: ['2kg packet', '5kg bag', '10kg bag', '25kg sack', '50kg bulk bag'],
          inStock: stockKg > 0,
          tags: tags.length ? tags : ['Certified Seed'],
          plantingSeason: plantingSeason.trim(),
        });
        onSeedCreated(newSeed);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save seed in admin:', err);
      setErrorMessage(err.message || 'Failed to save seed. Please check your network and permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-seed-modal-title"
      >
        {/* Header */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Admin Seed Library
              </span>
              <h2 id="admin-seed-modal-title" className="text-base sm:text-lg font-extrabold text-stone-900">
                {existingSeedToEdit ? `Edit & Adjust Stock: ${existingSeedToEdit.varietyName}` : 'Add New Crop Seed Variety'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-7 py-5 sm:py-6 space-y-5">
          {/* Variety Name */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Seed Variety Name *
            </label>
            <input
              type="text"
              required
              value={varietyName}
              onChange={(e) => setVarietyName(e.target.value)}
              placeholder="e.g. SAMMAZ-52 (Drought-Tolerant Hybrid Maize)"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          {/* Crop Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Crop Type *
              </label>
              <select
                value={cropType}
                onChange={(e) => {
                  const val = e.target.value as CropType;
                  setCropType(val);
                  if (['maize', 'sorghum', 'millet', 'rice', 'wheat'].includes(val)) {
                    setCategory('cereals');
                  } else if (['cowpea', 'soybean', 'groundnut'].includes(val)) {
                    setCategory('legumes');
                  } else if (['cassava'].includes(val)) {
                    setCategory('roots-tubers');
                  } else if (['vegetable'].includes(val)) {
                    setCategory('vegetables');
                  }
                }}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-[#1b4332]"
              >
                <option value="maize">Maize (Corn)</option>
                <option value="sorghum">Sorghum (Guinea Corn)</option>
                <option value="millet">Pearl Millet</option>
                <option value="cowpea">Cowpea (Beans)</option>
                <option value="rice">Rice (Lowland / Upland)</option>
                <option value="soybean">Soybean</option>
                <option value="groundnut">Groundnut (Peanut)</option>
                <option value="wheat">Wheat</option>
                <option value="cassava">Cassava (Stems)</option>
                <option value="vegetable">Vegetables (Tomato, Pepper, Onion)</option>
                <option value="other">Other Crop</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Marketplace Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CropCategory)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-medium focus:outline-none focus:border-[#1b4332]"
              >
                <option value="cereals">Cereals</option>
                <option value="legumes">Legumes &amp; Pulses</option>
                <option value="roots-tubers">Roots &amp; Tubers</option>
                <option value="vegetables">Vegetables</option>
              </select>
            </div>
          </div>

          {/* Core Stock in Kilograms & Pricing Highlight Box */}
          <div className="bg-[#f4f7f2] border-2 border-emerald-800/20 rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-[#1b4332]">
              <Scale className="w-4 h-4" />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Inventory Stock &amp; Pricing (Kilograms)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Available Stock (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={stockKg}
                    onChange={(e) => setStockKg(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black font-mono text-emerald-950 focus:outline-none focus:border-[#1b4332]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-semibold">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Price per Kilogram (₦) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-black font-mono text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Sowing Rate (kg/ha) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    required
                    value={recommendedRateKgPerHa}
                    onChange={(e) => setRecommendedRateKgPerHa(parseFloat(e.target.value) || 20)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm font-bold font-mono text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-semibold">
                    kg/ha
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stock increment buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-900/10">
              <span className="text-[11px] font-semibold text-stone-600">Quick stock additions:</span>
              {[25, 50, 100, 250, 500].map(addKg => (
                <button
                  key={addKg}
                  type="button"
                  onClick={() => setStockKg(prev => prev + addKg)}
                  className="px-2 py-0.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  +{addKg} kg
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Agronomic Description &amp; Traits
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High-yielding certified hybrid with excellent drought resistance and strong pest tolerance..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          {/* Agronomic Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Maturity Period
              </label>
              <input
                type="text"
                value={maturityDays}
                onChange={(e) => setMaturityDays(e.target.value)}
                placeholder="e.g. 85-90 days"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Yield Potential
              </label>
              <input
                type="text"
                value={yieldPotential}
                onChange={(e) => setYieldPotential(e.target.value)}
                placeholder="e.g. 5.5 - 7.0 t/ha"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Germination Rate (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={germinationRate}
                onChange={(e) => setGerminationRate(parseInt(e.target.value, 10) || 90)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {/* Breeder & Certification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Breeder / Certification Body
              </label>
              <input
                type="text"
                value={breederOrg}
                onChange={(e) => setBreederOrg(e.target.value)}
                placeholder="e.g. IAR Zaria / Premier Seeds (NASC Certified)"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Planting Season
              </label>
              <input
                type="text"
                value={plantingSeason}
                onChange={(e) => setPlantingSeason(e.target.value)}
                placeholder="e.g. May to July (Main Rains)"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {/* Suitable Agroecological Zones & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Suitable Agro-Zones (comma separated)
              </label>
              <input
                type="text"
                value={suitableAgroZoneStr}
                onChange={(e) => setSuitableAgroZoneStr(e.target.value)}
                placeholder="Sudan Savanna, Northern Guinea Savanna, Sahel"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Key Traits / Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="Drought-Tolerant, High-Yielding, NASC Certified"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Saving to Library...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{existingSeedToEdit ? 'Save Stock Changes' : 'Publish Seed to Marketplace'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
