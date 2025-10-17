'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getFirebaseStatus, resetFirebaseConnection, cleanupFirebase } from '@/lib/firebase-safe';
import { useFirebaseConnection } from '@/lib/firebase-connection';

export function FirebaseDebugPanel() {
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  const { isOnline, error, lastChecked } = useFirebaseConnection();
  const [isResetting, setIsResetting] = React.useState(false);

  const updateDebugInfo = () => {
    setDebugInfo(getFirebaseStatus());
  };

  React.useEffect(() => {
    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetFirebaseConnection();
      console.log('Firebase connection reset');
    } catch (error) {
      console.error('Reset failed:', error);
    } finally {
      setIsResetting(false);
      updateDebugInfo();
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanupFirebase();
      console.log('Firebase cleaned up');
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      updateDebugInfo();
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-blue-800">Firebase Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Connection Status:</strong>
            <Badge variant={isOnline ? 'default' : 'destructive'} className="ml-2">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          <div>
            <strong>Last Check:</strong>
            <span className="ml-2">{lastChecked.toLocaleTimeString()}</span>
          </div>
          
          {debugInfo && (
            <>
              <div>
                <strong>Initialized:</strong>
                <Badge variant={debugInfo.isInitialized ? 'default' : 'secondary'} className="ml-2">
                  {debugInfo.isInitialized ? 'Yes' : 'No'}
                </Badge>
              </div>
              
              <div>
                <strong>Active Listeners:</strong>
                <span className="ml-2">{debugInfo.activeListenersCount}</span>
              </div>
              
              <div>
                <strong>Terminated:</strong>
                <Badge variant={debugInfo.isTerminated ? 'destructive' : 'default'} className="ml-2">
                  {debugInfo.isTerminated ? 'Yes' : 'No'}
                </Badge>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="p-2 bg-red-100 border border-red-200 rounded text-xs">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset Firebase'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
          >
            Cleanup
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={updateDebugInfo}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}