'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GoogleAuthDebug() {
  const [isLogging, setIsLogging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log('[GoogleAuthDebug]', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleAuth = async () => {
    setIsLogging(true);
    addDebug('=== Google Auth Test Started ===');
    
    try {
      // Check Firebase Auth availability
      if (!auth) {
        addDebug('❌ Firebase Auth not available');
        return;
      }
      addDebug('✅ Firebase Auth available');

      // Create Google provider
      addDebug('Creating Google Auth provider...');
      const provider = new GoogleAuthProvider();
      
      // Add scopes
      provider.addScope('email');
      provider.addScope('profile');
      addDebug('✅ Google provider created with scopes');

      // Test popup availability
      if (typeof window === 'undefined') {
        addDebug('❌ Running on server side');
        return;
      }
      addDebug('✅ Client side environment confirmed');

      // Check if popups are blocked
      addDebug('Testing popup availability...');
      const testPopup = window.open('', '_blank', 'width=1,height=1');
      if (testPopup) {
        testPopup.close();
        addDebug('✅ Popups appear to be allowed');
      } else {
        addDebug('⚠️ Popups might be blocked');
      }

      // Attempt sign in
      addDebug('Attempting Google sign-in popup...');
      const result = await signInWithPopup(auth, provider);
      
      addDebug(`✅ Sign-in successful!`);
      addDebug(`User: ${result.user.email}`);
      addDebug(`UID: ${result.user.uid}`);
      addDebug(`Display Name: ${result.user.displayName}`);
      addDebug(`Email Verified: ${result.user.emailVerified}`);

      // Get ID Token
      const idToken = await result.user.getIdToken();
      addDebug(`✅ ID Token obtained (length: ${idToken.length})`);

    } catch (error: any) {
      addDebug(`❌ Error occurred: ${error.code}`);
      addDebug(`Error message: ${error.message}`);
      
      // Common error interpretations
      if (error.code === 'auth/popup-closed-by-user') {
        addDebug('📝 User closed the popup window');
      } else if (error.code === 'auth/popup-blocked') {
        addDebug('📝 Popup was blocked by browser');
      } else if (error.code === 'auth/cancelled-popup-request') {
        addDebug('📝 Popup request was cancelled');
      } else if (error.code === 'auth/unauthorized-domain') {
        addDebug('📝 Domain not authorized in Firebase Console');
      }
    } finally {
      setIsLogging(false);
      addDebug('=== Google Auth Test Completed ===');
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Google Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testGoogleAuth}
            disabled={isLogging}
            className="flex-1"
          >
            {isLogging ? 'Testing Google Auth...' : 'Test Google Auth'}
          </Button>
          
          <Button 
            onClick={clearDebug}
            variant="outline"
          >
            Clear Log
          </Button>
        </div>
        
        <div>
          <strong>Debug Log:</strong>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded max-h-60 overflow-y-auto text-sm font-mono">
            {debugInfo.length === 0 ? 'No debug info yet...' : debugInfo.map((info, i) => (
              <div key={i} className="mb-1">{info}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}