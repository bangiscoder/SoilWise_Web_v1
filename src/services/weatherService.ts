/**
 * Weather Service for SoilWise AI
 * Retrieves and validates raw climate and elevation data from Open-Meteo APIs.
 * Distinguishes raw API data from derived SoilWise calculations.
 */

export interface DailyRecord {
  date: string;
  precipitationMm: number;
  temperatureC: number | null;
}

export interface WeatherDataResponse {
  status: 'success' | 'unavailable';
  reason?: string;
  latitude: number;
  longitude: number;
  year: number;
  days: DailyRecord[];
  source: string;
}

/**
 * Helper: Fetch with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 8500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fetches daily precipitation and temperature time series for a specified location and calendar year.
 * Tries the Open-Meteo Climate API (for future/current years) and Open-Meteo Archive API (for past years).
 */
export async function fetchDailyWeatherSeries(
  lat: number,
  lon: number,
  targetYear: number
): Promise<WeatherDataResponse> {
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  // First try: Open-Meteo Climate API (handles current year, seasonal projections, and model ensembles)
  const climateUrl = `https://climate-api.open-meteo.com/v1/climate?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_mean`;

  try {
    let response = await fetchWithTimeout(climateUrl, 9000);
    let usedSource = 'Open-Meteo Climate Model API';

    // If climate API returns error or fails, fallback to archive API if applicable
    if (!response.ok) {
      console.warn(`Climate API returned HTTP ${response.status}. Attempting Archive API fallback...`);
      const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_mean&timezone=auto`;
      response = await fetchWithTimeout(archiveUrl, 9000);
      usedSource = 'Open-Meteo Archive Reanalysis API';
    }

    if (!response.ok) {
      console.warn(`Weather API request failed with status: ${response.status}`);
      return {
        status: 'unavailable',
        reason: `Weather service responded with HTTP status ${response.status}`,
        latitude: lat,
        longitude: lon,
        year: targetYear,
        days: [],
        source: 'Open-Meteo',
      };
    }

    const data = await response.json();

    // Section 7 Validation:
    // 1. API response exists and has daily object
    if (!data || typeof data !== 'object' || !data.daily) {
      console.warn('Weather API response missing daily data object:', data);
      return {
        status: 'unavailable',
        reason: 'Insufficient precipitation data (no daily object)',
        latitude: lat,
        longitude: lon,
        year: targetYear,
        days: [],
        source: usedSource,
      };
    }

    const { time, precipitation_sum, temperature_2m_mean } = data.daily;

    // 2. Validate arrays exist and are non-empty
    if (!Array.isArray(time) || !Array.isArray(precipitation_sum)) {
      return {
        status: 'unavailable',
        reason: 'Daily precipitation array is missing or malformed',
        latitude: lat,
        longitude: lon,
        year: targetYear,
        days: [],
        source: usedSource,
      };
    }

    // 3. Arrays have matching lengths
    if (time.length !== precipitation_sum.length) {
      return {
        status: 'unavailable',
        reason: 'Precipitation time series length mismatch',
        latitude: lat,
        longitude: lon,
        year: targetYear,
        days: [],
        source: usedSource,
      };
    }

    // 4. Validate data points: filter and sanitize
    const days: DailyRecord[] = [];
    for (let i = 0; i < time.length; i++) {
      const dateStr = time[i];
      const pVal = precipitation_sum[i];
      const tVal = Array.isArray(temperature_2m_mean) ? temperature_2m_mean[i] : null;

      // Validate date string YYYY-MM-DD
      if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        continue;
      }

      // Validate numeric precipitation
      const prec = typeof pVal === 'number' && !isNaN(pVal) && pVal >= 0 ? pVal : 0;
      const temp = typeof tVal === 'number' && !isNaN(tVal) ? tVal : null;

      days.push({
        date: dateStr,
        precipitationMm: Math.round(prec * 10) / 10,
        temperatureC: temp !== null ? Math.round(temp * 10) / 10 : null,
      });
    }

    // Require sufficient daily records (at least 60 days to even attempt analysis)
    if (days.length < 60) {
      return {
        status: 'unavailable',
        reason: `Insufficient precipitation data (${days.length} days returned)`,
        latitude: lat,
        longitude: lon,
        year: targetYear,
        days,
        source: usedSource,
      };
    }

    console.log(`WeatherService: Successfully retrieved and validated ${days.length} daily records for ${targetYear} (${usedSource})`);

    return {
      status: 'success',
      latitude: lat,
      longitude: lon,
      year: targetYear,
      days,
      source: usedSource,
    };
  } catch (error: any) {
    console.error('WeatherService fetch error:', error);
    return {
      status: 'unavailable',
      reason: error?.message || 'Network request failed or timed out',
      latitude: lat,
      longitude: lon,
      year: targetYear,
      days: [],
      source: 'Open-Meteo',
    };
  }
}

/**
 * Fetches elevation from Open-Meteo Elevation API
 */
export async function fetchElevation(lat: number, lon: number): Promise<number | null> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    const res = await fetchWithTimeout(url, 6000);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.elevation) && data.elevation.length > 0) {
      return Math.round(data.elevation[0]);
    }
    return null;
  } catch (error) {
    console.warn('Elevation fetch error:', error);
    return null;
  }
}
