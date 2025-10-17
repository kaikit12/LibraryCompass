// Firebase Connection Helper
import { db } from './firebase';
import { doc, getDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { initializeSafeFirebase, resetFirebaseConnection, getFirebaseStatus } from './firebase-safe';

export interface ConnectionStatus {
  isOnline: boolean;
  lastChecked: Date;
  error?: string;
}

class FirebaseConnectionManager {
  private connectionStatus: ConnectionStatus = {
    isOnline: false,
    lastChecked: new Date()
  };

  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  // Check Firebase connection by attempting a simple read
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      // First try to initialize safe Firebase
      const isInitialized = await initializeSafeFirebase();
      
      if (!isInitialized) {
        throw new Error('Firebase initialization failed');
      }

      // Try to read a small document or use a simple query
      const testDoc = doc(db, '_test_connection', 'test');
      await getDoc(testDoc);
      
      this.connectionStatus = {
        isOnline: true,
        lastChecked: new Date()
      };
    } catch (error: any) {
      console.warn('Firebase connection check failed:', error.message);
      
      this.connectionStatus = {
        isOnline: false,
        lastChecked: new Date(),
        error: error.message
      };

      // Handle specific Firebase internal errors
      if (error.message?.includes('INTERNAL ASSERTION FAILED') || 
          error.message?.includes('Unexpected state')) {
        console.warn('Firebase internal error detected, attempting reset');
        try {
          await resetFirebaseConnection();
        } catch (resetError) {
          console.error('Failed to reset Firebase connection:', resetError);
        }
      }
      // If it's an unavailable error, try to enable network
      else if (error.code === 'unavailable') {
        try {
          await enableNetwork(db);
          console.log('Attempted to re-enable Firebase network');
        } catch (enableError) {
          console.warn('Failed to re-enable network:', enableError);
        }
      }
    }

    // Notify all listeners
    this.notifyListeners();
    return this.connectionStatus;
  }

  // Start periodic connection monitoring
  startMonitoring() {
    // Check connection immediately
    this.checkConnection();

    // Then check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Get current connection status
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Subscribe to connection status changes
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Immediately call with current status
    callback(this.getStatus());

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Force offline mode
  async goOffline() {
    try {
      await disableNetwork(db);
      this.connectionStatus.isOnline = false;
      this.connectionStatus.lastChecked = new Date();
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to go offline:', error);
    }
  }

  // Force online mode
  async goOnline() {
    try {
      await enableNetwork(db);
      // Check connection after enabling
      setTimeout(() => this.checkConnection(), 1000);
    } catch (error) {
      console.error('Failed to go online:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.getStatus());
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }
}

// Global instance
export const firebaseConnectionManager = new FirebaseConnectionManager();

// Hook for React components
export function useFirebaseConnection() {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    firebaseConnectionManager.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = firebaseConnectionManager.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    ...status,
    checkConnection: () => firebaseConnectionManager.checkConnection(),
    goOffline: () => firebaseConnectionManager.goOffline(),
    goOnline: () => firebaseConnectionManager.goOnline()
  };
}

import React from 'react';