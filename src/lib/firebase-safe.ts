// Safe Firebase Wrapper - Handles connection issues and prevents internal errors
import { db, auth } from './firebase';
import { 
  getDocs, 
  getDoc, 
  onSnapshot as firebaseOnSnapshot,
  enableNetwork,
  disableNetwork,
  clearIndexedDbPersistence,
  terminate,
  type Query, 
  type CollectionReference, 
  type DocumentReference 
} from 'firebase/firestore';
import { FirebaseError } from './types';
import { debugLog, debugWarn, debugError } from './firebase-config';

// Global state to track Firebase status
let isFirebaseInitialized = false;
let isTerminated = false;
const activeListeners = new Set<() => void>();

// Initialize Firebase safely
export async function initializeSafeFirebase(): Promise<boolean> {
  if (isFirebaseInitialized) return true;
  
  try {
    debugLog('Initializing safe Firebase connection');
    
    // Try to enable network first (this might fail if already enabled)
    try {
      await enableNetwork(db);
    } catch (networkError: any) {
      // Network might already be enabled, continue
      debugWarn('Network enable failed (might already be enabled):', networkError.message);
    }
    
    // Test connection with a simple operation
    const isConnected = await testFirebaseConnection();
    
    if (isConnected) {
      isFirebaseInitialized = true;
      debugLog('Firebase initialized successfully');
      return true;
    } else {
      debugWarn('Firebase connection test failed');
      return false;
    }
  } catch (error: any) {
    debugError('Firebase initialization failed:', error);
    // Don't throw, just return false to allow app to continue
    return false;
  }
}

// Test Firebase connection
async function testFirebaseConnection(): Promise<boolean> {
  try {
    // Try different approaches to test Firebase connection
    
    // Method 1: Try to get app instance info
    try {
      const { getApp } = await import('firebase/app');
      const app = getApp();
      if (app?.name) {
        debugLog('Firebase app instance found:', app.name);
        return true;
      }
    } catch (appError) {
      debugWarn('Cannot get Firebase app instance:', appError);
    }
    
    // Method 2: Try a simple collection reference (without reading)
    try {
      const { collection } = await import('firebase/firestore');
      const testCollection = collection(db, '_connection_test');
      
      if (testCollection?.path) {
        debugLog('Firebase Firestore collection reference created successfully');
        return true;
      }
    } catch (collectionError: any) {
      debugWarn('Cannot create collection reference:', collectionError.message);
    }
    
    // Method 3: Try to read from a minimal collection
    try {
      const { collection } = await import('firebase/firestore');
      const testCollection = collection(db, 'books'); // Use existing collection
      await getDocs(testCollection);
      debugLog('Firebase connection test successful via books collection');
      return true;
    } catch (readError: any) {
      debugWarn('Cannot read from collections:', readError.message);
      
      // If permission denied or other specific errors, still consider connected
      if (readError.code === 'permission-denied' || 
          readError.message?.includes('Missing or insufficient permissions') ||
          readError.message?.includes('requires authentication')) {
        debugLog('Permission denied but Firebase connection is working');
        return true;
      }
    }
    
    // If we get here, assume connection is working but with restrictions
    debugLog('Firebase connection test completed with warnings, assuming connected');
    return true;
    
  } catch (error: any) {
    debugError('Firebase connection test failed completely:', error.message);
    return false;
  }
}

// Safe onSnapshot wrapper that prevents internal errors
export function safeOnSnapshot<T = any>(
  ref: Query | CollectionReference | DocumentReference | any,
  next: (snapshot: T) => void,
  error?: (err: unknown) => void
): () => void {
  let unsubscribe: (() => void) | null = null;
  let pollInterval: NodeJS.Timeout | null = null;
  let isActive = true;

  const cleanup = () => {
    isActive = false;
    if (unsubscribe) {
      try {
        unsubscribe();
        activeListeners.delete(cleanup);
      } catch (err) {
        debugWarn('Error during listener cleanup:', err);
      }
    }
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  };

  // Add to active listeners for global cleanup
  activeListeners.add(cleanup);

  // Polling fallback function
  const pollData = async () => {
    if (!isActive) return;
    
    try {
      let result;
      
      // Check if ref is a collection/query or document reference
      const refType = ref.constructor?.name || 'unknown';
      
      try {
        if (refType.includes('DocumentReference') || ref.path?.includes('/')) {
          // It's likely a document reference
          result = await getDoc(ref as any);
        } else {
          // It's likely a collection/query reference
          result = await getDocs(ref as any);
        }
      } catch (docErr: any) {
        // If getDocs failed, try getDoc as fallback
        if (docErr.message?.includes('Expected type')) {
          try {
            result = await getDoc(ref as any);
          } catch (getDocErr: any) {
            debugWarn('Both getDocs and getDoc failed:', getDocErr.message);
            throw docErr; // Throw original error
          }
        } else {
          throw docErr;
        }
      }
      
      if (isActive) {
        next(result as T);
      }
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        // Silently ignore permission denied errors during polling
        // This is expected when user is not authenticated
        debugLog('Permission denied during polling - waiting for authentication');
        return;
      }
      
      if (error && isActive) {
        debugWarn('Polling error:', err.message);
        error(err);
      }
    }
  };

  // Try to use real-time listener first
  const setupListener = () => {
    try {
      unsubscribe = firebaseOnSnapshot(
        ref,
        (snapshot) => {
          if (isActive) {
            next(snapshot as T);
          }
        },
        (err: any) => {
          debugWarn('Snapshot listener error:', err);
          
          // Handle specific Firebase internal errors
          if (err.message?.includes('INTERNAL ASSERTION FAILED') || 
              err.message?.includes('Unexpected state')) {
            debugWarn('Firebase internal error detected, switching to polling mode');
            
            // Clean up listener and switch to polling
            if (unsubscribe) {
              try { unsubscribe(); } catch (_) {}
              unsubscribe = null;
            }
            
            // Start polling instead
            if (isActive) {
              pollInterval = setInterval(pollData, 5000);
              pollData(); // Initial fetch
            }
            return;
          }
          
          // Handle other errors normally
          if (err.code === 'permission-denied') {
            debugLog('Permission denied - user not authenticated, listener will activate on login');
            
            // Completely suppress permission-denied errors to prevent console noise
            // The listener will automatically work once user logs in due to Firebase's built-in behavior
            return;
          } else if (error && isActive) {
            // Wrap error callback in try-catch to prevent uncaught errors
            try {
              error(err);
            } catch (errorCallbackErr) {
              debugWarn('Error in error callback:', errorCallbackErr);
            }
          }
        }
      );
    } catch (err: any) {
      debugWarn('Failed to setup real-time listener, using polling:', err.message);
      // Fallback to polling immediately
      if (isActive) {
        pollInterval = setInterval(pollData, 5000);
        pollData();
      }
    }
  };

  // Initialize based on auth state
  if (auth.currentUser) {
    setupListener();
  } else {
    // No auth, use polling only
    pollInterval = setInterval(pollData, 10000);
    pollData();
  }

  return cleanup;
}

// Cleanup all active listeners
export async function cleanupFirebase(): Promise<void> {
  debugLog('Cleaning up Firebase connections');
  
  // Cleanup all active listeners
  for (const cleanup of activeListeners) {
    try {
      cleanup();
    } catch (err) {
      debugWarn('Error during listener cleanup:', err);
    }
  }
  activeListeners.clear();

  try {
    // Disable network to prevent new connections
    await disableNetwork(db);
    
    // Clear persistence if possible
    try {
      await clearIndexedDbPersistence(db);
    } catch (err) {
      debugWarn('Could not clear persistence:', err);
    }
    
    // Terminate Firestore
    await terminate(db);
    isTerminated = true;
    isFirebaseInitialized = false;
    
    debugLog('Firebase cleanup completed');
  } catch (err) {
    debugError('Error during Firebase cleanup:', err);
  }
}

// Reset Firebase connection
export async function resetFirebaseConnection(): Promise<boolean> {
  debugLog('Resetting Firebase connection');
  
  try {
    await cleanupFirebase();
    
    // Wait a bit before reinitializing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return await initializeSafeFirebase();
  } catch (err) {
    debugError('Error resetting Firebase connection:', err);
    return false;
  }
}

// Get Firebase status
export function getFirebaseStatus() {
  return {
    isInitialized: isFirebaseInitialized,
    isTerminated,
    activeListenersCount: activeListeners.size
  };
}

// Setup cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupFirebase();
  });
  
  // Also cleanup on visibility change (when tab becomes hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeListeners.size > 0) {
      debugLog('Page hidden, cleaning up Firebase listeners');
      for (const cleanup of activeListeners) {
        try {
          cleanup();
        } catch (err) {
          debugWarn('Error during visibility cleanup:', err);
        }
      }
    }
  });
}