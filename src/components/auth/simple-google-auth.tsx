'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function SimpleGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  // Check for redirect result on component mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Google redirect login successful:', result.user.email);
          
          toast({
            title: "✅ Đăng nhập thành công",
            description: `Chào mừng ${result.user.displayName || result.user.email}!`,
          });
          
          // Redirect to home
          router.push('/');
        }
      } catch (error: any) {
        console.error('Google redirect error:', error);
        toast({
          variant: "destructive",
          title: "❌ Lỗi đăng nhập Google",
          description: error.message || "Đã xảy ra lỗi khi đăng nhập.",
        });
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    handleRedirectResult();
  }, [toast, router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      console.log('🚀 [SimpleGoogleAuth] Initiating Google sign-in with redirect...');
      
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Add custom parameters for better UX
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log('🔧 [SimpleGoogleAuth] Provider configured, starting redirect...');
      
      // Show user feedback before redirect
      toast({
        title: "🔄 Chuyển hướng đến Google",
        description: "Bạn sẽ được chuyển hướng đến trang đăng nhập Google...",
      });
      
      // Use redirect method to avoid popup/CSP issues
      await signInWithRedirect(auth, provider);
      
      // Page will redirect, so this won't execute
      console.log('✅ [SimpleGoogleAuth] Redirect initiated successfully');
      
    } catch (error: any) {
      console.error('❌ [SimpleGoogleAuth] Google login error:', error);
      
      toast({
        variant: "destructive",
        title: "❌ Lỗi đăng nhập Google", 
        description: `${error.code}: ${error.message}` || "Không thể khởi tạo đăng nhập Google.",
      });
      
      setIsLoading(false);
    }
  };

  if (isCheckingRedirect) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Đang kiểm tra đăng nhập Google...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Đăng nhập Google (Redirect)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Đang chuyển hướng...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Đăng nhập bằng Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}