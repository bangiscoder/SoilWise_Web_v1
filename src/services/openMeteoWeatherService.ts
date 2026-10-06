/**
 * Open-Meteo Weather & Climate Service for SoilWise AI
 * 
 * Provides:
 * 1. 7-Day agricultural weather forecast (temperatures, precipitation, rain probability,
 *    wind speeds, and FAO-56 Penman-Monteith reference evapotranspiration ET0).
 * 2. Multi-year historical rainfall patterns from the Open-Meteo Archive (ERA5-Land reanalysis).
 * 3. Agronomic field advisory calculations (spraying suitability, runoff/fertilizer risk,
 *    and dry spells).
 */

export interface WeatherCodeInfo {
  code: number;
  label: string;
  category: 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'thunderstorm' | 'snow';
  iconName: 'Sun' | 'CloudSun' | 'Cloud' | 'CloudRain' | 'Droplets' | 'Wind';
}

export interface CurrentWeatherSnapshot {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPercent: number;
  precipitationMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  weatherLabel: string;
  iconName: WeatherCodeInfo['iconName'];
}

export interface DailyForecastDay {
  date: string;
  dayName: string;
  weatherCode: number;
  weatherLabel: string;
  iconName: WeatherCodeInfo['iconName'];
  tempMaxC: number;
  tempMinC: number;
  precipitationMm: number;
  precipitationProbabilityPercent: number;
  windSpeedMaxKmh: number;
  et0EvapotranspirationMm: number;
  // Agronomic suitability
  sprayingSuitability: 'optimal' | 'caution' | 'unfavorable';
  sprayingNote: string;
  moistureImpact: 'high_replenishment' | 'moderate' | 'dry' | 'high_evaporative_loss';
}

export interface SevenDayForecastResult {
  status: 'success' | 'error';
  errorMessage?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevationM?: number;
  current: CurrentWeatherSnapshot;
  days: DailyForecastDay[];
  summary: {
    totalPrecipitationMm: number;
    avgTempMaxC: number;
    avgTempMinC: number;
    totalEt0Mm: number;
    wetDaysCount: number;
    maxRainDay: { date: string; dayName: string; mm: number } | null;
  };
}

export interface MonthlyRainfallRecord {
  monthIndex: number; // 0-11
  monthName: string;
  rainfallMm: number;
}

export interface YearlyRainfallPattern {
  year: number;
  totalRainfallMm: number;
  rainyDaysCount: number; // days >= 1mm
  heavyRainDaysCount: number; // days >= 20mm
  peakMonth: { monthName: string; rainfallMm: number };
  monthly: MonthlyRainfallRecord[];
  longestDrySpellDaysDuringSeason: number; // Max consecutive dry days during May-Oct wet season
}

export interface HistoricalRainfallResult {
  status: 'success' | 'error';
  errorMessage?: string;
  latitude: number;
  longitude: number;
  years: YearlyRainfallPattern[];
  multiYearAverageAnnualMm: number;
  multiYearMonthlyAverage: MonthlyRainfallRecord[];
  typicalOnsetMonth: string;
  typicalPeakMonth: string;
  typicalCessationMonth: string;
}

/**
 * Interpret WMO Weather Code
 */
export function interpretWeatherCode(code: number): WeatherCodeInfo {
  switch (code) {
    case 0:
      return { code, label: 'Clear sky', category: 'clear', iconName: 'Sun' };
    case 1:
      return { code, label: 'Mainly clear', category: 'clear', iconName: 'Sun' };
    case 2:
      return { code, label: 'Partly cloudy', category: 'cloudy', iconName: 'CloudSun' };
    case 3:
      return { code, label: 'Overcast', category: 'cloudy', iconName: 'Cloud' };
    case 45:
    case 48:
      return { code, label: 'Fog / Haze', category: 'fog', iconName: 'Cloud' };
    case 51:
      return { code, label: 'Light drizzle', category: 'drizzle', iconName: 'Droplets' };
    case 53:
      return { code, label: 'Moderate drizzle', category: 'drizzle', iconName: 'Droplets' };
    case 55:
      return { code, label: 'Dense drizzle', category: 'drizzle', iconName: 'Droplets' };
    case 61:
      return { code, label: 'Slight rain', category: 'rain', iconName: 'CloudRain' };
    case 63:
      return { code, label: 'Moderate rain', category: 'rain', iconName: 'CloudRain' };
    case 65:
      return { code, label: 'Heavy rain', category: 'rain', iconName: 'CloudRain' };
    case 80:
      return { code, label: 'Light rain showers', category: 'rain', iconName: 'CloudRain' };
    case 81:
      return { code, label: 'Moderate showers', category: 'rain', iconName: 'CloudRain' };
    case 82:
      return { code, label: 'Violent showers', category: 'rain', iconName: 'CloudRain' };
    case 95:
      return { code, label: 'Thunderstorm', category: 'thunderstorm', iconName: 'CloudRain' };
    case 96:
    case 99:
      return { code, label: 'Thunderstorm with hail', category: 'thunderstorm', iconName: 'CloudRain' };
    default:
      return { code, label: 'Partly cloudy', category: 'cloudy', iconName: 'CloudSun' };
  }
}

// In-memory caches to prevent redundant external API hits
const forecastCache = new Map<string, { data: SevenDayForecastResult; timestamp: number }>();
const historicalCache = new Map<string, { data: HistoricalRainfallResult; timestamp: number }>();
const CACHE_TTL_FORECAST_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_HISTORICAL_MS = 60 * 60 * 1000; // 1 hour

function getCoordKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

/**
 * Fetch 7-day agricultural weather forecast
 */
export async function fetch7DayWeatherForecast(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<SevenDayForecastResult> {
  const coordKey = getCoordKey(lat, lon);
  if (!forceRefresh) {
    const cached = forecastCache.get(coordKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_FORECAST_MS) {
      return cached.data;
    }
  }

  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=7`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9500);

  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Open-Meteo forecast API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.daily || !Array.isArray(data.daily.time)) {
      throw new Error('Malformed daily forecast data from Open-Meteo');
    }

    const currentWmo = interpretWeatherCode(data.current?.weather_code ?? 0);
    const current: CurrentWeatherSnapshot = {
      time: data.current?.time || new Date().toISOString(),
      temperatureC: Math.round((data.current?.temperature_2m ?? 26) * 10) / 10,
      apparentTemperatureC: Math.round((data.current?.apparent_temperature ?? data.current?.temperature_2m ?? 26) * 10) / 10,
      relativeHumidityPercent: Math.round(data.current?.relative_humidity_2m ?? 65),
      precipitationMm: Math.round((data.current?.precipitation ?? 0) * 10) / 10,
      windSpeedKmh: Math.round((data.current?.wind_speed_10m ?? 8) * 10) / 10,
      weatherCode: currentWmo.code,
      weatherLabel: currentWmo.label,
      iconName: currentWmo.iconName,
    };

    const days: DailyForecastDay[] = [];
    const count = Math.min(7, data.daily.time.length);

    let totalRain = 0;
    let sumTMax = 0;
    let sumTMin = 0;
    let totalEt0 = 0;
    let wetDays = 0;
    let maxRainDay: { date: string; dayName: string; mm: number } | null = null;

    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < count; i++) {
      const dateStr = data.daily.time[i];
      const parsedDate = new Date(`${dateStr}T12:00:00Z`);
      const isToday = i === 0;
      const dayName = isToday ? 'Today' : weekdayNames[parsedDate.getUTCDay()];

      const wCode = data.daily.weather_code[i] ?? 0;
      const wInfo = interpretWeatherCode(wCode);
      const tMax = Math.round((data.daily.temperature_2m_max[i] ?? 30) * 10) / 10;
      const tMin = Math.round((data.daily.temperature_2m_min[i] ?? 20) * 10) / 10;
      const precip = Math.round((data.daily.precipitation_sum[i] ?? 0) * 10) / 10;
      const prob = Math.round(data.daily.precipitation_probability_max[i] ?? 0);
      const windMax = Math.round((data.daily.wind_speed_10m_max[i] ?? 10) * 10) / 10;
      const et0 = Math.round((data.daily.et0_fao_evapotranspiration?.[i] ?? 3.5) * 10) / 10;

      totalRain += precip;
      sumTMax += tMax;
      sumTMin += tMin;
      totalEt0 += et0;
      if (precip >= 1.0) wetDays++;

      if (!maxRainDay || precip > maxRainDay.mm) {
        maxRainDay = { date: dateStr, dayName, mm: precip };
      }

      // Agronomic evaluations
      let sprayingSuitability: DailyForecastDay['sprayingSuitability'] = 'optimal';
      let sprayingNote = 'Calm winds and low wash-off risk.';

      if (windMax > 18) {
        sprayingSuitability = 'unfavorable';
        sprayingNote = `High wind drift risk (${windMax} km/h).`;
      } else if (precip >= 5 || prob >= 60) {
        sprayingSuitability = 'unfavorable';
        sprayingNote = `Rain wash-off risk (${precip} mm expected, ${prob}% prob).`;
      } else if (windMax > 12 || prob >= 35) {
        sprayingSuitability = 'caution';
        sprayingNote = `Moderate drift or light shower risk (${prob}% prob).`;
      }

      let moistureImpact: DailyForecastDay['moistureImpact'] = 'dry';
      if (precip >= 15) {
        moistureImpact = 'high_replenishment';
      } else if (precip >= 4) {
        moistureImpact = 'moderate';
      } else if (et0 > 4.5) {
        moistureImpact = 'high_evaporative_loss';
      }

      days.push({
        date: dateStr,
        dayName,
        weatherCode: wCode,
        weatherLabel: wInfo.label,
        iconName: wInfo.iconName,
        tempMaxC: tMax,
        tempMinC: tMin,
        precipitationMm: precip,
        precipitationProbabilityPercent: prob,
        windSpeedMaxKmh: windMax,
        et0EvapotranspirationMm: et0,
        sprayingSuitability,
        sprayingNote,
        moistureImpact,
      });
    }

    const result: SevenDayForecastResult = {
      status: 'success',
      latitude: lat,
      longitude: lon,
      timezone: data.timezone || 'UTC',
      elevationM: data.elevation ? Math.round(data.elevation) : undefined,
      current,
      days,
      summary: {
        totalPrecipitationMm: Math.round(totalRain * 10) / 10,
        avgTempMaxC: Math.round((sumTMax / count) * 10) / 10,
        avgTempMinC: Math.round((sumTMin / count) * 10) / 10,
        totalEt0Mm: Math.round(totalEt0 * 10) / 10,
        wetDaysCount: wetDays,
        maxRainDay: maxRainDay && maxRainDay.mm > 0 ? maxRainDay : null,
      },
    };

    forecastCache.set(coordKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    clearTimeout(timer);
    console.error('Failed to fetch 7-day forecast:', err);
    return {
      status: 'error',
      errorMessage: err.message || 'Unable to connect to Open-Meteo forecast service',
      latitude: lat,
      longitude: lon,
      timezone: 'UTC',
      current: {
        time: new Date().toISOString(),
        temperatureC: 28,
        apparentTemperatureC: 30,
        relativeHumidityPercent: 60,
        precipitationMm: 0,
        windSpeedKmh: 10,
        weatherCode: 1,
        weatherLabel: 'Mainly clear',
        iconName: 'Sun',
      },
      days: [],
      summary: {
        totalPrecipitationMm: 0,
        avgTempMaxC: 0,
        avgTempMinC: 0,
        totalEt0Mm: 0,
        wetDaysCount: 0,
        maxRainDay: null,
      },
    };
  }
}

/**
 * Fetch multi-year historical rainfall patterns from Open-Meteo Archive (ERA5-Land reanalysis)
 */
export async function fetchHistoricalRainfallPatterns(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<HistoricalRainfallResult> {
  const coordKey = getCoordKey(lat, lon);
  if (!forceRefresh) {
    const cached = historicalCache.get(coordKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_HISTORICAL_MS) {
      return cached.data;
    }
  }

  // Query recent 3 full calendar years: 2023, 2024, 2025
  const startYear = 2023;
  const endYear = 2025;
  const startDate = `${startYear}-01-01`;
  const endDate = `${endYear}-12-31`;

  const endpoint = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  try {
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Open-Meteo archive API responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.daily || !Array.isArray(data.daily.time) || !Array.isArray(data.daily.precipitation_sum)) {
      throw new Error('Malformed archive rainfall data from Open-Meteo');
    }

    const { time, precipitation_sum } = data.daily;

    // Group records by year and month
    const yearlyMap = new Map<
      number,
      {
        dailyRecords: { date: string; precip: number; month: number }[];
      }
    >();

    for (let i = 0; i < time.length; i++) {
      const dateStr = time[i];
      const p = precipitation_sum[i];
      const precip = typeof p === 'number' && !isNaN(p) && p >= 0 ? p : 0;
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(5, 7), 10) - 1; // 0-indexed

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { dailyRecords: [] });
      }
      yearlyMap.get(year)!.dailyRecords.push({ date: dateStr, precip, month });
    }

    const yearsList: YearlyRainfallPattern[] = [];
    let grandTotalRainfall = 0;
    const monthlyAccumulators: number[] = new Array(12).fill(0);

    for (const year of [2023, 2024, 2025]) {
      const bucket = yearlyMap.get(year);
      if (!bucket || bucket.dailyRecords.length < 300) continue;

      let annualMm = 0;
      let wetDays = 0;
      let heavyDays = 0;
      const monthSums: number[] = new Array(12).fill(0);

      // Wet season dry spell calculation (May to October = month 4 to 9)
      let currentDrySpell = 0;
      let maxDrySpell = 0;

      for (const rec of bucket.dailyRecords) {
        annualMm += rec.precip;
        monthSums[rec.month] += rec.precip;

        if (rec.precip >= 1.0) {
          wetDays++;
        }
        if (rec.precip >= 20.0) {
          heavyDays++;
        }

        // Check dry spell during May-Oct active cultivation season
        if (rec.month >= 4 && rec.month <= 9) {
          if (rec.precip < 1.0) {
            currentDrySpell++;
            if (currentDrySpell > maxDrySpell) {
              maxDrySpell = currentDrySpell;
            }
          } else {
            currentDrySpell = 0;
          }
        }
      }

      grandTotalRainfall += annualMm;

      // Find peak month
      let peakMonthIdx = 7; // Default August
      let peakMonthVal = 0;
      for (let m = 0; m < 12; m++) {
        monthlyAccumulators[m] += monthSums[m];
        if (monthSums[m] > peakMonthVal) {
          peakMonthVal = monthSums[m];
          peakMonthIdx = m;
        }
      }

      const monthlyRecords: MonthlyRainfallRecord[] = monthSums.map((val, m) => ({
        monthIndex: m,
        monthName: monthNames[m],
        rainfallMm: Math.round(val * 10) / 10,
      }));

      yearsList.push({
        year,
        totalRainfallMm: Math.round(annualMm * 10) / 10,
        rainyDaysCount: wetDays,
        heavyRainDaysCount: heavyDays,
        peakMonth: {
          monthName: monthNames[peakMonthIdx],
          rainfallMm: Math.round(peakMonthVal * 10) / 10,
        },
        monthly: monthlyRecords,
        longestDrySpellDaysDuringSeason: maxDrySpell,
      });
    }

    const validYearsCount = Math.max(1, yearsList.length);
    const multiYearAverageAnnualMm = Math.round((grandTotalRainfall / validYearsCount) * 10) / 10;

    const multiYearMonthlyAverage: MonthlyRainfallRecord[] = monthlyAccumulators.map((sum, m) => ({
      monthIndex: m,
      monthName: monthNames[m],
      rainfallMm: Math.round((sum / validYearsCount) * 10) / 10,
    }));

    // Find typical onset, peak, cessation from multi-year monthly curve
    // In Nigerian agro-ecologies, onset is generally the first month exceeding 40-50mm
    let onsetIdx = 4; // May
    for (let m = 2; m < 7; m++) {
      if (multiYearMonthlyAverage[m].rainfallMm >= 45) {
        onsetIdx = m;
        break;
      }
    }

    let peakIdx = 7; // August
    let maxAvg = 0;
    for (let m = 0; m < 12; m++) {
      if (multiYearMonthlyAverage[m].rainfallMm > maxAvg) {
        maxAvg = multiYearMonthlyAverage[m].rainfallMm;
        peakIdx = m;
      }
    }

    let cessationIdx = 9; // October
    for (let m = peakIdx; m < 12; m++) {
      if (multiYearMonthlyAverage[m].rainfallMm < 40) {
        cessationIdx = Math.max(m - 1, peakIdx);
        break;
      }
    }

    const result: HistoricalRainfallResult = {
      status: 'success',
      latitude: lat,
      longitude: lon,
      years: yearsList,
      multiYearAverageAnnualMm,
      multiYearMonthlyAverage,
      typicalOnsetMonth: monthNames[onsetIdx],
      typicalPeakMonth: monthNames[peakIdx],
      typicalCessationMonth: monthNames[cessationIdx],
    };

    historicalCache.set(coordKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (err: any) {
    clearTimeout(timer);
    console.error('Failed to fetch historical rainfall patterns:', err);
    return {
      status: 'error',
      errorMessage: err.message || 'Unable to retrieve historical rainfall data',
      latitude: lat,
      longitude: lon,
      years: [],
      multiYearAverageAnnualMm: 0,
      multiYearMonthlyAverage: [],
      typicalOnsetMonth: 'May',
      typicalPeakMonth: 'August',
      typicalCessationMonth: 'October',
    };
  }
}
