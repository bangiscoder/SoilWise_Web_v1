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

### Environment Variables (.env)
If configuring manually via environment variables:
```bash
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_DATABASE_ID="your-database-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="1:...:web:..."
```

---

## Security Model

1. **Public Feedback Collection**:
   - Farmers and agricultural testers can submit validation feedback without creating an account or authenticating.
   - Submissions use Firestore `serverTimestamp()` to ensure tamper-proof timestamps.
   - Public users have **no read, update, or delete permissions** on the `soilwise_feedback` collection.

2. **Authorized Administrator Access**:
   - Only `bangiscoder@gmail.com` is permitted access to the administration dashboard.
   - Firestore security rules strictly enforce:
     ```javascript
     match /soilwise_feedback/{feedbackId} {
       allow create: if isValidFeedback();
       allow read, update, delete: if request.auth != null && request.auth.token.email == 'bangiscoder@gmail.com';
     }
     ```
   - Any other authenticated user receives an "Access denied" error and is logged out immediately.

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
