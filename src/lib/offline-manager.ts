// Offline Data Manager - Manages local storage for Firebase data
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

class OfflineDataManager {
  private static instance: OfflineDataManager;
  private cachePrefix = 'firebase_cache_';
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  // Store data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    try {
      const expiresAt = Date.now() + (ttl || this.defaultTTL);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt
      };
      
      localStorage.setItem(
        this.cachePrefix + key, 
        JSON.stringify(entry)
      );
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  // Get data from cache
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.cachePrefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      
      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to get cached data:', error);
      return null;
    }
  }

  // Remove specific cache entry
  remove(key: string): void {
    try {
      localStorage.removeItem(this.cachePrefix + key);
    } catch (error) {
      console.warn('Failed to remove cached data:', error);
    }
  }

  // Clear all cached data
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.cachePrefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Get all cache entries for a pattern
  getByPattern<T>(pattern: string): { [key: string]: T } {
    const results: { [key: string]: T } = {};
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.cachePrefix + pattern)
      );

      keys.forEach(fullKey => {
        const key = fullKey.replace(this.cachePrefix, '');
        const data = this.get<T>(key);
        if (data !== null) {
          results[key] = data;
        }
      });
    } catch (error) {
      console.warn('Failed to get cached data by pattern:', error);
    }

    return results;
  }

  // Check if data exists and is not expired
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Get cache info
  getCacheInfo(key: string): { exists: boolean; timestamp?: number; expiresAt?: number } {
    try {
      const item = localStorage.getItem(this.cachePrefix + key);
      if (!item) return { exists: false };

      const entry: CacheEntry = JSON.parse(item);
      return {
        exists: true,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt
      };
    } catch (error) {
      return { exists: false };
    }
  }
}

// Global instance
export const offlineDataManager = OfflineDataManager.getInstance();

// Helper functions for common Firebase collections
export const FirebaseCache = {
  // Books
  setBooks: (books: any[]) => offlineDataManager.set('books', books, 10 * 60 * 1000), // 10 min
  getBooks: () => offlineDataManager.get<any[]>('books'),
  
  // Users/Readers
  setUsers: (users: any[]) => offlineDataManager.set('users', users, 10 * 60 * 1000),
  getUsers: () => offlineDataManager.get<any[]>('users'),
  
  // Borrowing records
  setBorrowings: (borrowings: any[]) => offlineDataManager.set('borrowings', borrowings, 5 * 60 * 1000), // 5 min
  getBorrowings: () => offlineDataManager.get<any[]>('borrowings'),
  
  // Current user
  setCurrentUser: (user: any) => offlineDataManager.set('current_user', user, 30 * 60 * 1000), // 30 min
  getCurrentUser: () => offlineDataManager.get<any>('current_user'),
  
  // Clear all
  clearAll: () => offlineDataManager.clear()
};

// Hook for offline-aware data fetching
export function useOfflineAware<T>(
  key: string, 
  fetchFn: () => Promise<T>,
  ttl?: number
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFromCache, setIsFromCache] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      const cachedData = offlineDataManager.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);
        setLoading(false);
      }

      // Try to fetch fresh data
      try {
        const freshData = await fetchFn();
        setData(freshData);
        setIsFromCache(false);
        
        // Cache the fresh data
        offlineDataManager.set(key, freshData, ttl);
      } catch (err: any) {
        setError(err.message);
        
        // If we have cached data, use it
        if (cachedData) {
          console.warn(`Using cached data for ${key} due to error:`, err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, ttl]);

  return { data, loading, error, isFromCache };
}

import React from 'react';