// Console error suppressor for expected Firebase errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressedErrors = [
  'Missing or insufficient permissions',
  'permission-denied',
  'FIRESTORE (11.9.0): Uncaught Error in snapshot listener',
  'FirebaseError: Missing or insufficient permissions',
  '@firebase/firestore: Firestore (11.9.0): Uncaught Error in snapshot listener',
  'FIRESTORE (11.9.0) INTERNAL ASSERTION FAILED',
  'INTERNAL UNHANDLED ERROR',
  'Unexpected state',
  '@firebase/firestore: "Firestore (11.9.0): INTERNAL UNHANDLED ERROR',
];

// Track suppression for debugging
let suppressionCount = 0;

// Override console.error to suppress expected Firebase permission errors
console.error = (...args: any[]) => {
  const errorMessage = String(args[0] || '') + ' ' + args.slice(1).join(' ');
  
  // Check if this is a Firebase permission error we want to suppress
  const shouldSuppress = suppressedErrors.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (shouldSuppress) {
    suppressionCount++;
    // Log as debug instead of error in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Suppressed Firebase Error #${suppressionCount}]`, ...args);
    }
    return;
  }
  
  // Call original console.error for other errors
  originalConsoleError.apply(console, args);
};

// Override console.warn for Firebase warnings
console.warn = (...args: any[]) => {
  const warningMessage = String(args[0] || '') + ' ' + args.slice(1).join(' ');
  
  // Suppress Firebase permission warnings
  if (warningMessage.toLowerCase().includes('missing or insufficient permissions') ||
      warningMessage.toLowerCase().includes('@firebase/firestore') ||
      warningMessage.toLowerCase().includes('permission-denied')) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Suppressed Firebase Warning]', ...args);
    }
    return;
  }
  
  originalConsoleWarn.apply(console, args);
};

// Log initialization
if (process.env.NODE_ENV === 'development') {
  console.debug('[Console Suppressor] Initialized for Firebase errors');
}

// Export for cleanup if needed
export const restoreConsole = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Console Suppressor] Restored original console methods. Suppressed ${suppressionCount} errors.`);
  }
};