/**
 * SoilWise AI Orchestrator Service
 * 
 * Coordinates the full analysis pipeline:
 * 1. Collects user soil data + dynamic analysis date + farm coordinates
 * 2. Concurrently retrieves raw API data from Open-Meteo, OpenStreetMap, and ISRIC SoilGrids
 * 3. Enriches raw daily series through the dedicated rainfallAnalysisService and environmentalCalculationService
 * 4. Produces a transparent, structured FarmAnalysisResult
 */

import {
  SoilData,
  FarmLocation,
  SoilTexture,
  RainfallOutlook,
  EnvironmentalInfo,
  FarmAnalysisResult,
  AnalysisStep,
  SoilDataProvenance,
} from '../types/soilwise';

import { fetchDailyWeatherSeries, fetchElevation } from './weatherService';
import { calculateRainfallOutlook } from './rainfallAnalysisService';
import { calculateEnvironmentalInfo } from './environmentalCalculationService';
import { fetchReverseGeocode, fetchNearestLandmark } from './geocodingService';
import { fetchSoilTexture, fetchLocationEstimatedSoilData } from './soilService';

export async function performFarmAnalysis(
  soilData: SoilData,
  coordinates: { latitude: number; longitude: number },
  analysisDate: string,
  onStepChange?: (step: AnalysisStep) => void,
  locationDetails?: { state?: string; lga?: string },
  soilTestMeta?: {
    hasSoilTest?: boolean;
    soilDataProvenance?: 'user_measured' | 'location_estimated' | 'unavailable';
    soilPhotoProvided?: boolean;
    soilPhoto?: string | null;
    soilTextureImageEstimate?: {
      texture: string;
      confidence: number;
      source: 'image_estimate';
      status: 'preliminary';
    } | null;
    photoAnalysisResult?: {
      estimatedTextureClass?: string;
      confidence?: number;
      fileName?: string;
    } | null;
  }
): Promise<FarmAnalysisResult> {
  const { latitude, longitude } = coordinates;
  const analysisYear = new Date(analysisDate).getFullYear() || new Date().getFullYear();

  console.log(`Starting SoilWise Farm Analysis for (${latitude}, ${longitude}), Date: ${analysisDate} (Year: ${analysisYear})`);

  // Step 1: Preparing farm data...
  onStepChange?.('preparing_data');
  await new Promise((r) => setTimeout(r, 350));

  // Step 2: Retrieving environmental information...
  onStepChange?.('retrieving_environmental');

  // Trigger parallel asynchronous requests
  const weatherPromise = fetchDailyWeatherSeries(latitude, longitude, analysisYear);
  const elevationPromise = fetchElevation(latitude, longitude);
  const soilTexturePromise = fetchSoilTexture(latitude, longitude);
  const geocodePromise = fetchReverseGeocode(latitude, longitude);
  const landmarkPromise = fetchNearestLandmark(latitude, longitude);
  const locationSoilPromise =
    soilTestMeta?.hasSoilTest === false
      ? fetchLocationEstimatedSoilData(latitude, longitude)
      : Promise.resolve(null);

  // Step 3: Retrieving rainfall information...
  await new Promise((r) => setTimeout(r, 400));
  onStepChange?.('retrieving_rainfall');

  // Step 4: Finding farm location...
  await new Promise((r) => setTimeout(r, 400));
  onStepChange?.('finding_location');

  // Await all independent services concurrently using allSettled to ensure resilience
  const [weatherRes, elevationRes, soilTextureRes, geocodeRes, landmarkRes, locationSoilRes] =
    await Promise.allSettled([
      weatherPromise,
      elevationPromise,
      soilTexturePromise,
      geocodePromise,
      landmarkPromise,
      locationSoilPromise,
    ]);

  // Step 5: Combining data...
  onStepChange?.('combining_data');
  await new Promise((r) => setTimeout(r, 400));

  // Resolve Weather / Climate Daily Series
  const weatherResult = weatherRes.status === 'fulfilled' ? weatherRes.value : null;
  const elevation = elevationRes.status === 'fulfilled' ? elevationRes.value : null;

  // Perform SoilWise calculations on retrieved daily data
  let rainfallOutlook: RainfallOutlook;
  let environmentalInfo: EnvironmentalInfo;

  if (weatherResult && weatherResult.status === 'success' && weatherResult.days.length > 0) {
    console.log('Weather data retrieved successfully. Executing calculation layer...');
    rainfallOutlook = calculateRainfallOutlook(weatherResult.days, analysisDate);
    environmentalInfo = calculateEnvironmentalInfo(weatherResult.days, elevation);
  } else {
    console.warn('Weather data was unavailable. Generating structured unavailable states...');
    const reason = weatherResult?.reason || 'Could not retrieve precipitation data from weather service.';
    rainfallOutlook = {
      isAvailable: false,
      unavailabilityReason: reason,
      seasonalOutlook: 'Rainfall outlook unavailable: We could not retrieve sufficient precipitation data for this location.',
      expectedOnset: null,
      expectedCessation: null,
      estimatedSeasonDurationDays: null,
      estimatedRemainingDaysText: 'Remaining days cannot be estimated',
      remainingDaysCount: null,
      approximatePeakPeriod: 'Peak period unavailable',
      rainfallOnsetStatus: 'Not available',
      totalSeasonalRainfallMm: null,
      source: 'Model-based seasonal outlook (Open-Meteo)',
    };

    environmentalInfo = {
      isAvailable: false,
      unavailabilityReason: reason,
      meanAnnualTemperatureC: null,
      annualPrecipitationMm: null,
      climateZone: 'Climate classification unavailable',
      climateClassificationExplanation: 'Additional long-term climate data is required.',
      elevationMeters: elevation,
      source: 'Open-Meteo',
    };
  }

  // Resolve Soil Texture
  const soilTexture: SoilTexture =
    soilTextureRes.status === 'fulfilled'
      ? soilTextureRes.value
      : {
          clayPercent: null,
          sandPercent: null,
          siltPercent: null,
          texturalClass: null,
          source: 'ISRIC SoilGrids',
          isAvailable: false,
          unavailabilityReason: 'Soil texture service was unreachable.',
        };

  // Resolve Geocoded Location & Landmark
  const address = geocodeRes.status === 'fulfilled' ? geocodeRes.value : undefined;
  const landmark = landmarkRes.status === 'fulfilled' ? landmarkRes.value : null;

  const farmLocation: FarmLocation = {
    latitude,
    longitude,
    state: locationDetails?.state,
    lga: locationDetails?.lga,
    address: address || {
      fullAddress: `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`,
    },
    landmark,
    elevationMeters: elevation,
  };

  // Resolve Soil Data: Use user-measured laboratory test if hasSoilTest !== false,
  // or use location-derived soil estimates if hasSoilTest === false
  let effectiveSoilData: SoilData = soilData;
  const isUserMeasured = soilTestMeta?.hasSoilTest !== false;
  const provenance: SoilDataProvenance = isUserMeasured ? 'user_measured' : 'location_estimated';

  if (!isUserMeasured) {
    const locSoil = locationSoilRes.status === 'fulfilled' ? locationSoilRes.value : null;
    if (locSoil) {
      effectiveSoilData = {
        ph: locSoil.ph,
        nitrogen: locSoil.nitrogen,
        phosphorus: locSoil.phosphorus,
        potassium: locSoil.potassium,
        ec: locSoil.ec,
      };
    }
  }

  // Step 6: Preparing Farm Analysis...
  onStepChange?.('preparing_analysis');
  await new Promise((r) => setTimeout(r, 350));

  const result: FarmAnalysisResult = {
    id: `FA-${Date.now()}`,
    analysisDate,
    createdAt: new Date().toISOString(),
    soilData: effectiveSoilData,
    location: farmLocation,
    soilTexture,
    rainfallOutlook,
    environmentalInfo,
    status: rainfallOutlook.isAvailable ? 'completed' : 'partial',
    selectedState: locationDetails?.state,
    selectedLga: locationDetails?.lga,
    hasSoilTest: isUserMeasured,
    soilDataProvenance: provenance,
    soilPhotoProvided: soilTestMeta?.soilPhotoProvided ?? Boolean(soilTestMeta?.soilPhoto),
    soilPhoto: soilTestMeta?.soilPhoto || null,
    soilTextureImageEstimate: soilTestMeta?.soilTextureImageEstimate || null,
    photoAnalysisResult: soilTestMeta?.photoAnalysisResult || null,
  };

  onStepChange?.('completed');
  return result;
}
