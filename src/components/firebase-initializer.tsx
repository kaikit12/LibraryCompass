'use client';

import { useEffect, useState } from 'react';
import { initializeSafeFirebase } from '@/lib/firebase-safe';

export function FirebaseInitializer() {
  const [initStatus, setInitStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const initFirebase = async () => {
      try {
        console.log('Starting Firebase initialization...');
        const success = await initializeSafeFirebase();
        
        if (success) {
          console.log('✅ Firebase initialized successfully');
          setInitStatus('success');
        } else {
          console.warn('⚠️ Firebase initialization failed, app will work in offline mode');
          setInitStatus('failed');
        }
      } catch (error) {
        console.error('❌ Critical error initializing Firebase:', error);
        setInitStatus('failed');
        
        // Still allow app to continue, just log the error
        console.warn('App will continue in offline mode');
      }
    };

    // Add a small delay to prevent race conditions
    const timer = setTimeout(initFirebase, 100);
    return () => clearTimeout(timer);
  }, []);

  // Only show loading state in development
  if (process.env.NODE_ENV === 'development' && initStatus === 'loading') {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded px-3 py-2 text-sm">
        🔄 Initializing Firebase...
      </div>
    );
  }

  return null;
}