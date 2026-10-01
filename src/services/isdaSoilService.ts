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

export interface IsdaSoilServiceResponse {
  success: boolean;
  raw: any;
  authDiagnostic: AuthDiagnostic;
  soilPropertyDiagnostic: SoilPropertyDiagnostic;
  normalised: SoilWiseNormalisedProfile;
  tokenInfo: TokenCacheMetadata;
  diagnostics: {
    timestamp: string;
    stage: string;
    status: 'ok' | 'warning' | 'error' | 'info';
    message: string;
  }[];
}

// In-memory token cache (strictly server-side, never exposed to browser)
class IsdaTokenManager {
  private token: string | null = null;
  private tokenCreatedAt: number | null = null;
  private tokenExpiresAt: number | null = null;
  private cacheHitsCount = 0;
  private authCallsCount = 0;

  public getCacheMetadata(): TokenCacheMetadata {
    const username = typeof process !== 'undefined' ? process.env?.ISDA_USERNAME : undefined;
    const password = typeof process !== 'undefined' ? (process.env?.ISDA_PASSWORD || process.env?.ISDaa_PASSWORD) : undefined;
    const hasUsername = Boolean(username && username.trim().length > 0);
    const hasPassword = Boolean(password && password.trim().length > 0);
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
    const isExpired = !this.token || !this.tokenExpiresAt || now >= this.tokenExpiresAt;
    const expiresInSeconds =
      this.tokenExpiresAt && !isExpired
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
      usernameMasked: null,
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
  }

  /**
   * Performs authentication on-demand against https://api.isda-africa.com/login
   * Uses application/x-www-form-urlencoded with required form fields.
   */
  public async getValidToken(
    logStage: (stage: string, status: 'ok' | 'warning' | 'error' | 'info', message: string) => void
  ): Promise<{ token: string | null; authDiagnostic: AuthDiagnostic }> {
    const username = typeof process !== 'undefined' ? process.env?.ISDA_USERNAME : undefined;
    const password = typeof process !== 'undefined' ? (process.env?.ISDA_PASSWORD || process.env?.ISDaa_PASSWORD) : undefined;
    const authEndpoint = 'https://api.isda-africa.com/login';

    const hasUsername = Boolean(username && username.trim().length > 0);
    const hasPassword = Boolean(password && password.trim().length > 0);

    // Safe debugging diagnostics (NEVER log password or full credentials)
    console.log('[iSDAsoil Auth Debug] Endpoint:', authEndpoint);
    console.log('[iSDAsoil Auth Debug] Username configured:', hasUsername ? 'YES' : 'NO');
    console.log('[iSDAsoil Auth Debug] Password configured:', hasPassword ? 'YES' : 'NO');

    if (!hasUsername || !hasPassword) {
      logStage(
        'Authentication',
        'warning',
        'ISDA_USERNAME and/or ISDA_PASSWORD are not configured in server environment. Cannot authenticate against live iSDAsoil API.'
      );
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

    const now = Date.now();
    // Use cached token if valid and has at least 3 minutes remaining
    if (this.token && this.tokenExpiresAt && this.tokenExpiresAt - now > 3 * 60 * 1000) {
      this.cacheHitsCount++;
      const remainingSec = Math.floor((this.tokenExpiresAt - now) / 1000);
      logStage(
        'Token Verification',
        'ok',
        `Reusing valid cached iSDAsoil JWT token (Cache hit #${this.cacheHitsCount}). Expires in ${remainingSec}s.`
      );
      return {
        token: this.token,
        authDiagnostic: {
          endpoint: authEndpoint,
          httpStatus: 200,
          authentication: 'SUCCESS',
          tokenReceived: true,
          message: `Cached token active (${remainingSec}s remaining).`,
        },
      };
    }

    logStage('Authentication', 'info', `Requesting JWT token from ${authEndpoint}...`);

    try {
      this.authCallsCount++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Verified working request specification:
      // POST https://api.isda-africa.com/login
      // Content-Type: application/x-www-form-urlencoded
      // Body: grant_type=password&username=USERNAME&password=PASSWORD&scope=&client_id=string&client_secret=string
      const formParams = new URLSearchParams();
      formParams.append('grant_type', 'password');
      formParams.append('username', username as string);
      formParams.append('password', password as string);
      formParams.append('scope', process.env?.ISDA_SCOPE || '');
      formParams.append('client_id', process.env?.ISDA_CLIENT_ID || 'string');
      formParams.append('client_secret', process.env?.ISDA_CLIENT_SECRET || 'string');

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
        logStage(
          'Authentication',
          'error',
          `iSDAsoil authentication failed with HTTP ${httpStatus}: ${errorText.substring(0, 150) || resp.statusText}`
        );
        this.token = null;
        this.tokenExpiresAt = null;
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
        logStage(
          'Authentication',
          'error',
          'iSDAsoil login endpoint returned HTTP 200, but no access_token found in response.'
        );
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

      // Store in memory (expires in ~55 mins, iSDA tokens standard validity is 1 hour)
      this.token = accessToken;
      this.tokenCreatedAt = now;
      const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 55 * 60;
      this.tokenExpiresAt = now + expiresInSec * 1000;

      logStage(
        'Authentication',
        'ok',
        `iSDAsoil authentication SUCCESS (HTTP 200). Token received and cached (${expiresInSec}s).`
      );

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
      logStage(
        'Authentication',
        'error',
        `Network or server error during iSDAsoil login: ${err.message || 'Unknown network error'}`
      );
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

export const tokenManager = new IsdaTokenManager();

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
          const entry = candidate[0];
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
      analytical_method: '1:5 H2O suspension prediction',
      notes: 'Soil reaction (acidity/alkalinity) estimated at 30m resolution.',
    };
  } else {
    phProp = createUnavailableProperty('pH', 'pH', defaultReason, '0-20cm', 30, '1:5 H2O suspension');
  }

  // 2. Total Nitrogen
  let nProp: NormalisedSoilProperty;
  const nExtracted = getPropData(['nitrogen_total']);
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
      analytical_method: 'Total Nitrogen (Dumas dry combustion equivalent prediction)',
      notes: `Original unit: ${origUnit}. Normalised unit: ${normUnit} (${normVal}%).`,
    };
  } else {
    nProp = createUnavailableProperty(
      'Total Nitrogen',
      'g/kg',
      defaultReason,
      '0-20cm',
      30,
      'Total Nitrogen (Dumas dry combustion equivalent)'
    );
    nProp.original_unit = 'g/kg';
    nProp.normalised_unit = '%';
  }

  // 3. Extractable Phosphorus (supports phosphorus_extractable and phosphorous_extractable)
  let pProp: NormalisedSoilProperty;
  const pExtracted = getPropData(['phosphorous_extractable', 'phosphorus_extractable']);
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
      analytical_method: 'Mehlich-3 extraction prediction',
      notes: 'Mehlich-3 extractable P. Location-derived estimate.',
    };
  } else {
    pProp = createUnavailableProperty(
      'Extractable Phosphorus',
      'mg/kg',
      defaultReason,
      '0-20cm',
      30,
      'Mehlich-3 extraction prediction'
    );
  }

  // 4. Extractable Potassium
  let kProp: NormalisedSoilProperty;
  const kExtracted = getPropData(['potassium_extractable']);
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
      analytical_method: 'Mehlich-3 extraction prediction',
      notes: 'Mehlich-3 extractable K. Location-derived estimate.',
    };
  } else {
    kProp = createUnavailableProperty(
      'Extractable Potassium',
      'mg/kg',
      defaultReason,
      '0-20cm',
      30,
      'Mehlich-3 extraction prediction'
    );
  }

  // 5. Sand Content
  let sandProp: NormalisedSoilProperty;
  const sandExtracted = getPropData(['sand_content']);
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
      analytical_method: 'Laser diffraction / Pipette method equivalent prediction',
    };
  } else {
    sandProp = createUnavailableProperty('Sand Content', '%', defaultReason);
  }

  // 6. Silt Content
  let siltProp: NormalisedSoilProperty;
  const siltExtracted = getPropData(['silt_content']);
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
      analytical_method: 'Laser diffraction / Pipette method equivalent prediction',
    };
  } else {
    siltProp = createUnavailableProperty('Silt Content', '%', defaultReason);
  }

  // 7. Clay Content
  let clayProp: NormalisedSoilProperty;
  const clayExtracted = getPropData(['clay_content']);
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
      analytical_method: 'Laser diffraction / Pipette method equivalent prediction',
    };
  } else {
    clayProp = createUnavailableProperty('Clay Content', '%', defaultReason);
  }

  // 8. USDA Texture Class
  let textureClassProp: NormalisedSoilProperty;
  const tcExtracted = getPropData(['texture_class']);
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
      analytical_method: 'USDA 12-class textural classification',
    };
  } else {
    textureClassProp = createUnavailableProperty('USDA Texture Class', 'textural class', defaultReason);
  }

  // 9. Electrical Conductivity (EC) — Requirement 8: Strictly unavailable. Never calculated.
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
      'Electrical Conductivity (EC) is not measured or exposed by the iSDAsoil API v2 dataset. SoilWise policy strictly prohibits estimating or fabricating EC from pH or texture proxies.',
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
 * 2. GET https://api.isda-africa.com/isdasoil/v2/soilproperty
 * 3. If HTTP 401: invalidate token, authenticate again, and retry once.
 * 4. Never calls /layers.
 * 5. Returns actual raw response.
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

  logStage('Initialisation', 'info', `Target coordinates: lat=${latitude}, lon=${longitude}`);

  // Step 1: Token retrieval
  const { token, authDiagnostic } = await tokenManager.getValidToken(logStage);
  const tokenInfo = tokenManager.getCacheMetadata();

  const soilPropertyEndpoint = 'https://api.isda-africa.com/isdasoil/v2/soilproperty';

  if (!token) {
    logStage(
      'iSDAsoil Query',
      'warning',
      'Skipping live HTTP request to iSDAsoil because no authentication token is available.'
    );
    const normalised = normaliseIsdaSoilData(null, tokenInfo.credentialsConfigured);
    return {
      success: false,
      raw: {
        status: 'unavailable',
        error: 'Authentication credentials not configured or failed.',
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
      tokenInfo,
      diagnostics,
    };
  }

  // Helper to query /isdasoil/v2/soilproperty
  const querySoilProperty = async (bearerToken: string) => {
    const apiUrl = new URL(soilPropertyEndpoint);
    apiUrl.searchParams.set('lat', String(latitude));
    apiUrl.searchParams.set('lon', String(longitude));
    apiUrl.searchParams.set('depth', '0-20');

    logStage('iSDAsoil Query', 'info', `Executing GET ${apiUrl.toString()}`);

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
    return resp;
  };

  try {
    let resp = await querySoilProperty(token);

    // If HTTP 401: invalidate cached token, authenticate again, and retry once
    if (resp.status === 401) {
      logStage('iSDAsoil Query', 'warning', 'API returned HTTP 401. Invalidating cached token and retrying once...');
      tokenManager.invalidateToken();
      const reAuth = await tokenManager.getValidToken(logStage);
      if (reAuth.token) {
        resp = await querySoilProperty(reAuth.token);
      }
    }

    const httpStatus = resp.status;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      logStage(
        'iSDAsoil Query',
        'error',
        `iSDAsoil API responded with HTTP ${httpStatus}: ${errText.substring(0, 200) || resp.statusText}`
      );
      const normalised = normaliseIsdaSoilData(null, true);
      return {
        success: false,
        raw: { status: 'error', code: httpStatus, response: errText || resp.statusText },
        authDiagnostic,
        soilPropertyDiagnostic: {
          endpoint: soilPropertyEndpoint,
          httpStatus,
          responseReceived: false,
          message: `HTTP ${httpStatus}: ${errText.substring(0, 150) || resp.statusText}`,
        },
        normalised,
        tokenInfo: tokenManager.getCacheMetadata(),
        diagnostics,
      };
    }

    const rawData = await resp.json();
    logStage('iSDAsoil Query', 'ok', 'Successfully received raw soil property payload from iSDAsoil (HTTP 200).');

    // Normalisation layer
    logStage('Normalisation', 'info', 'Applying SoilWise normalisation layer to raw iSDAsoil response.');
    const normalised = normaliseIsdaSoilData(rawData, true);
    logStage('Normalisation', 'ok', `Normalised soil profile ready (overall_status: ${normalised.overall_status}).`);

    return {
      success: true,
      raw: rawData,
      authDiagnostic,
      soilPropertyDiagnostic: {
        endpoint: soilPropertyEndpoint,
        httpStatus: 200,
        responseReceived: true,
        message: 'Raw soilproperty response successfully retrieved.',
      },
      normalised,
      tokenInfo: tokenManager.getCacheMetadata(),
      diagnostics,
    };
  } catch (err: any) {
    logStage('iSDAsoil Query', 'error', `Network or fetch failure: ${err.message || 'Unknown network error'}`);
    const normalised = normaliseIsdaSoilData(null, true);
    return {
      success: false,
      raw: { status: 'error', error: err.message },
      authDiagnostic,
      soilPropertyDiagnostic: {
        endpoint: soilPropertyEndpoint,
        httpStatus: null,
        responseReceived: false,
        message: err.message || 'Network exception during soilproperty request.',
      },
      normalised,
      tokenInfo: tokenManager.getCacheMetadata(),
      diagnostics,
    };
  }
}
