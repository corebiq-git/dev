import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Public Firebase web configuration for COREBIQ Care.
// Vite environment variables can override these values for staging environments.
const defaults = {
  apiKey: 'AIzaSyDRqHxDNwXfjOMSEtTnRnAmH-iY2_IipLs',
  authDomain: 'corebiq-40001.firebaseapp.com',
  projectId: 'corebiq-40001',
  storageBucket: 'corebiq-40001.firebasestorage.app',
  messagingSenderId: '601846285423',
  appId: '1:601846285423:web:e94fd03743af7f41f0b99a',
  measurementId: 'G-M4CQ9ZGP2T',
};
const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || defaults.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaults.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaults.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaults.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaults.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || defaults.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || defaults.measurementId,
};
export const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const app = isConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app, 'asia-south1') : null;
export const storage = app ? getStorage(app) : null;

if (app && env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
