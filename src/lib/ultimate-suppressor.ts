// Ultimate Firebase error suppressor - blocks all Firebase internal errors
import { debugLog } from './firebase-config';

// Store original methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

// Firebase error patterns to completely suppress
const firebaseErrorPatterns = [
  // Permission errors
  'Missing or insufficient permissions',
  'permission-denied',
  'FirebaseError: Missing or insufficient permissions',
  
  // Internal Firebase errors
  'FIRESTORE (11.9.0) INTERNAL ASSERTION FAILED',
  'INTERNAL UNHANDLED ERROR',
  'Unexpected state',
  'INTERNAL ASSERTION FAILED',
  
  // Firebase SDK errors
  '@firebase/firestore: Firestore (11.9.0): INTERNAL UNHANDLED ERROR',
  '@firebase/firestore: "Firestore (11.9.0): INTERNAL UNHANDLED ERROR',
  'Uncaught Error in snapshot listener',
  'FIRESTORE (11.9.0): Uncaught Error in snapshot listener',
  
  // Context specific errors
  'CONTEXT: {"Fe":-1}',
  '__PRIVATE__fail',
  '__PRIVATE_hardAssert',
  '__PRIVATE_TargetState',
];

function shouldSuppressMessage(message: string): boolean {
  const messageStr = String(message).toLowerCase();
  return firebaseErrorPatterns.some(pattern => 
    messageStr.includes(pattern.toLowerCase())
  );
}

function createSuppressor(originalMethod: any, methodName: string) {
  return (...args: any[]) => {
    const message = args.join(' ');
    
    if (shouldSuppressMessage(message)) {
      if (process.env.NODE_ENV === 'development') {
        debugLog(`[${methodName.toUpperCase()} SUPPRESSED]`, message.substring(0, 100) + '...');
      }
      return;
    }
    
    // Call original method for non-Firebase errors
    originalMethod.apply(console, args);
  };
}

// Override all console methods
console.log = createSuppressor(originalLog, 'log');
console.warn = createSuppressor(originalWarn, 'warn');
console.error = createSuppressor(originalError, 'error');
console.info = createSuppressor(originalInfo, 'info');

// Handle unhandled rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const message = error?.message || String(error);
    
    if (shouldSuppressMessage(message)) {
      debugLog('[UNHANDLED REJECTION SUPPRESSED]', message.substring(0, 100) + '...');
      event.preventDefault();
      return;
    }
  });
  
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    const message = error?.message || String(error);
    
    if (shouldSuppressMessage(message)) {
      debugLog('[UNCAUGHT ERROR SUPPRESSED]', message.substring(0, 100) + '...');
      event.preventDefault();
      return;
    }
  });
}

// Restore function
export const restoreConsole = () => {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  console.info = originalInfo;
};

// Log initialization
if (process.env.NODE_ENV === 'development') {
  debugLog('[Ultimate Firebase Suppressor] All Firebase errors will be suppressed');
}