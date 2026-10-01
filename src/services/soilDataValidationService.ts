import {
  LocationValidationResult,
  PipelineRunResult,
  TokenCacheMetadata,
} from '../types/soilDataValidation';

export async function fetchTokenCacheStatus(): Promise<TokenCacheMetadata> {
  const resp = await fetch('/api/admin/soil-data-test/token-status');
  if (!resp.ok) {
    throw new Error(`Failed to fetch token status: HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function fetchCredentialsStatus(): Promise<TokenCacheMetadata> {
  const resp = await fetch('/api/admin/soil-data-test/credentials-status');
  if (!resp.ok) {
    throw new Error(`Failed to fetch credentials status: HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function resetTokenCache(): Promise<{ success: boolean; message: string; meta: TokenCacheMetadata }> {
  const resp = await fetch('/api/admin/soil-data-test/reset-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`Failed to reset token cache: HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function validateLocationApi(
  selectedState: string,
  selectedLga: string,
  latitude: number,
  longitude: number,
  accuracyM: number | null = null
): Promise<LocationValidationResult> {
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3000';
  const resp = await fetch(`${origin}/api/location/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedState,
      selectedLga,
      latitude,
      longitude,
      accuracyM,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || `Location validation failed with HTTP ${resp.status}`);
  }

  return resp.json();
}

export async function runSoilDataPipeline(
  selectedState: string,
  selectedLga: string,
  latitude: number,
  longitude: number,
  accuracyM: number | null = null
): Promise<PipelineRunResult> {
  const resp = await fetch('/api/admin/soil-data-test/pipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectedState,
      selectedLga,
      latitude,
      longitude,
      accuracyM,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || `Pipeline execution failed with HTTP ${resp.status}`);
  }

  return resp.json();
}
