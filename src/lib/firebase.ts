import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase is configured with valid-looking values (avoid placeholder keys)
const looksLikeRealApiKey = (key?: string) => !!key && key.startsWith('AIza');
const looksLikeNonPlaceholder = (value?: string) => !!value && !/^your[_-]/i.test(value);

const isFirebaseConfigured = looksLikeRealApiKey(firebaseConfig.apiKey) &&
  looksLikeNonPlaceholder(firebaseConfig.authDomain) &&
  looksLikeNonPlaceholder(firebaseConfig.projectId) &&
  looksLikeNonPlaceholder(firebaseConfig.appId);

// Only initialize Firebase if configured (used for AI service authentication)
// If not configured, the app will use Supabase auth only
let app;
let auth;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} else {
  console.warn('Firebase not configured or using placeholder keys. Skipping Firebase initialization.');
  // Create a mock auth object to prevent errors
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as any;
}

export { auth };
export default app;
