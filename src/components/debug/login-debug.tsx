'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginDebug() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [isGoogleLogging, setIsGoogleLogging] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log('[LoginDebug]', message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleLogin = async () => {
    setIsLogging(true);
    addDebug(`Starting login for: ${email}`);
    
    try {
      const result = await login(email, password);
      addDebug(`Login successful: ${(result as any)?.user?.uid || 'No user ID'}`);
    } catch (error: any) {
      addDebug(`Login failed: ${error.code} - ${error.message}`);
    } finally {
      setIsLogging(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLogging(true);
    addDebug('Starting Google login...');
    
    try {
      await loginWithGoogle();
      addDebug('Google login successful');
    } catch (error: any) {
      addDebug(`Google login failed: ${error.code} - ${error.message}`);
    } finally {
      setIsGoogleLogging(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Login Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Auth State:</strong> {loading ? 'Loading...' : user ? `Logged in as ${user.email}` : 'Not logged in'}
        </div>
        
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Input
          type="password" 
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <Button 
          onClick={handleLogin}
          disabled={isLogging || !email || !password}
          className="w-full mb-2"
        >
          {isLogging ? 'Logging in...' : 'Debug Login'}
        </Button>
        
        <Button 
          onClick={handleGoogleLogin}
          disabled={isGoogleLogging}
          className="w-full"
          variant="outline"
        >
          {isGoogleLogging ? 'Google Login...' : 'Debug Google Login'}
        </Button>
        
        <div className="mt-4">
          <strong>Debug Log:</strong>
          <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-auto text-sm">
            {debugInfo.length === 0 ? 'No debug info yet...' : debugInfo.map((info, i) => (
              <div key={i}>{info}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}