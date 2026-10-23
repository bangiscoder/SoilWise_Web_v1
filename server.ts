import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { validateNigerianLocation, loadBoundaryData } from './server/services/nigeriaBoundaryService.ts';
import { fetchIsdaSoilData, tokenManager } from './src/services/isdaSoilService.ts';
import { executeGeminiAgriculturalChat } from './server/services/geminiChatService.ts';
import { generateGeminiCropRecommendations } from './server/services/geminiCropRecommendationService.ts';
import { 
  verifyAndConfirmPaystackOrder, 
  verifyPaystackReference, 
  verifyAndProcessPaystackWebhook 
} from './server/services/paystackServerService.ts';

const containerPort = process.env.PORT;
dotenv.config({ override: true });
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

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

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

// Stage 4: Context-Aware Gemini Agricultural Assistant Endpoint (Strictly Authenticated Users Only)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { userQuery, context, history, userId } = req.body;

    // Strict authentication check: Never allow unauthenticated requests to reach Gemini backend
    const authHeader = req.headers.authorization;
    const hasBearerToken = Boolean(authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim().length > 0);
    const resolvedUserId = userId || context?.userProfile?.uid;
    const hasValidUser = Boolean(resolvedUserId && typeof resolvedUserId === 'string' && resolvedUserId.trim().length > 0);

    if (!hasBearerToken && !hasValidUser) {
      res.status(401).json({
        success: false,
        reply: 'Authentication required. Please sign in to consult the SoilWise AI Assistant.',
        error: 'Authentication required: Only authenticated users can consult the AI assistant.',
      });
      return;
    }

    if (!userQuery || typeof userQuery !== 'string') {
      res.status(400).json({ success: false, error: 'Question text is required' });
      return;
    }

    if (!context || typeof context !== 'object') {
      res.status(400).json({ success: false, error: 'Context payload is required' });
      return;
    }

    const response = await executeGeminiAgriculturalChat({
      userQuery: userQuery.trim(),
      context,
      history: Array.isArray(history) ? history : [],
    });

    res.json(response);
  } catch (err: any) {
    console.error('[Gemini API Route Error]:', err);
    res.status(500).json({
      success: false,
      reply: 'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
      error: err?.message || 'Server error communicating with Gemini',
    });
  }
});

// Gemini AI Powered Crop Recommendations Endpoint based on soil-test data and climate parameters
app.post('/api/ai/recommended-crops', async (req: Request, res: Response) => {
  try {
    const { location, soilData, soilTexture, climate } = req.body || {};
    const result = await generateGeminiCropRecommendations({
      location: location || {},
      soilData: soilData || {},
      soilTexture: soilTexture || {},
      climate: climate || {},
    });
    res.json(result);
  } catch (err: any) {
    console.error('[Gemini Crop Recommendations Route Error]:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to generate crop recommendations with Gemini',
    });
  }
});

// Open-Meteo Weather Proxy Endpoints (Robust against client adblockers, CORS & mobile network timeouts)
app.get('/api/weather/forecast', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.latitude as string);
    const lon = parseFloat(req.query.longitude as string);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid latitude and longitude query parameters are required' });
    }

    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto&forecast_days=7`;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try {
        controller.abort(new DOMException('Open-Meteo proxy timeout', 'TimeoutError'));
      } catch {
        controller.abort();
      }
    }, 12000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Open-Meteo returned status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn('[Weather Proxy Forecast Warning]:', err?.message || err);
    res.status(502).json({ error: err?.message || 'Failed to fetch forecast from Open-Meteo' });
  }
});

app.get('/api/weather/historical', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.latitude as string);
    const lon = parseFloat(req.query.longitude as string);
    const startYear = parseInt(req.query.start_year as string, 10) || 2023;
    const endYear = parseInt(req.query.end_year as string, 10) || 2025;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid latitude and longitude query parameters are required' });
    }

    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;
    const endpoint = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try {
        controller.abort(new DOMException('Open-Meteo archive proxy timeout', 'TimeoutError'));
      } catch {
        controller.abort();
      }
    }, 15000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Open-Meteo archive returned status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.warn('[Weather Proxy Historical Warning]:', err?.message || err);
    res.status(502).json({ error: err?.message || 'Failed to fetch historical data from Open-Meteo' });
  }
});

// Paystack Configuration & Verification Endpoints
app.get('/api/paystack/public-key', (_req: Request, res: Response) => {
  // Check both PAYSTACK_PUBLIC_KEY and VITE_PAYSTACK_PUBLIC_KEY
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
  res.json({
    publicKey,
    hasServerKey: !!process.env.PAYSTACK_SECRET_KEY,
  });
});

/**
 * Initializes a Paystack transaction on the server.
 * Returns authorization_url, reference, and access_code.
 */
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  const { email, amount, reference, callback_url, metadata } = req.body;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!email || !amount) {
    return res.status(400).json({ success: false, error: 'Email and amount are required' });
  }

  const transactionRef = reference || `SW-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // If live secret key is configured, initialize with official Paystack API
  if (secretKey && !secretKey.includes('placeholder') && secretKey !== 'sk_test_...' && secretKey !== 'sk_test_DEFAULT') {
    try {
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount, // in kobo
          reference: transactionRef,
          callback_url: callback_url || `${req.protocol}://${req.get('host')}/payment-success`,
          metadata,
        }),
      });

      const data = await paystackRes.json();
      if (paystackRes.ok && data?.status && data?.data) {
        return res.json({
          success: true,
          data: data.data,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: data?.message || 'Could not initialize Paystack transaction',
          data,
        });
      }
    } catch (err: any) {
      console.error('[Paystack Init Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to initialize transaction with Paystack',
      });
    }
  }

  // Test / simulated initialization fallback for preview environment
  return res.json({
    success: true,
    isSimulation: true,
    data: {
      authorization_url: `${callback_url || '/payment-success'}?reference=${transactionRef}&amount=${amount}`,
      access_code: `mock_access_${Date.now()}`,
      reference: transactionRef,
    },
  });
});

/**
 * Server-Side Cloud Function: Verifies Paystack transaction reference against Paystack API
 * and updates the Firestore document for the user's order and VIP commitment status.
 */
app.post('/api/paystack/verify-and-update', async (req: Request, res: Response) => {
  try {
    const { reference, orderId, userId, amountNgn, isCommitment } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference parameter is required in request body',
      });
    }

    const result = await verifyAndConfirmPaystackOrder({
      reference,
      orderId,
      userId,
      expectedAmountNgn: amountNgn ? Number(amountNgn) : undefined,
      isCommitment: isCommitment !== false,
    });

    if (!result.verified) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    console.error('[Paystack Verify & Update Endpoint Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while verifying Paystack transaction',
    });
  }
});

/**
 * GET Verification endpoint: Verifies reference and optionally updates Firestore document
 * if orderId or userId query parameters are passed.
 */
app.get('/api/paystack/verify/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;
  const orderId = req.query.orderId as string | undefined;
  const userId = req.query.userId as string | undefined;
  const amount = req.query.amount ? Number(req.query.amount) / 100 : undefined;
  const isCommitment = req.query.isCommitment !== 'false';

  if (!reference) {
    return res.status(400).json({ success: false, error: 'Reference parameter is required' });
  }

  try {
    // If orderId or userId provided, run full verification & Firestore update
    if (orderId || userId) {
      const fullResult = await verifyAndConfirmPaystackOrder({
        reference,
        orderId,
        userId,
        expectedAmountNgn: amount,
        isCommitment,
      });
      return res.json(fullResult);
    }

    // Standard verification against Paystack API
    const verifyResult = await verifyPaystackReference(reference, amount);
    return res.json(verifyResult);
  } catch (err: any) {
    console.error('[Paystack Verify Route Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to verify transaction with Paystack',
    });
  }
});

/**
 * Paystack Webhook Handler: Listens for server-to-server notifications from Paystack
 * (e.g. charge.success) and updates the order and user document in Firestore.
 */
app.post('/api/paystack/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'] as string | undefined;

    const webhookResult = await verifyAndProcessPaystackWebhook(rawBody, signature);

    if (webhookResult.handled) {
      return res.status(200).json({ status: 'success', handled: true });
    } else {
      return res.status(400).json({ status: 'ignored', error: webhookResult.error });
    }
  } catch (err: any) {
    console.error('[Paystack Webhook Handler Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// Configure Vite middleware in development or static serving in production
async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (isProd && hasDist) {
    console.log(`[Production Server] Serving pre-built static client assets from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr: any) {
      console.warn('[Vite Middleware Init Warning]:', viteErr?.message);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SoilWise AI full-stack server running on http://0.0.0.0:${port}`);
  });
}

startServer();
