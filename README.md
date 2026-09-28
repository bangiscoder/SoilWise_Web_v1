# SoilWise AI &mdash; Web MVP

SoilWise AI combines farm-level soil test data, gridded physical soil properties (ISRIC SoilGrids 2.0), and open meteorological climate models (Open-Meteo) with validated local agricultural expertise to guide smallholder farmers and stakeholders.

---

## Architecture Overview

```
Public SoilWise AI Result Page
  └── Feedback Form (Public, Authentication-independent)
        └── Cloud Firestore (Collection: 'soilwise_feedback')
              ├── Security Rules (Write-only for public, Read/Manage restricted)
              └── Private Admin Portal (/admin/login)
                    └── Firebase Authentication (Restricted to bangiscoder@gmail.com)
                          └── Feedback & Validation Dashboard (/admin/dashboard)
```

---

## Firebase Configuration & Setup

Firebase services (Cloud Firestore and Firebase Authentication) are configured centrally in `src/lib/firebase.ts`.

### Configuration Location
The client web configuration automatically loads from `firebase-applet-config.json` in the root workspace or from environment variables (`.env`):

```javascript
// firebase-applet-config.json or .env variables:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gen-lang-client-0258890999.firebaseapp.com",
  projectId: "gen-lang-client-0258890999",
  firestoreDatabaseId: "ai-studio-soilwiseaiweb-6c768f4c-f0cb-4d4f-9e44-6c78310c18a5",
  storageBucket: "gen-lang-client-0258890999.firebasestorage.app",
  messagingSenderId: "827122899732",
  appId: "1:827122899732:web:1fb478e14972bceca38001"
};
```

### Required Firebase Console Settings

To ensure authentication and password reset function correctly:

1. **Enable Email/Password Provider**:
   - Navigate to the Firebase Console: **Authentication → Sign-in method**.
   - Ensure the **Email/Password** provider is **Enabled**.
   - If disabled, authentication attempts will encounter `auth/operation-not-allowed`.

2. **Add Authorised Domains**:
   - Navigate to Firebase Console: **Authentication → Settings → Authorised domains**.
   - Add your application domains:
     - `ais-dev-5b2asfsm5ann3lkau562qr-507307338931.europe-west1.run.app`
     - `ais-pre-5b2asfsm5ann3lkau562qr-507307338931.europe-west1.run.app`
     - `localhost`
   - This ensures `sendPasswordResetEmail` action URLs and redirect handlers operate without `auth/unauthorized-continue-uri` errors.

3. **Password Reset Flow**:
   - The admin reset page is handled directly by the application at `/admin/login?mode=resetPassword&oobCode=...`.
   - The application inspects `oobCode` and validates it with `verifyPasswordResetCode(auth, oobCode)`, then sets the new password with `confirmPasswordReset(auth, oobCode, newPassword)`.

---

## Access Control & Security Model

1. **Centralized Admin Check**:
   - Evaluated via `isAdmin(user)` strictly matching `bangiscoder@gmail.com`.
   - **Public users / Unauthenticated visitors**:
     - "View Modular Architecture" button on the home page is completely hidden.
     - "Data Architecture & API" navigation link is completely hidden.
     - Direct access to architecture/API information is blocked and redirected.
     - Feedback dashboard is completely blocked.
   - **Authorized Administrator (`bangiscoder@gmail.com`)**:
     - "View Modular Architecture" button appears on the home page.
     - "Data Architecture & API" appears in navigation and opens schema docs.
     - Full access to the feedback & validation dashboard.

2. **Public Feedback Collection**:
   - Farmers and agricultural testers can submit validation feedback without creating an account or authenticating.
   - Submissions use Firestore `serverTimestamp()` to ensure tamper-proof timestamps.
   - Public users have **no read, update, or delete permissions** on the `soilwise_feedback` collection.

3. **Database Security Rules**:
   - Enforced by `firestore.rules`:
     ```javascript
     match /soilwise_feedback/{feedbackId} {
       allow create: if isValidFeedback();
       allow read, update, delete: if request.auth != null && request.auth.token.email == 'bangiscoder@gmail.com';
     }
     ```

---

## Administrator Dashboard Features

Navigate to `/admin/login` or click the **Admin Portal** link in the footer:
- **Real-time Live Metrics**: Total Responses, Would-Use %, Waiting-List signups, Willingness-to-Pay %, and Farmer demographics.
- **Validation Analytics**: Product sentiment distribution, usage likelihood, and requested improvements.
- **Searchable Submissions Table**: Filter by user type, price tiers, and waitlist status.
- **Detailed Response Modal**: Full view of farmer contact info, farming locations, and qualitative answers.
- **CSV Data Export**: One-click browser export of all feedback records.

---

## AI Assistant Prototype Notice

The AI Assistant on the result page is configured as an interactive frontend prototype (`AI_ASSISTANT_MODE = "mock"`). It uses available farm analysis numbers to demonstrate the user experience without making external model calls or consuming cloud credits during initial MVP validation.
