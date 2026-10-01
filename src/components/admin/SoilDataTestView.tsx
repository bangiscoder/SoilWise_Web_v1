import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Compass,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Search,
  Activity,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
  Code,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { NIGERIA_STATES_LGAS } from '../../data/nigeriaStatesLga';
import {
  PipelineRunResult,
  ValidationStatus,
  TokenCacheMetadata,
} from '../../types/soilDataValidation';
import {
  runSoilDataPipeline,
  fetchTokenCacheStatus,
  resetTokenCache,
} from '../../services/soilDataValidationService';

interface SoilDataTestViewProps {
  onBackToApp: () => void;
  onGoToDashboard: () => void;
}

export const SoilDataTestView: React.FC<SoilDataTestViewProps> = ({
  onBackToApp,
  onGoToDashboard,
}) => {
  // Input Form State
  const [selectedState, setSelectedState] = useState<string>('Bauchi');
  const [selectedLga, setSelectedLga] = useState<string>('Toro');
  const [latitude, setLatitude] = useState<string>('10.0500');
  const [longitude, setLongitude] = useState<string>('9.1500');
  const [accuracyM, setAccuracyM] = useState<string>('25');

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pipelineResult, setPipelineResult] = useState<PipelineRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [browserGpsNotice, setBrowserGpsNotice] = useState<string | null>(null);
  const [tokenMeta, setTokenMeta] = useState<TokenCacheMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<'normalised' | 'raw' | 'diagnostics'>('normalised');

  // Load initial token cache status
  useEffect(() => {
    fetchTokenCacheStatus()
      .then((data) => setTokenMeta(data))
      .catch((err) => console.warn('Could not fetch token status:', err.message));
  }, []);

  // Filter LGAs based on selected state
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

  // Browser Geolocation
  const handleGetBrowserLocation = () => {
    if (!navigator.geolocation) {
      setBrowserGpsNotice('Geolocation is not supported by your browser.');
      return;
    }

    setBrowserGpsNotice('Requesting device GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;

        setLatitude(lat.toFixed(5));
        setLongitude(lon.toFixed(5));
        if (acc !== null) {
          setAccuracyM(String(acc));
          setBrowserGpsNotice(`Acquired GPS: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° (±${acc}m accuracy)`);
        } else {
          setBrowserGpsNotice(`Acquired GPS: ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
        }
      },
      (err) => {
        setBrowserGpsNotice(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Preset Test Scenarios
  const applyPreset = (preset: {
    label: string;
    state: string;
    lga: string;
    lat: string;
    lon: string;
    accuracy: string;
  }) => {
    setSelectedState(preset.state);
    setSelectedLga(preset.lga);
    setLatitude(preset.lat);
    setLongitude(preset.lon);
    setAccuracyM(preset.accuracy);
    setBrowserGpsNotice(`Applied preset: ${preset.label}`);
  };

  // Run Pipeline
  const handleRunPipeline = async () => {
    setIsRunning(true);
    setErrorMessage(null);

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const accNum = accuracyM ? parseFloat(accuracyM) : null;

    if (isNaN(latNum) || isNaN(lonNum)) {
      setErrorMessage('Please enter valid numeric values for latitude and longitude.');
      setIsRunning(false);
      return;
    }

    try {
      const result = await runSoilDataPipeline(selectedState, selectedLga, latNum, lonNum, accNum);
      setPipelineResult(result);
      if (result.soilData?.tokenInfo) {
        setTokenMeta(result.soilData.tokenInfo);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Pipeline execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  // Status Badge Config
  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'match':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          title: 'MATCH',
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          desc: 'GPS point-in-polygon coordinates match selected State and LGA.',
        };
      case 'state_mismatch':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          title: 'STATE MISMATCH',
          bg: 'bg-red-50 border-red-300 text-red-900',
          desc: 'GPS coordinates fall in a different Nigerian State.',
        };
      case 'lga_mismatch':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          title: 'LGA MISMATCH',
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          desc: 'State matches, but GPS coordinates fall in a different LGA.',
        };
      case 'boundary_uncertain':
        return {
          icon: <HelpCircle className="w-5 h-5 text-yellow-600" />,
          title: 'BOUNDARY UNCERTAIN',
          bg: 'bg-yellow-50 border-yellow-300 text-yellow-900',
          desc: 'Coordinate is within boundary tolerance/GPS uncertainty buffer of adjacent border.',
        };
      case 'outside_nigeria':
        return {
          icon: <Compass className="w-5 h-5 text-purple-600" />,
          title: 'OUTSIDE NIGERIA',
          bg: 'bg-purple-50 border-purple-300 text-purple-900',
          desc: 'Coordinate is outside Nigerian administrative boundaries.',
        };
      case 'invalid_coordinates':
        return {
          icon: <XCircle className="w-5 h-5 text-rose-600" />,
          title: 'INVALID COORDINATES',
          bg: 'bg-rose-50 border-rose-300 text-rose-900',
          desc: 'Coordinate numbers exceed geographical range [-90 to 90 lat, -180 to 180 lon].',
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-stone-600" />,
          title: 'UNKNOWN',
          bg: 'bg-stone-100 border-stone-300 text-stone-800',
          desc: 'Status could not be confidently determined.',
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
              SoilWise AI
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Developer Soil Data & GPS Validation Test
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
            iSDAsoil & Administrative Boundary Pipeline Test
          </h1>

          <p className="text-xs text-stone-500 mt-1 max-w-3xl">
            Isolated developer/admin validation tool to verify GPS point-in-polygon Nigerian
            State/LGA detection, boundary uncertainty analysis, server-side iSDAsoil JWT token caching,
            and the SoilWise Normalised Soil Data contract.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onGoToDashboard}
            className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Admin Feedback Dashboard</span>
          </button>

          <button
            onClick={onBackToApp}
            className="px-3.5 py-2 text-xs font-medium text-[#1b4332] bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Farm Analysis View</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-900">Pipeline Error</p>
            <p className="mt-0.5 text-xs">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Server Environment & iSDAsoil Credentials Verification Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base ${
              tokenMeta?.credentialsConfigured
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-stone-900">
                  Server Environment &amp; iSDAsoil Credentials Diagnostic
                </h2>
                {tokenMeta?.credentialsConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Credentials Verified
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Credentials Incomplete
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Real-time verification confirming that server-side environment variables are loaded prior to authentication.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {tokenMeta?.hasCachedToken && (
              <button
                onClick={() => {
                  resetTokenCache()
                    .then((res) => setTokenMeta(res.meta))
                    .catch((err) => console.warn('Reset token error:', err.message));
                }}
                className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200 flex items-center gap-1.5 cursor-pointer"
                title="Invalidate current cached JWT token so next request authenticates fresh"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Reset Token Cache</span>
              </button>
            )}
            <button
              onClick={() => {
                fetchTokenCacheStatus()
                  .then((data) => setTokenMeta(data))
                  .catch((err) => console.warn('Refresh error:', err.message));
              }}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
              <span>Re-check Environment</span>
            </button>
          </div>
        </div>

        {/* Verification Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ISDA_USERNAME Status */}
          <div className={`p-4 rounded-2xl border transition-all ${
            tokenMeta?.usernameStatus === 'loaded'
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/60 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600">
                process.env.ISDA_USERNAME
              </span>
              {tokenMeta?.usernameStatus === 'loaded' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-800 border border-emerald-300">
                  LOADED
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-800 border border-amber-300">
                  MISSING
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-stone-800">
              {tokenMeta?.usernameStatus === 'loaded' ? (
                <span className="font-mono text-emerald-900 bg-white/70 px-2 py-1 rounded border border-emerald-200 block">
                  &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull; (Protected server-side &mdash; value hidden)
                </span>
              ) : (
                <span className="text-amber-800 text-[11px] block">
                  Not found in server environment. Set <code className="font-mono font-bold">ISDA_USERNAME</code> in Cloud Run secrets or <code className="font-mono font-bold">.env</code>.
                </span>
              )}
            </p>
            <span className="text-[10px] text-stone-500 mt-2 block">
              Source: Server-side environment variable (never exposed in client bundle)
            </span>
          </div>

          {/* ISDA_PASSWORD Status */}
          <div className={`p-4 rounded-2xl border transition-all ${
            tokenMeta?.passwordStatus === 'loaded'
              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/60 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600">
                process.env.ISDA_PASSWORD
              </span>
              {tokenMeta?.passwordStatus === 'loaded' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/70 text-emerald-800 border border-emerald-300">
                  LOADED
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-800 border border-amber-300">
                  MISSING
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-stone-800">
              {tokenMeta?.passwordStatus === 'loaded' ? (
                <span className="font-mono text-emerald-900 bg-white/70 px-2 py-1 rounded border border-emerald-200 block">
                  &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull; (Secured server-side)
                </span>
              ) : (
                <span className="text-amber-800 text-[11px] block">
                  Not found in server environment. Set <code className="font-mono font-bold">ISDA_PASSWORD</code> in Cloud Run secrets or <code className="font-mono font-bold">.env</code>.
                </span>
              )}
            </p>
            <span className="text-[10px] text-stone-500 mt-2 block">
              Security: Strictly hidden &amp; never written to browser, logs, or responses
            </span>
          </div>

          {/* Auth Endpoint & JWT Cache Status */}
          <div className="p-4 rounded-2xl border bg-stone-50 border-stone-200 text-stone-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600">
                Auth Endpoint &amp; Cache
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                POST /login
              </span>
            </div>
            <p className="text-xs font-mono text-stone-800 bg-white px-2 py-1 rounded border border-stone-200 block truncate">
              {tokenMeta?.authEndpoint || 'https://api.isda-africa.com/login'}
            </p>
            <div className="mt-2 text-[10px] text-stone-600 space-y-0.5">
              <div>
                JWT Cache:{' '}
                <strong className="text-stone-800">
                  {tokenMeta?.hasCachedToken
                    ? `Active (${tokenMeta.expiresInSeconds}s left, ${tokenMeta.cacheHitsCount} hits)`
                    : 'No token cached (will authenticate on-demand)'}
                </strong>
              </div>
              <div>
                Auth calls executed: <strong className="text-stone-800">{tokenMeta?.authCallsCount ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Reliability Architecture Footnote */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p>
              <strong>Zero Startup Blocking:</strong> Authentication executes strictly on-demand during active queries. Missing credentials or upstream timeouts never terminate the server or prevent Cloud Run from listening on the required port.
            </p>
            <p className="text-[11px] text-stone-500">
              When updating credentials, set <code className="font-mono text-stone-700 font-semibold">ISDA_USERNAME</code> and <code className="font-mono text-stone-700 font-semibold">ISDA_PASSWORD</code> as Cloud Run environment variables or in your local server environment.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION A: LOCATION INPUT & PRESETS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Section A — Location Input & Coordinates</h2>
              <p className="text-xs text-stone-500">
                Specify Nigerian State/LGA selections and GPS coordinates to test independent point-in-polygon verification.
              </p>
            </div>
          </div>

          <button
            onClick={handleGetBrowserLocation}
            className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Use Browser GPS</span>
          </button>
        </div>

        {browserGpsNotice && (
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{browserGpsNotice}</span>
          </div>
        )}

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Selected State */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Selected State
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-stone-800"
            >
              {NIGERIA_STATES_LGAS.map((item) => (
                <option key={item.state} value={item.state}>
                  {item.state}
                </option>
              ))}
            </select>
          </div>

          {/* Selected LGA */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Selected LGA
            </label>
            <select
              value={selectedLga}
              onChange={(e) => setSelectedLga(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-stone-800"
            >
              {availableLgas.map((lga) => (
                <option key={lga} value={lga}>
                  {lga}
                </option>
              ))}
            </select>
          </div>

          {/* Latitude */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Latitude (°N)
            </label>
            <input
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g. 10.0500"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-stone-800 font-mono"
            />
          </div>

          {/* Longitude */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Longitude (°E)
            </label>
            <input
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g. 9.1500"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-stone-800 font-mono"
            />
          </div>

          {/* Accuracy (m) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              GPS Accuracy (m)
              <span className="text-[10px] text-stone-400 font-normal ml-1">Optional</span>
            </label>
            <input
              type="number"
              min="0"
              value={accuracyM}
              onChange={(e) => setAccuracyM(e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] text-stone-800 font-mono"
            />
          </div>
        </div>

        {/* Quick Test Presets */}
        <div>
          <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
            Preset Developer Test Scenarios
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                applyPreset({
                  label: 'Exact Match (Bauchi / Toro)',
                  state: 'Bauchi',
                  lga: 'Toro',
                  lat: '10.0500',
                  lon: '9.1500',
                  accuracy: '25',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>1. Match (Bauchi &rarr; Toro)</span>
            </button>

            <button
              onClick={() =>
                applyPreset({
                  label: 'LGA Mismatch (Selected Toro, GPS in Ningi)',
                  state: 'Bauchi',
                  lga: 'Toro',
                  lat: '11.0800',
                  lon: '9.5600',
                  accuracy: '20',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>2. LGA Mismatch (Toro vs Ningi)</span>
            </button>

            <button
              onClick={() =>
                applyPreset({
                  label: 'State Mismatch (Selected Kaduna, GPS in Kano)',
                  state: 'Kaduna',
                  lga: 'Zaria',
                  lat: '11.9900',
                  lon: '8.5200',
                  accuracy: '30',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3 h-3 text-red-600" />
              <span>3. State Mismatch (Kaduna vs Kano)</span>
            </button>

            <button
              onClick={() =>
                applyPreset({
                  label: 'Boundary Uncertain (Plateau / Kaduna border with 600m accuracy)',
                  state: 'Plateau',
                  lga: 'Jos North',
                  lat: '9.9800',
                  lon: '8.8500',
                  accuracy: '600',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3 text-yellow-600" />
              <span>4. Boundary Uncertain (Border proximity)</span>
            </button>

            <button
              onClick={() =>
                applyPreset({
                  label: 'Outside Nigeria (Cotonou, Benin)',
                  state: 'Lagos',
                  lga: 'Badagry',
                  lat: '6.3703',
                  lon: '2.4333',
                  accuracy: '15',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Compass className="w-3 h-3 text-purple-600" />
              <span>5. Outside Nigeria (Cotonou)</span>
            </button>

            <button
              onClick={() =>
                applyPreset({
                  label: 'Invalid Coordinates (999.0, 999.0)',
                  state: 'Abia',
                  lga: 'Aba North',
                  lat: '999.0',
                  lon: '999.0',
                  accuracy: '0',
                })
              }
              className="px-2.5 py-1.5 text-xs bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>6. Invalid Coordinates</span>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleRunPipeline}
            disabled={isRunning}
            className="w-full sm:w-auto px-6 py-3 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Executing Pipeline (Boundaries &rarr; iSDAsoil &rarr; Normalisation)...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-emerald-300" />
                <span>Run Validation &amp; Fetch Soil Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PIPELINE OUTPUT CONTAINER */}
      {pipelineResult && (
        <div className="space-y-8">
          {/* SECTION B: GEOGRAPHIC VALIDATION RESULTS */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-sm">
                  B
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Section B — Geographic Point-in-Polygon Validation
                  </h2>
                  <p className="text-xs text-stone-500">
                    Comparison between selected Nigerian State/LGA and geoBoundaries ADM1/ADM2 polygon analysis.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {(() => {
                const badge = getStatusBadge(pipelineResult.locationValidation.validation.status);
                return (
                  <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 ${badge.bg}`}>
                    {badge.icon}
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wide">
                        {badge.title}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Selected */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>Farmer / User Selection</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  State: <span className="font-bold text-[#1b4332]">{pipelineResult.locationValidation.selected.state}</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  LGA: <span className="font-bold text-[#1b4332]">{pipelineResult.locationValidation.selected.lga}</span>
                </div>
                <div className="text-[11px] text-stone-500 italic mt-2">
                  &bull; User input is strictly preserved (never silently replaced)
                </div>
              </div>

              {/* Card 2: Detected */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>GPS Detected (Point-in-Polygon)</span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  Detected State:{' '}
                  <span
                    className={`font-bold ${
                      pipelineResult.locationValidation.detected.state ? 'text-[#1b4332]' : 'text-red-600'
                    }`}
                  >
                    {pipelineResult.locationValidation.detected.state || 'None (Outside Nigeria)'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-stone-900">
                  Detected LGA:{' '}
                  <span
                    className={`font-bold ${
                      pipelineResult.locationValidation.detected.lga ? 'text-[#1b4332]' : 'text-red-600'
                    }`}
                  >
                    {pipelineResult.locationValidation.detected.lga || 'None (Outside Nigeria)'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 mt-2">
                  Dataset: geoBoundaries NGA ADM1 &amp; ADM2
                </div>
              </div>

              {/* Card 3: Boundary Proximity & Tolerance */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-stone-400" />
                  <span>Tolerance &amp; Boundary Distance</span>
                </div>
                <div className="text-xs text-stone-800">
                  Distance to State Border:{' '}
                  <span className="font-mono font-bold text-stone-900">
                    {pipelineResult.locationValidation.boundaryDetails.distanceToStateBorderKm !== null
                      ? `${pipelineResult.locationValidation.boundaryDetails.distanceToStateBorderKm} km (${pipelineResult.locationValidation.validation.distanceToStateBoundaryM}m)`
                      : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-stone-800">
                  Distance to LGA Border:{' '}
                  <span className="font-mono font-bold text-stone-900">
                    {pipelineResult.locationValidation.boundaryDetails.distanceToLgaBorderKm !== null
                      ? `${pipelineResult.locationValidation.boundaryDetails.distanceToLgaBorderKm} km (${pipelineResult.locationValidation.validation.distanceToLgaBoundaryM}m)`
                      : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-stone-800">
                  Tolerance Applied:{' '}
                  <span className="font-mono font-bold text-stone-900">
                    {pipelineResult.locationValidation.validation.toleranceM}m
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Explanation Box */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
              <span className="font-bold text-stone-900">Validation Diagnostic:</span>
              <p>{pipelineResult.locationValidation.validation.reason}</p>
            </div>
          </div>

          {/* SECTION C: RAW VS NORMALISED iSDAsoil DATA */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-4 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-sm">
                  C
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Section C — SoilWise Normalised Profile vs Raw iSDAsoil Data
                  </h2>
                  <p className="text-xs text-stone-500">
                    Verify data contract normalisation, depth (0-20cm), 30m resolution, Mehlich-3 extraction metadata, and EC unavailability.
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('normalised')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'normalised'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Normalised Profile
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'raw'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Raw iSDAsoil JSON
                </button>
                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'diagnostics'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Diagnostic Audit Log
                </button>
              </div>
            </div>

            {/* TAB 1: NORMALISED PROFILE */}
            {activeTab === 'normalised' && (
              <div className="space-y-6">
                {/* Contract Meta Banner */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">Source:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                      {pipelineResult.soilData.normalised.source} ({pipelineResult.soilData.normalised.source_type})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">Standard Interval:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                      {pipelineResult.soilData.normalised.depth}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">Spatial Resolution:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-900">
                      {pipelineResult.soilData.normalised.spatial_resolution}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">Overall Status:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded border ${
                        pipelineResult.soilData.normalised.overall_status === 'available'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {pipelineResult.soilData.normalised.overall_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. pH */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Soil Reaction (pH)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.normalised.ph.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {pipelineResult.soilData.normalised.ph.status}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-stone-900 font-mono">
                      {pipelineResult.soilData.normalised.ph.value !== null
                        ? pipelineResult.soilData.normalised.ph.value
                        : '—'}
                      <span className="text-xs font-medium text-stone-500 ml-1">pH</span>
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <div>Method: {pipelineResult.soilData.normalised.ph.analytical_method}</div>
                      <div>
                        Uncertainty:{' '}
                        {pipelineResult.soilData.normalised.ph.uncertainty.stdev !== null
                          ? `±${pipelineResult.soilData.normalised.ph.uncertainty.stdev}`
                          : 'None'}
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Nitrogen */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Total Nitrogen (N)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.normalised.nitrogen_total.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {pipelineResult.soilData.normalised.nitrogen_total.status}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-stone-900 font-mono">
                      {pipelineResult.soilData.normalised.nitrogen_total.value !== null
                        ? pipelineResult.soilData.normalised.nitrogen_total.value
                        : '—'}
                      <span className="text-xs font-medium text-stone-500 ml-1">
                        {pipelineResult.soilData.normalised.nitrogen_total.unit}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <div>
                        Normalised:{' '}
                        <strong className="text-stone-800 font-mono">
                          {pipelineResult.soilData.normalised.nitrogen_total.normalised_value !== null
                            ? `${pipelineResult.soilData.normalised.nitrogen_total.normalised_value} ${pipelineResult.soilData.normalised.nitrogen_total.normalised_unit}`
                            : 'N/A'}
                        </strong>
                      </div>
                      <div>Method: Dumas combustion equivalent</div>
                    </div>
                  </div>

                  {/* 3. Extractable Phosphorus */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Extractable Phosphorus (P)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.normalised.phosphorus_extractable.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {pipelineResult.soilData.normalised.phosphorus_extractable.status}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-stone-900 font-mono">
                      {pipelineResult.soilData.normalised.phosphorus_extractable.value !== null
                        ? pipelineResult.soilData.normalised.phosphorus_extractable.value
                        : '—'}
                      <span className="text-xs font-medium text-stone-500 ml-1">mg/kg</span>
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <div>Analytical Definition: Mehlich-3 extractable P</div>
                      <div className="italic text-emerald-800">Location-derived estimate</div>
                    </div>
                  </div>

                  {/* 4. Extractable Potassium */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Extractable Potassium (K)</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.normalised.potassium_extractable.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {pipelineResult.soilData.normalised.potassium_extractable.status}
                      </span>
                    </div>

                    <div className="text-2xl font-black text-stone-900 font-mono">
                      {pipelineResult.soilData.normalised.potassium_extractable.value !== null
                        ? pipelineResult.soilData.normalised.potassium_extractable.value
                        : '—'}
                      <span className="text-xs font-medium text-stone-500 ml-1">mg/kg</span>
                    </div>

                    <div className="text-[11px] text-stone-500 space-y-0.5">
                      <div>Analytical Definition: Mehlich-3 extractable K</div>
                      <div className="italic text-emerald-800">Location-derived estimate</div>
                    </div>
                  </div>

                  {/* 5. Soil Texture (Sand / Silt / Clay) */}
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Soil Texture Fractions</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Sand / Silt / Clay
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-stone-900 space-y-1 font-mono">
                      <div>
                        Sand:{' '}
                        <strong className="text-stone-900">
                          {pipelineResult.soilData.normalised.sand_content.value !== null
                            ? `${pipelineResult.soilData.normalised.sand_content.value}%`
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        Silt:{' '}
                        <strong className="text-stone-900">
                          {pipelineResult.soilData.normalised.silt_content.value !== null
                            ? `${pipelineResult.soilData.normalised.silt_content.value}%`
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        Clay:{' '}
                        <strong className="text-stone-900">
                          {pipelineResult.soilData.normalised.clay_content.value !== null
                            ? `${pipelineResult.soilData.normalised.clay_content.value}%`
                            : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500">
                      USDA Class:{' '}
                      <span className="font-bold text-[#1b4332]">
                        {pipelineResult.soilData.normalised.texture_class.value || 'Undetermined'}
                      </span>
                    </div>
                  </div>

                  {/* 6. Electrical Conductivity (EC) — Requirement 8: STRICTLY UNAVAILABLE */}
                  <div className="p-4 bg-stone-100/90 border border-stone-300 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Electrical Conductivity (EC)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-300 text-stone-700">
                        UNAVAILABLE
                      </span>
                    </div>

                    <div className="text-xl font-bold text-stone-400 font-mono">
                      null <span className="text-xs font-normal text-stone-500">(dS/m)</span>
                    </div>

                    <div className="text-[11px] text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                      <p className="font-semibold text-stone-900">Section 8 Compliance Rule:</p>
                      <p className="mt-0.5">
                        EC is not exposed in the iSDAsoil dataset. SoilWise strictly forbids estimating or inventing EC from pH or texture proxies.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: RAW iSDAsoil JSON */}
            {activeTab === 'raw' && (
              <div className="space-y-4">
                {/* Dedicated Diagnostic Summary for iSDAsoil Connection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Authentication Diagnostic Card */}
                  <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl space-y-2 border border-stone-800">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Authentication Diagnostic
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.authDiagnostic?.authentication === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : pipelineResult.soilData.authDiagnostic?.authentication === 'SKIPPED'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {pipelineResult.soilData.authDiagnostic?.authentication || (pipelineResult.soilData.tokenInfo.hasCachedToken ? 'SUCCESS' : 'FAILED')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 font-mono">
                      <div>
                        <span className="text-stone-400">Endpoint: </span>
                        <span className="text-stone-200">
                          {pipelineResult.soilData.authDiagnostic?.endpoint || 'https://api.isda-africa.com/login'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">HTTP Status: </span>
                        <span className="text-stone-200 font-bold">
                          {pipelineResult.soilData.authDiagnostic?.httpStatus !== null && pipelineResult.soilData.authDiagnostic?.httpStatus !== undefined
                            ? pipelineResult.soilData.authDiagnostic.httpStatus
                            : pipelineResult.soilData.tokenInfo.hasCachedToken
                            ? 200
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">Authentication: </span>
                        <span
                          className={`font-bold ${
                            pipelineResult.soilData.authDiagnostic?.authentication === 'SUCCESS' || pipelineResult.soilData.tokenInfo.hasCachedToken
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {pipelineResult.soilData.authDiagnostic?.authentication || (pipelineResult.soilData.tokenInfo.hasCachedToken ? 'SUCCESS' : 'FAILED')}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">Token received: </span>
                        <span className="text-emerald-400 font-bold">
                          {pipelineResult.soilData.authDiagnostic?.tokenReceived || pipelineResult.soilData.tokenInfo.hasCachedToken
                            ? 'YES (cached server-side)'
                            : 'NO'}
                        </span>
                      </div>
                      {pipelineResult.soilData.authDiagnostic?.message && (
                        <div className="text-[11px] text-stone-400 font-sans pt-1 border-t border-stone-800">
                          {pipelineResult.soilData.authDiagnostic.message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Soilproperty Diagnostic Card */}
                  <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl space-y-2 border border-stone-800">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                        Soilproperty Diagnostic
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          pipelineResult.soilData.soilPropertyDiagnostic?.responseReceived
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {pipelineResult.soilData.soilPropertyDiagnostic?.responseReceived ? 'RECEIVED' : 'PENDING / ERROR'}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 font-mono">
                      <div>
                        <span className="text-stone-400">Endpoint: </span>
                        <span className="text-stone-200">
                          {pipelineResult.soilData.soilPropertyDiagnostic?.endpoint || 'https://api.isda-africa.com/isdasoil/v2/soilproperty'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">HTTP Status: </span>
                        <span className="text-stone-200 font-bold">
                          {pipelineResult.soilData.soilPropertyDiagnostic?.httpStatus !== null && pipelineResult.soilData.soilPropertyDiagnostic?.httpStatus !== undefined
                            ? pipelineResult.soilData.soilPropertyDiagnostic.httpStatus
                            : pipelineResult.soilData.success
                            ? 200
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">Response received: </span>
                        <span
                          className={`font-bold ${
                            pipelineResult.soilData.soilPropertyDiagnostic?.responseReceived
                              ? 'text-emerald-400'
                              : 'text-stone-400'
                          }`}
                        >
                          {pipelineResult.soilData.soilPropertyDiagnostic?.responseReceived ? 'YES' : 'NO'}
                        </span>
                      </div>
                      {pipelineResult.soilData.soilPropertyDiagnostic?.message && (
                        <div className="text-[11px] text-stone-400 font-sans pt-1 border-t border-stone-800">
                          {pipelineResult.soilData.soilPropertyDiagnostic.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 flex items-center justify-between">
                  <span className="font-semibold">
                    Raw JSON payload from <code className="font-mono text-[#1b4332]">/isdasoil/v2/soilproperty</code>:
                  </span>
                  <span className="text-stone-500 text-[11px]">
                    Direct API payload (tokens/credentials sanitized)
                  </span>
                </div>

                <pre className="p-4 bg-stone-950 text-stone-200 rounded-2xl text-xs font-mono overflow-x-auto max-h-[460px] border border-stone-800 leading-relaxed">
                  {JSON.stringify(pipelineResult.soilData.raw, null, 2)}
                </pre>
              </div>
            )}

            {/* TAB 3: DIAGNOSTICS AUDIT LOG */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4">
                <div className="text-xs text-stone-600 font-medium">
                  Complete audit log of all decision stages across the pipeline ({pipelineResult.pipelineLog.length} steps, total duration {pipelineResult.totalDurationMs}ms):
                </div>

                <div className="divide-y divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden bg-stone-50 text-xs">
                  {pipelineResult.pipelineLog.map((step, idx) => (
                    <div key={idx} className="p-3.5 flex items-start gap-3 hover:bg-white transition-colors">
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {step.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {step.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                        {step.status === 'info' && <Info className="w-4 h-4 text-sky-600" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">{step.step}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(step.timestamp).toLocaleTimeString()}
                            {step.durationMs !== undefined ? ` (${step.durationMs}ms)` : ''}
                          </span>
                        </div>
                        <p className="mt-1 text-stone-600">{step.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION D: PIPELINE DIAGNOSTIC SUMMARY */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-200 pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#1b4332] text-white flex items-center justify-center font-bold text-sm">
                D
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Section D — Pipeline Summary &amp; Verification</h2>
                <p className="text-xs text-stone-500">
                  Integrity checklist proving reliability of location-derived soil estimates when laboratory soil test is unavailable.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">1. Boundary Check</span>
                <p className="text-xs font-semibold text-stone-900">
                  {pipelineResult.locationValidation.validation.status === 'match'
                    ? 'Verified Match'
                    : pipelineResult.locationValidation.validation.status.replace('_', ' ').toUpperCase()}
                </p>
                <p className="text-[11px] text-stone-500">
                  Selected State &amp; LGA intact: No silent modification
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">2. Token Cache</span>
                <p className="text-xs font-semibold text-stone-900">
                  {pipelineResult.soilData.tokenInfo.hasCachedToken ? 'Token Reused' : 'Initial / Expired'}
                </p>
                <p className="text-[11px] text-stone-500">
                  Cached in server memory; never leaked to browser
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">3. Provenance</span>
                <p className="text-xs font-semibold text-emerald-800">
                  location_estimated
                </p>
                <p className="text-[11px] text-stone-500">
                  Strictly distinguished from lab test or measured
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">4. EC Handling</span>
                <p className="text-xs font-semibold text-stone-700">
                  Status: Unavailable
                </p>
                <p className="text-[11px] text-stone-500">
                  Never fabricated or inferred from salinity proxies
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
