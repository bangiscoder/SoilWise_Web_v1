/**
 * Soil Texture Service for SoilWise AI
 * Primary source: ISRIC SoilGrids REST API v2.0
 * Fallback source: OpenLandMap / OpenGeoHub open environmental layers
 * 
 * Accurately determines clay, sand, and silt percentages and derives USDA texture classifications.
 * Never fabricates values if external services are unavailable or paused.
 */

import { SoilTexture } from '../types/soilwise';

/**
 * Standard USDA Texture Classification based on genuine mineral fractions
 */
export function calculateUsdaTextureClass(clay: number, sand: number, silt: number): string {
  if (sand >= 70 && clay <= 15) return 'Sandy Soil';
  if (clay >= 40) return 'Clay';
  if (silt >= 80) return 'Silt';
  if (sand >= 45 && clay <= 20) return 'Sandy Loam';
  if (clay >= 27 && clay < 40 && sand <= 45) return 'Clay Loam';
  if (clay >= 27 && clay < 40 && sand > 45) return 'Sandy Clay Loam';
  if (silt >= 50) return 'Silty Loam';
  return 'Loam';
}

/**
 * Helper to fetch with an explicit timeout error signal
 */
async function fetchWithSafeTimeout(url: string, timeoutMs: number = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Primary soil query: ISRIC SoilGrids 2.0
 */
async function querySoilGrids(lat: number, lon: number): Promise<SoilTexture | null> {
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=clay&property=sand&property=silt&depth=0-5cm&value=mean`;
  
  try {
    const res = await fetchWithSafeTimeout(url, 6000);
    if (!res.ok) {
      console.warn(`SoilGrids returned HTTP ${res.status}: service may be throttled or paused.`);
      return null;
    }

    const data = await res.json();
    const layers = data.properties?.layers || [];

    let clayGkg: number | null = null;
    let sandGkg: number | null = null;
    let siltGkg: number | null = null;

    layers.forEach((l: { name: string; depths?: { values?: { mean?: number } }[] }) => {
      const meanVal = l.depths?.[0]?.values?.mean;
      if (typeof meanVal === 'number') {
        if (l.name === 'clay') clayGkg = meanVal;
        if (l.name === 'sand') sandGkg = meanVal;
        if (l.name === 'silt') siltGkg = meanVal;
      }
    });

    if (clayGkg !== null && sandGkg !== null && siltGkg !== null) {
      const clayPercent = Math.round((clayGkg / 10) * 10) / 10;
      const sandPercent = Math.round((sandGkg / 10) * 10) / 10;
      const siltPercent = Math.round((siltGkg / 10) * 10) / 10;
      const texturalClass = calculateUsdaTextureClass(clayPercent, sandPercent, siltPercent);

      return {
        clayPercent,
        sandPercent,
        siltPercent,
        texturalClass,
        source: 'ISRIC SoilGrids 2.0 (250 m model)',
        isAvailable: true,
        soilDataSource: 'SoilGrids',
      };
    }

    return null;
  } catch (error: any) {
    console.warn('SoilGrids primary query unavailable:', error?.message || error);
    return null;
  }
}

/**
 * Fallback Candidate: OpenLandMap / OpenGeoHub soil data query
 * Checks supported endpoints. If the external catalog requires GEE credentials or direct raster access,
 * it returns null rather than fabricating arbitrary percentages.
 */
async function queryOpenLandMapFallback(lat: number, lon: number): Promise<SoilTexture | null> {
  try {
    // OpenLandMap STAC metadata verification
    const stacUrl = `https://stac.opengeohub.org/v1/cat/openlandmap`;
    const res = await fetchWithSafeTimeout(stacUrl, 3000);
    
    if (res.ok) {
      // OpenLandMap STAC catalog is reachable, but point-fraction REST endpoints for sand/clay/silt
      // are not offered as an open REST API (data is distributed via COG GeoTIFFs / GEE).
      // We log transparent diagnostic and avoid inventing numbers.
      console.info(`OpenLandMap catalog reached for (${lat}, ${lon}); direct point query requires raster processing.`);
    }
    return null;
  } catch (err: any) {
    console.warn('OpenLandMap fallback query could not be resolved:', err?.message || err);
    return null;
  }
}

/**
 * Main Soil Texture Orchestrator
 * Pipeline:
 * 1. Query SoilGrids (primary)
 * 2. If SoilGrids fails or times out, try OpenLandMap fallback
 * 3. If both fail or have no point data, return transparent, professional unavailable state
 */
export async function fetchSoilTexture(lat: number, lon: number): Promise<SoilTexture> {
  // 1. Primary: SoilGrids
  const soilGridsResult = await querySoilGrids(lat, lon);
  if (soilGridsResult && soilGridsResult.isAvailable) {
    return soilGridsResult;
  }

  // 2. Fallback: OpenLandMap / OpenGeoHub
  const fallbackResult = await queryOpenLandMapFallback(lat, lon);
  if (fallbackResult && fallbackResult.isAvailable) {
    return fallbackResult;
  }

  // 3. Graceful Unavailable State (Strictly no fabricated data)
  return {
    clayPercent: null,
    sandPercent: null,
    siltPercent: null,
    texturalClass: null,
    source: 'External soil-grid services (SoilGrids / OpenLandMap)',
    isAvailable: false,
    soilDataSource: null,
    unavailabilityReason: 'Soil texture data is currently unavailable for this location. External soil-grid services did not return sufficient data for these coordinates. SoilWise AI is being developed with a dedicated fallback soil model to improve coverage in future versions.',
  };
}
