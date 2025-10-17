// Global error handler for Firebase permission errors
import { debugLog } from './firebase-config';

// Track if global handlers are installed
let handlersInstalled = false;

export function installGlobalErrorHandlers() {
  if (handlersInstalled || typeof window === 'undefined') return;
  
  // Handle unhandled promise rejections (common source of Firebase errors)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error?.code === 'permission-denied' || 
        (error?.message && (
          error.message.includes('Missing or insufficient permissions') ||
          error.message.includes('INTERNAL ASSERTION FAILED') ||
          error.message.includes('INTERNAL UNHANDLED ERROR') ||
          error.message.includes('Unexpected state')
        ))) {
      
      debugLog('Suppressed unhandled Firebase error:', error.message);
      event.preventDefault(); // Prevent default error logging
      return;
    }
    
    // Let other unhandled rejections through
  });
  
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error?.code === 'permission-denied' || 
        (error?.message && (
          error.message.includes('Missing or insufficient permissions') ||
          error.message.includes('FirebaseError: Missing or insufficient permissions') ||
          error.message.includes('INTERNAL ASSERTION FAILED') ||
          error.message.includes('INTERNAL UNHANDLED ERROR') ||
          error.message.includes('Unexpected state')
        ))) {
      
      debugLog('Suppressed uncaught Firebase error:', error.message);
      event.preventDefault(); // Prevent default error logging
      return;
    }
    
    // Let other errors through
  });
  
  handlersInstalled = true;
  debugLog('Global Firebase error handlers installed');
}

// Auto-install in browser environment
if (typeof window !== 'undefined') {
  // Install immediately
  installGlobalErrorHandlers();
  
  // Also install after DOM is ready to be sure
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGlobalErrorHandlers);
  }
}