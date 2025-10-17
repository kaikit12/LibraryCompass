'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useFirebaseConnection } from '@/lib/firebase-connection';

export function ConnectionStatus() {
  const { isOnline, error, lastChecked, checkConnection, goOnline } = useFirebaseConnection();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await goOnline();
      await checkConnection();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  // Only show when offline or has error
  if (isOnline && !error) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">
            {error ? 'Kết nối Firebase gặp vấn đề' : 'Đang ở chế độ offline'}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            {error ? `Lỗi: ${error}` : 'Một số tính năng có thể bị hạn chế'}
          </span>
          <span className="text-xs text-muted-foreground">
            Kiểm tra lần cuối: {lastChecked.toLocaleTimeString('vi-VN')}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-auto"
          >
            {isRetrying ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Wifi className="h-3 w-3 mr-1" />
            )}
            {isRetrying ? 'Đang thử...' : 'Thử lại'}
          </Button>
          
          {error?.includes('INTERNAL ASSERTION FAILED') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-2"
            >
              Tải lại trang
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Component để hiển thị trong header/navbar
export function ConnectionIndicator() {
  const { isOnline, error } = useFirebaseConnection();

  if (isOnline && !error) {
    return (
      <div className="flex items-center text-green-600">
        <Wifi className="h-4 w-4 mr-1" />
        <span className="text-xs">Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-yellow-600">
      <WifiOff className="h-4 w-4 mr-1" />
      <span className="text-xs">Offline</span>
    </div>
  );
}