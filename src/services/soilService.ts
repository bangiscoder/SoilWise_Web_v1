/**
 * Soil Texture Service for SoilWise AI
 * Queries ISRIC SoilGrids REST API for gridded clay, sand, silt layers
 * and assigns standard USDA textural classifications.
 */

import { SoilTexture } from '../types/soilwise';

async function fetchWithTimeout(url: string, timeoutMs: number = 7500): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function fetchSoilTexture(lat: number, lon: number): Promise<SoilTexture> {
  try {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${lat}&lon=${lon}&property=clay&property=sand&property=silt&depth=0-5cm&value=mean`;
    const res = await fetchWithTimeout(url, 7500);

    if (!res.ok) {
      return {
        clayPercent: null,
        sandPercent: null,
        siltPercent: null,
        texturalClass: null,
        source: 'ISRIC SoilGrids REST API',
        isAvailable: false,
        unavailabilityReason: `SoilGrids service returned status ${res.status}`,
      };
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
      // ISRIC SoilGrids values are in g/kg (permille). Convert to percentages:
      const clayPercent = Math.round((clayGkg / 10) * 10) / 10;
      const sandPercent = Math.round((sandGkg / 10) * 10) / 10;
      const siltPercent = Math.round((siltGkg / 10) * 10) / 10;

      // USDA Texture Classification
      let texturalClass = 'Loam';
      if (sandPercent >= 70 && clayPercent <= 15) texturalClass = 'Sandy Soil';
      else if (clayPercent >= 40) texturalClass = 'Clay';
      else if (siltPercent >= 80) texturalClass = 'Silt';
      else if (sandPercent >= 45 && clayPercent <= 20) texturalClass = 'Sandy Loam';
      else if (clayPercent >= 27 && clayPercent < 40 && sandPercent <= 45) texturalClass = 'Clay Loam';
      else if (clayPercent >= 27 && clayPercent < 40 && sandPercent > 45) texturalClass = 'Sandy Clay Loam';
      else if (siltPercent >= 50) texturalClass = 'Silty Loam';

      return {
        clayPercent,
        sandPercent,
        siltPercent,
        texturalClass,
        source: 'ISRIC SoilGrids 2.0 (Modelled 250m gridded data)',
        isAvailable: true,
      };
    }

    return {
      clayPercent: null,
      sandPercent: null,
      siltPercent: null,
      texturalClass: null,
      source: 'ISRIC SoilGrids',
      isAvailable: false,
      unavailabilityReason: 'Coordinates fall outside mapped terrestrial soil grid or in marine/water boundary.',
    };
  } catch (error: any) {
    console.warn('SoilGrids request error or timeout:', error);
    return {
      clayPercent: null,
      sandPercent: null,
      siltPercent: null,
      texturalClass: null,
      source: 'ISRIC SoilGrids',
      isAvailable: false,
      unavailabilityReason: error?.message || 'SoilGrids API request timed out.',
    };
  }
}
