// Firebase Configuration Helper
export const firebaseConfig = {
  // Development settings
  isDevelopment: process.env.NODE_ENV === 'development',
  useEmulator: process.env.USE_FIREBASE_EMULATOR === 'true',
  
  // Connection settings
  enableOfflineSupport: true,
  connectionCheckInterval: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  
  // Cache settings
  defaultCacheTTL: 5 * 60 * 1000, // 5 minutes
  
  // Debug settings
  enableDebugLogs: process.env.NODE_ENV === 'development',
  suppressEmulatorWarnings: true,
  
  // Emulator ports
  emulators: {
    auth: 'http://localhost:9099',
    firestore: { host: 'localhost', port: 8080 },
    storage: { host: 'localhost', port: 9199 }
  },
  
  // Error handling
  suppressPermissionErrors: true,
  fallbackToPolling: true,
  pollingInterval: 5000, // 5 seconds
};

export const debugLog = (...args: any[]) => {
  if (firebaseConfig.enableDebugLogs) {
    console.log('[Firebase Debug]', ...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (firebaseConfig.enableDebugLogs) {
    console.warn('[Firebase Warning]', ...args);
  }
};

export const debugError = (...args: any[]) => {
  console.error('[Firebase Error]', ...args);
};