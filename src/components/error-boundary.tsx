'use client';

import React from 'react';
import { debugLog } from '@/lib/firebase-config';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export class FirebaseErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if this is a Firebase permission error
    if (error?.message?.includes('Missing or insufficient permissions') ||
        error?.message?.includes('permission-denied') ||
        (error as any)?.code === 'permission-denied') {
      
      debugLog('Firebase permission error caught by boundary, suppressing:', error.message);
      // Don't treat permission errors as actual errors - just log and continue
      return { hasError: false };
    }
    
    // For other errors, show error boundary
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't log Firebase permission errors
    if (error?.message?.includes('Missing or insufficient permissions') ||
        error?.message?.includes('permission-denied') ||
        (error as any)?.code === 'permission-denied') {
      return;
    }
    
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error} 
            reset={() => this.setState({ hasError: false, error: undefined })}
          />
        );
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}