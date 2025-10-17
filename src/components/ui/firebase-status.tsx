'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface FirebaseStatusProps {
  status: 'loading' | 'success' | 'failed';
  error?: string;
}

export function FirebaseStatus({ status, error }: FirebaseStatusProps) {
  if (status === 'success') return null; // Don't show anything when successful
  
  if (status === 'loading') {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <span className="font-medium">Đang kết nối Firebase...</span>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (status === 'failed') {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-col">
            <span className="font-medium">Firebase không khả dụng</span>
            <span className="text-sm text-muted-foreground mt-1">
              Ứng dụng sẽ hoạt động ở chế độ offline. Một số tính năng có thể bị hạn chế.
            </span>
            {error && (
              <span className="text-xs text-red-600 mt-1">
                Lỗi: {error}
              </span>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}