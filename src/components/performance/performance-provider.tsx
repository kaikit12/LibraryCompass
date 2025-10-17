/**
 * Performance Provider Component
 * Initializes and manages performance monitoring across the app
 */

"use client";

import React, { useEffect, createContext, useContext } from 'react';
import { initPerformanceMonitoring, performanceMonitor, cacheManager } from '@/lib/performance';

interface PerformanceContextType {
  monitor: typeof performanceMonitor;
  cache: typeof cacheManager;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize performance monitoring on mount
    initPerformanceMonitoring();
  }, []);

  const value = {
    monitor: performanceMonitor,
    cache: cacheManager,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

// HOC for component performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Performance] ${componentName} render time: ${renderTime.toFixed(2)}ms`);
        }
      };
    });

    return <Component {...props} />;
  };
}