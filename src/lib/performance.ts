import { PerformanceMetric } from './types';
/**
 * Performance Monitoring and Optimization Utilities
 */

import React from 'react';

// Import web-vitals dynamically since it might not be available in SSR
const importWebVitals = () => import('web-vitals');

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: { [key: string]: unknown } = {};

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  async initWebVitals() {
    if (typeof window === 'undefined') return;

    try {
      const webVitals = await importWebVitals();
      // Core Web Vitals
      webVitals.onCLS(this.sendToAnalytics.bind(this));
      // Note: FID is deprecated, use INP instead
      if ('onINP' in webVitals) {
        webVitals.onINP(this.sendToAnalytics.bind(this));
      }
      webVitals.onFCP(this.sendToAnalytics.bind(this));
      webVitals.onLCP(this.sendToAnalytics.bind(this));
      webVitals.onTTFB(this.sendToAnalytics.bind(this));
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  private sendToAnalytics(metric: unknown) {
    this.metrics[(metric as PerformanceMetric).name] = (metric as PerformanceMetric).value;

    const perfMetric = metric as PerformanceMetric;
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${perfMetric.name}: ${perfMetric.value}`);
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToFirebaseAnalytics(perfMetric);
    }
  }

  private sendToFirebaseAnalytics(metric: PerformanceMetric) {
    // Implement Firebase Analytics tracking
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  // Memory monitoring
  measureMemoryUsage() {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      memoryUsagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  // Resource timing
  measureResourceTiming() {
    if (typeof window === 'undefined' || !performance.getEntriesByType) {
      return [];
    }

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: resource.transferSize,
      type: resource.initiatorType
    }));
  }

  // Bundle size analysis
  analyzeBundleSize() {
    const resources = this.measureResourceTiming();
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const cssResources = resources.filter(r => r.name.endsWith('.css'));

    return {
      totalJSSize: jsResources.reduce((total, r) => total + (r.size || 0), 0),
      totalCSSSize: cssResources.reduce((total, r) => total + (r.size || 0), 0),
      jsFiles: jsResources.length,
      cssFiles: cssResources.length
    };
  }
}

// Lazy loading utilities
export class LazyLoadManager {
  private static instance: LazyLoadManager;
  private observer: IntersectionObserver | null = null;
  private loadedImages = new Set<string>();

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  init() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target as HTMLImageElement);
            this.observer?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px'
      }
    );
  }

  observeImage(img: HTMLImageElement) {
    if (this.observer && !this.loadedImages.has(img.src)) {
      this.observer.observe(img);
    }
  }

  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (src && !this.loadedImages.has(src)) {
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      this.loadedImages.add(src);
    }
  }
}

// Code splitting utilities
export const dynamicImports = {
  // Lazy load heavy components - these paths should be updated based on actual component locations
  // Example: BookEditor: () => import('@/components/books/book-editor').then(m => ({ default: m.BookEditor })),
};

// Cache management
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: unknown, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Image optimization
export const imageOptimization = {
  // Generate responsive image sources
  generateSrcSet(src: string, sizes: number[] = [320, 640, 768, 1024, 1280]) {
    return sizes.map(size => `${src}?w=${size}&q=75 ${size}w`).join(', ');
  },

  // Get optimized image props
  getImageProps(src: string, alt: string, priority = false) {
    return {
      src,
      alt,
      loading: priority ? 'eager' : 'lazy',
      decoding: 'async',
      sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      quality: 75,
      priority
    };
  },

  // Preload critical images
  preloadImage(src: string) {
    if (typeof window === 'undefined') return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
};

// Performance hooks
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  React.useEffect(() => {
    monitor.initWebVitals();
  }, []);

  return {
    getMetrics: () => monitor.getMetrics(),
    measureMemory: () => monitor.measureMemoryUsage(),
    analyzeBundles: () => monitor.analyzeBundleSize()
  };
}

// React performance utilities
export const reactOptimizations = {
  // Memoize expensive calculations
  useMemoizedValue: <T>(factory: () => T, deps: React.DependencyList): T => {
    return React.useMemo(factory, deps);
  },

  // Debounced callback
  useDebounced: <T extends (...args: unknown[]) => any>(callback: T, delay: number): T => {
    const debouncedCallback = React.useRef<T>();

    React.useEffect(() => {
      debouncedCallback.current = callback;
    }, [callback]);

    return React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      
      return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          debouncedCallback.current?.(...args);
        }, delay);
      }) as T;
    }, [delay]);
  },

  // Throttled callback
  useThrottled: <T extends (...args: unknown[]) => any>(callback: T, delay: number): T => {
    const throttledCallback = React.useRef<T>();
    const lastCall = React.useRef(0);

    React.useEffect(() => {
      throttledCallback.current = callback;
    }, [callback]);

    return React.useMemo(() => {
      return ((...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall.current >= delay) {
          lastCall.current = now;
          throttledCallback.current?.(...args);
        }
      }) as T;
    }, [delay]);
  }
};

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  const monitor = PerformanceMonitor.getInstance();
  const lazyLoader = LazyLoadManager.getInstance();
  const cache = CacheManager.getInstance();

  // Initialize web vitals
  monitor.initWebVitals();

  // Initialize lazy loading
  lazyLoader.init();

  // Cleanup cache periodically
  setInterval(() => {
    cache.cleanup();
  }, 60000); // Every minute

  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.log('Performance Metrics:', monitor.getMetrics());
      console.log('Memory Usage:', monitor.measureMemoryUsage());
      console.log('Bundle Analysis:', monitor.analyzeBundleSize());
    }, 3000);
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const lazyLoadManager = LazyLoadManager.getInstance();
export const cacheManager = CacheManager.getInstance();