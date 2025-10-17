import { useState, useEffect } from 'react';
import { initializeSafeFirebase, getFirebaseStatus } from '@/lib/firebase-safe';

export function useFirebaseInit() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initialize = async () => {
    try {
      setStatus('loading');
      setError(null);
      
      const success = await initializeSafeFirebase();
      
      if (success) {
        setStatus('success');
        setError(null);
      } else {
        setStatus('failed');
        setError('Initialization failed');
      }
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'Unknown error');
    }
  };

  const retry = () => {
    setRetryCount(prev => prev + 1);
    initialize();
  };

  useEffect(() => {
    initialize();
  }, [retryCount]);

  const fbStatus = getFirebaseStatus();

  return {
    status,
    error,
    retry,
    retryCount,
    isInitialized: fbStatus.isInitialized,
    activeListeners: fbStatus.activeListenersCount
  };
}