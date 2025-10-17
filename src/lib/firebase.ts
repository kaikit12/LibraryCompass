import { FirebaseError } from './types';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, onSnapshot, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getStorage, type FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getDocs, getDoc, type Query, type CollectionReference, type DocumentReference, query as queryFn } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { validateEnvironment, sanitizeError } from './security';
import { firebaseConfig as fbConfig, debugLog, debugWarn, debugError } from './firebase-config';

// Validate environment variables
if (typeof window === 'undefined') {
  // Only validate on server side to avoid exposing in client bundle
  try {
    validateEnvironment();
  } catch (error) {
    console.error('Firebase configuration error:', sanitizeError(error));
  }
}

// Firebase configuration - only expose what's necessary
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app with error handling
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  // Connect to emulators in development (only if explicitly enabled)
  if (fbConfig.isDevelopment && 
      typeof window !== 'undefined' && 
      fbConfig.useEmulator) {
    
    const isEmulatorConnected = {
      auth: false,
      firestore: false,
      storage: false
    };

    try {
      if (!isEmulatorConnected.auth) {
        connectAuthEmulator(auth, fbConfig.emulators.auth, { disableWarnings: fbConfig.suppressEmulatorWarnings });
        isEmulatorConnected.auth = true;
        debugLog('Connected to Firebase Auth emulator');
      }
    } catch (error) {
      debugWarn('Auth emulator connection failed, using production Firebase Auth');
    }

    try {
      if (!isEmulatorConnected.firestore) {
        connectFirestoreEmulator(db, fbConfig.emulators.firestore.host, fbConfig.emulators.firestore.port);
        isEmulatorConnected.firestore = true;
        debugLog('Connected to Firestore emulator');
      }
    } catch (error) {
      debugWarn('Firestore emulator connection failed, using production Firestore');
    }

    try {
      if (!isEmulatorConnected.storage) {
        connectStorageEmulator(storage, fbConfig.emulators.storage.host, fbConfig.emulators.storage.port);
        isEmulatorConnected.storage = true;
        debugLog('Connected to Storage emulator');
      }
    } catch (error) {
      debugWarn('Storage emulator connection failed, using production Firebase Storage');
    }
  } else if (fbConfig.isDevelopment) {
    debugLog('Using production Firebase services in development mode');
  }
} catch (error) {
  console.error('Firebase initialization failed:', sanitizeError(error));
  throw new Error('Firebase service unavailable');
}

// Export the initialized instances
export { db, auth, storage, onSnapshot };

// Export safe Firebase functions for backward compatibility
export { 
  safeOnSnapshot, 
  initializeSafeFirebase, 
  resetFirebaseConnection, 
  cleanupFirebase 
} from './firebase-safe';
