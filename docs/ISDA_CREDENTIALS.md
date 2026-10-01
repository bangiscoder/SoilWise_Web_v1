# iSDAsoil Integration & Environment Configuration Guide

## Overview

SoilWise AI integrates with the **iSDAsoil API** (`https://api.isda-africa.com`) to provide location-derived soil property estimates (pH, Nitrogen, Mehlich-3 Extractable Phosphorus, Extractable Potassium, Sand, Silt, and Clay content).

To ensure zero startup blocking and bank-grade credential security:
- **Authentication is performed strictly on-demand**: No auth calls run during server or container startup.
- **Tokens are cached in server memory**: Access tokens are cached with TTL tracking and automatic expiration refresh.
- **Zero credential leakage**: Passwords and raw JWT tokens are never sent to the browser or logged in console logs.
- **Fail-safe resilience**: Upstream timeouts or missing credentials do not crash the container or abort Farm Analysis.

---

## 1. Required Server Environment Variables

Configure these two environment variables on your deployment platform (Google Cloud Run) or in your local `.env`:

| Environment Variable | Description | Security Requirement |
| :--- | :--- | :--- |
| `ISDA_USERNAME` | Registered email/username for the iSDA account | Server-side only (never prefix with `VITE_`) |
| `ISDA_PASSWORD` | API password for the iSDA account | Store in Cloud Secret Manager or Cloud Run env |

### Optional Environment Variables:
- `ISDA_SCOPE`: OAuth2 scope (defaults to empty `""`).
- `ISDA_CLIENT_ID`: Client ID parameter (defaults to `"string"` per OpenAPI spec).
- `ISDA_CLIENT_SECRET`: Client Secret parameter (defaults to `"string"` per OpenAPI spec).

---

## 2. Setting Up in Google Cloud Run

To configure or update credentials in Cloud Run:

### Option A: Via Google Cloud Console
1. Navigate to **Google Cloud Run** in the Google Cloud Console.
2. Select your service (`soilwise-ai-web`).
3. Click **Edit & Deploy New Revision**.
4. Scroll to **Variables & Secrets** (or **Environment Variables**).
5. Add:
   - Name: `ISDA_USERNAME`, Value: `your_username@domain.com`
   - Name: `ISDA_PASSWORD`, Value: `your_password`
6. Click **Deploy**.

### Option B: Via `gcloud` CLI
```bash
gcloud run services update soilwise-ai-web \
  --set-env-vars="ISDA_USERNAME=your_username@domain.com,ISDA_PASSWORD=your_password" \
  --region=YOUR_REGION
```

---

## 3. How Authentication Works

### A. Authentication Endpoint
```http
POST https://api.isda-africa.com/login
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=USERNAME&password=PASSWORD&scope=&client_id=string&client_secret=string
```

### B. Response
```json
{
  "access_token": "ey...",
  "token_type": "bearer"
}
```

### C. Soil Property Endpoint
```http
GET https://api.isda-africa.com/isdasoil/v2/soilproperty?lat=10.05&lon=9.15
Authorization: Bearer <access_token>
Accept: application/json
```

---

## 4. Admin Diagnostic Verification

To verify that credentials are successfully loaded without making a public request:
1. Log in to the SoilWise AI Admin Panel at `/admin` (or click **Admin Feedback & Feedback Review**).
2. Look at the **iSDAsoil Service Integration** banner:
   - Confirms `ISDA_USERNAME` status (`LOADED` with masked display, e.g. `mye***@domain.com`).
   - Confirms `ISDA_PASSWORD` status (`LOADED` with hidden characters).
3. Click **Soil Data & GPS Test** to open the developer validation tool:
   - Inspect the real-time **Server Environment & iSDAsoil Credentials Diagnostic** card.
   - Run the isolated point-in-polygon and iSDAsoil pipeline test with preset coordinates or browser GPS.
   - Inspect live HTTP status codes, raw responses, and SoilWise normalisation badges.
