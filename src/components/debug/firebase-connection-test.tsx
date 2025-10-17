'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FirebaseConnectionTest() {
  const [authState, setAuthState] = useState<string>('checking...');
  const [dbState, setDbState] = useState<string>('checking...');

  useEffect(() => {
    // Test Auth
    try {
      if (auth) {
        setAuthState(`✅ Auth initialized (${auth.app.name})`);
        
        // Listen for auth state
        auth.onAuthStateChanged((user) => {
          if (user) {
            setAuthState(`✅ User logged in: ${user.email}`);
          } else {
            setAuthState(`✅ Auth ready, no user logged in`);
          }
        });
      } else {
        setAuthState('❌ Auth not initialized');
      }
    } catch (error: any) {
      setAuthState(`❌ Auth error: ${error.message}`);
    }

    // Test Firestore
    try {
      if (db) {
        setDbState(`✅ Firestore initialized (${db.app.name})`);
      } else {
        setDbState('❌ Firestore not initialized');
      }
    } catch (error: any) {
      setDbState(`❌ Firestore error: ${error.message}`);
    }
  }, []);

  return (
    <Card className="max-w-md mx-auto mb-4">
      <CardHeader>
        <CardTitle>Firebase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div><strong>Auth:</strong> {authState}</div>
        <div><strong>Firestore:</strong> {dbState}</div>
      </CardContent>
    </Card>
  );
}