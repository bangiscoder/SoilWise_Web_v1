import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CloudRain, 
  ThermometerSun, 
  Wind, 
  Droplets, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { FarmLocation } from '../../types/soilwise';
import { 
  fetch7DayWeatherForecast, 
  SevenDayForecastResult 
} from '../../services/openMeteoWeatherService';
import { 
  evaluateWeatherAlerts, 
  WeatherAlert, 
  AlertSeverity 
} from '../../services/weatherAlertService';

interface RealTimeWeatherAlertsProps {
  location: FarmLocation;
  preloadedForecast?: SevenDayForecastResult | null;
  onNavigateToWeatherTab?: () => void;
  className?: string;
}

export const RealTimeWeatherAlerts: React.FC<RealTimeWeatherAlertsProps> = ({
  location,
  preloadedForecast,
  onNavigateToWeatherTab,
  className = '',
}) => {
  const [forecast, setForecast] = useState<SevenDayForecastResult | null>(preloadedForecast || null);
  const [loading, setLoading] = useState<boolean>(!preloadedForecast);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [simulatedScenario, setSimulatedScenario] = useState<'flood' | 'heatwave' | 'drought' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);

  const handleCopyAlert = (alert: WeatherAlert) => {
    try {
      const locationText = location.lga
        ? `${location.lga}, ${location.state || 'Nigeria'}`
        : location.state || 'Nigeria';
      const steps = alert.mitigationSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      const text = `⚠️ [SOILWISE WEATHER ALERT - ${alert.severity.toUpperCase()}]\n${alert.title}\n📍 Location: ${locationText}\n⏳ Timeline: ${alert.timeline}\n📋 Summary: ${alert.shortSummary}\n\nKey Mitigations:\n${steps}\n\nPowered by Open-Meteo & SoilWise AI`;
      navigator.clipboard.writeText(text);
      setCopiedAlertId(alert.id);
      setTimeout(() => setCopiedAlertId(null), 2500);
    } catch (e) {
      console.warn('Failed to copy alert:', e);
    }
  };

  // Load weather forecast for farm location
  const loadForecast = async (force = false) => {
    if (!location.latitude || !location.longitude) return;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const result = await fetch7DayWeatherForecast(location.latitude, location.longitude, force);
      if (result && result.status === 'success') {
        setForecast(result);
      }
    } catch (err) {
      console.warn('Real-time weather alerts forecast error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (preloadedForecast) {
      setForecast(preloadedForecast);
      setLoading(false);
    } else {
      loadForecast(false);
    }
  }, [location.latitude, location.longitude, preloadedForecast]);

  // Compute active weather alerts
  const alerts: WeatherAlert[] = React.useMemo(() => {
    return evaluateWeatherAlerts(forecast, location, simulatedScenario);
  }, [forecast, location, simulatedScenario]);

  // Set default expanded alert to the most severe one
  useEffect(() => {
    if (alerts.length > 0 && !expandedAlertId) {
      const criticalOrWarning = alerts.find(a => a.severity === 'critical' || a.severity === 'warning');
      if (criticalOrWarning) {
        setExpandedAlertId(criticalOrWarning.id);
      } else {
        setExpandedAlertId(alerts[0].id);
      }
    }
  }, [alerts]);

  // Audio Speech Synthesis for Rural Accessibility
  const speakAlert = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const getAlertIcon = (type: WeatherAlert['type'], severity: AlertSeverity) => {
    switch (type) {
      case 'flash_flood':
        return <CloudRain className="w-5 h-5 text-blue-600" />;
      case 'heatwave':
        return <ThermometerSun className="w-5 h-5 text-amber-600" />;
      case 'windstorm':
        return <Wind className="w-5 h-5 text-teal-600" />;
      case 'dry_spell':
        return <Droplets className="w-5 h-5 text-orange-600" />;
      case 'favorable_conditions':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            CRITICAL ALERT
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            SEVERE WARNING
          </span>
        );
      case 'advisory':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950">
            CLIMATE ADVISORY
          </span>
        );
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white">
            FAVORABLE CONDITIONS
          </span>
        );
    }
  };

  const getContainerStyles = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-gradient-to-br from-red-50 via-rose-50 to-orange-50/60 border-2 border-red-400/90 shadow-md';
      case 'warning':
        return 'bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 border-2 border-orange-400/80 shadow-xs';
      case 'advisory':
        return 'bg-amber-50/70 border border-amber-300 shadow-2xs';
      case 'optimal':
        return 'bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-300 shadow-2xs';
    }
  };

  const hasHighSeverity = alerts.some(a => a.severity === 'critical' || a.severity === 'warning');

  return (
    <section className={`rounded-3xl overflow-hidden transition-all duration-300 ${className}`}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-white border border-stone-200/90 rounded-3xl shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              hasHighSeverity ? 'bg-red-600 text-white animate-pulse' : 'bg-[#1b4332] text-emerald-300'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                  <span>Real-Time Farm Climate Alerts</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                </h3>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                <span>
                  {location.lga ? `${location.lga}, ` : ''}{location.state ? `${location.state} State` : 'Nigeria'} ({location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E)
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Refresh, Audio Briefing, Scenario Toggle) */}
          <div className="flex items-center gap-2 text-xs">
            {/* Audio Read-Out Toggle */}
            {alerts[0] && (
              <button
                onClick={() => speakAlert(`${alerts[0].title}. ${alerts[0].shortSummary}. Recommended actions: ${alerts[0].mitigationSteps.join('. ')}`)}
                title={isSpeaking ? 'Stop audio briefing' : 'Play audio voice alert'}
                className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSpeaking ? 'bg-red-100 text-red-700 border-red-300' : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-red-600" /> : <Volume2 className="w-3.5 h-3.5 text-stone-600" />}
                <span className="text-[11px] font-bold hidden sm:inline">{isSpeaking ? 'Mute' : 'Voice Alert'}</span>
              </button>
            )}

            {/* Test Simulation Dropdown / Toggle */}
            <div className="relative inline-flex items-center gap-1 bg-stone-100 rounded-xl p-0.5 border border-stone-200 text-[10px] font-bold text-stone-600">
              <button
                onClick={() => setSimulatedScenario(null)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  simulatedScenario === null ? 'bg-white text-stone-900 shadow-2xs font-black' : 'hover:text-stone-900'
                }`}
              >
                Live Radar
              </button>
              <button
                onClick={() => setSimulatedScenario('flood')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  simulatedScenario === 'flood' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'hover:text-stone-900'
                }`}
                title="Preview Flash Flood Alert Mode"
              >
                Test Flood
              </button>
              <button
                onClick={() => setSimulatedScenario('heatwave')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  simulatedScenario === 'heatwave' ? 'bg-amber-600 text-white shadow-2xs font-black' : 'hover:text-stone-900'
                }`}
                title="Preview Heatwave Alert Mode"
              >
                Test Heat
              </button>
              <button
                onClick={() => setSimulatedScenario('drought')}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  simulatedScenario === 'drought' ? 'bg-orange-600 text-white shadow-2xs font-black' : 'hover:text-stone-900'
                }`}
                title="Preview Agricultural Drought & Severe Dry Spell Mode"
              >
                Test Drought
              </button>
            </div>

            {/* Live Refresh Button */}
            <button
              onClick={() => loadForecast(true)}
              disabled={loading || refreshing}
              title="Refresh live weather scan"
              className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#1b4332]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="p-6 text-center text-xs text-stone-500 space-y-2">
            <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin mx-auto" />
            <p>Scanning atmospheric models and NiMet radar for extreme weather events...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`p-4 sm:p-5 rounded-2xl transition-all ${getContainerStyles(alert.severity)}`}
                >
                  {/* Top Bar of Alert Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-white/90 shadow-2xs shrink-0 mt-0.5">
                        {getAlertIcon(alert.type, alert.severity)}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {alert.timeline}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-stone-900 tracking-tight leading-snug">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-stone-700 leading-relaxed font-medium">
                          {alert.shortSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAlert(alert);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                          copiedAlertId === alert.id
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white/80 hover:bg-white text-stone-700 border-stone-200/80 shadow-2xs'
                        }`}
                        title="Copy alert for SMS / WhatsApp broadcast to farm workers"
                      >
                        {copiedAlertId === alert.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span className="text-[10px] hidden sm:inline text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-stone-600" />
                            <span className="text-[10px] hidden sm:inline">Share</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-stone-600 transition-colors shrink-0 cursor-pointer border border-stone-200/60 shadow-2xs"
                        aria-label="Toggle alert details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Actionable Agroecological Mitigations & Metrics */}
                  {isExpanded && (
                    <div className="mt-4 pt-3.5 border-t border-stone-200/60 space-y-3.5 text-xs">
                      {/* Metric Gauges */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {alert.metrics.map((m, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white/95 border border-stone-200/80 shadow-2xs space-y-0.5">
                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                              {m.label}
                            </span>
                            <span className="text-sm font-black text-stone-900 block font-mono">
                              {m.value}
                            </span>
                            <span className="text-[10px] font-medium text-stone-500 block truncate">
                              Ref: {m.threshold}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Agroecological Mitigation Protocols */}
                      <div className="p-3.5 rounded-xl bg-white/95 border border-stone-200/90 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Immediate Agronomic Mitigation Instructions:</span>
                        </div>
                        <ul className="space-y-1.5 pl-1 text-[11px] text-stone-700">
                          {alert.mitigationSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 leading-relaxed">
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Footer Link to Deep Weather View */}
                      {onNavigateToWeatherTab && (
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-stone-500">
                            Live atmospheric model updated: {alert.timestamp}
                          </span>
                          <button
                            onClick={onNavigateToWeatherTab}
                            className="font-bold text-[#1b4332] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open 7-Day Agricultural Forecast</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
