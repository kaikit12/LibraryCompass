// Migration helper - Replace old safeOnSnapshot with new safe version
import { safeOnSnapshot } from './firebase-safe';

// Re-export for backward compatibility
export { safeOnSnapshot };

// Also export other safe Firebase utilities
export { 
  initializeSafeFirebase, 
  resetFirebaseConnection, 
  cleanupFirebase, 
  getFirebaseStatus 
} from './firebase-safe';