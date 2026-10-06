import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudRain,
  CloudSun,
  Sun,
  Cloud,
  Droplets,
  Wind,
  Thermometer,
  Calendar,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  fetch7DayWeatherForecast,
  fetchHistoricalRainfallPatterns,
  SevenDayForecastResult,
  HistoricalRainfallResult,
  DailyForecastDay,
  YearlyRainfallPattern,
} from '../services/openMeteoWeatherService';
import { FarmLocation } from '../types/soilwise';

interface FarmOpenMeteoWeatherSectionProps {
  location: FarmLocation;
}

type WeatherViewTab = 'forecast' | 'historical' | 'operations';

export const FarmOpenMeteoWeatherSection: React.FC<FarmOpenMeteoWeatherSectionProps> = ({
  location,
}) => {
  const [activeTab, setActiveTab] = useState<WeatherViewTab>('forecast');
  const [forecastData, setForecastData] = useState<SevenDayForecastResult | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalRainfallResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Day in 7-day forecast (default: today / first day)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Selected Year in Historical Rainfall view ('average' or year number)
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState<number | 'average' | 'all'>('average');

  // Hovered month index in historical chart
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const lat = location.latitude;
  const lon = location.longitude;

  const loadData = async (force = false) => {
    if (!lat || !lon) return;
    try {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [fResult, hResult] = await Promise.all([
        fetch7DayWeatherForecast(lat, lon, force),
        fetchHistoricalRainfallPatterns(lat, lon, force),
      ]);

      setForecastData(fResult);
      setHistoricalData(hResult);

      if (fResult.status === 'error' && hResult.status === 'error') {
        setError(fResult.errorMessage || 'Unable to connect to Open-Meteo services.');
      }
    } catch (err: any) {
      console.error('Failed to load Open-Meteo weather data:', err);
      setError(err?.message || 'Unexpected network error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [lat, lon]);

  // Selected day object
  const selectedDay: DailyForecastDay | null = useMemo(() => {
    if (!forecastData || !forecastData.days || forecastData.days.length === 0) return null;
    return forecastData.days[selectedDayIndex] || forecastData.days[0];
  }, [forecastData, selectedDayIndex]);

  // Weather icon renderer
  const renderWeatherIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Sun':
        return <Sun className={`${className} text-amber-500`} />;
      case 'CloudSun':
        return <CloudSun className={`${className} text-amber-600`} />;
      case 'Cloud':
        return <Cloud className={`${className} text-stone-500`} />;
      case 'CloudRain':
        return <CloudRain className={`${className} text-blue-600`} />;
      case 'Droplets':
        return <Droplets className={`${className} text-sky-500`} />;
      case 'Wind':
        return <Wind className={`${className} text-teal-600`} />;
      default:
        return <CloudSun className={`${className} text-amber-600`} />;
    }
  };

  // Get active historical dataset to render
  const activeHistoricalDataset = useMemo(() => {
    if (!historicalData || !historicalData.years) return null;
    if (selectedHistoricalYear === 'average') {
      return {
        label: 'Multi-Year Climatological Average (2023–2025)',
        records: historicalData.multiYearMonthlyAverage,
        annualTotal: historicalData.multiYearAverageAnnualMm,
      };
    }
    const found = historicalData.years.find((y) => y.year === selectedHistoricalYear);
    if (found) {
      return {
        label: `Year ${found.year} Observed Rainfall`,
        records: found.monthly,
        annualTotal: found.totalRainfallMm,
        pattern: found,
      };
    }
    return {
      label: 'Multi-Year Climatological Average',
      records: historicalData.multiYearMonthlyAverage,
      annualTotal: historicalData.multiYearAverageAnnualMm,
    };
  }, [historicalData, selectedHistoricalYear]);

  // Calculate highest monthly rainfall value for relative bar heights
  const maxMonthlyRainVal = useMemo(() => {
    if (!historicalData) return 100;
    let max = 60;
    historicalData.years.forEach((y) => {
      y.monthly.forEach((m) => {
        if (m.rainfallMm > max) max = m.rainfallMm;
      });
    });
    historicalData.multiYearMonthlyAverage.forEach((m) => {
      if (m.rainfallMm > max) max = m.rainfallMm;
    });
    return Math.ceil(max * 1.15); // Add 15% headroom
  }, [historicalData]);

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Weather Forecast &amp; Rainfall Patterns
              </h2>
              <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60 uppercase tracking-wider">
                Open-Meteo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              High-resolution 7-day agricultural forecast &amp; ERA5-Land historical precipitation analysis
            </p>
          </div>
        </div>

        {/* Live Farm Coordinates & Refresh Action */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-mono text-stone-500">
              {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
            </div>
            <div className="text-[10px] text-stone-400">
              {location.lga ? `${location.lga}, ` : ''}{location.state || 'Nigeria'}
            </div>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh weather data from Open-Meteo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'forecast'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>7-Day Ag-Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('historical')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'historical'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Historical Rainfall Patterns</span>
          </button>

          <button
            onClick={() => setActiveTab('operations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'operations'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Field Operations Advisory</span>
          </button>
        </div>

        {/* Current Conditions Micro-kicker (when forecast data is loaded) */}
        {forecastData?.current && !loading && (
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="flex items-center gap-1 font-semibold text-stone-800">
              {renderWeatherIcon(forecastData.current.iconName, 'w-4 h-4')}
              <span>{forecastData.current.temperatureC}°C</span>
            </span>
            <span className="text-stone-300">·</span>
            <span>Feels {forecastData.current.apparentTemperatureC}°C</span>
            <span className="text-stone-300">·</span>
            <span className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-sky-500" />
              <span>{forecastData.current.relativeHumidityPercent}% Hum</span>
            </span>
            <span className="text-stone-300 hidden md:inline">·</span>
            <span className="flex items-center gap-1 hidden md:flex">
              <Wind className="w-3.5 h-3.5 text-teal-600" />
              <span>{forecastData.current.windSpeedKmh} km/h</span>
            </span>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 py-8 animate-pulse">
          <div className="h-28 bg-stone-100 rounded-2xl w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-32 bg-stone-100 rounded-xl" />
            ))}
          </div>
          <div className="h-44 bg-stone-100 rounded-2xl w-full" />
        </div>
      )}

      {/* Error Banner */}
      {!loading && error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Weather service temporarily restricted</p>
            <p className="text-amber-800 leading-relaxed">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="mt-2 text-xs font-bold underline hover:text-amber-950 cursor-pointer"
            >
              Try reconnecting to Open-Meteo
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: 7-DAY AG-WEATHER FORECAST */}
      {!loading && activeTab === 'forecast' && forecastData && (
        <div className="space-y-6">
          {/* 7-Day Cumulative Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                7-Day Total Rain
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-[#1b4332]">
                  {forecastData.summary.totalPrecipitationMm}
                </span>
                <span className="text-xs font-medium text-stone-500">mm</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                {forecastData.summary.wetDaysCount} wet {forecastData.summary.wetDaysCount === 1 ? 'day' : 'days'} (≥1mm)
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Weekly Temp Range
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg sm:text-xl font-bold font-mono text-stone-800">
                  {forecastData.summary.avgTempMinC}° – {forecastData.summary.avgTempMaxC}°
                </span>
                <span className="text-xs font-medium text-stone-500">C</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Avg min / max daily range
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Crop Water Loss (ET₀)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-extrabold font-mono text-amber-700">
                  {forecastData.summary.totalEt0Mm}
                </span>
                <span className="text-xs font-medium text-stone-500">mm</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                FAO-56 evapotranspiration sum
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Water Balance Outlook
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                {forecastData.summary.totalPrecipitationMm >= forecastData.summary.totalEt0Mm ? (
                  <span className="text-sm font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Surplus (+{(forecastData.summary.totalPrecipitationMm - forecastData.summary.totalEt0Mm).toFixed(1)} mm)
                  </span>
                ) : (
                  <span className="text-sm font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Deficit (-{(forecastData.summary.totalEt0Mm - forecastData.summary.totalPrecipitationMm).toFixed(1)} mm)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Rainfall vs crop evapotranspiration
              </span>
            </div>
          </div>

          {/* 7-Day Interactive Forecast Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Daily Forecast Timeline
              </span>
              <span className="text-[11px] text-stone-500">
                Click any day for agronomic field details
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {forecastData.days.map((day, idx) => {
                const isSelected = idx === selectedDayIndex;
                const isRainExpected = day.precipitationMm > 0.5;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#f0f5ee] border-[#1b4332] shadow-xs ring-2 ring-[#1b4332]/20'
                        : 'bg-stone-50 hover:bg-stone-100/80 border-stone-200/80'
                    }`}
                  >
                    <div>
                      {/* Day Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">
                          {day.dayName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {day.date.slice(5)}
                        </span>
                      </div>

                      {/* Weather Icon & Condition */}
                      <div className="my-2.5 flex items-center gap-2">
                        {renderWeatherIcon(day.iconName, 'w-6 h-6')}
                        <span className="text-[11px] font-medium text-stone-700 leading-tight line-clamp-1">
                          {day.weatherLabel}
                        </span>
                      </div>

                      {/* Temperature Range */}
                      <div className="flex items-baseline justify-between text-xs mt-1">
                        <span className="font-extrabold text-stone-900 font-mono">
                          {day.tempMaxC}°
                        </span>
                        <span className="text-stone-400 font-mono text-[11px]">
                          {day.tempMinC}°
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-200/60 space-y-1">
                      {/* Rain Probability & Amount */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-sky-700 font-medium">
                          <Droplets className="w-3 h-3 text-sky-500" />
                          <span>{day.precipitationProbabilityPercent}%</span>
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            isRainExpected ? 'text-blue-700' : 'text-stone-400'
                          }`}
                        >
                          {day.precipitationMm} mm
                        </span>
                      </div>

                      {/* Spraying Suitability Indicator */}
                      <div className="flex items-center gap-1 text-[10px] mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            day.sprayingSuitability === 'optimal'
                              ? 'bg-emerald-500'
                              : day.sprayingSuitability === 'caution'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-stone-500 truncate">
                          {day.sprayingSuitability === 'optimal'
                            ? 'Spray OK'
                            : day.sprayingSuitability === 'caution'
                            ? 'Spray Caution'
                            : 'No Spray'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Expanded Agronomic Detail Card */}
          {selectedDay && (
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
                    {renderWeatherIcon(selectedDay.iconName, 'w-4 h-4')}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900">
                      Agronomic Assessment for {selectedDay.dayName} ({selectedDay.date})
                    </h3>
                    <p className="text-xs text-stone-500">
                      {selectedDay.weatherLabel} · High: {selectedDay.tempMaxC}°C · Low: {selectedDay.tempMinC}°C
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-stone-500">ET₀ Water Demand:</span>
                  <span className="font-mono font-bold text-amber-800">
                    {selectedDay.et0EvapotranspirationMm} mm/day
                  </span>
                </div>
              </div>

              {/* 3 Action Pillars for Selected Day */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Chemical & Fertilizer Application */}
                <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        selectedDay.sprayingSuitability === 'optimal'
                          ? 'text-emerald-600'
                          : selectedDay.sprayingSuitability === 'caution'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    />
                    <span>Spraying &amp; Chemicals</span>
                  </div>
                  <p className="text-xs text-stone-800 font-semibold mt-1">
                    {selectedDay.sprayingSuitability === 'optimal'
                      ? 'Favorable spraying window'
                      : selectedDay.sprayingSuitability === 'caution'
                      ? 'Exercise caution when spraying'
                      : 'Unfavorable for spraying'}
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {selectedDay.sprayingNote} Maximum wind speed {selectedDay.windSpeedMaxKmh} km/h.
                  </p>
                </div>

                {/* 2. Soil Moisture & Rain Infiltration */}
                <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <span>Rain Infiltration &amp; Moisture</span>
                  </div>
                  <p className="text-xs text-stone-800 font-semibold mt-1">
                    {selectedDay.precipitationMm >= 10
                      ? 'Substantial soil recharge'
                      : selectedDay.precipitationMm >= 2
                      ? 'Light surface moistening'
                      : 'Dry conditions prevail'}
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Expected rain: {selectedDay.precipitationMm} mm ({selectedDay.precipitationProbabilityPercent}% probability).
                    {selectedDay.precipitationMm > 15 && ' Heavy rainfall risk: delay topdressing nitrogen.'}
                  </p>
                </div>

                {/* 3. Evapotranspiration & Irrigation Need */}
                <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <Thermometer className="w-4 h-4 text-amber-600" />
                    <span>Crop Evapotranspiration</span>
                  </div>
                  <p className="text-xs text-stone-800 font-semibold mt-1">
                    ET₀: {selectedDay.et0EvapotranspirationMm} mm
                  </p>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {selectedDay.et0EvapotranspirationMm >= 5.0
                      ? 'High evaporative stress on crops. Moisture conservation advised.'
                      : selectedDay.et0EvapotranspirationMm >= 3.0
                      ? 'Moderate crop water consumption rate.'
                      : 'Low evaporative demand. Favorable for seedling recovery.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORICAL RAINFALL PATTERNS */}
      {!loading && activeTab === 'historical' && historicalData && (
        <div className="space-y-6">
          {/* Year Selector Control */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setSelectedHistoricalYear('average')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedHistoricalYear === 'average'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Multi-Year Average
              </button>

              {historicalData.years.map((y) => (
                <button
                  key={y.year}
                  onClick={() => setSelectedHistoricalYear(y.year)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    selectedHistoricalYear === y.year
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {y.year}
                </button>
              ))}

              <button
                onClick={() => setSelectedHistoricalYear('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedHistoricalYear === 'all'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Multi-Year Comparison
              </button>
            </div>

            <div className="text-xs text-stone-500">
              <span>Baseline: </span>
              <strong className="text-stone-800">{historicalData.multiYearAverageAnnualMm} mm/year</strong>
            </div>
          </div>

          {/* Historical Climatology Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Typical Onset Month
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-[#1b4332] mt-0.5">
                {historicalData.typicalOnsetMonth}
              </p>
              <span className="text-[10px] text-stone-400 block">
                First month averaging &gt;45mm
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Peak Rainfall Month
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-[#1b4332] mt-0.5">
                {historicalData.typicalPeakMonth}
              </p>
              <span className="text-[10px] text-stone-400 block">
                Highest precipitation volume
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Typical Cessation
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-[#1b4332] mt-0.5">
                {historicalData.typicalCessationMonth}
              </p>
              <span className="text-[10px] text-stone-400 block">
                Onset of dry harmattan transition
              </span>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Average Annual Wet Days
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-stone-900 mt-0.5">
                {Math.round(
                  historicalData.years.reduce((acc, y) => acc + y.rainyDaysCount, 0) /
                    Math.max(1, historicalData.years.length)
                )}{' '}
                days
              </p>
              <span className="text-[10px] text-stone-400 block">
                Days with ≥1.0mm rain
              </span>
            </div>
          </div>

          {/* Interactive Monthly Rainfall Chart */}
          <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {selectedHistoricalYear === 'all'
                    ? 'Multi-Year Monthly Rainfall Comparison (2023 vs 2024 vs 2025)'
                    : activeHistoricalDataset?.label}
                </h3>
                <p className="text-xs text-stone-500">
                  Total observed precipitation across all 12 calendar months (mm)
                </p>
              </div>

              {selectedHistoricalYear !== 'all' && activeHistoricalDataset && (
                <div className="text-right">
                  <span className="text-xs text-stone-500">Annual Total: </span>
                  <span className="text-sm font-bold font-mono text-[#1b4332]">
                    {activeHistoricalDataset.annualTotal} mm
                  </span>
                </div>
              )}
            </div>

            {/* Chart Grid */}
            {selectedHistoricalYear !== 'all' && activeHistoricalDataset && (
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-4">
                {activeHistoricalDataset.records.map((m, idx) => {
                  const heightPct = Math.round((m.rainfallMm / maxMonthlyRainVal) * 100);
                  const isHovered = hoveredMonthIndex === idx;
                  const isPeak = m.rainfallMm > 0 && m.rainfallMm === Math.max(...activeHistoricalDataset.records.map((r) => r.rainfallMm));

                  return (
                    <div
                      key={m.monthName}
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      {/* Bar Container */}
                      <div className="w-full h-36 bg-white rounded-xl border border-stone-200/60 flex items-end p-1 transition-all group-hover:border-stone-400">
                        <div
                          className={`w-full rounded-lg transition-all ${
                            isPeak
                              ? 'bg-[#1b4332] group-hover:bg-emerald-700'
                              : isHovered
                              ? 'bg-sky-700'
                              : 'bg-sky-600/80 group-hover:bg-sky-600'
                          }`}
                          style={{ height: `${Math.max(4, heightPct)}%` }}
                          title={`${m.monthName}: ${m.rainfallMm} mm`}
                        />
                      </div>

                      {/* Month Label */}
                      <span className="text-[11px] font-semibold text-stone-700 mt-2">
                        {m.monthName}
                      </span>

                      {/* Rainfall value */}
                      <span
                        className={`text-[10px] font-mono mt-0.5 ${
                          isPeak ? 'font-bold text-[#1b4332]' : 'text-stone-500'
                        }`}
                      >
                        {Math.round(m.rainfallMm)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Multi-Year Comparison Grouped Bars */}
            {selectedHistoricalYear === 'all' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="w-3 h-3 rounded-xs bg-sky-500 inline-block" />
                    2023
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="w-3 h-3 rounded-xs bg-teal-600 inline-block" />
                    2024
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span className="w-3 h-3 rounded-xs bg-[#1b4332] inline-block" />
                    2025
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                    (mName, mIdx) => {
                      const y2023 = historicalData.years.find((y) => y.year === 2023)?.monthly[mIdx]?.rainfallMm ?? 0;
                      const y2024 = historicalData.years.find((y) => y.year === 2024)?.monthly[mIdx]?.rainfallMm ?? 0;
                      const y2025 = historicalData.years.find((y) => y.year === 2025)?.monthly[mIdx]?.rainfallMm ?? 0;

                      const h2023 = Math.round((y2023 / maxMonthlyRainVal) * 100);
                      const h2024 = Math.round((y2024 / maxMonthlyRainVal) * 100);
                      const h2025 = Math.round((y2025 / maxMonthlyRainVal) * 100);

                      return (
                        <div key={mName} className="flex flex-col items-center">
                          <div className="w-full h-36 bg-white rounded-xl border border-stone-200/60 flex items-end p-1 gap-0.5">
                            <div
                              className="w-1/3 bg-sky-500 rounded-xs transition-all hover:opacity-80"
                              style={{ height: `${Math.max(4, h2023)}%` }}
                              title={`2023 ${mName}: ${y2023} mm`}
                            />
                            <div
                              className="w-1/3 bg-teal-600 rounded-xs transition-all hover:opacity-80"
                              style={{ height: `${Math.max(4, h2024)}%` }}
                              title={`2024 ${mName}: ${y2024} mm`}
                            />
                            <div
                              className="w-1/3 bg-[#1b4332] rounded-xs transition-all hover:opacity-80"
                              style={{ height: `${Math.max(4, h2025)}%` }}
                              title={`2025 ${mName}: ${y2025} mm`}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-stone-700 mt-1.5">
                            {mName}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Agronomic Insight Note */}
            <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200/70 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                Rainfall amounts under 30 mm/month generally support land preparation and early tillage, while sustained monthly precipitation &gt; 100 mm (typically {historicalData.typicalPeakMonth}) provides full root zone saturation for maize, sorghum, and soybean flowering.
              </span>
            </div>
          </div>

          {/* Multi-Year Drought Stress & Torrential Rain Vulnerability Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {historicalData.years.map((y) => (
              <div
                key={y.year}
                className="p-4 bg-white rounded-2xl border border-stone-200/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">{y.year} Season Breakdown</span>
                  <span className="text-xs font-mono font-bold text-[#1b4332]">
                    {y.totalRainfallMm} mm
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600 pt-1">
                  <div className="flex justify-between">
                    <span>Rainy Days (≥1mm):</span>
                    <strong className="text-stone-800 font-mono">{y.rainyDaysCount} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Heavy Rain Days (≥20mm):</span>
                    <strong className="text-stone-800 font-mono">{y.heavyRainDaysCount} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak Month:</span>
                    <strong className="text-stone-800">
                      {y.peakMonth.monthName} ({y.peakMonth.rainfallMm} mm)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Mid-Season Dry Spell:</span>
                    <strong
                      className={`font-mono ${
                        y.longestDrySpellDaysDuringSeason > 14
                          ? 'text-rose-700'
                          : y.longestDrySpellDaysDuringSeason > 9
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {y.longestDrySpellDaysDuringSeason} consecutive days
                    </strong>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 pt-1">
                  {y.longestDrySpellDaysDuringSeason > 12
                    ? 'Prolonged mid-season dry spell experienced; drought-tolerant varieties (e.g. SAMMAZ series) recommended.'
                    : 'Relatively well-distributed rainy season with minimal moisture stress.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FIELD OPERATIONS ADVISORY */}
      {!loading && activeTab === 'operations' && forecastData && (
        <div className="space-y-5">
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
            <h3 className="text-sm font-bold text-stone-900">
              7-Day Operational Decision Matrix for this Farm
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Targeted field guidance combining Open-Meteo wind vectors, precipitation probability, and reference evapotranspiration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Agro-Chemical Spraying Planner */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h4 className="text-sm font-bold text-stone-900">
                  Agrochemical Spraying Windows
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Herbicides and insecticides require sustained leaf contact (≥2–4 hours) and calm winds (&lt;15 km/h) to avoid droplet drift into non-target areas or water bodies.
              </p>

              <div className="space-y-2 pt-1">
                {forecastData.days.slice(0, 5).map((d) => (
                  <div
                    key={d.date}
                    className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-800 w-12">{d.dayName}</span>
                      <span className="text-[11px] text-stone-500">
                        {d.windSpeedMaxKmh} km/h wind · {d.precipitationProbabilityPercent}% rain
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        d.sprayingSuitability === 'optimal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.sprayingSuitability === 'caution'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {d.sprayingSuitability === 'optimal'
                        ? 'Recommended'
                        : d.sprayingSuitability === 'caution'
                        ? 'Caution'
                        : 'Avoid'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Fertilizer Application & Runoff Management */}
            <div className="p-5 bg-white rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-700" />
                <h4 className="text-sm font-bold text-stone-900">
                  Fertilizer Topdressing &amp; Leaching Risk
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Applying soluble nitrogen (Urea) prior to heavy downpours (&gt;15 mm) leads to surface runoff and deep leaching past the root zone.
              </p>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Peak Rain Day this Week:</span>
                  <strong className="text-stone-900">
                    {forecastData.summary.maxRainDay
                      ? `${forecastData.summary.maxRainDay.dayName} (${forecastData.summary.maxRainDay.mm} mm)`
                      : 'No heavy rain expected'}
                  </strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Weekly Rain Volume:</span>
                  <strong className="text-stone-900 font-mono">
                    {forecastData.summary.totalPrecipitationMm} mm
                  </strong>
                </div>

                <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                  {forecastData.summary.totalPrecipitationMm >= 25
                    ? '⚠️ Heavy rain expected this week. Delay broadcasting granular urea until soil drains to prevent substantial nutrient loss.'
                    : '✓ Gentle precipitation expected. Suitable for basal or side-dress application into moist topsoil.'}
                </p>
              </div>

              {/* Tillage & Planting Readiness */}
              <div className="pt-2 border-t border-stone-100">
                <span className="text-xs font-bold text-stone-800 block mb-1">
                  Land Preparation &amp; Sowing
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {forecastData.summary.wetDaysCount >= 3
                    ? 'Consecutive wet days provide adequate seedbed moisture for germination. Ensure planting depth aligns with soil texture.'
                    : 'Limited rainfall predicted this week. Ensure supplemental moisture or wait for verified onset before dry-seeding.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attribution & Technical Data Disclosure */}
      <div className="text-[11px] text-stone-500 border-t border-stone-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-stone-700">Data Source:</span>
          <span>
            Open-Meteo Weather Forecast &amp; ERA5-Land Reanalysis (ECMWF).
          </span>
        </div>
        <div className="text-stone-400">
          Updated on demand · Model ensemble resolution 0.1° (~11 km)
        </div>
      </div>
    </section>
  );
};
