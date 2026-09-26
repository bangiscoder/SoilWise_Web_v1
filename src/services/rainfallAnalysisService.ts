/**
 * Rainfall Analysis Service for SoilWise AI
 * 
 * Implements real time-series processing to calculate derived agro-meteorological metrics:
 * - Expected seasonal rainfall total
 * - Monthly rainfall aggregation
 * - Approximate peak rainfall period
 * - Approximate rainfall onset with false-start detection
 * - Approximate rainfall cessation
 * - Estimated season duration
 * - Estimated remaining rainy-season days relative to the selected analysis date
 * 
 * All calculations use explicit analytical assumptions for the MVP and are transparently
 * attributed to model-based data (Open-Meteo), never fabricated or presented as official NiMet.
 */

import { RainfallOutlook, RainfallOnsetClassification } from '../types/soilwise';
import { DailyRecord } from './weatherService';

/**
 * Configurable thresholds for MVP seasonal rainfall analysis.
 * Documented initial analytical assumptions for the MVP, not official NiMet thresholds.
 */
export interface RainfallRules {
  /** Minimum daily precipitation to count as a rainy day in onset/cessation tracking (default: 5mm) */
  onsetRainfallThresholdMm: number;
  /** Length of the sliding observation window to detect season initiation (default: 10 days) */
  onsetWindowDays: number;
  /** Minimum number of rainy days required within the onset window (default: 3 days) */
  minimumRainyDays: number;
  /** Maximum allowable dry spell (days) immediately following the initial rainfall window before classifying as a false start (default: 7 days) */
  maximumInitialDrySpellDays: number;
  /** Minimum daily precipitation threshold for the final active rainfall events (default: 5mm) */
  cessationRainfallThresholdMm: number;
  /** Number of consecutive dry days required after the final rainfall event to confirm cessation (default: 15 days) */
  sustainedDryDays: number;
}

export const DEFAULT_RAINFALL_RULES: RainfallRules = {
  onsetRainfallThresholdMm: 5.0,
  onsetWindowDays: 10,
  minimumRainyDays: 3,
  maximumInitialDrySpellDays: 7,
  cessationRainfallThresholdMm: 5.0,
  sustainedDryDays: 15,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Helper: Format YYYY-MM-DD to "DD MMMM YYYY"
export function formatReadableDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const month = MONTH_NAMES[monthIdx];
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Main calculation engine: transforms validated daily records into a RainfallOutlook object
 */
export function calculateRainfallOutlook(
  dailyRecords: DailyRecord[],
  analysisDateStr: string,
  rules: RainfallRules = DEFAULT_RAINFALL_RULES
): RainfallOutlook {
  console.log('Rainfall calculation input:', dailyRecords.length, 'daily records. Analysis Date:', analysisDateStr);

  // Section 7: Validate input dataset
  if (!dailyRecords || dailyRecords.length < 60) {
    return {
      isAvailable: false,
      unavailabilityReason: 'Insufficient precipitation time-series data returned for this location.',
      seasonalOutlook: 'Model-based rainfall data could not be retrieved at this time.',
      expectedOnset: null,
      expectedCessation: null,
      estimatedSeasonDurationDays: null,
      estimatedRemainingDaysText: 'Remaining days cannot be estimated',
      remainingDaysCount: null,
      approximatePeakPeriod: 'Peak period unavailable',
      rainfallOnsetStatus: 'Not available',
      totalSeasonalRainfallMm: null,
      source: 'Open-Meteo Climate Model API',
    };
  }

  // 1. Calculate Seasonal Rainfall Total (Section 8)
  const totalSeasonalRainfallMm = Math.round(
    dailyRecords.reduce((acc, d) => acc + (d.precipitationMm || 0), 0)
  );

  // 2. Aggregate Daily Precipitation by Calendar Month (Section 9)
  const monthlyTotals = Array(12).fill(0);
  dailyRecords.forEach((d) => {
    const monthIndex = parseInt(d.date.split('-')[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyTotals[monthIndex] += d.precipitationMm;
    }
  });

  const monthlyPrecipitation = MONTH_NAMES.map((name, idx) => ({
    month: name,
    precipitationMm: Math.round(monthlyTotals[idx] * 10) / 10,
  }));

  // 3. Calculate Approximate Peak Rainfall Period (Section 9)
  let peakMonthIndex = 0;
  let maxMonthlyPrecip = -1;
  monthlyTotals.forEach((val, idx) => {
    if (val > maxMonthlyPrecip) {
      maxMonthlyPrecip = val;
      peakMonthIndex = idx;
    }
  });

  let approximatePeakPeriod = 'Peak period unavailable';
  if (maxMonthlyPrecip > 15) {
    // Check if adjacent month is also a near-peak (>= 80% of max)
    const prevIdx = peakMonthIndex > 0 ? peakMonthIndex - 1 : null;
    const nextIdx = peakMonthIndex < 11 ? peakMonthIndex + 1 : null;

    if (prevIdx !== null && monthlyTotals[prevIdx] >= maxMonthlyPrecip * 0.85) {
      approximatePeakPeriod = `${MONTH_NAMES[prevIdx]}–${MONTH_NAMES[peakMonthIndex]} (approx. ${Math.round(maxMonthlyPrecip)} mm/month)`;
    } else if (nextIdx !== null && monthlyTotals[nextIdx] >= maxMonthlyPrecip * 0.85) {
      approximatePeakPeriod = `${MONTH_NAMES[peakMonthIndex]}–${MONTH_NAMES[nextIdx]} (approx. ${Math.round(maxMonthlyPrecip)} mm/month)`;
    } else {
      approximatePeakPeriod = `${MONTH_NAMES[peakMonthIndex]} (approx. ${Math.round(maxMonthlyPrecip)} mm/month)`;
    }
  }

  // 4. Calculate Expected Rainfall Onset & Detect False Starts (Sections 10 & 11)
  let onsetDateRaw: string | null = null;
  let falseStartDetected = false;

  // Search forward through time series up to late summer
  const maxSearchDays = Math.min(dailyRecords.length - rules.onsetWindowDays, 250);

  for (let i = 0; i <= maxSearchDays; i++) {
    // Count rainy days in this sliding window
    let rainyDaysInWindow = 0;
    for (let w = 0; w < rules.onsetWindowDays; w++) {
      if (dailyRecords[i + w].precipitationMm >= rules.onsetRainfallThresholdMm) {
        rainyDaysInWindow++;
      }
    }

    if (rainyDaysInWindow >= rules.minimumRainyDays) {
      // Find the first day in this window that met the threshold
      let candidateIdx = i;
      while (
        candidateIdx < i + rules.onsetWindowDays &&
        dailyRecords[candidateIdx].precipitationMm < rules.onsetRainfallThresholdMm
      ) {
        candidateIdx++;
      }

      // Check subsequent dry spell immediately after the initial window
      let maxSubsequentDry = 0;
      let currentDry = 0;
      const verifyEnd = Math.min(dailyRecords.length, candidateIdx + rules.onsetWindowDays + 21);

      for (let j = candidateIdx + rules.onsetWindowDays; j < verifyEnd; j++) {
        if (dailyRecords[j].precipitationMm < rules.onsetRainfallThresholdMm) {
          currentDry++;
          if (currentDry > maxSubsequentDry) maxSubsequentDry = currentDry;
        } else {
          currentDry = 0;
        }
      }

      // False start condition: prolonged dry spell right after initial wet pulse
      if (maxSubsequentDry > rules.maximumInitialDrySpellDays && !onsetDateRaw) {
        falseStartDetected = true;
        // Skip ahead and look for sustained onset
        i = candidateIdx + maxSubsequentDry;
        continue;
      }

      if (!onsetDateRaw) {
        onsetDateRaw = dailyRecords[candidateIdx].date;
        break;
      }
    }
  }

  // 5. Calculate Expected Rainfall Cessation (Section 12)
  // Search backward from end of season (day 365 down to mid-year)
  let cessationDateRaw: string | null = null;
  const startCessationSearch = dailyRecords.length - 1;
  const minCessationDay = Math.max(160, Math.floor(dailyRecords.length * 0.45)); // ~June onwards

  for (let i = startCessationSearch; i >= minCessationDay; i--) {
    if (dailyRecords[i].precipitationMm >= rules.cessationRainfallThresholdMm) {
      // Check that at least sustainedDryDays follow this event with low/dry rainfall
      let isSustainedDry = true;
      const checkLimit = Math.min(dailyRecords.length, i + 1 + rules.sustainedDryDays);

      for (let j = i + 1; j < checkLimit; j++) {
        if (dailyRecords[j].precipitationMm >= rules.cessationRainfallThresholdMm) {
          isSustainedDry = false;
          break;
        }
      }

      if (isSustainedDry) {
        cessationDateRaw = dailyRecords[i].date;
        break;
      }
    }
  }

  // 6. Calculate Season Duration (Section 13)
  let seasonDurationDays: number | null = null;
  if (onsetDateRaw && cessationDateRaw) {
    const msOnset = new Date(onsetDateRaw).getTime();
    const msCessation = new Date(cessationDateRaw).getTime();
    const diffDays = Math.round((msCessation - msOnset) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      seasonDurationDays = diffDays;
    }
  }

  // 7. Calculate Estimated Remaining Rainy-Season Days (Sections 14 & 15)
  let remainingDaysCount: number | null = null;
  let estimatedRemainingDaysText = 'Remaining days cannot be estimated';

  if (cessationDateRaw) {
    const analysisDateMs = new Date(analysisDateStr).getTime();
    const cessationDateMs = new Date(cessationDateRaw).getTime();
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = Math.round((cessationDateMs - analysisDateMs) / msPerDay);

    if (diff > 0) {
      remainingDaysCount = diff;
      estimatedRemainingDaysText = `Approximately ${diff} days remaining`;
    } else {
      remainingDaysCount = 0;
      estimatedRemainingDaysText = 'Expected rainy season has ended';
    }
  }

  // 8. Rainfall Onset Status (Section 16)
  let rainfallOnsetStatus: RainfallOnsetClassification = 'Not available';
  if (falseStartDetected) {
    rainfallOnsetStatus = 'Possible false start';
  } else {
    // Per Section 16: "Only implement this when sufficient historical/reference information exists.
    // If no reliable historical baseline is available: 'Not available'."
    rainfallOnsetStatus = 'Not available';
  }

  // 9. Seasonal Outlook Summary
  let seasonalOutlook = 'Model-based precipitation outlook indicates active seasonal rainfall.';
  if (onsetDateRaw && cessationDateRaw) {
    seasonalOutlook = `Model-based seasonal outlook indicates active precipitation between ${formatReadableDate(onsetDateRaw)} and ${formatReadableDate(cessationDateRaw)} with an expected total of ${totalSeasonalRainfallMm.toLocaleString()} mm.`;
  } else if (totalSeasonalRainfallMm > 0) {
    seasonalOutlook = `Model-based total expected rainfall is approximately ${totalSeasonalRainfallMm.toLocaleString()} mm across the observation period.`;
  }

  // Section 23: Debugging logs
  console.log('Calculated onset:', onsetDateRaw);
  console.log('Calculated cessation:', cessationDateRaw);
  console.log('Calculated season duration:', seasonDurationDays);
  console.log('Calculated remaining days:', remainingDaysCount, `(${estimatedRemainingDaysText})`);

  return {
    isAvailable: true,
    seasonalOutlook,
    expectedOnset: onsetDateRaw ? formatReadableDate(onsetDateRaw) : 'Onset not available',
    expectedCessation: cessationDateRaw ? formatReadableDate(cessationDateRaw) : 'Cessation not available',
    estimatedSeasonDurationDays: seasonDurationDays,
    estimatedRemainingDaysText,
    remainingDaysCount,
    approximatePeakPeriod,
    rainfallOnsetStatus,
    totalSeasonalRainfallMm,
    source: 'Model-based seasonal outlook (Open-Meteo)',
    calculationNote: 'SoilWise analytical estimate based on daily time-series from Open-Meteo',
    monthlyPrecipitation,
  };
}
