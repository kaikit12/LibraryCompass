'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signInWithPopup } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GoogleAuthAlternative() {
  const [isLogging, setIsLogging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log('[GoogleAuthAlternative]', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check for redirect result on mount
  const checkRedirectResult = async () => {
    addDebug('Checking for redirect result...');
    
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        addDebug(`✅ Redirect login successful: ${result.user.email}`);
      } else {
        addDebug('No redirect result found');
      }
    } catch (error: any) {
      addDebug(`❌ Redirect result error: ${error.code} - ${error.message}`);
    }
  };

  const tryPopupMethod = async () => {
    setIsLogging(true);
    addDebug('=== Trying Popup Method ===');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      addDebug('Attempting popup sign-in...');
      const result = await signInWithPopup(auth, provider);
      
      addDebug(`✅ Popup login successful: ${result.user.email}`);
      
    } catch (error: any) {
      addDebug(`❌ Popup method failed: ${error.code} - ${error.message}`);
      
      if (error.code === 'auth/popup-blocked' || 
          error.code === 'auth/internal-error' ||
          error.message.includes('Content Security Policy')) {
        addDebug('🔄 Popup blocked, trying redirect method...');
        await tryRedirectMethod();
      }
    } finally {
      setIsLogging(false);
    }
  };

  const tryRedirectMethod = async () => {
    addDebug('=== Trying Redirect Method ===');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      addDebug('Initiating redirect sign-in...');
      await signInWithRedirect(auth, provider);
      
      // This will redirect the page, so we won't reach this line
      addDebug('Redirect initiated (page should redirect now)');
      
    } catch (error: any) {
      addDebug(`❌ Redirect method failed: ${error.code} - ${error.message}`);
    }
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Google Auth Alternative Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={checkRedirectResult}
            variant="outline"
          >
            Check Redirect Result
          </Button>
          
          <Button 
            onClick={tryPopupMethod}
            disabled={isLogging}
          >
            {isLogging ? 'Trying Popup...' : 'Try Popup Method'}
          </Button>
          
          <Button 
            onClick={tryRedirectMethod}
            variant="secondary"
          >
            Try Redirect Method
          </Button>
          
          <Button 
            onClick={clearDebug}
            variant="outline"
          >
            Clear Log
          </Button>
        </div>
        
        <div>
          <strong>Alternative Methods Log:</strong>
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