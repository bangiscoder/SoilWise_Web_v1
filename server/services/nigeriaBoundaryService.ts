import fs from 'fs';
import path from 'path';

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface GeoJsonFeature {
  type: string;
  properties: {
    shapeName: string;
    shapeISO?: string;
    shapeID?: string;
    shapeGroup?: string;
    shapeType?: string;
    [key: string]: any;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any[];
  };
  bbox?: BoundingBox;
}

export type ValidationStatus =
  | 'match'
  | 'state_mismatch'
  | 'lga_mismatch'
  | 'boundary_uncertain'
  | 'invalid_coordinates'
  | 'outside_nigeria'
  | 'unknown';

export interface LocationValidationResult {
  selected: {
    state: string;
    lga: string;
  };
  gps: {
    latitude: number;
    longitude: number;
    accuracy_m: number | null;
  };
  detected: {
    state: string | null;
    lga: string | null;
  };
  validation: {
    status: ValidationStatus;
    distanceToStateBoundaryM?: number | null;
    distanceToLgaBoundaryM?: number | null;
    accuracyUsedM?: number | null;
    toleranceM?: number;
    reason?: string;
  };
  boundaryDetails: {
    detectedState: string | null;
    detectedLga: string | null;
    distanceToStateBorderKm: number | null;
    distanceToLgaBorderKm: number | null;
    isNearStateBorder: boolean;
    isNearLgaBorder: boolean;
    selectedStatePreserved: boolean;
    selectedLgaPreserved: boolean;
  };
}

// In-memory cache for spatial boundary features
let adm1Features: GeoJsonFeature[] | null = null;
let adm2Features: GeoJsonFeature[] | null = null;
let nigeriaOverallBbox: BoundingBox = { minLng: 2.6, minLat: 4.2, maxLng: 14.7, maxLat: 13.9 };

function computeBbox(geometry: GeoJsonFeature['geometry']): BoundingBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const checkCoord = (pt: [number, number]) => {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  };

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      for (const pt of ring) checkCoord(pt);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        for (const pt of ring) checkCoord(pt);
      }
    }
  }

  return { minLng, minLat, maxLng, maxLat };
}

export function loadBoundaryData(): { adm1Count: number; adm2Count: number } {
  if (adm1Features && adm2Features) {
    return { adm1Count: adm1Features.length, adm2Count: adm2Features.length };
  }

  const baseDir = path.resolve(process.cwd(), 'server', 'data');
  const adm1Path = path.join(baseDir, 'geoBoundaries-NGA-ADM1.geojson');
  const adm2Path = path.join(baseDir, 'geoBoundaries-NGA-ADM2.geojson');

  if (!fs.existsSync(adm1Path) || !fs.existsSync(adm2Path)) {
    throw new Error(`Boundary files not found in ${baseDir}.`);
  }

  const rawAdm1 = JSON.parse(fs.readFileSync(adm1Path, 'utf8'));
  adm1Features = (rawAdm1.features as GeoJsonFeature[]).map((f) => {
    f.bbox = computeBbox(f.geometry);
    return f;
  });

  const rawAdm2 = JSON.parse(fs.readFileSync(adm2Path, 'utf8'));
  adm2Features = (rawAdm2.features as GeoJsonFeature[]).map((f) => {
    f.bbox = computeBbox(f.geometry);
    return f;
  });

  // Calculate overall bounding box for Nigeria
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const f of adm1Features) {
    if (f.bbox) {
      if (f.bbox.minLng < minLng) minLng = f.bbox.minLng;
      if (f.bbox.minLat < minLat) minLat = f.bbox.minLat;
      if (f.bbox.maxLng > maxLng) maxLng = f.bbox.maxLng;
      if (f.bbox.maxLat > maxLat) maxLat = f.bbox.maxLat;
    }
  }
  nigeriaOverallBbox = { minLng, minLat, maxLng, maxLat };

  return { adm1Count: adm1Features.length, adm2Count: adm2Features.length };
}

/**
 * Standard Ray-Casting algorithm for point-in-polygon.
 * Coordinate order is [longitude, latitude].
 */
function pointInRing(pt: [number, number], ring: [number, number][]): boolean {
  const [lng, lat] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInGeometry(pt: [number, number], geometry: GeoJsonFeature['geometry']): boolean {
  if (geometry.type === 'Polygon') {
    if (!pointInRing(pt, geometry.coordinates[0])) return false;
    // Check holes (inner rings)
    for (let k = 1; k < geometry.coordinates.length; k++) {
      if (pointInRing(pt, geometry.coordinates[k])) return false;
    }
    return true;
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (pointInRing(pt, poly[0])) {
        let inHole = false;
        for (let k = 1; k < poly.length; k++) {
          if (pointInRing(pt, poly[k])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }
  return false;
}

/**
 * Calculate distance from point to line segment in meters.
 */
function distToSegmentMeters(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  meanLatRad: number
): number {
  const metersPerDegLat = 111132;
  const metersPerDegLng = 111320 * Math.cos(meanLatRad);

  const dxSeg = (x2 - x1) * metersPerDegLng;
  const dySeg = (y2 - y1) * metersPerDegLat;
  const segLenSq = dxSeg * dxSeg + dySeg * dySeg;

  if (segLenSq === 0) {
    const dpx = (px - x1) * metersPerDegLng;
    const dpy = (py - y1) * metersPerDegLat;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  const dpx = (px - x1) * metersPerDegLng;
  const dpy = (py - y1) * metersPerDegLat;
  let t = (dpx * dxSeg + dpy * dySeg) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = (x1 + t * (x2 - x1) - px) * metersPerDegLng;
  const projY = (y1 + t * (y2 - y1) - py) * metersPerDegLat;
  return Math.sqrt(projX * projX + projY * projY);
}

/**
 * Calculates shortest distance in meters from point [lng, lat] to polygon boundary rings.
 */
function distanceToBoundaryMeters(pt: [number, number], geometry: GeoJsonFeature['geometry']): number {
  const [lng, lat] = pt;
  const meanLatRad = (lat * Math.PI) / 180;
  let minDistance = Infinity;

  const testRingDistance = (ring: [number, number][]) => {
    for (let i = 0; i < ring.length - 1; i++) {
      const d = distToSegmentMeters(
        lng,
        lat,
        ring[i][0],
        ring[i][1],
        ring[i + 1][0],
        ring[i + 1][1],
        meanLatRad
      );
      if (d < minDistance) minDistance = d;
    }
  };

  if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      testRingDistance(ring);
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      for (const ring of poly) {
        testRingDistance(ring);
      }
    }
  }

  return minDistance;
}

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\bstate\b/gi, '')
    .replace(/\blga\b/gi, '')
    .replace(/\bfederal capital territory\b/gi, 'fct')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Determines whether two administrative names match, accounting for common synonyms,
 * prefixes, suffixes, punctuation, and FCT variations.
 */
export function areNamesEquivalent(nameA: string, nameB: string): boolean {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  if (normA === normB) return true;
  if (!normA || !normB) return false;

  // Handle Abuja / FCT
  if ((normA === 'abuja' || normA === 'fct') && (normB === 'abuja' || normB === 'fct')) {
    return true;
  }

  // Substring matching for compound names
  if (normA.length > 4 && normB.length > 4 && (normA.includes(normB) || normB.includes(normA))) {
    return true;
  }

  return false;
}

/**
 * Detect Nigerian State and LGA from GPS coordinate.
 */
export function detectLocationFromGps(lat: number, lon: number): {
  detectedState: string | null;
  detectedLga: string | null;
  stateFeature: GeoJsonFeature | null;
  lgaFeature: GeoJsonFeature | null;
  isWithinNigeriaBbox: boolean;
  isValidCoordinate: boolean;
} {
  // Validate coordinates
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    isNaN(lat) ||
    isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return {
      detectedState: null,
      detectedLga: null,
      stateFeature: null,
      lgaFeature: null,
      isWithinNigeriaBbox: false,
      isValidCoordinate: false,
    };
  }

  loadBoundaryData();

  const pt: [number, number] = [lon, lat];

  // Quick check against Nigeria overall bounding box with slight margin
  const margin = 0.05;
  const isWithinBbox =
    lon >= nigeriaOverallBbox.minLng - margin &&
    lon <= nigeriaOverallBbox.maxLng + margin &&
    lat >= nigeriaOverallBbox.minLat - margin &&
    lat <= nigeriaOverallBbox.maxLat + margin;

  if (!isWithinBbox) {
    return {
      detectedState: null,
      detectedLga: null,
      stateFeature: null,
      lgaFeature: null,
      isWithinNigeriaBbox: false,
      isValidCoordinate: true,
    };
  }

  // 1. Point-in-polygon for ADM1 (State)
  let matchedStateFeature: GeoJsonFeature | null = null;
  if (adm1Features) {
    for (const feature of adm1Features) {
      if (
        feature.bbox &&
        (lon < feature.bbox.minLng ||
          lon > feature.bbox.maxLng ||
          lat < feature.bbox.minLat ||
          lat > feature.bbox.maxLat)
      ) {
        continue;
      }
      if (pointInGeometry(pt, feature.geometry)) {
        matchedStateFeature = feature;
        break;
      }
    }
  }

  // 2. Point-in-polygon for ADM2 (LGA)
  let matchedLgaFeature: GeoJsonFeature | null = null;
  if (adm2Features) {
    for (const feature of adm2Features) {
      if (
        feature.bbox &&
        (lon < feature.bbox.minLng ||
          lon > feature.bbox.maxLng ||
          lat < feature.bbox.minLat ||
          lat > feature.bbox.maxLat)
      ) {
        continue;
      }
      if (pointInGeometry(pt, feature.geometry)) {
        matchedLgaFeature = feature;
        break;
      }
    }
  }

  return {
    detectedState: matchedStateFeature ? matchedStateFeature.properties.shapeName : null,
    detectedLga: matchedLgaFeature ? matchedLgaFeature.properties.shapeName : null,
    stateFeature: matchedStateFeature,
    lgaFeature: matchedLgaFeature,
    isWithinNigeriaBbox: isWithinBbox,
    isValidCoordinate: true,
  };
}

/**
 * Independent Geographic Validation Layer.
 * Compares user selected State/LGA against GPS point-in-polygon detection.
 * Considers boundary proximity and GPS accuracy for 'boundary_uncertain'.
 * NEVER silently replaces user's selected State/LGA.
 */
export function validateNigerianLocation(
  selectedState: string,
  selectedLga: string,
  latitude: number,
  longitude: number,
  accuracyM: number | null = null
): LocationValidationResult {
  const DEFAULT_BOUNDARY_TOLERANCE_M = 500; // 500 meters tolerance for administrative boundaries
  const effectiveToleranceM = accuracyM && accuracyM > 0
    ? Math.max(DEFAULT_BOUNDARY_TOLERANCE_M, accuracyM)
    : DEFAULT_BOUNDARY_TOLERANCE_M;

  const detection = detectLocationFromGps(latitude, longitude);

  // 1. Invalid coordinates check
  if (!detection.isValidCoordinate) {
    return {
      selected: { state: selectedState, lga: selectedLga },
      gps: { latitude, longitude, accuracy_m: accuracyM },
      detected: { state: null, lga: null },
      validation: {
        status: 'invalid_coordinates',
        accuracyUsedM: accuracyM,
        toleranceM: effectiveToleranceM,
        reason: 'GPS coordinates are numerically invalid or outside standard geographical limits [-90 to 90 lat, -180 to 180 lon].',
      },
      boundaryDetails: {
        detectedState: null,
        detectedLga: null,
        distanceToStateBorderKm: null,
        distanceToLgaBorderKm: null,
        isNearStateBorder: false,
        isNearLgaBorder: false,
        selectedStatePreserved: true,
        selectedLgaPreserved: true,
      },
    };
  }

  // 2. Outside Nigeria check
  if (!detection.isWithinNigeriaBbox || (!detection.detectedState && !detection.detectedLga)) {
    return {
      selected: { state: selectedState, lga: selectedLga },
      gps: { latitude, longitude, accuracy_m: accuracyM },
      detected: { state: null, lga: null },
      validation: {
        status: 'outside_nigeria',
        accuracyUsedM: accuracyM,
        toleranceM: effectiveToleranceM,
        reason: 'GPS coordinates fall outside Nigerian administrative boundaries according to official geoBoundaries ADM1/ADM2 data.',
      },
      boundaryDetails: {
        detectedState: null,
        detectedLga: null,
        distanceToStateBorderKm: null,
        distanceToLgaBorderKm: null,
        isNearStateBorder: false,
        isNearLgaBorder: false,
        selectedStatePreserved: true,
        selectedLgaPreserved: true,
      },
    };
  }

  // Compute boundary distances
  let distToStateBorderM: number | null = null;
  let distToLgaBorderM: number | null = null;

  if (detection.stateFeature) {
    distToStateBorderM = distanceToBoundaryMeters([longitude, latitude], detection.stateFeature.geometry);
  }
  if (detection.lgaFeature) {
    distToLgaBorderM = distanceToBoundaryMeters([longitude, latitude], detection.lgaFeature.geometry);
  }

  const isNearStateBorder = distToStateBorderM !== null && distToStateBorderM <= effectiveToleranceM;
  const isNearLgaBorder = distToLgaBorderM !== null && distToLgaBorderM <= effectiveToleranceM;

  const detectedState = detection.detectedState;
  const detectedLga = detection.detectedLga;

  const stateMatches = detectedState ? areNamesEquivalent(selectedState, detectedState) : false;
  const lgaMatches = detectedLga ? areNamesEquivalent(selectedLga, detectedLga) : false;

  let status: ValidationStatus = 'unknown';
  let reason = '';

  if (stateMatches && lgaMatches) {
    status = 'match';
    reason = `GPS coordinate precisely matches selected State (${selectedState}) and LGA (${selectedLga}).`;
  } else if (!stateMatches) {
    // State differs
    if (isNearStateBorder) {
      status = 'boundary_uncertain';
      reason = `Coordinate is within ${Math.round(distToStateBorderM || 0)}m of the state boundary between ${detectedState} and adjacent states (GPS uncertainty: ${accuracyM !== null ? `${accuracyM}m` : 'unspecified'}). Determining confident state assignment requires higher GPS precision.`;
    } else {
      status = 'state_mismatch';
      reason = `Selected State is '${selectedState}', but GPS point-in-polygon analysis places coordinate securely within '${detectedState}' (${distToStateBorderM ? (distToStateBorderM / 1000).toFixed(1) : 0} km from state border).`;
    }
  } else if (stateMatches && !lgaMatches) {
    // State matches, but LGA differs
    if (isNearLgaBorder) {
      status = 'boundary_uncertain';
      reason = `State matches (${selectedState}), but coordinate is within ${Math.round(distToLgaBorderM || 0)}m of the administrative boundary of '${detectedLga}' (GPS uncertainty: ${accuracyM !== null ? `${accuracyM}m` : 'unspecified'}). Determination between '${selectedLga}' and '${detectedLga}' is boundary uncertain.`;
    } else {
      status = 'lga_mismatch';
      reason = `Selected State matches (${selectedState}), but selected LGA is '${selectedLga}' while GPS point-in-polygon analysis places coordinate in '${detectedLga}' (${distToLgaBorderM ? (distToLgaBorderM / 1000).toFixed(1) : 0} km from LGA border).`;
    }
  }

  return {
    selected: {
      state: selectedState,
      lga: selectedLga,
    },
    gps: {
      latitude,
      longitude,
      accuracy_m: accuracyM,
    },
    detected: {
      state: detectedState,
      lga: detectedLga,
    },
    validation: {
      status,
      distanceToStateBoundaryM: distToStateBorderM ? Math.round(distToStateBorderM) : null,
      distanceToLgaBoundaryM: distToLgaBorderM ? Math.round(distToLgaBorderM) : null,
      accuracyUsedM: accuracyM,
      toleranceM: Math.round(effectiveToleranceM),
      reason,
    },
    boundaryDetails: {
      detectedState,
      detectedLga,
      distanceToStateBorderKm: distToStateBorderM !== null ? parseFloat((distToStateBorderM / 1000).toFixed(2)) : null,
      distanceToLgaBorderKm: distToLgaBorderM !== null ? parseFloat((distToLgaBorderM / 1000).toFixed(2)) : null,
      isNearStateBorder,
      isNearLgaBorder,
      selectedStatePreserved: true,
      selectedLgaPreserved: true,
    },
  };
}
