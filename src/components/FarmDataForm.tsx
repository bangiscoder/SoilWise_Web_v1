import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  FlaskConical, 
  Navigation, 
  AlertCircle, 
  AlertTriangle,
  Check, 
  Info,
  ShieldCheck,
  Loader2,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPinCheck,
  RefreshCw,
  Compass,
  Crown,
  Sprout,
  Search,
  Sparkles,
  Wheat,
} from 'lucide-react';
import { SoilData } from '../types/soilwise';
import { NIGERIA_STATES_LGAS } from '../data/nigeriaStatesLga';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getUserFarms } from '../services/farmService';
import { FarmProfileDocument } from '../types/farm';
import { 
  analyzeSoilPhoto, 
  validateSoilPhotoFile, 
  SoilPhotoAnalysisResult 
} from '../services/soilPhotoAnalysisService';
import { validateLocationApi } from '../services/soilDataValidationService';
import { LocationValidationResult } from '../types/soilDataValidation';
import { LocationPermissionModal } from './location/LocationPermissionModal';
import heroBackground from '../assets/images/farm_analysis_hero_1790600561723.jpg';

export interface AvailableCrop {
  id: string;
  name: string; // Plain crop name only (e.g. "Maize", "Rice", "Cassava")
  altHint?: string; // Informative common alias
  category: 'cereals' | 'legumes' | 'tubers' | 'vegetables' | 'cash';
  categoryLabel: string;
  emoji: string;
  description: string;
  popular?: boolean;
}

export const AVAILABLE_CROPS: AvailableCrop[] = [
  {
    id: 'maize',
    name: 'Maize',
    altHint: 'Corn',
    category: 'cereals',
    categoryLabel: 'Cereal / Grain',
    emoji: '🌽',
    description: 'High-demand staple grain responsive to nitrogen and balanced soil pH.',
    popular: true,
  },
  {
    id: 'rice',
    name: 'Rice',
    category: 'cereals',
    categoryLabel: 'Cereal / Grain',
    emoji: '🌾',
    description: 'Staple grain thriving in lowland fadama, river basins, and rainfed uplands.',
    popular: true,
  },
  {
    id: 'cassava',
    name: 'Cassava',
    category: 'tubers',
    categoryLabel: 'Root / Tuber',
    emoji: '🥔',
    description: 'Hardy drought-tolerant root crop with exceptional food security value.',
    popular: true,
  },
  {
    id: 'cowpea',
    name: 'Cowpea',
    altHint: 'Beans',
    category: 'legumes',
    categoryLabel: 'Legume / Pulse',
    emoji: '🫘',
    description: 'High-protein staple legume that fixes nitrogen naturally into farmland.',
    popular: true,
  },
  {
    id: 'soybeans',
    name: 'Soybeans',
    category: 'legumes',
    categoryLabel: 'Legume / Pulse',
    emoji: '🌱',
    description: 'Commercial cash legume high in protein, excellent for soil fertility.',
    popular: true,
  },
  {
    id: 'sorghum',
    name: 'Sorghum',
    altHint: 'Guinea Corn',
    category: 'cereals',
    categoryLabel: 'Cereal / Grain',
    emoji: '🌾',
    description: 'Resilient dryland savanna grain with exceptional heat and drought tolerance.',
    popular: true,
  },
  {
    id: 'groundnut',
    name: 'Groundnut',
    altHint: 'Peanut',
    category: 'legumes',
    categoryLabel: 'Legume / Oilseed',
    emoji: '🥜',
    description: 'Drought-hardy oilseed and protein crop well suited for sandy-loam soils.',
    popular: true,
  },
  {
    id: 'yam',
    name: 'Yam',
    category: 'tubers',
    categoryLabel: 'Root / Tuber',
    emoji: '🍠',
    description: 'High-value staple tuber demanding deep, well-drained fertile soils.',
  },
  {
    id: 'millet',
    name: 'Millet',
    category: 'cereals',
    categoryLabel: 'Cereal / Grain',
    emoji: '🌾',
    description: 'Fast-maturing dryland grain ideal for low rainfall and short savanna seasons.',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'cereals',
    categoryLabel: 'Cereal / Grain',
    emoji: '🌾',
    description: 'Cool-season irrigated cereal suited for northern savanna winters.',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'vegetables',
    categoryLabel: 'Vegetable',
    emoji: '🍅',
    description: 'High-value fresh market crop requiring fertile, friable soils and sunshine.',
  },
  {
    id: 'pepper',
    name: 'Pepper',
    category: 'vegetables',
    categoryLabel: 'Vegetable',
    emoji: '🌶️',
    description: 'Staple culinary spice vegetable widely cultivated across Nigeria.',
  },
  {
    id: 'onion',
    name: 'Onion',
    category: 'vegetables',
    categoryLabel: 'Vegetable',
    emoji: '🧅',
    description: 'Savanna dry-season bulb vegetable suited for friable, well-drained soils.',
  },
  {
    id: 'ginger',
    name: 'Ginger',
    category: 'cash',
    categoryLabel: 'Cash Crop',
    emoji: '🫚',
    description: 'High-value export cash rhizome thriving in rich, friable loamy soil.',
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'cash',
    categoryLabel: 'Oilseed / Cash Crop',
    emoji: '🌻',
    description: 'Drought-tolerant oilseed crop with deep roots and high commercial value.',
  },
];

interface FarmDataFormProps {
  onSubmit: (
    soilData: SoilData,
    coordinates: { latitude: number; longitude: number },
    analysisDate: string,
    locationDetails?: { state?: string; lga?: string },
    soilTestMeta?: {
      hasSoilTest?: boolean;
      soilPhoto?: string | null;
      photoAnalysisResult?: {
        estimatedTextureClass?: string;
        confidence?: number;
        fileName?: string;
      } | null;
      locationValidation?: LocationValidationResult | null;
      farmId?: string;
      farmName?: string;
      intendedCrop?: string;
    }
  ) => void;
  isSubmitting: boolean;
  preselectedFarm?: FarmProfileDocument | null;
  onOpenCommitmentModal?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToLogin?: () => void;
}

export const FarmDataForm: React.FC<FarmDataFormProps> = ({ 
  onSubmit, 
  isSubmitting, 
  preselectedFarm,
  onOpenCommitmentModal,
  onNavigateToRegister,
  onNavigateToLogin,
}) => {
  const { t } = useLanguage();
  const { currentUser, userProfile } = useAuth();

  // Saved user farms for optional farm linking (Section 13)
  const [userFarms, setUserFarms] = useState<FarmProfileDocument[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<FarmProfileDocument | null>(preselectedFarm || null);

  // Active form section: 1 = Soil Analysis Data, 2 = Soil Photo, 3 = Farm Location, 4 = Intended Crop
  const [currentSection, setCurrentSection] = useState<1 | 2 | 3 | 4>(1);

  // Step 4: Intended Crop Selection
  const [selectedCrop, setSelectedCrop] = useState<string>('Maize');
  const [otherCropName, setOtherCropName] = useState<string>('');
  const [cropSearch, setCropSearch] = useState<string>('');
  const [cropCategoryFilter, setCropCategoryFilter] = useState<string>('all');

  // Soil test availability state (null = not selected yet, true = Yes, false = No)
  const [hasSoilTest, setHasSoilTest] = useState<boolean | null>(null);

  // Optional soil photo upload state
  const [soilPhotoFile, setSoilPhotoFile] = useState<File | null>(null);
  const [soilPhotoPreview, setSoilPhotoPreview] = useState<string | null>(null);
  const [soilPhotoAnalysis, setSoilPhotoAnalysis] = useState<SoilPhotoAnalysisResult | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Soil fields - start completely blank with no prefilled values
  const [ph, setPh] = useState<string>('');
  const [nitrogen, setNitrogen] = useState<string>('');
  const [phosphorus, setPhosphorus] = useState<string>('');
  const [potassium, setPotassium] = useState<string>('');
  const [ec, setEc] = useState<string>('');

  // Required Farm Location fields - all start completely blank
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  // Selected State and LGA selection
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedLga, setSelectedLga] = useState<string>('');

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);

  // Geographic validation state
  const [locationValidation, setLocationValidation] = useState<LocationValidationResult | null>(null);
  const [isValidatingLocation, setIsValidatingLocation] = useState<boolean>(false);
  const [boundaryConfirmed, setBoundaryConfirmed] = useState<boolean>(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const triggerLocationValidation = async (
    stateVal = selectedState,
    lgaVal = selectedLga,
    latVal = latitude,
    lonVal = longitude,
    accVal = gpsAccuracy
  ): Promise<LocationValidationResult | null> => {
    const latNum = parseFloat(latVal);
    const lonNum = parseFloat(lonVal);
    if (!stateVal || !lgaVal || isNaN(latNum) || isNaN(lonNum)) {
      setLocationValidation(null);
      return null;
    }
    setIsValidatingLocation(true);
    try {
      const res = await validateLocationApi(stateVal, lgaVal, latNum, lonNum, accVal);
      setLocationValidation(res);
      return res;
    } catch (err: any) {
      console.warn('Geographic validation error:', err);
      return null;
    } finally {
      setIsValidatingLocation(false);
    }
  };

  // Section 13: Load user saved farms and auto-apply preselected / active farm
  useEffect(() => {
    if (currentUser) {
      getUserFarms(currentUser.uid)
        .then((farms) => {
          setUserFarms(farms);
          if (preselectedFarm) {
            handleApplyFarm(preselectedFarm);
          } else if (userProfile?.activeFarmId) {
            const active = farms.find((f) => f.farmId === userProfile.activeFarmId);
            if (active) {
              handleApplyFarm(active);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not load saved farms:', err);
        });
    }
  }, [currentUser, preselectedFarm]);

  const handleApplyFarm = (farm: FarmProfileDocument) => {
    setSelectedFarm(farm);
    setSelectedState(farm.location.state);
    setSelectedLga(farm.location.lga);
    setLatitude(String(farm.location.latitude));
    setLongitude(String(farm.location.longitude));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.state;
      delete next.lga;
      delete next.latitude;
      delete next.longitude;
      delete next.locationConflict;
      delete next.boundary;
      return next;
    });
    triggerLocationValidation(
      farm.location.state,
      farm.location.lga,
      String(farm.location.latitude),
      String(farm.location.longitude)
    );
  };

  const handleClearFarm = () => {
    setSelectedFarm(null);
  };

  useEffect(() => {
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (
      selectedState &&
      selectedLga &&
      !isNaN(latNum) &&
      !isNaN(lonNum) &&
      latNum >= 4.0 &&
      latNum <= 14.0 &&
      lonNum >= 2.5 &&
      lonNum <= 15.0
    ) {
      const timer = setTimeout(() => {
        triggerLocationValidation(selectedState, selectedLga, latitude, longitude, gpsAccuracy);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setLocationValidation(null);
      setBoundaryConfirmed(false);
    }
  }, [selectedState, selectedLga, latitude, longitude, gpsAccuracy]);

  const requestGpsCoordinates = () => {
    setIsPermissionModalOpen(false);
    setGeoError(null);
    setGeoSuccess(false);

    if (!('geolocation' in navigator)) {
      setGeoError(t('form.validation.geoError'));
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const acc = position.coords.accuracy !== undefined ? position.coords.accuracy : null;
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        setGpsAccuracy(acc);
        setGeoSuccess(true);
        setGeoLoading(false);
        setIsPermissionDenied(false);
        // Clear coordinate errors
        setErrors((prev) => {
          const next = { ...prev };
          delete next.latitude;
          delete next.longitude;
          delete next.locationConflict;
          delete next.boundary;
          return next;
        });
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setIsPermissionDenied(true);
          setIsPermissionModalOpen(true);
          setGeoError(t('form.validation.geoPermission'));
        } else {
          setGeoError(t('form.validation.geoError'));
        }
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleGetLocation = async () => {
    setGeoError(null);
    setGeoSuccess(false);

    if (!('geolocation' in navigator)) {
      setGeoError(t('form.validation.geoError'));
      return;
    }

    // Check if user has already granted permission permanently
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
          // Already allowed always -> proceed directly
          requestGpsCoordinates();
          return;
        } else if (permissionStatus.state === 'denied') {
          // Permission blocked -> show guidance modal
          setIsPermissionDenied(true);
          setIsPermissionModalOpen(true);
          return;
        } else {
          // Permission is 'prompt' (not allowed always) -> explicitly prompt user
          setIsPermissionDenied(false);
          setIsPermissionModalOpen(true);
          return;
        }
      } catch {
        // Fallback to opening permission modal
        setIsPermissionDenied(false);
        setIsPermissionModalOpen(true);
        return;
      }
    }

    // Default to prompt modal if permissions query not supported
    setIsPermissionDenied(false);
    setIsPermissionModalOpen(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    const validation = validateSoilPhotoFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error || 'Invalid file');
      return;
    }

    setSoilPhotoFile(file);
    setIsAnalyzingPhoto(true);

    try {
      const analysis = await analyzeSoilPhoto(file);
      setSoilPhotoPreview(analysis.imageUrl);
      setSoilPhotoAnalysis(analysis);
    } catch (err: any) {
      console.error('Photo processing error:', err);
      setPhotoError(err.message || 'Could not process soil photo.');
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setSoilPhotoFile(null);
    setSoilPhotoPreview(null);
    setSoilPhotoAnalysis(null);
    setPhotoError(null);
  };

  // Validate Section 1: Soil Analysis Data
  const validateSection1 = (): boolean => {
    const errs: Record<string, string> = { ...errors };

    // 1. Soil test availability question must be explicitly chosen
    if (hasSoilTest === null) {
      errs.hasSoilTest = t('form.validation.hasSoilTestRequired');
      setErrors(errs);
      const el = document.getElementById('soilTestQuestion');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    delete errs.hasSoilTest;

    // 2. Only validate manual soil chemistry if user selected YES
    if (hasSoilTest === true) {
      let firstErrorKey: string | null = null;

      // pH validation (Required, 1.0 - 14.0)
      if (!ph.trim()) {
        errs.ph = t('form.validation.phRequired');
        firstErrorKey = firstErrorKey || 'ph';
      } else {
        const phNum = parseFloat(ph);
        if (isNaN(phNum) || phNum < 1 || phNum > 14) {
          errs.ph = t('form.validation.phRange');
          firstErrorKey = firstErrorKey || 'ph';
        } else {
          delete errs.ph;
        }
      }

      // Nitrogen validation (Required, >= 0 mg/kg)
      if (!nitrogen.trim()) {
        errs.nitrogen = t('form.validation.nRequired');
        firstErrorKey = firstErrorKey || 'nitrogen';
      } else {
        const nNum = parseFloat(nitrogen);
        if (isNaN(nNum) || nNum < 0) {
          errs.nitrogen = t('form.validation.nRange');
          firstErrorKey = firstErrorKey || 'nitrogen';
        } else {
          delete errs.nitrogen;
        }
      }

      // Phosphorus validation (Required, >= 0 mg/kg)
      if (!phosphorus.trim()) {
        errs.phosphorus = t('form.validation.pRequired');
        firstErrorKey = firstErrorKey || 'phosphorus';
      } else {
        const pNum = parseFloat(phosphorus);
        if (isNaN(pNum) || pNum < 0) {
          errs.phosphorus = t('form.validation.pRange');
          firstErrorKey = firstErrorKey || 'phosphorus';
        } else {
          delete errs.phosphorus;
        }
      }

      // Potassium validation (Required, >= 0 mg/kg)
      if (!potassium.trim()) {
        errs.potassium = t('form.validation.kRequired');
        firstErrorKey = firstErrorKey || 'potassium';
      } else {
        const kNum = parseFloat(potassium);
        if (isNaN(kNum) || kNum < 0) {
          errs.potassium = t('form.validation.kRange');
          firstErrorKey = firstErrorKey || 'potassium';
        } else {
          delete errs.potassium;
        }
      }

      // Electrical Conductivity validation (Required, >= 0 dS/m)
      if (!ec.trim()) {
        errs.ec = t('form.validation.ecRequired');
        firstErrorKey = firstErrorKey || 'ec';
      } else {
        const ecNum = parseFloat(ec);
        if (isNaN(ecNum) || ecNum < 0) {
          errs.ec = t('form.validation.ecRange');
          firstErrorKey = firstErrorKey || 'ec';
        } else {
          delete errs.ec;
        }
      }

      setErrors(errs);
      if (firstErrorKey) {
        const el = document.getElementById(`${firstErrorKey}Input`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement)?.focus?.();
        return false;
      }
    } else {
      delete errs.ph;
      delete errs.nitrogen;
      delete errs.phosphorus;
      delete errs.potassium;
      delete errs.ec;
      setErrors(errs);
    }

    return true;
  };

  // Validate Section 3: Farm Location
  const validateLocation = (): boolean => {
    const errs: Record<string, string> = { ...errors };
    let firstErrorKey: string | null = null;

    if (!selectedState.trim()) {
      errs.state = 'Please select your State';
      firstErrorKey = firstErrorKey || 'state';
    } else {
      delete errs.state;
    }

    if (!selectedLga.trim()) {
      errs.lga = 'Please select your LGA';
      firstErrorKey = firstErrorKey || 'lga';
    } else {
      delete errs.lga;
    }

    if (!latitude.trim()) {
      errs.latitude = t('form.validation.latRequired');
      firstErrorKey = firstErrorKey || 'latitude';
    } else {
      const latNum = parseFloat(latitude);
      if (isNaN(latNum) || latNum < 4.0 || latNum > 14.0) {
        errs.latitude = t('form.validation.latRange');
        firstErrorKey = firstErrorKey || 'latitude';
      } else {
        delete errs.latitude;
      }
    }

    if (!longitude.trim()) {
      errs.longitude = t('form.validation.lngRequired');
      firstErrorKey = firstErrorKey || 'longitude';
    } else {
      const lonNum = parseFloat(longitude);
      if (isNaN(lonNum) || lonNum < 2.5 || lonNum > 15.0) {
        errs.longitude = t('form.validation.lngRange');
        firstErrorKey = firstErrorKey || 'longitude';
      } else {
        delete errs.longitude;
      }
    }

    setErrors(errs);
    if (firstErrorKey) {
      const el = document.getElementById(`${firstErrorKey}Input`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement)?.focus?.();
      return false;
    }

    return true;
  };

  // Section Navigation Handlers
  const handleContinueToPhoto = () => {
    if (validateSection1()) {
      setCurrentSection(2);
      const formEl = document.getElementById('farmAnalysisForm');
      formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBackToSoilData = () => {
    setCurrentSection(1);
    const formEl = document.getElementById('farmAnalysisForm');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleContinueToLocation = () => {
    setCurrentSection(3);
    const formEl = document.getElementById('farmAnalysisForm');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBackToPhoto = () => {
    setCurrentSection(2);
    const formEl = document.getElementById('farmAnalysisForm');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleContinueToCrop = async () => {
    if (!validateLocation()) return;

    let currentValidation = locationValidation;
    if (!currentValidation) {
      currentValidation = await triggerLocationValidation(
        selectedState,
        selectedLga,
        latitude,
        longitude,
        gpsAccuracy
      );
    }

    if (currentValidation) {
      const status = currentValidation.validation.status;
      if (status === 'match') {
        // Confirmed match - proceed
      } else if (status === 'boundary_uncertain') {
        if (!boundaryConfirmed) {
          setErrors((prev) => ({
            ...prev,
            boundary: 'Please confirm your farm location near the boundary before continuing.',
          }));
          const cardEl = document.getElementById('locationValidationCard');
          cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        // Conflicting or invalid location: do not silently proceed
        setErrors((prev) => ({
          ...prev,
          locationConflict: 'Please resolve the location mismatch before continuing.',
        }));
        const cardEl = document.getElementById('locationValidationCard');
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setCurrentSection(4);
    const formEl = document.getElementById('farmAnalysisForm');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBackToLocation = () => {
    setCurrentSection(3);
    const formEl = document.getElementById('farmAnalysisForm');
    formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Check Section 1 validity
    if (!validateSection1()) {
      setCurrentSection(1);
      return;
    }

    // Check Section 3 validity
    if (!validateLocation()) {
      setCurrentSection(3);
      return;
    }

    // Validate location coordinates against administrative boundaries
    let currentValidation = locationValidation;
    if (!currentValidation) {
      currentValidation = await triggerLocationValidation(
        selectedState,
        selectedLga,
        latitude,
        longitude,
        gpsAccuracy
      );
    }

    if (currentValidation) {
      const status = currentValidation.validation.status;
      if (status === 'match') {
        // Confirmed match - proceed
      } else if (status === 'boundary_uncertain') {
        if (!boundaryConfirmed) {
          setErrors((prev) => ({
            ...prev,
            boundary: 'Please confirm your farm location near the boundary before continuing.',
          }));
          const cardEl = document.getElementById('locationValidationCard');
          cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        // Conflicting or invalid location: do not silently proceed
        setErrors((prev) => ({
          ...prev,
          locationConflict: 'Please resolve the location mismatch before continuing.',
        }));
        const cardEl = document.getElementById('locationValidationCard');
        cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    const soilData: SoilData = hasSoilTest === true
      ? {
          ph: parseFloat(ph),
          nitrogen: parseFloat(nitrogen),
          phosphorus: parseFloat(phosphorus),
          potassium: parseFloat(potassium),
          ec: parseFloat(ec),
        }
      : {
          // Standard regional baseline reference values when user does not have a laboratory soil test
          ph: 6.5,
          nitrogen: 25,
          phosphorus: 15,
          potassium: 120,
          ec: 0.25,
        };

    // System automatically captures the analysis date internally
    const autoAnalysisDate = new Date().toISOString().split('T')[0];

    const finalIntendedCrop = selectedCrop === 'recommend_for_me'
      ? 'Not sure (Recommend for me)'
      : selectedCrop === 'other'
      ? (otherCropName.trim() || 'Other Crop')
      : (selectedCrop || 'Not sure (Recommend for me)');

    onSubmit(
      soilData,
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      autoAnalysisDate,
      {
        state: selectedState || undefined,
        lga: selectedLga || undefined,
      },
      {
        hasSoilTest: hasSoilTest === true,
        soilPhoto: soilPhotoPreview || null,
        photoAnalysisResult: soilPhotoAnalysis ? {
          estimatedTextureClass: soilPhotoAnalysis.estimatedTextureClass,
          confidence: soilPhotoAnalysis.confidence,
          fileName: soilPhotoAnalysis.fileName,
        } : null,
        locationValidation: currentValidation || null,
        farmId: selectedFarm?.farmId,
        farmName: selectedFarm?.name,
        intendedCrop: finalIntendedCrop,
      }
    );
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION (~50vh) */}
      <section className="relative h-[48vh] sm:h-[50vh] min-h-[380px] w-full flex items-center justify-center overflow-hidden bg-stone-950">
        <img
          src={heroBackground}
          alt="Agricultural farmland soil and crops"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Dark contrast overlay for high text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/65 to-stone-950/50" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-3.5 py-1 rounded-full border border-emerald-500/30 mb-3.5 backdrop-blur-xs">
            {t('hero.eyebrow')}
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            {t('hero.title')}
          </h1>
          <p className="mt-3.5 text-base sm:text-xl text-stone-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-xs">
            {t('hero.caption')}
          </p>
        </div>
      </section>

      {/* 2. THE 3-STAGE V1 PIPELINE */}
      <section className="bg-[#f4f7f2] border-b border-stone-200/80 py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {t('pipeline.title')}
            </h2>
            <p className="text-sm sm:text-base text-stone-700 max-w-3xl mx-auto leading-relaxed">
              {t('pipeline.caption')}
            </p>
          </div>

          {/* Three Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                  1
                </div>
                <h3 className="font-semibold text-stone-900 text-base mb-2">
                  {t('pipeline.stage1Title')}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {t('pipeline.stage1Desc')}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                  2
                </div>
                <h3 className="font-semibold text-stone-900 text-base mb-2">
                  {t('pipeline.stage2Title')}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {t('pipeline.stage2Desc')}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center mb-3 font-bold text-sm">
                  3
                </div>
                <h3 className="font-semibold text-stone-900 text-base mb-2">
                  {t('pipeline.stage3Title')}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {t('pipeline.stage3Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* Agricultural Data Transparency Statement */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex items-start gap-3.5 text-xs sm:text-sm text-stone-700">
            <ShieldCheck className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-stone-900 text-sm">
                {t('transparency.badge')}
              </h4>
              <p className="leading-relaxed text-stone-600">
                {t('transparency.notice')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN FARM ANALYSIS FORM */}
      <section id="farmAnalysisForm" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
        {/* Direct VIP Upgrade Banner (No Farm Analysis Required) */}
        {!userProfile?.isVipFarmer && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 rounded-3xl p-4 sm:p-5 text-stone-950 shadow-md border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-stone-950 text-amber-300 px-2.5 py-0.5 rounded-full">
                    Direct VIP Upgrade
                  </span>
                  <span className="text-xs font-bold text-stone-900">
                    No Farm Analysis Required
                  </span>
                </div>
                <p className="text-xs text-stone-900 font-medium leading-relaxed">
                  Commit <strong>₦1,000 (100% refundable)</strong> to unlock <strong>35% off certified seed varieties</strong> and <strong>100% free nationwide farm delivery</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  try {
                    sessionStorage.setItem('soilwise_pending_action', 'open_commitment');
                  } catch {}
                  onNavigateToRegister?.();
                } else if (onOpenCommitmentModal) {
                  onOpenCommitmentModal();
                }
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-stone-950 hover:bg-stone-900 text-amber-300 text-xs sm:text-sm font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 shrink-0"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>{currentUser ? 'Upgrade Account (₦1,000)' : 'Sign Up to Upgrade (₦1,000)'}</span>
            </button>
          </div>
        )}

        {/* Header of input area */}
        <div className="text-center sm:text-left space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1b4332]">
            {t('nav.farmAnalysis')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            {t('nav.farmAnalysis')}
          </h2>
          <p className="text-sm text-stone-600">
            {t('hero.caption')}
          </p>
        </div>

        {/* Section 13: Optional Farm Linking for Authenticated Farmers */}
        {currentUser && userFarms.length > 0 && (
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 mb-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Saved Farm Association (Optional)
                  </span>
                  <span className="text-[11px] text-stone-600 block">
                    {selectedFarm ? (
                      <>
                        Linked to: <strong className="text-stone-900 font-semibold">{selectedFarm.name}</strong> ({selectedFarm.location.state}, {selectedFarm.location.lga})
                      </>
                    ) : (
                      'Select a saved farm to automatically fill coordinates and agro-ecology, or analyse as new farm.'
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedFarm?.farmId || ''}
                  onChange={(e) => {
                    const farmId = e.target.value;
                    const found = userFarms.find((f) => f.farmId === farmId);
                    if (found) {
                      handleApplyFarm(found);
                    } else {
                      handleClearFarm();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 text-stone-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] shadow-2xs"
                >
                  <option value="">Analyse as new farm</option>
                  {userFarms.map((f) => (
                    <option key={f.farmId} value={f.farmId}>
                      {f.name} ({f.location.state}, {f.location.lga})
                    </option>
                  ))}
                </select>

                {selectedFarm ? (
                  <button
                    type="button"
                    onClick={handleClearFarm}
                    className="px-2.5 py-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    Analyse as new farm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (userFarms[0]) handleApplyFarm(userFarms[0]);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    Use saved farm
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4-Section Stepper Indicator */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200/90 shadow-xs mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {/* Step 1: Soil Analysis Data */}
            <button
              type="button"
              onClick={() => {
                setCurrentSection(1);
                document.getElementById('farmAnalysisForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer ${
                currentSection === 1
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : hasSoilTest !== null
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                  : 'bg-transparent hover:bg-stone-50 text-stone-500'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentSection === 1
                  ? 'bg-white/20 text-white'
                  : hasSoilTest !== null
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {hasSoilTest !== null && currentSection !== 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
              </div>
              <div className="hidden sm:block min-w-0">
                <span className="text-xs font-bold block truncate">1. Soil Analysis</span>
                <span className={`text-[10px] block truncate ${currentSection === 1 ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {hasSoilTest === true ? 'Lab data' : hasSoilTest === false ? 'No lab test' : 'Required'}
                </span>
              </div>
              <span className="sm:hidden text-xs font-bold truncate">1. Soil</span>
            </button>

            {/* Step 2: Soil Photo */}
            <button
              type="button"
              onClick={() => {
                if (validateSection1()) {
                  setCurrentSection(2);
                  document.getElementById('farmAnalysisForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer ${
                currentSection === 2
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : soilPhotoPreview
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                  : 'bg-transparent hover:bg-stone-50 text-stone-500'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentSection === 2
                  ? 'bg-white/20 text-white'
                  : soilPhotoPreview
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {soilPhotoPreview && currentSection !== 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
              </div>
              <div className="hidden sm:block min-w-0">
                <span className="text-xs font-bold block truncate">2. Soil Photo</span>
                <span className={`text-[10px] block truncate ${currentSection === 2 ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {soilPhotoPreview ? 'Photo attached' : 'Optional'}
                </span>
              </div>
              <span className="sm:hidden text-xs font-bold truncate">2. Photo</span>
            </button>

            {/* Step 3: Farm Location */}
            <button
              type="button"
              onClick={() => {
                if (validateSection1()) {
                  setCurrentSection(3);
                  document.getElementById('farmAnalysisForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer ${
                currentSection === 3
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : latitude && longitude
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                  : 'bg-transparent hover:bg-stone-50 text-stone-500'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentSection === 3
                  ? 'bg-white/20 text-white'
                  : latitude && longitude
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {latitude && longitude && currentSection !== 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
              </div>
              <div className="hidden sm:block min-w-0">
                <span className="text-xs font-bold block truncate">3. Location</span>
                <span className={`text-[10px] block truncate ${currentSection === 3 ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {latitude && longitude ? 'GPS set' : 'Required'}
                </span>
              </div>
              <span className="sm:hidden text-xs font-bold truncate">3. Location</span>
            </button>

            {/* Step 4: Intended Crop */}
            <button
              type="button"
              onClick={() => {
                if (validateSection1()) {
                  handleContinueToCrop();
                }
              }}
              className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl transition-all text-left cursor-pointer ${
                currentSection === 4
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : selectedCrop
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                  : 'bg-transparent hover:bg-stone-50 text-stone-500'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentSection === 4
                  ? 'bg-white/20 text-white'
                  : selectedCrop
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {selectedCrop && currentSection !== 4 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '4'}
              </div>
              <div className="hidden sm:block min-w-0">
                <span className="text-xs font-bold block truncate">4. Intended Crop</span>
                <span className={`text-[10px] block truncate ${currentSection === 4 ? 'text-emerald-100' : 'text-stone-500'}`}>
                  {selectedCrop ? (selectedCrop === 'recommend_for_me' ? 'Recommend' : selectedCrop === 'other' ? (otherCropName || 'Other') : selectedCrop) : 'Required'}
                </span>
              </div>
              <span className="sm:hidden text-xs font-bold truncate">4. Crop</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: SOIL ANALYSIS DATA */}
          {currentSection === 1 && (
            <div id="soilDataSection" className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {t('form.soilDataTitle')}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    {t('form.soilDataSubtitle')}
                  </p>
                </div>
              </div>

              {/* 1. SOIL-TEST AVAILABILITY QUESTION (Before the pH, N, P, K and EC inputs) */}
              <div id="soilTestQuestion" className="p-5 sm:p-6 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                    {t('form.hasSoilTestQuestion')} <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {t('form.hasSoilTestSubtitle')}
                  </p>
                </div>

                {/* Two Options: Yes / No - neither preselected */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Option 1: Yes, I have a soil test result */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasSoilTest(true);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.hasSoilTest;
                        return next;
                      });
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                      hasSoilTest === true
                        ? 'border-[#1b4332] bg-[#f0f5ee] text-[#1b4332] ring-2 ring-[#1b4332]/25 font-semibold shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      hasSoilTest === true ? 'border-[#1b4332] bg-[#1b4332] text-white' : 'border-stone-300 bg-stone-100'
                    }`}>
                      {hasSoilTest === true && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs sm:text-sm font-bold block text-stone-900">
                        {t('form.hasSoilTestYes')}
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        Enter laboratory pH, N, P, K & EC values
                      </span>
                    </div>
                  </button>

                  {/* Option 2: No, I don't have a soil test result */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasSoilTest(false);
                      // Clear any manual soil parameter errors
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.hasSoilTest;
                        delete next.ph;
                        delete next.nitrogen;
                        delete next.phosphorus;
                        delete next.potassium;
                        delete next.ec;
                        return next;
                      });
                    }}
                    className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                      hasSoilTest === false
                        ? 'border-[#1b4332] bg-[#f0f5ee] text-[#1b4332] ring-2 ring-[#1b4332]/25 font-semibold shadow-xs'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      hasSoilTest === false ? 'border-[#1b4332] bg-[#1b4332] text-white' : 'border-stone-300 bg-stone-100'
                    }`}>
                      {hasSoilTest === false && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs sm:text-sm font-bold block text-stone-900">
                        {t('form.hasSoilTestNo')}
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        Continue with initial assessment using location
                      </span>
                    </div>
                  </button>
                </div>

                {errors.hasSoilTest && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.hasSoilTest}</span>
                  </p>
                )}
              </div>

              {/* 2. WHEN THE USER SELECTS YES */}
              {hasSoilTest === true && (
                <div className="space-y-5 pt-2">
                  {/* Contextual label: Source: User-provided soil test result */}
                  <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1b4332] bg-[#f0f5ee] px-3 py-1 rounded-full border border-[#1b4332]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332]" />
                      {t('form.soilTestSourceUser')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {/* pH */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="phInput" className="block text-xs font-semibold text-stone-700">
                          {t('form.phLabel')} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">1.0 &ndash; 14.0</span>
                      </div>
                      <div className="relative">
                        <input
                          id="phInput"
                          type="number"
                          step="0.01"
                          min="1"
                          max="14"
                          placeholder={t('form.phPlaceholder')}
                          value={ph}
                          onChange={(e) => {
                            setPh(e.target.value);
                            if (errors.ph) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.ph;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                            errors.ph ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                          } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                          pH
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                        {t('form.phHelper')}
                      </p>
                      {errors.ph && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {errors.ph}
                        </p>
                      )}
                    </div>

                    {/* Nitrogen */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="nitrogenInput" className="block text-xs font-semibold text-stone-700">
                          {t('form.nLabel')} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">&ge; 0 mg/kg</span>
                      </div>
                      <div className="relative">
                        <input
                          id="nitrogenInput"
                          type="number"
                          step="any"
                          min="0"
                          placeholder={t('form.nPlaceholder')}
                          value={nitrogen}
                          onChange={(e) => {
                            setNitrogen(e.target.value);
                            if (errors.nitrogen) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.nitrogen;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                            errors.nitrogen ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                          } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                          mg/kg
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                        {t('form.nHelper')}
                      </p>
                      {errors.nitrogen && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {errors.nitrogen}
                        </p>
                      )}
                    </div>

                    {/* Phosphorus */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="phosphorusInput" className="block text-xs font-semibold text-stone-700">
                          {t('form.pLabel')} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">&ge; 0 mg/kg</span>
                      </div>
                      <div className="relative">
                        <input
                          id="phosphorusInput"
                          type="number"
                          step="any"
                          min="0"
                          placeholder={t('form.pPlaceholder')}
                          value={phosphorus}
                          onChange={(e) => {
                            setPhosphorus(e.target.value);
                            if (errors.phosphorus) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.phosphorus;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                            errors.phosphorus ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                          } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                          mg/kg
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                        {t('form.pHelper')}
                      </p>
                      {errors.phosphorus && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {errors.phosphorus}
                        </p>
                      )}
                    </div>

                    {/* Potassium */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="potassiumInput" className="block text-xs font-semibold text-stone-700">
                          {t('form.kLabel')} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">&ge; 0 mg/kg</span>
                      </div>
                      <div className="relative">
                        <input
                          id="potassiumInput"
                          type="number"
                          step="any"
                          min="0"
                          placeholder={t('form.kPlaceholder')}
                          value={potassium}
                          onChange={(e) => {
                            setPotassium(e.target.value);
                            if (errors.potassium) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.potassium;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                            errors.potassium ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                          } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                          mg/kg
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                        {t('form.kHelper')}
                      </p>
                      {errors.potassium && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {errors.potassium}
                        </p>
                      )}
                    </div>

                    {/* Electrical Conductivity (EC) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="ecInput" className="block text-xs font-semibold text-stone-700">
                          {t('form.ecLabel')} <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] text-stone-400">&ge; 0 dS/m</span>
                      </div>
                      <div className="relative">
                        <input
                          id="ecInput"
                          type="number"
                          step="any"
                          min="0"
                          placeholder={t('form.ecPlaceholder')}
                          value={ec}
                          onChange={(e) => {
                            setEc(e.target.value);
                            if (errors.ec) {
                              setErrors((prev) => {
                                const next = { ...prev };
                                delete next.ec;
                                return next;
                              });
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                            errors.ec ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                          } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                          dS/m
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1 leading-normal">
                        {t('form.ecHelper')}
                      </p>
                      {errors.ec && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {errors.ec}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Explanation Under "Your Soil Data" */}
                  <div className="pt-3 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-600">
                    <Info className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      {t('form.soilDataExplanation')}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. WHEN THE USER SELECTS NO */}
              {hasSoilTest === false && (
                <div className="space-y-4 pt-2">
                  {/* Reassuring Information Panel */}
                  <div className="p-5 sm:p-6 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3.5 text-stone-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#1b4332] shrink-0" />
                      <h4 className="text-base sm:text-lg font-bold text-stone-900">
                        {t('form.noTestTitle')}
                      </h4>
                    </div>
                    
                    <p className="text-xs sm:text-sm leading-relaxed text-stone-700">
                      {t('form.noTestParagraph1')}
                    </p>

                    <p className="text-xs sm:text-sm leading-relaxed text-stone-700 font-medium">
                      {t('form.noTestParagraph2')}
                    </p>

                    <div className="p-3.5 bg-white/80 rounded-xl border border-emerald-300/40 text-xs sm:text-sm text-stone-700 leading-relaxed">
                      {t('form.noTestParagraph3')}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1 Navigation Action */}
              <div className="pt-4 border-t border-stone-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueToPhoto}
                  className="px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{t('form.continueToPhoto')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: SOIL PHOTO */}
          {currentSection === 2 && (
            <div id="soilPhotoSection" className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {t('form.photoTitle')}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    {t('form.photoSubtitle')}
                  </p>
                </div>
              </div>

              {/* Upload Drop/Click Area or Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-bold text-stone-900">
                    {t('form.uploadPhoto')}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    Optional
                  </span>
                </div>

                {!soilPhotoPreview ? (
                  <div>
                    <label
                      htmlFor="soilPhotoUpload"
                      className="border-2 border-dashed border-stone-300 hover:border-[#1b4332] rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white hover:bg-[#f0f5ee]/40 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#f0f5ee] border border-stone-200 flex items-center justify-center text-stone-600 group-hover:text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shadow-xs mb-3">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-stone-900 group-hover:text-[#1b4332] transition-colors">
                        {t('form.uploadPhoto')}
                      </span>
                      <span className="text-xs text-stone-500 mt-1">
                        {t('form.supportedFormats')}
                      </span>
                      <input
                        id="soilPhotoUpload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={soilPhotoPreview}
                          alt="Uploaded farm soil"
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-stone-300 shadow-xs shrink-0"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-bold text-stone-900 block truncate max-w-[200px] sm:max-w-xs">
                            {soilPhotoFile?.name || 'soil-sample.jpg'}
                          </span>
                          <span className="text-[11px] text-stone-500 block">
                            {soilPhotoFile ? `${(soilPhotoFile.size / 1024).toFixed(1)} KB` : ''}
                          </span>
                          {isAnalyzingPhoto ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              {t('form.analyzingPhoto')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {t('form.photoUploadedSuccess')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Change / Remove Buttons */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="changeSoilPhotoUpload"
                          className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer"
                        >
                          {t('form.changePhoto')}
                          <input
                            id="changeSoilPhotoUpload"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
                          title={t('form.removePhoto')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Display preliminary estimated texture indicator if processed */}
                    {soilPhotoAnalysis?.estimatedTextureClass && (
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-stone-600 font-medium">
                          Preliminary Visual Texture Indicator:
                        </span>
                        <span className="font-bold text-[#1b4332] bg-[#f0f5ee] px-2.5 py-0.5 rounded-md border border-[#1b4332]/20">
                          {soilPhotoAnalysis.estimatedTextureClass}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {photoError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {photoError}
                  </p>
                )}

                {/* 5. PHOTO GUIDANCE */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/70 flex items-start gap-2.5 text-xs text-stone-600">
                  <Info className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {t('form.photoGuidance')}
                  </p>
                </div>
              </div>

              {/* Section 2 Navigation Buttons */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToSoilData}
                  className="px-5 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('form.backToSoilData')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleContinueToLocation}
                  className="px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{t('form.continueToLocation')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: FARM LOCATION */}
          {currentSection === 3 && (
            <div id="farmLocationSection" className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      {t('form.locationTitle')}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                      {t('form.locationSubtitle')}
                    </p>
                  </div>
                </div>

                {/* Geolocation Button */}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#1b4332] bg-[#f0f5ee] hover:bg-[#e4ede1] border border-[#1b4332]/25 rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
                  <span>{geoLoading ? t('form.acquiringGps') : t('form.getMyLocation')}</span>
                </button>
              </div>

              {/* Geolocation Message Banners */}
              {geoError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{geoError}</span>
                </div>
              )}

              {geoSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{t('form.locationAcquired')}</span>
                </div>
              )}

              {/* Step A: State and LGA Selection */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">1. Administrative Location</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label htmlFor="stateInput" className="block text-xs font-semibold text-stone-700 mb-1.5">
                      {t('form.stateLabel')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="stateInput"
                      value={selectedState}
                      onChange={(e) => {
                        const newState = e.target.value;
                        setSelectedState(newState);
                        setSelectedLga('');
                        setLocationValidation(null);
                        setBoundaryConfirmed(false);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.state;
                          delete next.locationConflict;
                          return next;
                        });
                      }}
                      className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                        errors.state ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                      } rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all cursor-pointer`}
                    >
                      <option value="">{t('form.statePlaceholder')}...</option>
                      {NIGERIA_STATES_LGAS.map((s) => (
                        <option key={s.state} value={s.state}>
                          {s.state}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {errors.state}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lgaInput" className="block text-xs font-semibold text-stone-700 mb-1.5">
                      {t('form.lgaLabel')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="lgaInput"
                      value={selectedLga}
                      disabled={!selectedState}
                      onChange={(e) => {
                        setSelectedLga(e.target.value);
                        setLocationValidation(null);
                        setBoundaryConfirmed(false);
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.lga;
                          delete next.locationConflict;
                          return next;
                        });
                      }}
                      className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                        errors.lga ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                      } rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {selectedState ? `${t('form.lgaPlaceholder')}...` : `${t('form.lgaSelectStateFirst')}...`}
                      </option>
                      {(NIGERIA_STATES_LGAS.find((s) => s.state === selectedState)?.lgas || []).map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </select>
                    {errors.lga && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {errors.lga}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step B: GPS Coordinates */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">2. Farm GPS Coordinates</span>
                  {gpsAccuracy !== null && (
                    <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Accuracy: &plusmn;{Math.round(gpsAccuracy)}m
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {/* Latitude */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="latitudeInput" className="block text-xs font-semibold text-stone-700">
                        {t('form.latitudeLabel')} <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-stone-400">4.0&deg; to 14.0&deg; N</span>
                    </div>
                    <input
                      id="latitudeInput"
                      type="number"
                      step="any"
                      placeholder={t('form.latitudePlaceholder')}
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(e.target.value);
                        setGeoSuccess(false);
                        setLocationValidation(null);
                        setBoundaryConfirmed(false);
                        if (errors.latitude || errors.locationConflict) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.latitude;
                            delete next.locationConflict;
                            return next;
                          });
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                        errors.latitude ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                      } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                    />
                    {errors.latitude && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {errors.latitude}
                      </p>
                    )}
                  </div>

                  {/* Longitude */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="longitudeInput" className="block text-xs font-semibold text-stone-700">
                        {t('form.longitudeLabel')} <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-stone-400">2.5&deg; to 15.0&deg; E</span>
                    </div>
                    <input
                      id="longitudeInput"
                      type="number"
                      step="any"
                      placeholder={t('form.longitudePlaceholder')}
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(e.target.value);
                        setGeoSuccess(false);
                        setLocationValidation(null);
                        setBoundaryConfirmed(false);
                        if (errors.longitude || errors.locationConflict) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.longitude;
                            delete next.locationConflict;
                            return next;
                          });
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 bg-stone-50 border ${
                        errors.longitude ? 'border-red-400 bg-red-50/30' : 'border-stone-300'
                      } rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all`}
                    />
                    {errors.longitude && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {errors.longitude}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Step C: Location Validation Result Card */}
              <div id="locationValidationCard" className="pt-2 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    3. Location Verification Status
                  </span>
                  {selectedState && selectedLga && latitude && longitude && (
                    <button
                      type="button"
                      onClick={() => triggerLocationValidation(selectedState, selectedLga, latitude, longitude, gpsAccuracy)}
                      disabled={isValidatingLocation}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1b4332] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isValidatingLocation ? 'animate-spin' : ''}`} />
                      <span>Re-validate</span>
                    </button>
                  )}
                </div>

                {/* Case 1: Validating in progress */}
                {isValidatingLocation && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center gap-3 text-stone-700 text-xs sm:text-sm">
                    <Loader2 className="w-5 h-5 text-[#1b4332] animate-spin shrink-0" />
                    <span>Verifying your GPS coordinates against Nigerian State and LGA boundaries...</span>
                  </div>
                )}

                {/* Case 2: Validation result received */}
                {!isValidatingLocation && locationValidation && (
                  <>
                    {/* Status: MATCH */}
                    {locationValidation.validation.status === 'match' && (
                      <div className="p-4 sm:p-5 bg-emerald-50/90 border border-emerald-300 rounded-2xl flex items-start gap-3.5 text-emerald-950 shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                          <span className="font-bold text-emerald-900 block text-sm">
                            Location Verified
                          </span>
                          <p className="leading-relaxed text-emerald-900">
                            Location verified. Your GPS location is within <span className="font-semibold">{locationValidation.selected.state}</span>, <span className="font-semibold">{locationValidation.selected.lga}</span>, matching the State and LGA you selected. This location will be used for your SoilWise assessment.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status: LGA_MISMATCH */}
                    {locationValidation.validation.status === 'lga_mismatch' && (
                      <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-xs">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <span className="font-bold text-amber-900 block text-sm">
                            LGA Mismatch
                          </span>
                          <p className="leading-relaxed text-amber-900">
                            Your GPS location appears to be outside the <span className="font-semibold">{locationValidation.selected.lga}</span> you selected. Please check your selected State/LGA or update your GPS location before continuing.
                          </p>
                          {locationValidation.detected.lga && (
                            <p className="text-[11px] text-amber-800 font-medium">
                              GPS boundary analysis places your coordinate in: <span className="font-bold underline">{locationValidation.detected.lga}</span>. Your selected administrative location has not been changed.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status: STATE_MISMATCH */}
                    {locationValidation.validation.status === 'state_mismatch' && (
                      <div className="p-4 sm:p-5 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3.5 text-red-950 shadow-xs">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <span className="font-bold text-red-900 block text-sm">
                            State Mismatch
                          </span>
                          <p className="leading-relaxed text-red-900">
                            Your GPS location appears to be in another State. Please confirm your GPS location and selected State before continuing.
                          </p>
                          {locationValidation.detected.state && (
                            <p className="text-[11px] text-red-800 font-medium">
                              GPS boundary analysis places your coordinate in: <span className="font-bold underline">{locationValidation.detected.state}</span>. Your selected administrative location has not been changed.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status: BOUNDARY_UNCERTAIN */}
                    {locationValidation.validation.status === 'boundary_uncertain' && (
                      <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-xs">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-2.5 text-xs sm:text-sm">
                          <span className="font-bold text-amber-900 block text-sm">
                            Boundary Uncertainty
                          </span>
                          <p className="leading-relaxed text-amber-900">
                            Your GPS location is close to an administrative boundary, so we could not confirm the LGA with certainty. Please check your selected State and LGA before continuing.
                          </p>
                          <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none bg-white/70 p-2.5 rounded-xl border border-amber-200">
                            <input
                              type="checkbox"
                              checked={boundaryConfirmed}
                              onChange={(e) => {
                                setBoundaryConfirmed(e.target.checked);
                                if (e.target.checked) {
                                  setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.boundary;
                                    delete next.locationConflict;
                                    return next;
                                  });
                                }
                              }}
                              className="mt-0.5 rounded border-amber-400 text-[#1b4332] focus:ring-[#1b4332] w-4 h-4 cursor-pointer shrink-0"
                            />
                            <span className="text-xs font-semibold text-amber-950 leading-normal">
                              I confirm that my farm is located in {selectedState}, {selectedLga} near the boundary.
                            </span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Status: OUTSIDE_NIGERIA */}
                    {locationValidation.validation.status === 'outside_nigeria' && (
                      <div className="p-4 sm:p-5 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3.5 text-red-950 shadow-xs">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                          <span className="font-bold text-red-900 block text-sm">
                            Outside Nigeria
                          </span>
                          <p className="leading-relaxed text-red-900">
                            Your GPS location appears to be outside Nigeria. Please check your GPS location before continuing.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status: INVALID_COORDINATES */}
                    {locationValidation.validation.status === 'invalid_coordinates' && (
                      <div className="p-4 sm:p-5 bg-red-50 border border-red-300 rounded-2xl flex items-start gap-3.5 text-red-950 shadow-xs">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                          <span className="font-bold text-red-900 block text-sm">
                            Invalid Coordinates
                          </span>
                          <p className="leading-relaxed text-red-900">
                            We could not validate your GPS location. Please obtain your location again and try again.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status: UNKNOWN */}
                    {locationValidation.validation.status === 'unknown' && (
                      <div className="p-4 sm:p-5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-950 shadow-xs">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs sm:text-sm">
                          <span className="font-bold text-amber-900 block text-sm">
                            Location Unconfirmed
                          </span>
                          <p className="leading-relaxed text-amber-900">
                            We could not confirm your selected location. Please check your GPS location and selected State/LGA before continuing.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Case 3: Prompting input when validation has not run yet */}
                {!isValidatingLocation && !locationValidation && (
                  <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-2xl flex items-start gap-3 text-stone-600 text-xs sm:text-sm">
                    <Info className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                    <div>
                      {!selectedState || !selectedLga ? (
                        <p className="leading-relaxed">
                          Please select your <span className="font-semibold text-stone-800">State</span> and <span className="font-semibold text-stone-800">LGA</span> above, then provide your farm GPS coordinates to verify your location.
                        </p>
                      ) : !latitude || !longitude ? (
                        <p className="leading-relaxed">
                          Click <span className="font-semibold text-stone-800">&quot;{t('form.getMyLocation')}&quot;</span> or enter your farm coordinates to verify your location against <span className="font-semibold text-stone-800">{selectedState}, {selectedLga}</span>.
                        </p>
                      ) : (
                        <p className="leading-relaxed">
                          Coordinates and administrative area selected. Checking verification status...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation errors on submission */}
                {(errors.locationConflict || errors.boundary) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errors.locationConflict || errors.boundary}</span>
                  </div>
                )}
              </div>

              {/* Explanation Under "Farm Location" */}
              <div className="pt-3 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-600">
                <Info className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t('form.coordsExplanation')}
                </p>
              </div>

              {/* Section 3 Navigation Actions */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToPhoto}
                  className="px-5 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('form.backToPhoto')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueToCrop}
                  className="px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('form.continueToCrop') || 'Continue to Intended Crop →'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: INTENDED CROP */}
          {currentSection === 4 && (
            <div id="intendedCropSection" className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
              {/* Section Header */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center shrink-0 mt-0.5">
                  <Sprout className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    4. Intended Crop Plan
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1 leading-relaxed">
                    {t('form.cropPlanSubtitle') || "Tell us what crop you intend to plant this season. SoilWise AI will evaluate its agronomic suitability for your soil and local climate."}
                  </p>
                </div>
              </div>

              {/* Main Question Box */}
              <div className="p-5 sm:p-6 bg-[#fafaf7] rounded-2xl border border-stone-200/90 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-bold text-stone-900">
                    What crop do you intend to plant? <span className="text-red-500">*</span>
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    Select one crop from the common crops below, or let SoilWise AI recommend the best match for your soil. Only understandable crop names are shown (not complicated seed variety numbers).
                  </p>
                </div>

                {/* Search Bar & Category Filters */}
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search crop name (e.g., Maize, Rice, Cassava, Soybeans)..."
                      value={cropSearch}
                      onChange={(e) => setCropSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] shadow-2xs"
                    />
                    {cropSearch && (
                      <button
                        type="button"
                        onClick={() => setCropSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {[
                      { id: 'all', label: 'All Crops' },
                      { id: 'cereals', label: 'Cereals & Grains' },
                      { id: 'legumes', label: 'Legumes & Pulses' },
                      { id: 'tubers', label: 'Roots & Tubers' },
                      { id: 'vegetables', label: 'Vegetables' },
                      { id: 'cash', label: 'Cash Crops & Oilseeds' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCropCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all cursor-pointer ${
                          cropCategoryFilter === cat.id
                            ? 'bg-[#1b4332] text-white font-bold shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option: Recommend for Me (Special Card) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCrop('recommend_for_me');
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    selectedCrop === 'recommend_for_me'
                      ? 'border-[#1b4332] bg-[#f0f5ee] text-[#1b4332] ring-2 ring-[#1b4332]/25 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-emerald-300 text-stone-800'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    selectedCrop === 'recommend_for_me'
                      ? 'border-[#1b4332] bg-[#1b4332] text-white'
                      : 'border-stone-300 bg-stone-100'
                  }`}>
                    {selectedCrop === 'recommend_for_me' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Sparkles className="w-3.5 h-3.5 text-stone-400" />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-900">
                        Not sure / Recommend best crop for my soil
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#1b4332] px-2 py-0.5 rounded-full">
                        AI Matched
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Let SoilWise AI evaluate all crop options against your soil pH, nutrients, and rainfall outlook to determine the most profitable crop.
                    </p>
                  </div>
                </button>

                {/* Grid of Available Crops */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {AVAILABLE_CROPS.filter((c) => {
                    const matchesCategory = cropCategoryFilter === 'all' || c.category === cropCategoryFilter;
                    const matchesSearch = !cropSearch.trim() || 
                      c.name.toLowerCase().includes(cropSearch.toLowerCase()) || 
                      (c.altHint && c.altHint.toLowerCase().includes(cropSearch.toLowerCase())) ||
                      c.categoryLabel.toLowerCase().includes(cropSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).map((crop) => {
                    const isSelected = selectedCrop === crop.name;
                    return (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() => {
                          setSelectedCrop(crop.name);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'border-[#1b4332] bg-[#f0f5ee] ring-2 ring-[#1b4332]/25 shadow-xs'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl shrink-0" role="img" aria-label={crop.name}>
                                {crop.emoji}
                              </span>
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-stone-900 block truncate">
                                  {crop.name}
                                </span>
                                {crop.altHint && (
                                  <span className="text-[11px] text-stone-500 block truncate">
                                    ({crop.altHint})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#1b4332] bg-[#1b4332] text-white'
                                : 'border-stone-300 bg-stone-100'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <p className="text-[11px] text-stone-600 line-clamp-2 leading-snug">
                            {crop.description}
                          </p>
                        </div>

                        <div className="pt-2.5 mt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                          <span className="text-stone-500 font-medium">
                            {crop.categoryLabel}
                          </span>
                          {crop.popular && (
                            <span className="text-emerald-800 bg-emerald-50 font-bold px-1.5 py-0.5 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Option: Other Crop */}
                <div className={`p-4 rounded-xl border transition-all ${
                  selectedCrop === 'other'
                    ? 'border-[#1b4332] bg-[#f0f5ee] ring-2 ring-[#1b4332]/25'
                    : 'border-stone-200 bg-white'
                }`}>
                  <button
                    type="button"
                    onClick={() => setSelectedCrop('other')}
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedCrop === 'other'
                          ? 'border-[#1b4332] bg-[#1b4332] text-white'
                          : 'border-stone-300 bg-stone-100'
                      }`}>
                        {selectedCrop === 'other' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-stone-900">
                        Other Crop (Not in list)
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500">
                      Type your crop name
                    </span>
                  </button>

                  {selectedCrop === 'other' && (
                    <div className="mt-3 pt-3 border-t border-stone-200/80">
                      <label htmlFor="otherCropInput" className="block text-xs font-semibold text-stone-700 mb-1">
                        Enter the crop you plan to cultivate:
                      </label>
                      <input
                        id="otherCropInput"
                        type="text"
                        placeholder="e.g. Sesame, Okra, Sweet Potato, Plantain, Cotton"
                        value={otherCropName}
                        onChange={(e) => setOtherCropName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                      />
                    </div>
                  )}
                </div>

                {/* Selected Choice Summary Bar */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="leading-relaxed">
                    Selected intended planting plan:{' '}
                    <strong className="font-extrabold text-[#1b4332]">
                      {selectedCrop === 'recommend_for_me'
                        ? 'Not sure (Recommend for me)'
                        : selectedCrop === 'other'
                        ? (otherCropName.trim() || 'Other Crop')
                        : selectedCrop}
                    </strong>
                    . SoilWise AI will factor this into your soil chemistry evaluation.
                  </div>
                </div>
              </div>

              {/* Section 4 Navigation Actions */}
              <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToLocation}
                  className="px-5 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t('form.backToLocation') || '← Back to Farm Location'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-3.5 px-8 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('form.submittingButton')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>{t('form.submitButton')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* GPS Location Permission Guidance Modal */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        isDenied={isPermissionDenied}
        onClose={() => setIsPermissionModalOpen(false)}
        onConfirmGrant={requestGpsCoordinates}
        onManualEntry={() => {
          setIsPermissionModalOpen(false);
          // Focus or scroll to administrative location inputs
          const stateEl = document.getElementById('stateInput');
          if (stateEl) {
            stateEl.focus();
            stateEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      />
    </div>
  );
};
