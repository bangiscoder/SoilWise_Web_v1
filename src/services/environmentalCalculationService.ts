/**
 * Environmental Calculation Service for SoilWise AI
 * 
 * Computes derived environmental metrics:
 * - Mean annual temperature (from validated daily mean series)
 * - Total annual precipitation
 * - Köppen-Geiger Climate Classification with documented methodology
 */

import { EnvironmentalInfo } from '../types/soilwise';
import { DailyRecord } from './weatherService';

/**
 * Calculates empirical Köppen-Geiger climate classification from 365/366-day daily series.
 * 
 * Standard Rules:
 * - T: Mean annual temperature (°C)
 * - P: Total annual precipitation (mm)
 * - Monthly temperature and precipitation distributions
 */
function determineKoppenClassification(
  monthlyPrecip: number[],
  monthlyTemp: (number | null)[],
  totalP: number,
  meanT: number
): { zone: string; explanation: string } {
  // Check if temperatures are predominantly tropical (mean of all months >= 18°C)
  const validTemps = monthlyTemp.filter((t): t is number => t !== null);
  const minMonthTemp = validTemps.length > 0 ? Math.min(...validTemps) : meanT;

  const driestMonthP = Math.min(...monthlyPrecip);
  const wettestMonthP = Math.max(...monthlyPrecip);

  // Aridity threshold (B climates)
  // Threshold formula depends on when precipitation falls (summer vs winter vs uniform)
  // For standard threshold approximation:
  const aridityThreshold = 20 * meanT + 140;

  if (totalP < aridityThreshold) {
    if (totalP < aridityThreshold / 2) {
      return {
        zone: 'Arid Desert (BWh/BWk)',
        explanation: `Annual precipitation (${Math.round(totalP)} mm) is below half the aridity threshold (${Math.round(aridityThreshold)} mm).`,
      };
    }
    return {
      zone: 'Semi-Arid Steppe / Sahelian (BSh)',
      explanation: `Annual precipitation (${Math.round(totalP)} mm) is below the aridity threshold (${Math.round(aridityThreshold)} mm) with high mean temperature (${meanT.toFixed(1)}°C).`,
    };
  }

  // Tropical Climates (A) - all monthly means >= 18°C
  if (minMonthTemp >= 18) {
    if (driestMonthP >= 60) {
      return {
        zone: 'Tropical Rainforest (Af)',
        explanation: `Tropical climate where precipitation in every month exceeds 60 mm (driest month: ${Math.round(driestMonthP)} mm).`,
      };
    }
    // Monsoon check: driest month >= 100 - (P / 25)
    if (driestMonthP >= 100 - totalP / 25) {
      return {
        zone: 'Tropical Monsoon (Am)',
        explanation: `Tropical climate with a short dry season compensated by heavy total annual precipitation (${Math.round(totalP)} mm).`,
      };
    }
    return {
      zone: 'Tropical Wet-Dry Savanna (Aw)',
      explanation: `Tropical savanna with a pronounced dry season (driest month: ${Math.round(driestMonthP)} mm) and distinct summer wet season.`,
    };
  }

  // Temperate Climates (C)
  if (minMonthTemp > -3 && minMonthTemp < 18) {
    if (driestMonthP < 30 && wettestMonthP > 3 * driestMonthP) {
      return {
        zone: 'Humid Subtropical with Dry Winter (Cwa)',
        explanation: 'Temperate climate with distinct dry winter and warm wet summer.',
      };
    }
    return {
      zone: 'Temperate Humid (Cfa/Cfb)',
      explanation: 'Temperate climate with uniform precipitation throughout the year.',
    };
  }

  return {
    zone: 'Sub-Humid Continental / Highland',
    explanation: `Climatic zone with moderate seasonal temperature range (${meanT.toFixed(1)}°C mean) and ${Math.round(totalP)} mm annual rainfall.`,
  };
}

export function calculateEnvironmentalInfo(
  dailyRecords: DailyRecord[],
  elevationMeters: number | null
): EnvironmentalInfo {
  // Validate that we have at least 300 days to calculate a valid annual metric
  if (!dailyRecords || dailyRecords.length < 300) {
    return {
      isAvailable: false,
      unavailabilityReason: 'Insufficient full-year climate data to calculate annual averages.',
      meanAnnualTemperatureC: null,
      annualPrecipitationMm: null,
      climateZone: 'Climate classification unavailable',
      climateClassificationExplanation: 'Additional long-term climate data is required to establish annual normals.',
      elevationMeters,
      source: 'Open-Meteo',
    };
  }

  // 1. Total Annual Precipitation (Section 18)
  const totalAnnualPrecip = Math.round(
    dailyRecords.reduce((acc, d) => acc + (d.precipitationMm || 0), 0)
  );

  // 2. Mean Annual Temperature (Section 17)
  const validTemps = dailyRecords
    .map((d) => d.temperatureC)
    .filter((t): t is number => t !== null && !isNaN(t));

  const meanAnnualTemp =
    validTemps.length > 0
      ? Math.round((validTemps.reduce((acc, t) => acc + t, 0) / validTemps.length) * 10) / 10
      : null;

  // 3. Aggregate Monthly for Köppen-Geiger Classification (Section 19)
  const monthlyPrecip = Array(12).fill(0);
  const monthlyTempSums = Array(12).fill(0);
  const monthlyTempCounts = Array(12).fill(0);

  dailyRecords.forEach((d) => {
    const m = parseInt(d.date.split('-')[1], 10) - 1;
    if (m >= 0 && m < 12) {
      monthlyPrecip[m] += d.precipitationMm;
      if (d.temperatureC !== null) {
        monthlyTempSums[m] += d.temperatureC;
        monthlyTempCounts[m]++;
      }
    }
  });

  const monthlyTempMeans: (number | null)[] = monthlyTempSums.map((sum, i) =>
    monthlyTempCounts[i] > 0 ? sum / monthlyTempCounts[i] : null
  );

  let climateZone = 'Climate classification unavailable';
  let climateClassificationExplanation = 'Additional long-term climate data is required.';

  if (meanAnnualTemp !== null && totalAnnualPrecip > 0) {
    const classification = determineKoppenClassification(
      monthlyPrecip,
      monthlyTempMeans,
      totalAnnualPrecip,
      meanAnnualTemp
    );
    climateZone = classification.zone;
    climateClassificationExplanation = `${classification.explanation} Method: Köppen-Geiger empirical formula derived from 365 daily records (Open-Meteo).`;
  }

  return {
    isAvailable: true,
    meanAnnualTemperatureC: meanAnnualTemp,
    annualPrecipitationMm: totalAnnualPrecip,
    climateZone,
    climateClassificationExplanation,
    elevationMeters,
    source: 'Open-Meteo Climate Model API',
  };
}
