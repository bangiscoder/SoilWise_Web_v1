import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sprout,
  ArrowRight,
  Loader2,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Archive,
  ChevronRight,
  Crosshair,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NIGERIA_STATES_LGAS } from '../../data/nigeriaStatesLga';
import {
  getUserFarms,
  createFarmProfile,
  updateFarmProfile,
  deleteFarmProfile,
  deriveEcologyForLocation,
} from '../../services/farmService';
import { setActiveFarmId } from '../../services/authService';
import { FarmProfileDocument, CreateFarmInput } from '../../types/farm';
import { LocationPermissionModal } from '../location/LocationPermissionModal';

interface FarmsManagementViewProps {
  onStartAnalysisWithFarm?: (farm: FarmProfileDocument) => void;
  onNavigateToProfile: () => void;
  onNavigateToHistory: () => void;
  onNavigateToAnalysis: () => void;
}

export const FarmsManagementView: React.FC<FarmsManagementViewProps> = ({
  onStartAnalysisWithFarm,
  onNavigateToProfile,
  onNavigateToHistory,
  onNavigateToAnalysis,
}) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [farms, setFarms] = useState<FarmProfileDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal / Form state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingFarm, setEditingFarm] = useState<FarmProfileDocument | null>(null);
  const [deletingFarm, setDeletingFarm] = useState<FarmProfileDocument | null>(null);

  // Form Fields
  const [farmName, setFarmName] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Kaduna');
  const [selectedLga, setSelectedLga] = useState<string>('Zaria');
  const [latitude, setLatitude] = useState<string>('11.1100');
  const [longitude, setLongitude] = useState<string>('7.7300');
  const [sizeHectares, setSizeHectares] = useState<string>('');
  const [farmNotes, setFarmNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  // Load farms
  const loadFarms = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getUserFarms(currentUser.uid);
      setFarms(data);
    } catch (err: any) {
      console.error('Failed to load farms:', err);
      setErrorMessage('Could not load your saved farms. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, [currentUser]);

  // Handle LGA list for selected state
  const availableLgas =
    NIGERIA_STATES_LGAS.find((item) => item.state.toLowerCase() === selectedState.toLowerCase())
      ?.lgas || [];

  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const lgas =
      NIGERIA_STATES_LGAS.find((item) => item.state.toLowerCase() === newState.toLowerCase())
        ?.lgas || [];
    if (lgas.length > 0) {
      setSelectedLga(lgas[0]);
    } else {
      setSelectedLga('');
    }
  };

  // Device GPS
  const requestDeviceCoordinates = () => {
    setIsPermissionModalOpen(false);
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setFormError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setGpsLoading(false);
        setIsPermissionDenied(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setIsPermissionDenied(true);
          setIsPermissionModalOpen(true);
        } else {
          setFormError(`Could not acquire GPS: ${err.message}`);
        }
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleGetDeviceLocation = async () => {
    if (!navigator.geolocation) {
      setFormError('Geolocation is not supported by your browser.');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
          requestDeviceCoordinates();
          return;
        } else if (permissionStatus.state === 'denied') {
          setIsPermissionDenied(true);
          setIsPermissionModalOpen(true);
          return;
        } else {
          setIsPermissionDenied(false);
          setIsPermissionModalOpen(true);
          return;
        }
      } catch {
        setIsPermissionDenied(false);
        setIsPermissionModalOpen(true);
        return;
      }
    }

    setIsPermissionDenied(false);
    setIsPermissionModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingFarm(null);
    setFarmName('');
    setSelectedState('Kaduna');
    setSelectedLga('Zaria');
    setLatitude('11.1100');
    setLongitude('7.7300');
    setSizeHectares('');
    setFarmNotes('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (farm: FarmProfileDocument) => {
    setEditingFarm(farm);
    setFarmName(farm.name);
    setSelectedState(farm.location.state);
    setSelectedLga(farm.location.lga);
    setLatitude(String(farm.location.latitude));
    setLongitude(String(farm.location.longitude));
    setSizeHectares(farm.sizeHectares ? String(farm.sizeHectares) : '');
    setFarmNotes(farm.notes || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Save / Update Farm
  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedName = farmName.trim();
    if (!trimmedName) {
      setFormError('Please enter a name for your farm.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || isNaN(lonNum)) {
      setFormError('Please provide valid numerical coordinates.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingFarm) {
        // Update existing farm
        const updated = await updateFarmProfile(currentUser.uid, editingFarm.farmId, {
          name: trimmedName,
          state: selectedState,
          lga: selectedLga,
          latitude: latNum,
          longitude: lonNum,
          sizeHectares: sizeHectares ? parseFloat(sizeHectares) : null,
          notes: farmNotes,
        });

        setFarms((prev) =>
          prev.map((f) => (f.farmId === editingFarm.farmId ? updated : f))
        );
        setSuccessMessage(`Farm "${updated.name}" has been updated.`);
      } else {
        // Create new farm
        const newFarmInput: CreateFarmInput = {
          name: trimmedName,
          state: selectedState,
          lga: selectedLga,
          latitude: latNum,
          longitude: lonNum,
          sizeHectares: sizeHectares ? parseFloat(sizeHectares) : null,
          notes: farmNotes,
        };

        const created = await createFarmProfile(currentUser.uid, newFarmInput);
        setFarms((prev) => [created, ...prev]);

        // If user didn't have an active farm, set this as active
        if (!userProfile?.activeFarmId) {
          await setActiveFarmId(currentUser.uid, created.farmId);
          await refreshProfile();
        }

        setSuccessMessage(`Farm "${created.name}" created successfully.`);
      }

      setIsAddModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Could not save farm profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Active Farm
  const handleSetActive = async (farm: FarmProfileDocument) => {
    if (!currentUser) return;
    try {
      await setActiveFarmId(currentUser.uid, farm.farmId);
      await refreshProfile();
      setSuccessMessage(`"${farm.name}" is now your active farm.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage('Could not update active farm preference.');
    }
  };

  // Delete Farm
  const handleConfirmDelete = async () => {
    if (!currentUser || !deletingFarm) return;
    try {
      const res = await deleteFarmProfile(currentUser.uid, deletingFarm.farmId);
      if (res.success) {
        setFarms((prev) => prev.filter((f) => f.farmId !== deletingFarm.farmId));
        setSuccessMessage(`Farm "${deletingFarm.name}" removed from your farms list. Historical analyses remain safely intact.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setErrorMessage(res.error || 'Failed to delete farm.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not remove farm.');
    } finally {
      setDeletingFarm(null);
    }
  };

  // Live Ecology preview in Modal
  const previewEcology = deriveEcologyForLocation(
    selectedState,
    selectedLga,
    parseFloat(latitude) || 11.11,
    parseFloat(longitude) || 7.73
  );

  const activeFarmId = userProfile?.activeFarmId || (farms.length > 0 ? farms[0].farmId : null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mb-1">
            <button
              onClick={onNavigateToAnalysis}
              className="hover:text-[#1b4332] transition-colors cursor-pointer"
            >
              SoilWise
            </button>
            <span>/</span>
            <span className="text-stone-900 font-bold">My Farms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-[#1b4332]" />
            <span>My Farm Profiles</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Manage your land holdings with stable identifiers, validated Nigerian administrative locations, and derived agro-ecological zoning.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Farm</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs sm:text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Farm Count & Summary Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-stone-900">Total Saved Farms:</span>
          <span className="bg-stone-100 text-stone-800 px-2.5 py-0.5 rounded-full font-mono font-semibold">
            {farms.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-stone-500">
          <Info className="w-3.5 h-3.5 text-stone-400" />
          <span>Farms can be linked during analysis to track multiple fields over time.</span>
        </div>
      </div>

      {/* Farm List */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#1b4332] animate-spin mx-auto" />
          <p className="text-xs sm:text-sm text-stone-500 font-medium">Loading your farm profiles...</p>
        </div>
      ) : farms.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200/90 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#1b4332] flex items-center justify-center mx-auto shadow-2xs">
            <Compass className="w-7 h-7 text-emerald-700" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-stone-900">No Farm Profiles Saved Yet</h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Add your farm locations to quickly run assessments, compare seasonal soil trends, and personalize recommendations.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Farm Profile</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {farms.map((farm) => {
            const isActive = farm.farmId === activeFarmId;
            return (
              <div
                key={farm.farmId}
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                  isActive
                    ? 'border-2 border-[#1b4332] shadow-sm ring-2 ring-[#1b4332]/10'
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar on Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#1b4332]/10 text-[#1b4332] flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-stone-900 leading-tight">
                          {farm.name}
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                          {farm.location.lga}, {farm.location.state}
                        </p>
                      </div>
                    </div>

                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Active Farm</span>
                      </span>
                    )}
                  </div>

                  {/* Agro-Ecology Badge */}
                  <div className="p-3 bg-[#fafaf7] rounded-xl border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-500">
                      <span>Agro-Ecological Zone</span>
                      <span className="text-emerald-700 font-mono">SoilWise Verified</span>
                    </div>
                    <p className="text-xs font-bold text-stone-800">
                      {farm.ecology.value}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Coordinates: {farm.location.latitude.toFixed(4)}°, {farm.location.longitude.toFixed(4)}°
                    </p>
                  </div>

                  {/* Size & Notes */}
                  {(farm.sizeHectares || farm.notes) && (
                    <div className="text-xs space-y-1 pt-1 border-t border-stone-100 text-stone-600">
                      {farm.sizeHectares && (
                        <p className="flex items-center gap-1.5 font-medium">
                          <span className="text-stone-400">Land Area:</span>
                          <span className="font-semibold text-stone-900">{farm.sizeHectares} hectares</span>
                        </p>
                      )}
                      {farm.notes && (
                        <p className="text-stone-500 italic text-[11px] truncate">
                          "{farm.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(farm)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(farm)}
                      title="Edit farm details"
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingFarm(farm)}
                      title="Remove farm"
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onStartAnalysisWithFarm) {
                        onStartAnalysisWithFarm(farm);
                      } else {
                        onNavigateToAnalysis();
                      }
                    }}
                    className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Sprout className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Run Analysis</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Farm Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  {editingFarm ? 'Edit Farm Profile' : 'Add New Farm Profile'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Enter geographic coordinates and location for agro-ecological validation.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFarm} className="space-y-4">
              {/* Farm Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Farm Name *
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  placeholder="e.g. My Main Farm or Zaria Cereals Plot"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 text-xs sm:text-sm outline-none transition-all"
                />
              </div>

              {/* State & LGA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    State (Nigeria) *
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs sm:text-sm outline-none bg-white cursor-pointer"
                  >
                    {NIGERIA_STATES_LGAS.map((item) => (
                      <option key={item.state} value={item.state}>
                        {item.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Local Government Area (LGA) *
                  </label>
                  <select
                    value={selectedLga}
                    onChange={(e) => setSelectedLga(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs sm:text-sm outline-none bg-white cursor-pointer"
                  >
                    {availableLgas.map((lga) => (
                      <option key={lga} value={lga}>
                        {lga}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coordinates & GPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Geographic Coordinates (WGS84) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGetDeviceLocation}
                    disabled={gpsLoading}
                    className="text-[11px] font-bold text-[#1b4332] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{gpsLoading ? 'Acquiring GPS...' : 'Use Device GPS'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block mb-0.5">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="11.1100"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block mb-0.5">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="7.7300"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Derived Ecology Preview */}
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-emerald-800 block">
                    Derived Agro-Ecological Zone
                  </span>
                  <span className="font-bold text-emerald-950">{previewEcology.value}</span>
                </div>
                <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-800">
                  Automatic
                </span>
              </div>

              {/* Optional Farm Size */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Farm Land Area in Hectares <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={sizeHectares}
                  onChange={(e) => setSizeHectares(e.target.value)}
                  placeholder="e.g. 2.5"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs outline-none"
                />
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notes / Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={farmNotes}
                  onChange={(e) => setFarmNotes(e.target.value)}
                  placeholder="e.g. North plot next to irrigation canal"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-[#1b4332] text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingFarm ? 'Save Changes' : 'Create Farm Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Section 21 Reassurance) */}
      {deletingFarm && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-stone-900">
                Remove Farm Profile?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-stone-900">"{deletingFarm.name}"</strong>?
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Historical Analyses Protected</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                All previous soil and crop variety assessments linked to this farm will remain safely preserved in your analysis history.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingFarm(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Permission Guidance Modal */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        isDenied={isPermissionDenied}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirmGrant={requestDeviceCoordinates}
      />
    </div>
  );
};
