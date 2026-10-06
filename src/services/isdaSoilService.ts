import type { IsdaPropertyRecord, IsdaDepthLayer, SoilData } from '../types/soilwise.ts';

export interface NormalisedSoilProperty {
  property: string;
  value: number | string | null;
  unit: string;
  depth: string;
  source: 'iSDAsoil';
  source_type: 'location_estimated';
  resolution_m: number;
  uncertainty: {
    lower: number | null;
    upper: number | null;
    stdev?: number | null;
  };
  status: 'available' | 'unavailable' | 'error';
  unavailability_reason?: string;
  original_value?: number | string | null;
  original_unit?: string | null;
  normalised_value?: number | null;
  normalised_unit?: string | null;
  analytical_method?: string | null;
  notes?: string;
}

export interface SoilWiseNormalisedProfile {
  ph: NormalisedSoilProperty;
  nitrogen_total: NormalisedSoilProperty;
  phosphorus_extractable: NormalisedSoilProperty;
  potassium_extractable: NormalisedSoilProperty;
  sand_content: NormalisedSoilProperty;
  silt_content: NormalisedSoilProperty;
  clay_content: NormalisedSoilProperty;
  texture_class: NormalisedSoilProperty;
  ec: NormalisedSoilProperty;
  overall_status: 'available' | 'partially_available' | 'unavailable' | 'error';
  depth: '0-20cm';
  source: 'iSDAsoil';
  source_type: 'location_estimated';
  spatial_resolution: '30m';
  fetched_at: string;
}

export interface TokenCacheMetadata {
  hasCachedToken: boolean;
  isExpired: boolean;
  expiresInSeconds: number | null;
  cachedAt: string | null;
  expiresAt: string | null;
  cacheHitsCount: number;
  authCallsCount: number;
  credentialsConfigured: boolean;
  usernameStatus: 'loaded' | 'missing';
  passwordStatus: 'loaded' | 'missing';
  usernameMasked: string | null;
  authEndpoint: string;
  source: 'process.env';
  scope?: string;
  clientIdConfigured?: boolean;
  clientSecretConfigured?: boolean;
}

export interface AuthDiagnostic {
  endpoint: string;
  httpStatus: number | null;
  authentication: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  tokenReceived: boolean;
  message?: string;
}

export interface SoilPropertyDiagnostic {
  endpoint: string;
  httpStatus: number | null;
  responseReceived: boolean;
  message?: string;
}

export type IsdaClassification =
  | 'AUTHENTICATION_FAILED'
  | 'AUTHENTICATION_SUCCESS_SOIL_REQUEST_FAILED'
  | 'INVALID_COORDINATES'
  | 'INVALID_REQUEST_PARAMETERS'
  | 'NO_SOIL_DATA_RETURNED'
  | 'SOIL_DATA_RETURNED_BUT_NOT_PARSED'
  | 'SOIL_DATA_RETURNED_BUT_MAPPING_FAILED'
  | 'SUCCESS';

export interface IsdaDiagnosticSummary {
  authentication: {
    credentialsLoaded: boolean;
    authSuccessful: boolean;
    tokenObtained: boolean;
    details: string;
  };
  soilRequest: {
    endpointReachable: boolean;
    requestAuthenticated: boolean;
    coordinatesAccepted: boolean;
    soilProfileReturned: boolean;
    httpStatus: number | null;
  };
  response: {
    jsonReceived: boolean;
    propertiesDetected: boolean;
    parsedSuccessfully: boolean;
    detectedPropertiesCount: number;
  };
  profile: {
    phAvailable: boolean;
    nitrogenAvailable: boolean;
    phosphorusAvailable: boolean;
    potassiumAvailable: boolean;
    textureAvailable: boolean;
    additionalPropertiesAvailable: boolean;
    ecStatus: 'unavailable';
    availablePropertiesCount: number;
  };
}

export interface IsdaSoilServiceResponse {
  success: boolean;
  classification: IsdaClassification;
  classificationMessage: string;
  raw: any;
  authDiagnostic: AuthDiagnostic;
  soilPropertyDiagnostic: SoilPropertyDiagnostic;
  normalised: SoilWiseNormalisedProfile;
  fullProfile?: Record<string, IsdaPropertyRecord>;
  tokenInfo: TokenCacheMetadata;
  diagnosticSummary: IsdaDiagnosticSummary;
  diagnostics: {
    timestamp: string;
    stage: string;
    status: 'ok' | 'warning' | 'error' | 'info';
    message: string;
  }[];
}

// In-memory token cache (strictly server-side, never exposed to browser)
export class IsdaTokenManager {
  private token: string | null = null;
  private tokenCreatedAt: number | null = null;
  private tokenExpiresAt: number | null = null;
  private cacheHitsCount = 0;
  private authCallsCount = 0;
  private inFlightAuthPromise: Promise<{ token: string | null; authDiagnostic: AuthDiagnostic }> | null = null;

  // Conservative cache TTL: 50 minutes (3000 seconds) when iSDA response omits expires_in (standard tokens expire in 60 mins)
  private readonly DEFAULT_TTL_SECONDS = 50 * 60;
  // Safety buffer: refresh token if less than 3 minutes remaining before expiry
  private readonly SAFETY_BUFFER_MS = 3 * 60 * 1000;
  private lastAuthFailedAt: number | null = null;
  private lastFailureStatus: number | null = null;

  public getCacheMetadata(): TokenCacheMetadata {
    const username = typeof process !== 'undefined' ? process.env?.ISDA_USERNAME : undefined;
    const password = typeof process !== 'undefined' ? process.env?.ISDA_PASSWORD : undefined;
    const hasUsername = Boolean(username && username.trim().length > 0);
    const hasPassword = Boolean(password && password.length > 0);
    const hasCreds = hasUsername && hasPassword;

    // Mask username for safe diagnostic display (e.g., "mye***@gmail.com")
    let usernameMasked: string | null = null;
    if (hasUsername && username) {
      const trimmed = username.trim();
      if (trimmed.includes('@')) {
        const [localPart, domain] = trimmed.split('@');
        const visibleLocal = localPart.length > 2 ? localPart.slice(0, 3) : localPart.slice(0, 1);
        usernameMasked = `${visibleLocal}***@${domain}`;
      } else {
        const visible = trimmed.length > 3 ? trimmed.slice(0, 3) : trimmed.slice(0, 1);
        usernameMasked = `${visible}*** (${trimmed.length} chars)`;
      }
    }

    const now = Date.now();
    const isExpired = !this.token || !this.tokenExpiresAt || now >= (this.tokenExpiresAt - this.SAFETY_BUFFER_MS);
    const expiresInSeconds =
      this.tokenExpiresAt && now < this.tokenExpiresAt
        ? Math.max(0, Math.floor((this.tokenExpiresAt - now) / 1000))
        : null;

    return {
      hasCachedToken: Boolean(this.token),
      isExpired,
      expiresInSeconds,
      cachedAt: this.tokenCreatedAt ? new Date(this.tokenCreatedAt).toISOString() : null,
      expiresAt: this.tokenExpiresAt ? new Date(this.tokenExpiresAt).toISOString() : null,
      cacheHitsCount: this.cacheHitsCount,
      authCallsCount: this.authCallsCount,
      credentialsConfigured: hasCreds,
      usernameStatus: hasUsername ? 'loaded' : 'missing',
      passwordStatus: hasPassword ? 'loaded' : 'missing',
      usernameMasked,
      authEndpoint: 'https://api.isda-africa.com/login',
      source: 'process.env',
      scope: process.env?.ISDA_SCOPE || undefined,
      clientIdConfigured: Boolean(process.env?.ISDA_CLIENT_ID),
      clientSecretConfigured: Boolean(process.env?.ISDA_CLIENT_SECRET),
    };
  }

  public invalidateToken(): void {
    this.token = null;
    this.tokenExpiresAt = null;
    this.tokenCreatedAt = null;
    this.lastAuthFailedAt = null;
    this.lastFailureStatus = null;
  }

  /**
   * Invalidates cached token only if it matches the token that produced the 401 error.
   * Prevents an older request from accidentally invalidating a fresh token acquired by a concurrent request.
   */
  public invalidateTokenIfMatches(staleToken: string): boolean {
    if (this.token && this.token === staleToken) {
      console.log('[iSDAsoil Auth] iSDAsoil request returned 401; invalidating cached token');
      this.token = null;
      this.tokenExpiresAt = null;
      this.tokenCreatedAt = null;
      return true;
    }
    return false;
  }

  /**
   * Returns a valid access token. Uses cached token if not expired, or acquires a new one.
   * Concurrent requests wait on the same in-flight authentication promise to prevent duplicate /login calls.
   */
  public async getValidToken(
    logStage?: (stage: string, status: 'ok' | 'warning' | 'error' | 'info', message: string) => void
  ): Promise<{ token: string | null; authDiagnostic: AuthDiagnostic }> {
    const now = Date.now();

    // Check if current cached token is valid and not nearing expiry
    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt - now > this.SAFETY_BUFFER_MS) {
      this.cacheHitsCount++;
      const remainingSec = Math.floor((this.tokenExpiresAt - now) / 1000);
      console.log(`[iSDAsoil Auth] iSDAsoil authentication: SUCCESS\nToken available: YES\nToken expiry known: YES\nToken reused/refreshed: REUSED (${remainingSec}s remaining)`);
      if (logStage) {
        logStage(
          'Token Verification',
          'ok',
          `Reusing valid cached iSDAsoil JWT token (Cache hit #${this.cacheHitsCount}). Expires in ${remainingSec}s.`
        );
      }
      return {
        token: this.token,
        authDiagnostic: {
          endpoint: 'https://api.isda-africa.com/login',
          httpStatus: 200,
          authentication: 'SUCCESS',
          tokenReceived: true,
          message: `Cached token active (${remainingSec}s remaining).`,
        },
      };
    }

    // If authentication is already in progress, await the existing in-flight promise
    if (this.inFlightAuthPromise) {
      if (logStage) {
        logStage('Authentication', 'info', 'Awaiting existing in-flight iSDAsoil authentication request...');
      }
      return await this.inFlightAuthPromise;
    }

    this.inFlightAuthPromise = this.performLogin(logStage);
    try {
      return await this.inFlightAuthPromise;
    } finally {
      this.inFlightAuthPromise = null;
    }
  }

  private async performLogin(
    logStage?: (stage: string, status: 'ok' | 'warning' | 'error' | 'info', message: string) => void
  ): Promise<{ token: string | null; authDiagnostic: AuthDiagnostic }> {
    const username = typeof process !== 'undefined' ? process.env?.ISDA_USERNAME : undefined;
    const password = typeof process !== 'undefined' ? process.env?.ISDA_PASSWORD : undefined;
    const authEndpoint = 'https://api.isda-africa.com/login';

    const hasUsername = Boolean(username && username.trim().length > 0);
    const hasPassword = Boolean(password && password.length > 0);

    if (!hasUsername || !hasPassword) {
      if (logStage) {
        logStage(
          'Authentication',
          'warning',
          'ISDA_USERNAME and/or ISDA_PASSWORD are not configured in server environment. Cannot authenticate against live iSDAsoil API.'
        );
      }
      console.warn('[iSDAsoil Auth] iSDAsoil authentication: FAILED\nToken available: NO\nToken expiry known: NO\nToken reused/refreshed: FAILED (Missing credentials in server environment)');
      return {
        token: null,
        authDiagnostic: {
          endpoint: authEndpoint,
          httpStatus: null,
          authentication: 'SKIPPED',
          tokenReceived: false,
          message: 'ISDA_USERNAME and/or ISDA_PASSWORD missing in server environment variables.',
        },
      };
    }

    console.log('[iSDAsoil Auth] iSDAsoil token missing or expired; authenticating');
    if (logStage) {
      logStage('Authentication', 'info', `Requesting JWT token from ${authEndpoint}...`);
    }

    try {
      this.authCallsCount++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Verified working request specification:
      // POST https://api.isda-africa.com/login
      // Content-Type: application/x-www-form-urlencoded
      // Body: grant_type=password&username=USERNAME&password=PASSWORD
      const formParams = new URLSearchParams();
      formParams.append('grant_type', 'password');
      formParams.append('username', (username as string).trim());
      // Section 7: Do not trim or mutate the password value before authentication
      formParams.append('password', password as string);
      if (process.env?.ISDA_SCOPE) {
        formParams.append('scope', process.env.ISDA_SCOPE);
      }
      if (process.env?.ISDA_CLIENT_ID) {
        formParams.append('client_id', process.env.ISDA_CLIENT_ID);
      }
      if (process.env?.ISDA_CLIENT_SECRET) {
        formParams.append('client_secret', process.env.ISDA_CLIENT_SECRET);
      }

      const resp = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const httpStatus = resp.status;

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => '');
        this.lastAuthFailedAt = Date.now();
        this.lastFailureStatus = httpStatus;
        console.warn(`[iSDAsoil Auth] iSDAsoil authentication: FAILED\nToken available: NO\nToken expiry known: NO\nToken reused/refreshed: FAILED (HTTP ${httpStatus})`);
        if (logStage) {
          logStage(
            'Authentication',
            'warning',
            `iSDAsoil authentication returned HTTP ${httpStatus}: ${errorText.substring(0, 150) || resp.statusText}`
          );
        }
        this.token = null;
        this.tokenExpiresAt = null;
        this.tokenCreatedAt = null;
        return {
          token: null,
          authDiagnostic: {
            endpoint: authEndpoint,
            httpStatus,
            authentication: 'FAILED',
            tokenReceived: false,
            message: `HTTP ${httpStatus} error: ${errorText.substring(0, 200) || resp.statusText}`,
          },
        };
      }

      const data = await resp.json();
      const accessToken = data?.access_token;

      if (!accessToken || typeof accessToken !== 'string') {
        console.warn('[iSDAsoil Auth] iSDAsoil login endpoint returned HTTP 200, but no access_token found in response');
        if (logStage) {
          logStage(
            'Authentication',
            'error',
            'iSDAsoil login endpoint returned HTTP 200, but no access_token found in response.'
          );
        }
        return {
          token: null,
          authDiagnostic: {
            endpoint: authEndpoint,
            httpStatus,
            authentication: 'FAILED',
            tokenReceived: false,
            message: 'No access_token found in HTTP 200 response body.',
          },
        };
      }

      const now = Date.now();
      this.token = accessToken;
      this.tokenCreatedAt = now;
      const ttlSec =
        typeof data.expires_in === 'number' && data.expires_in > 0
          ? data.expires_in
          : this.DEFAULT_TTL_SECONDS;
      this.tokenExpiresAt = now + ttlSec * 1000;

      console.log(`[iSDAsoil Auth] iSDAsoil authentication: SUCCESS\nToken available: YES\nToken expiry known: ${typeof data.expires_in === 'number' ? 'YES' : 'NO'}\nToken reused/refreshed: REFRESHED (${ttlSec}s)`);
      if (logStage) {
        logStage(
          'Authentication',
          'ok',
          `iSDAsoil authentication SUCCESS (HTTP 200). Token received and cached (${ttlSec}s).`
        );
      }

      return {
        token: this.token,
        authDiagnostic: {
          endpoint: authEndpoint,
          httpStatus,
          authentication: 'SUCCESS',
          tokenReceived: true,
          message: 'Access token acquired and cached successfully.',
        },
      };
    } catch (err: any) {
      console.warn(`[iSDAsoil Auth] Network error during iSDAsoil login: ${err.message || 'Unknown network error'}`);
      if (logStage) {
        logStage(
          'Authentication',
          'error',
          `Network or server error during iSDAsoil login: ${err.message || 'Unknown network error'}`
        );
      }
      console.warn('[iSDAsoil Auth] iSDAsoil authentication: FAILED\nToken available: NO\nToken expiry known: NO\nToken reused/refreshed: FAILED');
      return {
        token: null,
        authDiagnostic: {
          endpoint: authEndpoint,
          httpStatus: null,
          authentication: 'FAILED',
          tokenReceived: false,
          message: err.message || 'Network exception during login request.',
        },
      };
    }
  }
}

export const isdaTokenManager = new IsdaTokenManager();
export const tokenManager = isdaTokenManager;

/**
 * Executes an iSDAsoil service request with automatic token lifecycle management.
 * Catches HTTP 401, clears the cache, calls the login endpoint, and retries the original request exactly once.
 */
export async function withAuthRetry(
  executeRequest: (token: string) => Promise<Response>,
  logStage?: (stage: string, status: 'ok' | 'warning' | 'error' | 'info', message: string) => void
): Promise<{
  resp: Response | null;
  token: string | null;
  authDiagnostic: AuthDiagnostic;
  retried: boolean;
}> {
  // 1. Obtain a valid token (cached or fresh)
  const initialAuth = await isdaTokenManager.getValidToken(logStage);
  if (!initialAuth.token) {
    return {
      resp: null,
      token: null,
      authDiagnostic: initialAuth.authDiagnostic,
      retried: false,
    };
  }

  const usedToken = initialAuth.token;

  // 2. Execute original request
  let resp = await executeRequest(usedToken);

  // 3. Handle HTTP 401 Unauthorized
  if (resp.status === 401) {
    console.log('[iSDAsoil Auth] iSDAsoil request returned 401; invalidating cached token');
    if (logStage) {
      logStage('iSDAsoil Query', 'warning', 'API returned HTTP 401. Invalidating cached token and retrying once...');
    }

    // Invalidate cached token only if it matches the token that produced 401
    isdaTokenManager.invalidateTokenIfMatches(usedToken);

    // Re-authenticate
    const reAuth = await isdaTokenManager.getValidToken(logStage);
    if (reAuth.token) {
      console.log('[iSDAsoil Auth] iSDAsoil request retried with refreshed token');
      if (logStage) {
        logStage('iSDAsoil Query', 'info', 'iSDAsoil request retried with refreshed token.');
      }

      // Retry request ONCE
      const retryResp = await executeRequest(reAuth.token);
      if (retryResp.status === 401) {
        console.warn('[iSDAsoil Auth] iSDAsoil request retry returned HTTP 401; request unauthenticated.');
        if (logStage) {
          logStage('iSDAsoil Query', 'warning', 'iSDAsoil request retry returned HTTP 401; request unauthenticated.');
        }
      }
      return {
        resp: retryResp,
        token: reAuth.token,
        authDiagnostic: reAuth.authDiagnostic,
        retried: true,
      };
    } else {
      console.warn('[iSDAsoil Auth] iSDAsoil authentication retry skipped: token not available.');
      return {
        resp,
        token: null,
        authDiagnostic: reAuth.authDiagnostic,
        retried: true,
      };
    }
  }

  return {
    resp,
    token: usedToken,
    authDiagnostic: initialAuth.authDiagnostic,
    retried: false,
  };
}

/**
 * Creates default unavailable property descriptor adhering to SoilWise Normalised Data Contract
 */
function createUnavailableProperty(
  property: string,
  unit: string,
  reason: string,
  depth = '0-20cm',
  resolution = 30,
  analyticalMethod: string | null = null
): NormalisedSoilProperty {
  return {
    property,
    value: null,
    unit,
    depth,
    source: 'iSDAsoil',
    source_type: 'location_estimated',
    resolution_m: resolution,
    uncertainty: { lower: null, upper: null, stdev: null },
    status: 'unavailable',
    unavailability_reason: reason,
    analytical_method: analyticalMethod,
  };
}

const PROPERTY_METADATA: Record<string, { name: string; method?: string }> = {
  ph: { name: 'Soil pH', method: 'iSDAsoil digital soil prediction' },
  nitrogen_total: { name: 'Total Nitrogen', method: 'iSDAsoil digital soil prediction' },
  nitrogen: { name: 'Total Nitrogen', method: 'iSDAsoil digital soil prediction' },
  phosphorus_extractable: { name: 'Extractable Phosphorus (Mehlich-3)', method: 'iSDAsoil digital soil prediction' },
  phosphorous_extractable: { name: 'Extractable Phosphorus (Mehlich-3)', method: 'iSDAsoil digital soil prediction' },
  phosphorus: { name: 'Extractable Phosphorus (Mehlich-3)', method: 'iSDAsoil digital soil prediction' },
  potassium_extractable: { name: 'Extractable Potassium (Mehlich-3)', method: 'iSDAsoil digital soil prediction' },
  potassium: { name: 'Extractable Potassium (Mehlich-3)', method: 'iSDAsoil digital soil prediction' },
  carbon_organic: { name: 'Organic Carbon', method: 'iSDAsoil digital soil prediction' },
  organic_carbon: { name: 'Organic Carbon', method: 'iSDAsoil digital soil prediction' },
  soc: { name: 'Organic Carbon', method: 'iSDAsoil digital soil prediction' },
  carbon_total: { name: 'Total Carbon', method: 'iSDAsoil digital soil prediction' },
  calcium_extractable: { name: 'Extractable Calcium', method: 'iSDAsoil digital soil prediction' },
  calcium: { name: 'Extractable Calcium', method: 'iSDAsoil digital soil prediction' },
  magnesium_extractable: { name: 'Extractable Magnesium', method: 'iSDAsoil digital soil prediction' },
  magnesium: { name: 'Extractable Magnesium', method: 'iSDAsoil digital soil prediction' },
  iron_extractable: { name: 'Extractable Iron', method: 'iSDAsoil digital soil prediction' },
  iron: { name: 'Extractable Iron', method: 'iSDAsoil digital soil prediction' },
  zinc_extractable: { name: 'Extractable Zinc', method: 'iSDAsoil digital soil prediction' },
  zinc: { name: 'Extractable Zinc', method: 'iSDAsoil digital soil prediction' },
  sulphur_extractable: { name: 'Extractable Sulphur', method: 'iSDAsoil digital soil prediction' },
  sulfur_extractable: { name: 'Extractable Sulphur', method: 'iSDAsoil digital soil prediction' },
  sulphur: { name: 'Extractable Sulphur', method: 'iSDAsoil digital soil prediction' },
  aluminium_extractable: { name: 'Extractable Aluminium', method: 'iSDAsoil digital soil prediction' },
  bulk_density: { name: 'Bulk Density', method: 'iSDAsoil digital soil prediction' },
  stone_content: { name: 'Stone Content', method: 'iSDAsoil digital soil prediction' },
  sand_content: { name: 'Sand Content', method: 'iSDAsoil digital soil prediction' },
  sand: { name: 'Sand Content', method: 'iSDAsoil digital soil prediction' },
  silt_content: { name: 'Silt Content', method: 'iSDAsoil digital soil prediction' },
  silt: { name: 'Silt Content', method: 'iSDAsoil digital soil prediction' },
  clay_content: { name: 'Clay Content', method: 'iSDAsoil digital soil prediction' },
  clay: { name: 'Clay Content', method: 'iSDAsoil digital soil prediction' },
  texture_class: { name: 'USDA Texture Class', method: 'iSDAsoil digital soil prediction' },
  texture: { name: 'USDA Texture Class', method: 'iSDAsoil digital soil prediction' },
  cation_exchange_capacity: { name: 'Cation Exchange Capacity (CEC)', method: 'iSDAsoil digital soil prediction' },
  cec: { name: 'Cation Exchange Capacity (CEC)', method: 'iSDAsoil digital soil prediction' },
  bedrock_depth: { name: 'Depth to Bedrock', method: 'iSDAsoil digital soil prediction' },
  slope_angle: { name: 'Slope Angle', method: 'iSDAsoil digital soil prediction' },
  slope: { name: 'Slope Angle', method: 'iSDAsoil digital soil prediction' },
  fcc: { name: 'Fertility Capability Classification', method: 'iSDAsoil digital soil prediction' },
  land_cover_2015: { name: 'Land Cover (2015)', method: 'Copernicus Global Land Cover' },
  crop_cover_2015: { name: 'Crop Cover (2015)', method: 'Copernicus Global Land Cover' },
  land_cover_2016: { name: 'Land Cover (2016)', method: 'Copernicus Global Land Cover' },
  crop_cover_2016: { name: 'Crop Cover (2016)', method: 'Copernicus Global Land Cover' },
  land_cover_2017: { name: 'Land Cover (2017)', method: 'Copernicus Global Land Cover' },
  crop_cover_2017: { name: 'Crop Cover (2017)', method: 'Copernicus Global Land Cover' },
  land_cover_2018: { name: 'Land Cover (2018)', method: 'Copernicus Global Land Cover' },
  crop_cover_2018: { name: 'Crop Cover (2018)', method: 'Copernicus Global Land Cover' },
  land_cover_2019: { name: 'Land Cover (2019)', method: 'Copernicus Global Land Cover' },
  crop_cover_2019: { name: 'Crop Cover (2019)', method: 'Copernicus Global Land Cover' },
};

/**
 * Extracts all multi-depth properties from iSDAsoil payload preserving 0-20cm and 20-50cm layers,
 * confidence intervals (50%, 68%, 90%), and contextual soil attributes without fabrication.
 */
export function extractFullIsdaProfile(rawData: any): Record<string, IsdaPropertyRecord> {
  const result: Record<string, IsdaPropertyRecord> = {};
  const propertySource =
    rawData?.property ||
    rawData?.properties ||
    rawData?.data?.property ||
    rawData?.result?.property ||
    (rawData && typeof rawData === 'object' && !rawData.status && !rawData.error ? rawData : null);

  if (propertySource && typeof propertySource === 'object') {
    for (const [rawKey, value] of Object.entries(propertySource)) {
      if (rawKey === 'status' || rawKey === 'error' || rawKey === 'code' || rawKey === 'detail') continue;

      // Section 8: Normalize historical misspelled 'phosphorous_extractable' immediately to canonical 'phosphorus_extractable'
      const key = rawKey === 'phosphorous_extractable' ? 'phosphorus_extractable' : rawKey;

      const meta = PROPERTY_METADATA[key] || {
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        method: 'iSDAsoil digital soil prediction',
      };

      if (Array.isArray(value)) {
        const layers: IsdaDepthLayer[] = value.map((entry: any) => {
          const rawDepth = entry?.depth?.value !== undefined && entry?.depth?.value !== null ? String(entry.depth.value).trim() : null;
          let depthVal = rawDepth;
          let depthUnit = entry?.depth?.unit ? String(entry.depth.unit).trim() : 'cm';
          let displayDepth: string;

          if (!rawDepth || rawDepth === '0' || rawDepth.toLowerCase().includes('landscape') || rawDepth.toLowerCase().includes('surface')) {
            depthVal = 'landscape';
            depthUnit = '';
            displayDepth = 'Site & Landscape';
          } else if (rawDepth.includes('0-20') || rawDepth.includes('0–20')) {
            depthVal = '0-20';
            depthUnit = depthUnit || 'cm';
            displayDepth = `0–20 ${depthUnit}`.trim();
          } else if (rawDepth.includes('20-50') || rawDepth.includes('20–50')) {
            depthVal = '20-50';
            depthUnit = depthUnit || 'cm';
            displayDepth = `20–50 ${depthUnit}`.trim();
          } else if (rawDepth.includes('0-200') || rawDepth.includes('0–200')) {
            depthVal = '0-200';
            depthUnit = depthUnit || 'cm';
            displayDepth = `0–200 ${depthUnit}`.trim();
          } else {
            displayDepth = `${depthVal}${depthUnit ? ` ${depthUnit}` : ''}`;
          }

          const rawVal =
            typeof entry?.value === 'object' && entry?.value !== null
              ? entry.value.value
              : (entry?.value ?? entry?.mean ?? null);
          const unit =
            typeof entry?.value === 'object' && entry?.value !== null
              ? entry.value.unit
              : (entry?.unit ?? null);

          let uncertainty: IsdaDepthLayer['uncertainty'] = null;
          if (Array.isArray(entry?.uncertainty) && entry.uncertainty.length > 0) {
            const u50 = entry.uncertainty.find((u: any) => u.confidence_interval === '50%');
            const u68 = entry.uncertainty.find((u: any) => u.confidence_interval === '68%');
            const u90 = entry.uncertainty.find((u: any) => u.confidence_interval === '90%');
            const primary = u68 || entry.uncertainty[0];

            const lower = primary?.lower_bound !== undefined ? Number(primary.lower_bound) : null;
            const upper = primary?.upper_bound !== undefined ? Number(primary.upper_bound) : null;
            const stdev =
              lower !== null && upper !== null ? parseFloat(((upper - lower) / 2).toFixed(2)) : null;

            uncertainty = {
              confidence_50: u50 ? { lower: Number(u50.lower_bound), upper: Number(u50.upper_bound) } : null,
              confidence_68: u68 ? { lower: Number(u68.lower_bound), upper: Number(u68.upper_bound) } : null,
              confidence_90: u90 ? { lower: Number(u90.lower_bound), upper: Number(u90.upper_bound) } : null,
              lower,
              upper,
              stdev,
            };
          }

          return {
            depth: displayDepth,
            depthValue: depthVal || 'landscape',
            depthUnit,
            value: rawVal,
            unit,
            uncertainty,
          };
        });

        const topsoil = layers.find((l) => l.depthValue === '0-20') || null;
        const subsoil = layers.find((l) => l.depthValue === '20-50') || null;

        result[key] = {
          key,
          name: meta.name,
          layers,
          topsoilLayer: topsoil,
          subsoilLayer: subsoil,
          status: layers.length > 0 && layers.some((l) => l.value !== null) ? 'available' : 'unavailable',
          analyticalMethod: meta.method || 'iSDAsoil digital soil prediction',
        };
      }
    }
  }

  // Ensure EC is explicitly recorded with transparent zero-fabrication contract (Section 10)
  result['ec'] = {
    key: 'ec',
    name: 'Electrical Conductivity',
    layers: [],
    topsoilLayer: null,
    subsoilLayer: null,
    status: 'unavailable',
    unavailabilityReason:
      'Electrical Conductivity is not available from the iSDAsoil dataset used by SoilWise.',
  };

  return result;
}

/**
 * Normalises raw iSDAsoil API response into SoilWise Normalised Soil Profile
 */
export function normaliseIsdaSoilData(
  rawData: any,
  isCredentialsConfigured: boolean
): SoilWiseNormalisedProfile {
  const unconfiguredReason = 'iSDAsoil credentials (ISDA_USERNAME / ISDA_PASSWORD) not configured in server environment.';
  const unavailableReason = 'Property value not returned by iSDAsoil API for this coordinate.';
  const defaultReason = !isCredentialsConfigured ? unconfiguredReason : unavailableReason;

  // Helper to extract property from live iSDAsoil payload (nested in rawData.property[name][0].value.value) or flat format
  const getPropData = (propNames: string[]) => {
    for (const name of propNames) {
      const candidate =
        rawData?.property?.[name] ||
        rawData?.properties?.[name] ||
        rawData?.[name];
      if (candidate !== undefined && candidate !== null) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          const entry = candidate.find((item: any) => item?.depth?.value === '0-20') || candidate[0];
          const val = typeof entry?.value === 'object' && entry?.value !== null
            ? entry.value.value
            : (entry?.value ?? entry?.mean);
          const unit = typeof entry?.value === 'object' && entry?.value !== null
            ? entry.value.unit
            : entry?.unit;
          let lower: number | null = null;
          let upper: number | null = null;
          let stdev: number | null = null;
          if (Array.isArray(entry?.uncertainty) && entry.uncertainty.length > 0) {
            const interval = entry.uncertainty.find((u: any) => u.confidence_interval === '68%') || entry.uncertainty[0];
            if (interval) {
              lower = interval.lower_bound !== undefined ? Number(interval.lower_bound) : null;
              upper = interval.upper_bound !== undefined ? Number(interval.upper_bound) : null;
              if (lower !== null && upper !== null && typeof val === 'number') {
                stdev = parseFloat(((upper - lower) / 2).toFixed(2));
              }
            }
          }
          return { value: val, unit, lower, upper, stdev };
        } else if (typeof candidate === 'object') {
          const val = candidate.value?.value ?? candidate.value ?? candidate.mean;
          const unit = candidate.value?.unit ?? candidate.unit;
          return {
            value: val,
            unit,
            lower: candidate.lower ?? null,
            upper: candidate.upper ?? null,
            stdev: candidate.stdev ?? null,
          };
        } else {
          return { value: candidate, unit: null, lower: null, upper: null, stdev: null };
        }
      }
    }
    return null;
  };

  // 1. pH
  let phProp: NormalisedSoilProperty;
  const phExtracted = getPropData(['ph']);
  if (phExtracted && phExtracted.value !== undefined && phExtracted.value !== null) {
    const phVal = Number(phExtracted.value);
    phProp = {
      property: 'pH',
      value: !isNaN(phVal) ? parseFloat(phVal.toFixed(2)) : null,
      unit: 'pH',
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: phExtracted.lower !== null ? parseFloat(Number(phExtracted.lower).toFixed(2)) : null,
        upper: phExtracted.upper !== null ? parseFloat(Number(phExtracted.upper).toFixed(2)) : null,
        stdev: phExtracted.stdev !== null ? parseFloat(Number(phExtracted.stdev).toFixed(2)) : null,
      },
      status: !isNaN(phVal) ? 'available' : 'unavailable',
      analytical_method: 'iSDAsoil digital soil prediction',
      notes: 'Soil reaction (acidity/alkalinity) estimated at 30m resolution.',
    };
  } else {
    phProp = createUnavailableProperty('pH', 'pH', defaultReason, '0-20cm', 30, 'iSDAsoil digital soil prediction');
  }

  // 2. Total Nitrogen
  let nProp: NormalisedSoilProperty;
  const nExtracted = getPropData(['nitrogen_total', 'nitrogen']);
  if (nExtracted && nExtracted.value !== undefined && nExtracted.value !== null) {
    const origVal = Number(nExtracted.value);
    const origUnit = nExtracted.unit || 'g/kg';

    let normVal: number | null = null;
    const normUnit = '%';
    if (!isNaN(origVal)) {
      if (origUnit.toLowerCase().includes('mg/kg') || origUnit.toLowerCase().includes('ppm')) {
        normVal = parseFloat((origVal / 10000).toFixed(4));
      } else {
        normVal = parseFloat((origVal / 10).toFixed(3));
      }
    }

    nProp = {
      property: 'Total Nitrogen',
      value: !isNaN(origVal) ? parseFloat(origVal.toFixed(2)) : null,
      unit: origUnit,
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: nExtracted.lower !== null ? parseFloat(Number(nExtracted.lower).toFixed(2)) : null,
        upper: nExtracted.upper !== null ? parseFloat(Number(nExtracted.upper).toFixed(2)) : null,
        stdev: nExtracted.stdev !== null ? parseFloat(Number(nExtracted.stdev).toFixed(2)) : null,
      },
      status: !isNaN(origVal) ? 'available' : 'unavailable',
      original_value: !isNaN(origVal) ? parseFloat(origVal.toFixed(2)) : null,
      original_unit: origUnit,
      normalised_value: normVal,
      normalised_unit: normUnit,
      analytical_method: 'iSDAsoil digital soil prediction',
      notes: `Original unit: ${origUnit}. Normalised unit: ${normUnit} (${normVal}%).`,
    };
  } else {
    nProp = createUnavailableProperty(
      'Total Nitrogen',
      'g/kg',
      defaultReason,
      '0-20cm',
      30,
      'iSDAsoil digital soil prediction'
    );
    nProp.original_unit = 'g/kg';
    nProp.normalised_unit = '%';
  }

  // 3. Extractable Phosphorus (supports phosphorus_extractable and phosphorous_extractable)
  let pProp: NormalisedSoilProperty;
  const pExtracted = getPropData(['phosphorus_extractable', 'phosphorous_extractable', 'phosphorus']);
  if (pExtracted && pExtracted.value !== undefined && pExtracted.value !== null) {
    const pVal = Number(pExtracted.value);
    const pUnit = pExtracted.unit || 'mg/kg';
    pProp = {
      property: 'Extractable Phosphorus',
      value: !isNaN(pVal) ? parseFloat(pVal.toFixed(2)) : null,
      unit: pUnit,
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: pExtracted.lower !== null ? parseFloat(Number(pExtracted.lower).toFixed(2)) : null,
        upper: pExtracted.upper !== null ? parseFloat(Number(pExtracted.upper).toFixed(2)) : null,
        stdev: pExtracted.stdev !== null ? parseFloat(Number(pExtracted.stdev).toFixed(2)) : null,
      },
      status: !isNaN(pVal) ? 'available' : 'unavailable',
      original_value: !isNaN(pVal) ? parseFloat(pVal.toFixed(2)) : null,
      original_unit: pUnit,
      normalised_value: !isNaN(pVal) ? parseFloat(pVal.toFixed(2)) : null,
      normalised_unit: 'mg/kg (ppm)',
      analytical_method: 'iSDAsoil digital soil prediction',
      notes: 'Mehlich-3 extractable P. Location-derived estimate.',
    };
  } else {
    pProp = createUnavailableProperty(
      'Extractable Phosphorus',
      'mg/kg',
      defaultReason,
      '0-20cm',
      30,
      'iSDAsoil digital soil prediction'
    );
  }

  // 4. Extractable Potassium
  let kProp: NormalisedSoilProperty;
  const kExtracted = getPropData(['potassium_extractable', 'potassium']);
  if (kExtracted && kExtracted.value !== undefined && kExtracted.value !== null) {
    const kVal = Number(kExtracted.value);
    const kUnit = kExtracted.unit || 'mg/kg';
    kProp = {
      property: 'Extractable Potassium',
      value: !isNaN(kVal) ? parseFloat(kVal.toFixed(2)) : null,
      unit: kUnit,
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: kExtracted.lower !== null ? parseFloat(Number(kExtracted.lower).toFixed(2)) : null,
        upper: kExtracted.upper !== null ? parseFloat(Number(kExtracted.upper).toFixed(2)) : null,
        stdev: kExtracted.stdev !== null ? parseFloat(Number(kExtracted.stdev).toFixed(2)) : null,
      },
      status: !isNaN(kVal) ? 'available' : 'unavailable',
      original_value: !isNaN(kVal) ? parseFloat(kVal.toFixed(2)) : null,
      original_unit: kUnit,
      normalised_value: !isNaN(kVal) ? parseFloat(kVal.toFixed(2)) : null,
      normalised_unit: 'mg/kg (ppm)',
      analytical_method: 'iSDAsoil digital soil prediction',
      notes: 'Mehlich-3 extractable K. Location-derived estimate.',
    };
  } else {
    kProp = createUnavailableProperty(
      'Extractable Potassium',
      'mg/kg',
      defaultReason,
      '0-20cm',
      30,
      'iSDAsoil digital soil prediction'
    );
  }

  // 5. Sand Content
  let sandProp: NormalisedSoilProperty;
  const sandExtracted = getPropData(['sand_content', 'sand']);
  if (sandExtracted && sandExtracted.value !== undefined && sandExtracted.value !== null) {
    const sandVal = Number(sandExtracted.value);
    sandProp = {
      property: 'Sand Content',
      value: !isNaN(sandVal) ? parseFloat(sandVal.toFixed(1)) : null,
      unit: '%',
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: sandExtracted.lower !== null ? parseFloat(Number(sandExtracted.lower).toFixed(1)) : null,
        upper: sandExtracted.upper !== null ? parseFloat(Number(sandExtracted.upper).toFixed(1)) : null,
        stdev: sandExtracted.stdev !== null ? parseFloat(Number(sandExtracted.stdev).toFixed(1)) : null,
      },
      status: !isNaN(sandVal) ? 'available' : 'unavailable',
      analytical_method: 'iSDAsoil digital soil prediction',
    };
  } else {
    sandProp = createUnavailableProperty('Sand Content', '%', defaultReason);
  }

  // 6. Silt Content
  let siltProp: NormalisedSoilProperty;
  const siltExtracted = getPropData(['silt_content', 'silt']);
  if (siltExtracted && siltExtracted.value !== undefined && siltExtracted.value !== null) {
    const siltVal = Number(siltExtracted.value);
    siltProp = {
      property: 'Silt Content',
      value: !isNaN(siltVal) ? parseFloat(siltVal.toFixed(1)) : null,
      unit: '%',
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: siltExtracted.lower !== null ? parseFloat(Number(siltExtracted.lower).toFixed(1)) : null,
        upper: siltExtracted.upper !== null ? parseFloat(Number(siltExtracted.upper).toFixed(1)) : null,
        stdev: siltExtracted.stdev !== null ? parseFloat(Number(siltExtracted.stdev).toFixed(1)) : null,
      },
      status: !isNaN(siltVal) ? 'available' : 'unavailable',
      analytical_method: 'iSDAsoil digital soil prediction',
    };
  } else {
    siltProp = createUnavailableProperty('Silt Content', '%', defaultReason);
  }

  // 7. Clay Content
  let clayProp: NormalisedSoilProperty;
  const clayExtracted = getPropData(['clay_content', 'clay']);
  if (clayExtracted && clayExtracted.value !== undefined && clayExtracted.value !== null) {
    const clayVal = Number(clayExtracted.value);
    clayProp = {
      property: 'Clay Content',
      value: !isNaN(clayVal) ? parseFloat(clayVal.toFixed(1)) : null,
      unit: '%',
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: {
        lower: clayExtracted.lower !== null ? parseFloat(Number(clayExtracted.lower).toFixed(1)) : null,
        upper: clayExtracted.upper !== null ? parseFloat(Number(clayExtracted.upper).toFixed(1)) : null,
        stdev: clayExtracted.stdev !== null ? parseFloat(Number(clayExtracted.stdev).toFixed(1)) : null,
      },
      status: !isNaN(clayVal) ? 'available' : 'unavailable',
      analytical_method: 'iSDAsoil digital soil prediction',
    };
  } else {
    clayProp = createUnavailableProperty('Clay Content', '%', defaultReason);
  }

  // 8. USDA Texture Class
  let textureClassProp: NormalisedSoilProperty;
  const tcExtracted = getPropData(['texture_class', 'texture']);
  if (tcExtracted && tcExtracted.value !== undefined && tcExtracted.value !== null) {
    const tcVal = String(tcExtracted.value);
    textureClassProp = {
      property: 'USDA Texture Class',
      value: tcVal,
      unit: 'textural class',
      depth: '0-20cm',
      source: 'iSDAsoil',
      source_type: 'location_estimated',
      resolution_m: 30,
      uncertainty: { lower: null, upper: null },
      status: 'available',
      analytical_method: 'iSDAsoil digital soil prediction',
    };
  } else {
    textureClassProp = createUnavailableProperty('USDA Texture Class', 'textural class', defaultReason);
  }

  // 9. Electrical Conductivity (EC) — Requirement 8, 9 & 10: Strictly unavailable. Never calculated.
  const ecProp: NormalisedSoilProperty = {
    property: 'EC',
    value: null,
    unit: 'dS/m',
    depth: '0-20cm',
    source: 'iSDAsoil',
    source_type: 'location_estimated',
    resolution_m: 30,
    uncertainty: { lower: null, upper: null },
    status: 'unavailable',
    unavailability_reason:
      'Electrical Conductivity is not available from the iSDAsoil dataset used by SoilWise.',
    notes: 'EC unavailable from iSDAsoil. Never estimated from other properties.',
  };

  const availableCount = [phProp, nProp, pProp, kProp, sandProp, siltProp, clayProp].filter(
    (p) => p.status === 'available'
  ).length;

  let overall_status: SoilWiseNormalisedProfile['overall_status'] = 'unavailable';
  if (availableCount === 7) overall_status = 'available';
  else if (availableCount > 0) overall_status = 'partially_available';

  return {
    ph: phProp,
    nitrogen_total: nProp,
    phosphorus_extractable: pProp,
    potassium_extractable: kProp,
    sand_content: sandProp,
    silt_content: siltProp,
    clay_content: clayProp,
    texture_class: textureClassProp,
    ec: ecProp,
    overall_status,
    depth: '0-20cm',
    source: 'iSDAsoil',
    source_type: 'location_estimated',
    spatial_resolution: '30m',
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Main function: Fetch location soil data from iSDAsoil API.
 * Follows strict on-demand lifecycle:
 * 1. Check or obtain valid token from POST https://api.isda-africa.com/login
 * 2. GET https://api.isda-africa.com/isdasoil/v2/soilproperty?lat=<lat>&lon=<lon>
 * 3. If HTTP 401: invalidate token, authenticate again, and retry once.
 * 4. Never calls /layers.
 * 5. Returns actual raw response, classification, and diagnostic summary.
 */
export async function fetchIsdaSoilData(
  latitude: number,
  longitude: number
): Promise<IsdaSoilServiceResponse> {
  const diagnostics: IsdaSoilServiceResponse['diagnostics'] = [];

  const logStage = (
    stage: string,
    status: 'ok' | 'warning' | 'error' | 'info',
    message: string
  ) => {
    diagnostics.push({
      timestamp: new Date().toISOString(),
      stage,
      status,
      message,
    });
  };

  const soilPropertyEndpoint = 'https://api.isda-africa.com/isdasoil/v2/soilproperty';

  // Section 5: Verify latitude and longitude
  const isInvalidCoords =
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180;

  console.log(`iSDAsoil coordinates:\nlatitude: ${latitude}\nlongitude: ${longitude}`);

  if (isInvalidCoords) {
    const errorMsg = 'Latitude and longitude must be valid numeric coordinates within valid geographic bounds.';
    logStage('Coordinates Validation', 'error', errorMsg);
    const tokenInfo = isdaTokenManager.getCacheMetadata();
    const normalised = normaliseIsdaSoilData(null, tokenInfo.credentialsConfigured);
    const fullProfile = extractFullIsdaProfile(null);

    return {
      success: false,
      classification: 'INVALID_COORDINATES',
      classificationMessage: errorMsg,
      raw: { status: 'invalid_coordinates', error: errorMsg },
      authDiagnostic: {
        endpoint: 'https://api.isda-africa.com/login',
        httpStatus: null,
        authentication: 'SKIPPED',
        tokenReceived: false,
        message: errorMsg,
      },
      soilPropertyDiagnostic: {
        endpoint: soilPropertyEndpoint,
        httpStatus: null,
        responseReceived: false,
        message: errorMsg,
      },
      normalised,
      fullProfile,
      tokenInfo,
      diagnosticSummary: {
        authentication: {
          credentialsLoaded: tokenInfo.credentialsConfigured,
          authSuccessful: false,
          tokenObtained: false,
          details: 'Skipped due to invalid coordinates',
        },
        soilRequest: {
          endpointReachable: false,
          requestAuthenticated: false,
          coordinatesAccepted: false,
          soilProfileReturned: false,
          httpStatus: null,
        },
        response: {
          jsonReceived: false,
          propertiesDetected: false,
          parsedSuccessfully: false,
          detectedPropertiesCount: 0,
        },
        profile: {
          phAvailable: false,
          nitrogenAvailable: false,
          phosphorusAvailable: false,
          potassiumAvailable: false,
          textureAvailable: false,
          additionalPropertiesAvailable: false,
          ecStatus: 'unavailable',
          availablePropertiesCount: 0,
        },
      },
      diagnostics,
    };
  }

  logStage('Initialisation', 'info', `Target coordinates: lat=${latitude}, lon=${longitude}`);

  // Helper to query /isdasoil/v2/soilproperty with the supplied bearer token
  const querySoilProperty = async (bearerToken: string) => {
    const apiUrl = new URL(soilPropertyEndpoint);
    apiUrl.searchParams.set('lat', String(latitude));
    apiUrl.searchParams.set('lon', String(longitude));
    // Omitting depth returns all available depth increments (0-20cm and 20-50cm) in a single request

    logStage('iSDAsoil Query', 'info', `Executing GET ${apiUrl.toString()}`);
    console.log('Soil request: START');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`Soil request status: ${resp.status}`);
    console.log(`Soil request response received: ${resp.ok ? 'YES' : 'NO'}`);
    return resp;
  };

  try {
    const { resp, token, authDiagnostic } = await withAuthRetry(querySoilProperty, logStage);
    const tokenInfo = isdaTokenManager.getCacheMetadata();

    // Case 1: Authentication failure (no token returned)
    if (!token) {
      const authFailedMsg = 'iSDAsoil authentication failed. Please check the server-side API credentials and authentication response.';
      logStage('iSDAsoil Query', 'warning', 'Skipping live HTTP request to iSDAsoil because authentication failed.');
      const normalised = normaliseIsdaSoilData(null, tokenInfo.credentialsConfigured);
      const fullProfile = extractFullIsdaProfile(null);

      return {
        success: false,
        classification: 'AUTHENTICATION_FAILED',
        classificationMessage: authFailedMsg,
        raw: {
          status: 'unavailable',
          error: authFailedMsg,
          endpoint: soilPropertyEndpoint,
        },
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus: null,
          responseReceived: false,
          message: 'Request skipped due to missing/invalid token.',
        },
        normalised,
        fullProfile,
        tokenInfo,
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: false,
            tokenObtained: false,
            details: authDiagnostic.message || authFailedMsg,
          },
          soilRequest: {
            endpointReachable: false,
            requestAuthenticated: false,
            coordinatesAccepted: true,
            soilProfileReturned: false,
            httpStatus: null,
          },
          response: {
            jsonReceived: false,
            propertiesDetected: false,
            parsedSuccessfully: false,
            detectedPropertiesCount: 0,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    if (!resp) {
      const errMessage = 'iSDAsoil authentication succeeded, but the soil profile request failed.';
      logStage('iSDAsoil Query', 'error', errMessage);
      const normalised = normaliseIsdaSoilData(null, true);
      const fullProfile = extractFullIsdaProfile(null);

      return {
        success: false,
        classification: 'AUTHENTICATION_SUCCESS_SOIL_REQUEST_FAILED',
        classificationMessage: errMessage,
        raw: { status: 'error', error: errMessage },
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus: null,
          responseReceived: false,
          message: errMessage,
        },
        normalised,
        fullProfile,
        tokenInfo,
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: true,
            tokenObtained: true,
            details: 'Access token acquired',
          },
          soilRequest: {
            endpointReachable: false,
            requestAuthenticated: true,
            coordinatesAccepted: true,
            soilProfileReturned: false,
            httpStatus: null,
          },
          response: {
            jsonReceived: false,
            propertiesDetected: false,
            parsedSuccessfully: false,
            detectedPropertiesCount: 0,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    const httpStatus = resp.status;

    // Case 2: HTTP error returned by /isdasoil/v2/soilproperty
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      const isParamError = httpStatus === 400 || httpStatus === 422;
      const classification: IsdaClassification = isParamError
        ? 'INVALID_REQUEST_PARAMETERS'
        : 'AUTHENTICATION_SUCCESS_SOIL_REQUEST_FAILED';
      const classificationMessage = isParamError
        ? 'Invalid request parameters sent to iSDAsoil API.'
        : 'iSDAsoil authentication succeeded, but the soil profile request failed.';

      logStage(
        'iSDAsoil Query',
        'error',
        `iSDAsoil API responded with HTTP ${httpStatus}: ${errText.substring(0, 200) || resp.statusText}`
      );
      const normalised = normaliseIsdaSoilData(null, true);
      const fullProfile = extractFullIsdaProfile(null);

      return {
        success: false,
        classification,
        classificationMessage,
        raw: { status: 'error', code: httpStatus, response: errText || resp.statusText },
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus,
          responseReceived: false,
          message: `HTTP ${httpStatus}: ${errText.substring(0, 150) || resp.statusText}`,
        },
        normalised,
        fullProfile,
        tokenInfo: isdaTokenManager.getCacheMetadata(),
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: true,
            tokenObtained: true,
            details: 'Access token acquired',
          },
          soilRequest: {
            endpointReachable: true,
            requestAuthenticated: true,
            coordinatesAccepted: !isParamError,
            soilProfileReturned: false,
            httpStatus,
          },
          response: {
            jsonReceived: false,
            propertiesDetected: false,
            parsedSuccessfully: false,
            detectedPropertiesCount: 0,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    // Case 3: HTTP 200 - Parse JSON
    let rawData: any = null;
    try {
      rawData = await resp.json();
    } catch (parseErr: any) {
      const parseFailMsg = 'iSDAsoil returned a response, but the data structure could not be parsed.';
      logStage('Response Parsing', 'error', parseFailMsg);
      const normalised = normaliseIsdaSoilData(null, true);
      const fullProfile = extractFullIsdaProfile(null);

      return {
        success: false,
        classification: 'SOIL_DATA_RETURNED_BUT_NOT_PARSED',
        classificationMessage: parseFailMsg,
        raw: { status: 'parse_error', error: parseErr.message },
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus: 200,
          responseReceived: true,
          message: parseFailMsg,
        },
        normalised,
        fullProfile,
        tokenInfo: isdaTokenManager.getCacheMetadata(),
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: true,
            tokenObtained: true,
            details: 'Access token active',
          },
          soilRequest: {
            endpointReachable: true,
            requestAuthenticated: true,
            coordinatesAccepted: true,
            soilProfileReturned: true,
            httpStatus: 200,
          },
          response: {
            jsonReceived: false,
            propertiesDetected: false,
            parsedSuccessfully: false,
            detectedPropertiesCount: 0,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    logStage('iSDAsoil Query', 'ok', 'Successfully received raw soil property payload from iSDAsoil (HTTP 200).');

    // Case 4: Inspect properties inside raw response
    const propertyObj = rawData?.property || rawData?.properties;
    const propertyKeys = propertyObj && typeof propertyObj === 'object' ? Object.keys(propertyObj) : [];

    if (propertyKeys.length === 0) {
      const noDataMsg = 'iSDAsoil responded successfully, but no soil profile data was returned for this location.';
      logStage('Soil Properties Detection', 'warning', noDataMsg);
      const normalised = normaliseIsdaSoilData(rawData, true);
      const fullProfile = extractFullIsdaProfile(rawData);

      return {
        success: false,
        classification: 'NO_SOIL_DATA_RETURNED',
        classificationMessage: noDataMsg,
        raw: rawData,
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus: 200,
          responseReceived: true,
          message: noDataMsg,
        },
        normalised,
        fullProfile,
        tokenInfo: isdaTokenManager.getCacheMetadata(),
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: true,
            tokenObtained: true,
            details: 'Access token active',
          },
          soilRequest: {
            endpointReachable: true,
            requestAuthenticated: true,
            coordinatesAccepted: true,
            soilProfileReturned: true,
            httpStatus: 200,
          },
          response: {
            jsonReceived: true,
            propertiesDetected: false,
            parsedSuccessfully: true,
            detectedPropertiesCount: 0,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    // Case 5: Normalisation & multi-depth mapping
    logStage('Normalisation', 'info', `Applying SoilWise normalisation layer to ${propertyKeys.length} returned iSDAsoil properties.`);
    const normalised = normaliseIsdaSoilData(rawData, true);
    const fullProfile = extractFullIsdaProfile(rawData);

    const availablePropertiesCount = Object.values(fullProfile).filter((p) => p.status === 'available').length;

    if (availablePropertiesCount === 0 || normalised.overall_status === 'unavailable') {
      const mappingFailMsg = 'iSDAsoil returned a response, but SoilWise could not map the returned soil properties into the SoilWise schema.';
      logStage('Normalisation', 'error', mappingFailMsg);

      return {
        success: false,
        classification: 'SOIL_DATA_RETURNED_BUT_MAPPING_FAILED',
        classificationMessage: mappingFailMsg,
        raw: rawData,
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus: 200,
          responseReceived: true,
          message: mappingFailMsg,
        },
        normalised,
        fullProfile,
        tokenInfo: isdaTokenManager.getCacheMetadata(),
        diagnosticSummary: {
          authentication: {
            credentialsLoaded: tokenInfo.credentialsConfigured,
            authSuccessful: true,
            tokenObtained: true,
            details: 'Access token active',
          },
          soilRequest: {
            endpointReachable: true,
            requestAuthenticated: true,
            coordinatesAccepted: true,
            soilProfileReturned: true,
            httpStatus: 200,
          },
          response: {
            jsonReceived: true,
            propertiesDetected: true,
            parsedSuccessfully: false,
            detectedPropertiesCount: propertyKeys.length,
          },
          profile: {
            phAvailable: false,
            nitrogenAvailable: false,
            phosphorusAvailable: false,
            potassiumAvailable: false,
            textureAvailable: false,
            additionalPropertiesAvailable: false,
            ecStatus: 'unavailable',
            availablePropertiesCount: 0,
          },
        },
        diagnostics,
      };
    }

    // Case 6: SUCCESS
    logStage('Normalisation', 'ok', `Normalised soil profile ready (overall_status: ${normalised.overall_status}, ${availablePropertiesCount} properties mapped).`);

    return {
      success: true,
      classification: 'SUCCESS',
      classificationMessage: 'Soil profile successfully retrieved and mapped.',
      raw: rawData,
      authDiagnostic,
      soilPropertyDiagnostic: {
        endpoint: soilPropertyEndpoint,
        httpStatus: 200,
        responseReceived: true,
        message: 'Raw soilproperty response successfully retrieved.',
      },
      normalised,
      fullProfile,
      tokenInfo: isdaTokenManager.getCacheMetadata(),
      diagnosticSummary: {
        authentication: {
          credentialsLoaded: tokenInfo.credentialsConfigured,
          authSuccessful: true,
          tokenObtained: true,
          details: 'Access token active and cached',
        },
        soilRequest: {
          endpointReachable: true,
          requestAuthenticated: true,
          coordinatesAccepted: true,
          soilProfileReturned: true,
          httpStatus: 200,
        },
        response: {
          jsonReceived: true,
          propertiesDetected: true,
          parsedSuccessfully: true,
          detectedPropertiesCount: propertyKeys.length,
        },
        profile: {
          phAvailable: normalised.ph.status === 'available',
          nitrogenAvailable: normalised.nitrogen_total.status === 'available',
          phosphorusAvailable: normalised.phosphorus_extractable.status === 'available',
          potassiumAvailable: normalised.potassium_extractable.status === 'available',
          textureAvailable: normalised.texture_class.status === 'available' || normalised.sand_content.status === 'available',
          additionalPropertiesAvailable: Object.keys(fullProfile).length > 8,
          ecStatus: 'unavailable',
          availablePropertiesCount,
        },
      },
      diagnostics,
    };
  } catch (err: any) {
    const catchMsg = err.message || 'Unknown network error';
    logStage('iSDAsoil Query', 'error', `Network or fetch failure: ${catchMsg}`);
    const tokenInfo = isdaTokenManager.getCacheMetadata();
    const normalised = normaliseIsdaSoilData(null, true);
    const fullProfile = extractFullIsdaProfile(null);

    return {
      success: false,
      classification: 'AUTHENTICATION_SUCCESS_SOIL_REQUEST_FAILED',
      classificationMessage: `Network exception during soilprofile request: ${catchMsg}`,
      raw: { status: 'error', error: catchMsg },
      authDiagnostic: {
        endpoint: 'https://api.isda-africa.com/login',
        httpStatus: null,
        authentication: 'FAILED',
        tokenReceived: false,
        message: catchMsg,
      },
      soilPropertyDiagnostic: {
        endpoint: soilPropertyEndpoint,
        httpStatus: null,
        responseReceived: false,
        message: catchMsg,
      },
      normalised,
      fullProfile,
      tokenInfo,
      diagnosticSummary: {
        authentication: {
          credentialsLoaded: tokenInfo.credentialsConfigured,
          authSuccessful: false,
          tokenObtained: false,
          details: catchMsg,
        },
        soilRequest: {
          endpointReachable: false,
          requestAuthenticated: false,
          coordinatesAccepted: true,
          soilProfileReturned: false,
          httpStatus: null,
        },
        response: {
          jsonReceived: false,
          propertiesDetected: false,
          parsedSuccessfully: false,
          detectedPropertiesCount: 0,
        },
        profile: {
          phAvailable: false,
          nitrogenAvailable: false,
          phosphorusAvailable: false,
          potassiumAvailable: false,
          textureAvailable: false,
          additionalPropertiesAvailable: false,
          ecStatus: 'unavailable',
          availablePropertiesCount: 0,
        },
      },
      diagnostics,
    };
  }
}

/**
 * Canonical mapping between iSDAsoil normalised profile and SoilWise recommendation soil data input.
 * Adheres strictly to Section 16 of the architecture:
 * - Preserves actual iSDAsoil property values (or null if unavailable)
 * - Preserves provenance as 'location_estimated'
 * - EC is strictly null and 'unavailable' (zero fabrication)
 */
export function mapIsdaSoilToRecommendationSoilData(isdaResponse: IsdaSoilServiceResponse): SoilData {
  const norm = isdaResponse.normalised;
  return {
    ph: typeof norm.ph.value === 'number' ? norm.ph.value : null,
    nitrogen: typeof norm.nitrogen_total.value === 'number' ? norm.nitrogen_total.value : null,
    phosphorus: typeof norm.phosphorus_extractable.value === 'number' ? norm.phosphorus_extractable.value : null,
    potassium: typeof norm.potassium_extractable.value === 'number' ? norm.potassium_extractable.value : null,
    ec: null,
    ecStatus: 'unavailable',
  };
}
