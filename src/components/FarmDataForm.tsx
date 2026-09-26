import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  FlaskConical, 
  Navigation, 
  AlertCircle, 
  Check, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { SoilData } from '../types/soilwise';

interface FarmDataFormProps {
  onSubmit: (soilData: SoilData, coordinates: { latitude: number; longitude: number }, analysisDate: string) => void;
  isSubmitting: boolean;
}

// Preset samples to make testing fast and realistic
const PRESET_FARM_DATA = [
  {
    name: 'Kaduna Grain Farm (Nigeria)',
    lat: 10.5105,
    lon: 7.4165,
    soil: { ph: 6.2, nitrogen: 42, phosphorus: 18, potassium: 120, ec: 0.85 },
  },
  {
    name: 'Ibadan Cassava & Maize (Nigeria)',
    lat: 7.3775,
    lon: 3.9470,
    soil: { ph: 5.8, nitrogen: 35, phosphorus: 14, potassium: 95, ec: 0.62 },
  },
  {
    name: 'Nakuru Valley Farm (Kenya)',
    lat: -0.3031,
    lon: 36.0800,
    soil: { ph: 6.5, nitrogen: 58, phosphorus: 26, potassium: 160, ec: 1.10 },
  },
];

export const FarmDataForm: React.FC<FarmDataFormProps> = ({ onSubmit, isSubmitting }) => {
  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const [analysisDate, setAnalysisDate] = useState<string>(todayStr);

  // Soil fields
  const [ph, setPh] = useState<string>('6.4');
  const [nitrogen, setNitrogen] = useState<string>('45');
  const [phosphorus, setPhosphorus] = useState<string>('22');
  const [potassium, setPotassium] = useState<string>('130');
  const [ec, setEc] = useState<string>('0.75');

  // Location fields
  const [latitude, setLatitude] = useState<string>('10.5105');
  const [longitude, setLongitude] = useState<string>('7.4165');

  // Geolocation state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<boolean>(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGetLocation = () => {
    setGeoError(null);
    setGeoSuccess(false);

    if (!('geolocation' in navigator)) {
      setGeoError('Geolocation is not supported by your browser. Please enter coordinates manually.');
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
        // Clear any previous coordinate errors
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
          setGeoError('Location access was not granted. Please enter your farm coordinates manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError('Location information is currently unavailable. Please enter coordinates manually.');
        } else {
          setGeoError('Location request timed out. Please enter your farm coordinates manually.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleApplyPreset = (preset: typeof PRESET_FARM_DATA[0]) => {
    setLatitude(preset.lat.toString());
    setLongitude(preset.lon.toString());
    setPh(preset.soil.ph.toString());
    setNitrogen(preset.soil.nitrogen.toString());
    setPhosphorus(preset.soil.phosphorus.toString());
    setPotassium(preset.soil.potassium.toString());
    setEc(preset.soil.ec.toString());
    setGeoError(null);
    setGeoSuccess(false);
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Date
    if (!analysisDate) {
      errs.analysisDate = 'Analysis date is required.';
    }

    // pH
    const phNum = parseFloat(ph);
    if (isNaN(phNum) || phNum < 1 || phNum > 14) {
      errs.ph = 'Enter a valid pH between 1.0 and 14.0.';
    }

    // N, P, K, EC
    const nNum = parseFloat(nitrogen);
    if (isNaN(nNum) || nNum < 0) {
      errs.nitrogen = 'Enter a valid Nitrogen level (≥ 0 mg/kg).';
    }

    const pNum = parseFloat(phosphorus);
    if (isNaN(pNum) || pNum < 0) {
      errs.phosphorus = 'Enter a valid Phosphorus level (≥ 0 mg/kg).';
    }

    const kNum = parseFloat(potassium);
    if (isNaN(kNum) || kNum < 0) {
      errs.potassium = 'Enter a valid Potassium level (≥ 0 mg/kg).';
    }

    const ecNum = parseFloat(ec);
    if (isNaN(ecNum) || ecNum < 0) {
      errs.ec = 'Enter a valid EC level (≥ 0 dS/m).';
    }

    // Lat / Lon
    const latNum = parseFloat(latitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      errs.latitude = 'Latitude must be between -90 and +90 degrees.';
    }

    const lonNum = parseFloat(longitude);
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      errs.longitude = 'Longitude must be between -180 and +180 degrees.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    const soilData: SoilData = {
      ph: parseFloat(ph),
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
      ec: parseFloat(ec),
    };

    onSubmit(
      soilData,
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      analysisDate
    );
  };

  const isLocationDetected = Boolean(
    latitude &&
    longitude &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude)) &&
    parseFloat(latitude) >= -90 &&
    parseFloat(latitude) <= 90 &&
    parseFloat(longitude) >= -180 &&
    parseFloat(longitude) <= 180
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#1b4332]">
          SoilWise AI
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
          Farm Analysis
        </h1>
        <p className="text-sm sm:text-base text-stone-600 mt-1">
          Enter your soil-test results and farm location to begin your analysis.
        </p>

        {/* Quick Demo Presets Bar */}
        <div className="mt-4 p-3 bg-[#f4f7f2] rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#1b4332]" />
            <span>Quick Test Presets:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_FARM_DATA.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 text-xs bg-white hover:bg-stone-50 text-stone-800 rounded-md border border-stone-200 shadow-2xs font-medium transition-colors"
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Analysis Date */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Analysis Date
              </h2>
              <p className="text-xs text-stone-500">
                Used to calculate estimated remaining rainy-season days.
              </p>
            </div>
          </div>

          <div className="max-w-xs">
            <label htmlFor="analysisDate" className="block text-xs font-medium text-stone-700 mb-1">
              Select Date
            </label>
            <input
              id="analysisDate"
              type="date"
              value={analysisDate}
              onChange={(e) => setAnalysisDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
            />
            {errors.analysisDate && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.analysisDate}
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Your Soil Data */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Your Soil Data
                </h2>
                <p className="text-xs text-stone-500">
                  Enter the results from your soil analysis.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline text-[11px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
              Laboratory / Test Kit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* pH */}
            <div>
              <label htmlFor="phInput" className="block text-xs font-medium text-stone-700 mb-1">
                pH Level
              </label>
              <div className="relative">
                <input
                  id="phInput"
                  type="number"
                  step="0.1"
                  min="1"
                  max="14"
                  placeholder="e.g. 6.5"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                  pH scale
                </span>
              </div>
              {errors.ph && (
                <p className="text-xs text-red-600 mt-1">{errors.ph}</p>
              )}
            </div>

            {/* Nitrogen */}
            <div>
              <label htmlFor="nitrogenInput" className="block text-xs font-medium text-stone-700 mb-1">
                Nitrogen (N) Level
              </label>
              <div className="relative">
                <input
                  id="nitrogenInput"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 45"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                  mg/kg
                </span>
              </div>
              {errors.nitrogen && (
                <p className="text-xs text-red-600 mt-1">{errors.nitrogen}</p>
              )}
            </div>

            {/* Phosphorus */}
            <div>
              <label htmlFor="phosphorusInput" className="block text-xs font-medium text-stone-700 mb-1">
                Phosphorus (P) Level
              </label>
              <div className="relative">
                <input
                  id="phosphorusInput"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 20"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                  mg/kg
                </span>
              </div>
              {errors.phosphorus && (
                <p className="text-xs text-red-600 mt-1">{errors.phosphorus}</p>
              )}
            </div>

            {/* Potassium */}
            <div>
              <label htmlFor="potassiumInput" className="block text-xs font-medium text-stone-700 mb-1">
                Potassium (K) Level
              </label>
              <div className="relative">
                <input
                  id="potassiumInput"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 140"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                  mg/kg
                </span>
              </div>
              {errors.potassium && (
                <p className="text-xs text-red-600 mt-1">{errors.potassium}</p>
              )}
            </div>

            {/* Electrical Conductivity (EC) */}
            <div>
              <label htmlFor="ecInput" className="block text-xs font-medium text-stone-700 mb-1">
                Electrical Conductivity (EC)
              </label>
              <div className="relative">
                <input
                  id="ecInput"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.8"
                  value={ec}
                  onChange={(e) => setEc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
                />
                <span className="absolute right-3 top-2.5 text-xs text-stone-400 pointer-events-none">
                  dS/m
                </span>
              </div>
              {errors.ec && (
                <p className="text-xs text-red-600 mt-1">{errors.ec}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Farm Location */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Farm Location
                </h2>
                <p className="text-xs text-stone-500">
                  Enter coordinates or use your browser location.
                </p>
              </div>
            </div>

            {/* Geolocation trigger */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={geoLoading}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1b4332] bg-[#f0f5ee] hover:bg-[#e4ede1] border border-[#1b4332]/20 rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
              <span>{geoLoading ? 'Detecting Location...' : 'Get My Location'}</span>
            </button>
          </div>

          {/* Geo messages */}
          {geoError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{geoError}</span>
            </div>
          )}

          {geoSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Browser coordinates retrieved successfully.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Latitude */}
            <div>
              <label htmlFor="latitudeInput" className="block text-xs font-medium text-stone-700 mb-1">
                Latitude
              </label>
              <input
                id="latitudeInput"
                type="number"
                step="any"
                placeholder="e.g. 10.510500"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  setGeoSuccess(false);
                }}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
              />
              {errors.latitude && (
                <p className="text-xs text-red-600 mt-1">{errors.latitude}</p>
              )}
            </div>

            {/* Longitude */}
            <div>
              <label htmlFor="longitudeInput" className="block text-xs font-medium text-stone-700 mb-1">
                Longitude
              </label>
              <input
                id="longitudeInput"
                type="number"
                step="any"
                placeholder="e.g. 7.416500"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  setGeoSuccess(false);
                }}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-all"
              />
              {errors.longitude && (
                <p className="text-xs text-red-600 mt-1">{errors.longitude}</p>
              )}
            </div>
          </div>

          {/* Section 10: Location Status Card */}
          <div className="mt-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isLocationDetected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-800">Farm Location</p>
                <p className="text-xs text-stone-500">
                  {isLocationDetected ? 'Location detected' : 'Location not detected'}
                </p>
              </div>
            </div>

            {isLocationDetected && (
              <div className="text-right text-xs font-mono text-stone-600">
                <div>Lat: {parseFloat(latitude).toFixed(4)}°</div>
                <div>Lon: {parseFloat(longitude).toFixed(4)}°</div>
              </div>
            )}
          </div>
        </div>

        {/* Section 11: Analyse Farm CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Analyzing Farm...' : 'Analyse Farm'}</span>
          </button>
          <p className="text-center text-xs text-stone-500 mt-2">
            SoilWise AI will query OpenStreetMap, ISRIC SoilGrids, and Open-Meteo climate models.
          </p>
        </div>
      </form>
    </div>
  );
};
