import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyAsLC5kOkGO7YcwxmAFxG91sFGckCYSxaE',
  authDomain: 'heartland-boys-home-data.firebaseapp.com',
  projectId: 'heartland-boys-home-data',
  storageBucket: 'heartland-boys-home-data.firebasestorage.app',
  messagingSenderId: '30882060333',
  appId: '1:30882060333:web:aa84a93fd3257b689d80a4',
  measurementId: 'G-ZMQXFX80T0',
};

const isPlaceholderValue = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === '' ||
    normalized === 'idk' ||
    normalized === 'null' ||
    normalized === 'undefined' ||
    normalized.startsWith('your_') ||
    normalized.startsWith('your-') ||
    normalized.startsWith('change-me')
  );
};

const resolveFirebaseValue = (
  envName: string,
  envValue: string | undefined,
  fallbackValue: string
): string => {
  if (typeof envValue !== 'string' || isPlaceholderValue(envValue)) {
    if (typeof envValue === 'string' && envValue.trim() !== '') {
      console.warn(`[firebase] Ignoring invalid ${envName} value and using default config.`);
    }
    return fallbackValue;
  }

  return envValue.trim();
};

const firebaseConfig = {
  apiKey: resolveFirebaseValue(
    'VITE_FIREBASE_API_KEY',
    import.meta.env.VITE_FIREBASE_API_KEY,
    defaultFirebaseConfig.apiKey
  ),
  authDomain: resolveFirebaseValue(
    'VITE_FIREBASE_AUTH_DOMAIN',
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    defaultFirebaseConfig.authDomain
  ),
  projectId: resolveFirebaseValue(
    'VITE_FIREBASE_PROJECT_ID',
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    defaultFirebaseConfig.projectId
  ),
  storageBucket: resolveFirebaseValue(
    'VITE_FIREBASE_STORAGE_BUCKET',
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    defaultFirebaseConfig.storageBucket
  ),
  messagingSenderId: resolveFirebaseValue(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    defaultFirebaseConfig.messagingSenderId
  ),
  appId: resolveFirebaseValue(
    'VITE_FIREBASE_APP_ID',
    import.meta.env.VITE_FIREBASE_APP_ID,
    defaultFirebaseConfig.appId
  ),
  measurementId: resolveFirebaseValue(
    'VITE_FIREBASE_MEASUREMENT_ID',
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    defaultFirebaseConfig.measurementId
  ),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
