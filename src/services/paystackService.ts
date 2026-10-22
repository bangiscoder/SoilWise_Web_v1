/**
 * SoilWise AI — Paystack Payment Gateway Integration
 * 
 * Manages live and test checkout for certified crop seeds.
 */

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackOptions) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number; // in kobo (NGN * 100)
  currency?: string; // 'NGN'
  ref: string;
  firstname?: string;
  lastname?: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
    [key: string]: any;
  };
  callback: (response: PaystackSuccessResponse) => void;
  onClose: () => void;
}

export interface PaystackSuccessResponse {
  reference: string;
  status: string;
  trans?: string;
  transaction?: string;
  message?: string;
  redirecturl?: string;
  trxref?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  isSimulation?: boolean;
  message?: string;
  data?: {
    reference: string;
    status: string;
    amount?: number;
    gateway_response?: string;
    paid_at?: string;
    channel?: string;
  };
}

let scriptLoadingPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the official Paystack inline popup script.
 */
export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.PaystackPop) return Promise.resolve(true);

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise((resolve) => {
      const existingScript = document.getElementById('paystack-inline-js');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.id = 'paystack-inline-js';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('[Paystack] Could not load Paystack inline script.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return scriptLoadingPromise;
}

/**
 * Fetches the active public key from the backend or client environment.
 */
export async function getPaystackPublicKey(): Promise<string> {
  const envKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  try {
    const res = await fetch('/api/paystack/public-key');
    if (res.ok) {
      const data = await res.json();
      if (data?.publicKey && data.publicKey.trim()) {
        return data.publicKey.trim();
      }
    }
  } catch (err) {
    console.warn('[Paystack] Could not fetch public key from server:', err);
  }

  // Standard safe test key format
  return 'pk_test_soilwise_demo_sandbox';
}

/**
 * Verifies a transaction reference with the SoilWise backend.
 * Optionally passes orderId and userId so server-side cloud function updates Firestore.
 */
export async function verifyPaystackTransaction(
  reference: string,
  amountNgn?: number,
  options?: { orderId?: string; userId?: string; isCommitment?: boolean }
): Promise<VerificationResult> {
  try {
    const params = new URLSearchParams();
    if (amountNgn) params.append('amount', Math.round(amountNgn * 100).toString());
    if (options?.orderId) params.append('orderId', options.orderId);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.isCommitment !== undefined) params.append('isCommitment', String(options.isCommitment));

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}${queryString}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Paystack Verify Service Error]:', err);
    return {
      success: false,
      verified: false,
      message: err.message || 'Could not verify transaction with server',
    };
  }
}

/**
 * Server-Side Cloud Function Caller: Explicitly triggers server verification against Paystack
 * and updates the Firestore document for the user's order and VIP commitment status.
 */
export async function verifyAndUpdateOrderOnServer(params: {
  reference: string;
  orderId?: string;
  userId?: string;
  amountNgn?: number;
  isCommitment?: boolean;
}): Promise<{
  success: boolean;
  verified: boolean;
  isSimulation?: boolean;
  message: string;
  firestoreResult?: {
    orderFound: boolean;
    orderUpdated: boolean;
    orderId?: string;
    userVipUpdated: boolean;
    userId?: string;
  };
}> {
  try {
    const res = await fetch('/api/paystack/verify-and-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('[Paystack Verify & Update Client Error]:', err);
    return {
      success: false,
      verified: false,
      message: err.message || 'Failed to call Paystack verification cloud function',
    };
  }
}

/**
 * Initializes a Paystack transaction via the server API (returns authorization_url).
 */
export async function initializeServerTransaction(params: {
  email: string;
  amountNgn: number;
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}): Promise<{
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amountNgn * 100), // in kobo
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await res.json();
    if (res.ok && data?.success && data?.data) {
      return {
        success: true,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        reference: data.data.reference,
      };
    }
    return {
      success: false,
      error: data?.message || data?.error || 'Failed to initialize payment',
    };
  } catch (err: any) {
    console.error('[Paystack Init Client Error]:', err);
    return {
      success: false,
      error: err.message || 'Payment initialization request failed',
    };
  }
}

/**
 * Initiates the Paystack popup checkout.
 */
export async function initiatePaystackCheckout(params: {
  email: string;
  amountNgn: number;
  reference: string;
  seedVariety: string;
  quantityKg: number;
  farmerPhone: string;
  deliveryAddress: string;
  farmerName?: string;
  customFields?: Array<{ display_name: string; variable_name: string; value: string }>;
  onSuccess: (response: PaystackSuccessResponse) => void;
  onCancel: () => void;
  overridePublicKey?: string;
}): Promise<boolean> {
  const isLoaded = await loadPaystackScript();
  const publicKey = params.overridePublicKey || (await getPaystackPublicKey());

  if (!isLoaded || !window.PaystackPop || publicKey.includes('sandbox') || publicKey.includes('placeholder')) {
    // If inline script is blocked or using sandbox without active key,
    // we provide a smooth, farmer-friendly simulated checkout modal confirmation
    return false;
  }

  try {
    const trimmedName = (params.farmerName || '').trim();
    const nameParts = trimmedName ? trimmedName.split(/\s+/) : [];
    const firstname = nameParts[0] || undefined;
    const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

    const baseFields = [
      {
        display_name: 'Farmer Name',
        variable_name: 'farmer_name',
        value: trimmedName || 'SoilWise Farmer',
      },
      {
        display_name: 'Farmer Email',
        variable_name: 'farmer_email',
        value: params.email,
      },
      {
        display_name: 'Crop Seed Variety',
        variable_name: 'seed_variety',
        value: params.seedVariety,
      },
      {
        display_name: 'Quantity (kg)',
        variable_name: 'quantity_kg',
        value: `${params.quantityKg} kg`,
      },
      {
        display_name: 'Farmer Phone',
        variable_name: 'farmer_phone',
        value: params.farmerPhone,
      },
      {
        display_name: 'Delivery Address',
        variable_name: 'delivery_address',
        value: params.deliveryAddress,
      },
    ];

    const mergedFields = params.customFields 
      ? [...baseFields, ...params.customFields] 
      : baseFields;

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: params.email,
      amount: Math.round(params.amountNgn * 100), // in kobo
      currency: 'NGN',
      ref: params.reference,
      firstname,
      lastname,
      metadata: {
        farmer_name: trimmedName,
        customer_name: trimmedName,
        email: params.email,
        custom_fields: mergedFields,
      },
      callback: (response) => {
        params.onSuccess(response);
      },
      onClose: () => {
        params.onCancel();
      },
    });

    handler.openIframe();
    return true;
  } catch (err) {
    console.warn('[Paystack] Error opening popup iframe:', err);
    return false;
  }
}
