'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, User } from 'lucide-react';

export function AuthStatusIndicator() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  if (user) {
    // User is authenticated - show minimal success indicator
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-green-100 border border-green-300 rounded-full px-3 py-1 text-xs flex items-center gap-1">
        <User className="h-3 w-3" />
        <span>Đã đăng nhập</span>
      </div>
    );
  }

  // User not authenticated - show info
  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Lock className="h-4 w-4" />
      <AlertDescription>
        <div className="flex flex-col">
          <span className="font-medium">Chưa đăng nhập</span>
          <span className="text-sm text-muted-foreground mt-1">
            Vui lòng đăng nhập để sử dụng đầy đủ tính năng của ứng dụng.
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}