/**
 * Firebase initialization. The web config comes from app/.env (copy
 * .env.example) — these identifiers are public by design; security lives
 * in Firestore/Storage rules, never in hiding them.
 */
import { initializeApp } from 'firebase/app';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error(
    'Missing Firebase config. Copy app/.env.example to app/.env and fill in ' +
      'the values from your Firebase project settings — see docs/SETUP.md.',
  );
}

export const app = initializeApp(firebaseConfig);

// App Check (optional, recommended): every request must come from this
// actual app. Enabled when a reCAPTCHA Enterprise site key is configured.
// On localhost the SDK mints a debug token (printed to the console once;
// register it under App Check → Apps → Manage debug tokens).
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
if (recaptchaKey) {
  if (location.hostname === 'localhost') {
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);

// Firestore and Storage live in ./firebase-data so a signed-out visitor
// never downloads them. Import from there, not from here.
