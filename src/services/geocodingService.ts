/**
 * Geocoding and Landmark Service for SoilWise AI
 * Uses OpenStreetMap Nominatim reverse-geocoding and localized landmark search.
 */

import { FarmLocation } from '../types/soilwise';

// Helper: Haversine distance in kilometers
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function fetchWithTimeout(url: string, timeoutMs: number = 7000): Promise<Response> {
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

/**
 * OpenStreetMap Nominatim Reverse Geocoding
 */
export async function fetchReverseGeocode(lat: number, lon: number): Promise<FarmLocation['address'] | undefined> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetchWithTimeout(url, 6500);

    if (!res.ok) return undefined;
    const data = await res.json();
    const addr = data.address || {};

    const parts = [
      addr.road,
      addr.village || addr.suburb || addr.neighbourhood,
      addr.town || addr.city,
      addr.county,
      addr.state,
      addr.country,
    ].filter(Boolean);

    const fullAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`);

    return {
      fullAddress,
      road: addr.road,
      village: addr.village || addr.suburb,
      town: addr.town,
      city: addr.city,
      county: addr.county,
      state: addr.state,
      country: addr.country,
      postcode: addr.postcode,
    };
  } catch (error) {
    console.warn('Reverse geocoding error or timeout:', error);
    return undefined;
  }
}

/**
 * Nearby Mapped Landmark using OpenStreetMap Search
 */
export async function fetchNearestLandmark(
  lat: number,
  lon: number
): Promise<{ name: string; distanceKm?: number } | null> {
  try {
    const delta = 0.05; // ~5km bounding box
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital+school+market+mosque+church+station+palace+park&bounded=1&viewbox=${lon - delta},${lat + delta},${lon + delta},${lat - delta}&limit=3`;
    const res = await fetchWithTimeout(url, 5500);

    if (!res.ok) return null;
    const items = await res.json();

    if (Array.isArray(items) && items.length > 0) {
      let closest = items[0];
      let minDistance = Infinity;

      for (const item of items) {
        const itemLat = parseFloat(item.lat);
        const itemLon = parseFloat(item.lon);
        if (!isNaN(itemLat) && !isNaN(itemLon)) {
          const d = calculateHaversineDistance(lat, lon, itemLat, itemLon);
          if (d < minDistance) {
            minDistance = d;
            closest = item;
          }
        }
      }

      const landmarkName = closest.display_name?.split(',')[0]?.trim() || closest.name;
      if (landmarkName) {
        return {
          name: landmarkName,
          distanceKm: isFinite(minDistance) ? minDistance : undefined,
        };
      }
    }
    return null;
  } catch (error) {
    console.warn('Landmark search error or timeout:', error);
    return null;
  }
}
