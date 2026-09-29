import React, { useState } from 'react';
import { 
  MapPin, 
  FlaskConical, 
  Navigation, 
  AlertCircle, 
  Check, 
  Info,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { SoilData } from '../types/soilwise';
import { NIGERIA_STATES_LGAS } from '../data/nigeriaStatesLga';
import { useLanguage } from '../context/LanguageContext';
import heroBackground from '../assets/images/farm_analysis_hero_1790600561723.jpg';

interface FarmDataFormProps {
  onSubmit: (
    soilData: SoilData,
    coordinates: { latitude: number; longitude: number },
    analysisDate: string,
    locationDetails?: { state?: string; lga?: string }
  ) => void;
  isSubmitting: boolean;
}

export const FarmDataForm: React.FC<FarmDataFormProps> = ({ onSubmit, isSubmitting }) => {
  const { t } = useLanguage();

  // Required Soil fields - all start completely blank with no prefilled values
  const [ph, setPh] = useState<string>('');
  const [nitrogen, setNitrogen] = useState<string>('');
  const [phosphorus, setPhosphorus] = useState<string>('');
  const [potassium, setPotassium] = useState<string>('');
  const [ec, setEc] = useState<string>('');

  // Required Farm Location fields - all start completely blank
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  // Optional State and LGA selection
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedLga, setSelectedLga] = useState<string>('');

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<boolean>(false);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGetLocation = () => {
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
        setLatitude(lat.toFixed(6));
        setLongitude(lon.toFixed(6));
        setGeoSuccess(true);
        setGeoLoading(false);
        // Clear coordinate errors
        setErrors((prev) => {
          const next = { ...prev };
          delete next.latitude;
          delete next.longitude;
          return next;
        });
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(t('form.validation.geoPermission'));
        } else {
          setGeoError(t('form.validation.geoError'));
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // pH validation (Required, 1.0 - 14.0)
    if (!ph.trim()) {
      errs.ph = t('form.validation.phRequired');
    } else {
      const phNum = parseFloat(ph);
      if (isNaN(phNum) || phNum < 1 || phNum > 14) {
        errs.ph = t('form.validation.phRange');
      }
    }

    // Nitrogen validation (Required, >= 0 mg/kg)
    if (!nitrogen.trim()) {
      errs.nitrogen = t('form.validation.nRequired');
    } else {
      const nNum = parseFloat(nitrogen);
      if (isNaN(nNum) || nNum < 0) {
        errs.nitrogen = t('form.validation.nRange');
      }
    }

    // Phosphorus validation (Required, >= 0 mg/kg)
    if (!phosphorus.trim()) {
      errs.phosphorus = t('form.validation.pRequired');
    } else {
      const pNum = parseFloat(phosphorus);
      if (isNaN(pNum) || pNum < 0) {
        errs.phosphorus = t('form.validation.pRange');
      }
    }

    // Potassium validation (Required, >= 0 mg/kg)
    if (!potassium.trim()) {
      errs.potassium = t('form.validation.kRequired');
    } else {
      const kNum = parseFloat(potassium);
      if (isNaN(kNum) || kNum < 0) {
        errs.potassium = t('form.validation.kRange');
      }
    }

    // Electrical Conductivity validation (Required, >= 0 dS/m)
    if (!ec.trim()) {
      errs.ec = t('form.validation.ecRequired');
    } else {
      const ecNum = parseFloat(ec);
      if (isNaN(ecNum) || ecNum < 0) {
        errs.ec = t('form.validation.ecRange');
      }
    }

    // Latitude validation (Required, -90 to +90)
    if (!latitude.trim()) {
      errs.latitude = t('form.validation.latRequired');
    } else {
      const latNum = parseFloat(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errs.latitude = t('form.validation.latRange');
      }
    }

    // Longitude validation (Required, -180 to +180)
    if (!longitude.trim()) {
      errs.longitude = t('form.validation.lngRequired');
    } else {
      const lonNum = parseFloat(longitude);
      if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
        errs.longitude = t('form.validation.lngRange');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      const errorEl = document.getElementById(`${firstErrorKey}Input`);
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorEl.focus();
      }
      return;
    }

    const soilData: SoilData = {
      ph: parseFloat(ph),
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
      ec: parseFloat(ec),
    };

    // System automatically captures the analysis date internally
    const autoAnalysisDate = new Date().toISOString().split('T')[0];

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
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <form onSubmit={handleSubmit} className="space-y-8">
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

          {/* Section: Your Soil Data */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pt-2">
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

          {/* Section: Farm Location */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
              {/* Latitude */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="latitudeInput" className="block text-xs font-semibold text-stone-700">
                    {t('form.latitudeLabel')} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-400">4.0&deg; to 14.0&deg;</span>
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
                    if (errors.latitude) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.latitude;
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
                  <span className="text-[11px] text-stone-400">2.5&deg; to 15.0&deg;</span>
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
                    if (errors.longitude) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.longitude;
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

            {/* State and LGA Dynamic Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1 border-t border-stone-100">
              <div>
                <label htmlFor="stateInput" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t('form.stateLabel')}
                </label>
                <select
                  id="stateInput"
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setSelectedState(newState);
                    setSelectedLga('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="">{t('form.statePlaceholder')}...</option>
                  {NIGERIA_STATES_LGAS.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-400 mt-1">
                  {t('common.optional')} &bull; Nigerian State
                </p>
              </div>

              <div>
                <label htmlFor="lgaInput" className="block text-xs font-semibold text-stone-700 mb-1.5">
                  {t('form.lgaLabel')}
                </label>
                <select
                  id="lgaInput"
                  value={selectedLga}
                  disabled={!selectedState}
                  onChange={(e) => setSelectedLga(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <p className="text-[11px] text-stone-400 mt-1">
                  {t('common.optional')} &bull; Local Government Area
                </p>
              </div>
            </div>

            {/* Explanation Under "Farm Location" */}
            <div className="pt-3 border-t border-stone-100 flex items-start gap-2.5 text-xs text-stone-600">
              <Info className="w-4 h-4 text-[#1b4332] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t('form.coordsExplanation')}
              </p>
            </div>
          </div>

          {/* Analyse Farm Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('form.submittingButton')}</span>
                </>
              ) : (
                <span>{t('form.submitButton')}</span>
              )}
            </button>
            <p className="text-center text-xs text-stone-500 mt-2.5">
              OpenStreetMap &bull; ISRIC SoilGrids &bull; Open-Meteo
            </p>
          </div>
        </form>
      </section>
    </div>
  );
};
