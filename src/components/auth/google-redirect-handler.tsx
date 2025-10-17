'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getRedirectResult } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function GoogleRedirectHandler() {
  const { toast } = useToast();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        console.log('[GoogleRedirectHandler] Checking for redirect result...');
        
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('[GoogleRedirectHandler] Redirect result found:', result.user.email);
          
          toast({
            title: "✅ Đăng nhập thành công",
            description: `Chào mừng ${result.user.displayName || result.user.email}!`,
          });
          
          // Redirect to home or dashboard
          router.push('/');
        } else {
          console.log('[GoogleRedirectHandler] No redirect result');
        }
      } catch (error: any) {
        console.error('[GoogleRedirectHandler] Redirect result error:', error);
        
        toast({
          variant: "destructive",
          title: "❌ Lỗi đăng nhập Google",
          description: error.message || "Đã xảy ra lỗi khi xử lý đăng nhập Google.",
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkRedirectResult();
  }, [toast, router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Đang xử lý đăng nhập Google...</p>
        </div>
      </div>
    );
  }

  return null;
}