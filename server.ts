import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { validateNigerianLocation, loadBoundaryData } from './server/services/nigeriaBoundaryService.ts';
import { fetchIsdaSoilData, tokenManager } from './src/services/isdaSoilService.ts';

const containerPort = process.env.PORT;
dotenv.config();
if (containerPort) {
  process.env.PORT = containerPort;
}

// Pre-load administrative boundary geojson on server initialization safely
try {
  const boundaryCounts = loadBoundaryData();
  console.log(`[GeoBoundaries] Loaded ${boundaryCounts.adm1Count} States and ${boundaryCounts.adm2Count} LGAs.`);
} catch (e: any) {
  console.warn('[GeoBoundaries] Notice loading boundaries:', e.message);
}

const app = express();

// Port resolution: check CLI --port, then process.env.PORT (Cloud Run / container), with 3000 fallback
function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.PORT) {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 3000;
}
const port = resolvePort();

app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'SoilWise AI Web MVP', port });
});

// Admin Developer Validation: Check iSDAsoil token cache & credentials metadata
app.get('/api/admin/soil-data-test/token-status', (_req: Request, res: Response) => {
  try {
    const meta = tokenManager.getCacheMetadata();
    res.json(meta);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/soil-data-test/credentials-status', (_req: Request, res: Response) => {
  try {
    const meta = tokenManager.getCacheMetadata();
    res.json(meta);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Developer Validation: Invalidate cached token on credential updates
app.post('/api/admin/soil-data-test/reset-token', (_req: Request, res: Response) => {
  try {
    tokenManager.invalidateToken();
    const meta = tokenManager.getCacheMetadata();
    res.json({ success: true, message: 'Cached token invalidated. Next query will authenticate fresh.', meta });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Farm Analysis: Geographic Point-in-Polygon Location Validation
app.post('/api/location/validate', (req: Request, res: Response) => {
  try {
    const { selectedState, selectedLga, latitude, longitude, accuracyM } = req.body;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const accNum = accuracyM !== undefined && accuracyM !== null && accuracyM !== '' ? parseFloat(accuracyM) : null;

    const result = validateNigerianLocation(
      selectedState || '',
      selectedLga || '',
      latNum,
      lonNum,
      accNum
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error validating Nigerian coordinates' });
  }
});

// Admin Developer Validation: Step 1 - Geographic Point-in-Polygon Validation
app.post('/api/admin/soil-data-test/validate-location', (req: Request, res: Response) => {
  try {
    const { selectedState, selectedLga, latitude, longitude, accuracyM } = req.body;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const accNum = accuracyM !== undefined && accuracyM !== null && accuracyM !== '' ? parseFloat(accuracyM) : null;

    const result = validateNigerianLocation(
      selectedState || '',
      selectedLga || '',
      latNum,
      lonNum,
      accNum
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error validating Nigerian coordinates' });
  }
});

// Farm Analysis: Query verified iSDAsoil location profile (strictly server-side auth & token cache)
app.post('/api/soil/isdasoil-profile', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      res.status(400).json({ error: 'Valid numeric latitude and longitude are required' });
      return;
    }

    const response = await fetchIsdaSoilData(latNum, lonNum);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error communicating with iSDAsoil service' });
  }
});

// Admin Developer Validation: Step 2 - iSDAsoil Data Fetch & Normalisation
app.post('/api/admin/soil-data-test/isdasoil', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      res.status(400).json({ error: 'Valid numeric latitude and longitude are required' });
      return;
    }

    const response = await fetchIsdaSoilData(latNum, lonNum);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error communicating with iSDAsoil service' });
  }
});

// Admin Developer Validation: Combined Pipeline Test
app.post('/api/admin/soil-data-test/pipeline', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const pipelineLog: { timestamp: string; step: string; status: 'ok' | 'warning' | 'error' | 'info'; message: string; durationMs?: number }[] = [];

  const logStep = (step: string, status: 'ok' | 'warning' | 'error' | 'info', message: string, dMs?: number) => {
    pipelineLog.push({
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      durationMs: dMs,
    });
  };

  try {
    const { selectedState, selectedLga, latitude, longitude, accuracyM } = req.body;
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    const accNum = accuracyM !== undefined && accuracyM !== null && accuracyM !== '' ? parseFloat(accuracyM) : null;

    logStep(
      'Input Ingestion',
      'info',
      `Target: Selected State='${selectedState}', Selected LGA='${selectedLga}', Coordinates=(${latNum}, ${lonNum}), Accuracy=${accNum !== null ? `${accNum}m` : 'None specified'}`
    );

    // 1. Geographic Boundary Validation
    const tGeo0 = Date.now();
    const locationValidation = validateNigerianLocation(
      selectedState || '',
      selectedLga || '',
      latNum,
      lonNum,
      accNum
    );
    const tGeo1 = Date.now();

    logStep(
      'Geographic Validation',
      locationValidation.validation.status === 'match'
        ? 'ok'
        : locationValidation.validation.status === 'boundary_uncertain'
        ? 'warning'
        : locationValidation.validation.status === 'outside_nigeria' || locationValidation.validation.status === 'invalid_coordinates'
        ? 'error'
        : 'warning',
      `Detected State='${locationValidation.detected.state || 'None'}', Detected LGA='${locationValidation.detected.lga || 'None'}'. Result: ${locationValidation.validation.status.toUpperCase()} (${locationValidation.validation.reason})`,
      tGeo1 - tGeo0
    );

    // 2. iSDAsoil Request
    const tIsda0 = Date.now();
    const isdaResult = await fetchIsdaSoilData(latNum, lonNum);
    const tIsda1 = Date.now();

    // Merge iSDA diagnostics
    for (const diag of isdaResult.diagnostics) {
      logStep(`iSDAsoil: ${diag.stage}`, diag.status, diag.message);
    }

    logStep(
      'SoilWise Normalisation',
      isdaResult.normalised.overall_status === 'available'
        ? 'ok'
        : isdaResult.normalised.overall_status === 'partially_available'
        ? 'warning'
        : 'info',
      `Normalised profile generated. Overall status: ${isdaResult.normalised.overall_status}. EC property: ${isdaResult.normalised.ec.status} (${isdaResult.normalised.ec.unavailability_reason})`,
      tIsda1 - tIsda0
    );

    const totalDuration = Date.now() - startTime;
    logStep(
      'Pipeline Execution Complete',
      'ok',
      `End-to-end pipeline finished in ${totalDuration}ms.`,
      totalDuration
    );

    res.json({
      success: true,
      locationValidation,
      soilData: isdaResult,
      pipelineLog,
      totalDurationMs: totalDuration,
    });
  } catch (err: any) {
    logStep('Pipeline Error', 'error', err.message || 'Unexpected failure in validation pipeline.');
    res.status(500).json({
      success: false,
      error: err.message,
      pipelineLog,
    });
  }
});

// Configure Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SoilWise AI full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();
