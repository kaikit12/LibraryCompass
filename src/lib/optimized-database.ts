/**
 * Optimized Database Operations with Caching and Performance Improvements
 */

import { 
    db, 
    safeOnSnapshot 
} from './firebase';
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter, 
    endBefore,
    writeBatch,
    runTransaction,
    serverTimestamp,
    DocumentSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
import type { Book, Reader, BorrowRecord, Reservation } from './types';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number; expiry: number }>();

// Cache helper functions
function getCacheKey(operation: string, params: any = {}): string {
    return `${operation}_${JSON.stringify(params)}`;
}

function setCache(key: string, data: any, duration: number = CACHE_DURATION) {
    const now = Date.now();
    cache.set(key, {
        data,
        timestamp: now,
        expiry: now + duration
    });
}

function getCache(key: string): any | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
        cache.delete(key);
        return null;
    }
    
    return cached.data;
}

function clearCacheByPattern(pattern: string) {
    const keys = Array.from(cache.keys());
    keys.forEach(key => {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    });
}

// Optimized book operations
export class OptimizedBookService {
    private static instance: OptimizedBookService;
    
    static getInstance(): OptimizedBookService {
        if (!OptimizedBookService.instance) {
            OptimizedBookService.instance = new OptimizedBookService();
        }
        return OptimizedBookService.instance;
    }

    // Get books with pagination and caching
    async getBooks(options: {
        pageSize?: number;
        startAfterDoc?: DocumentSnapshot;
        genre?: string;
        searchTerm?: string;
        sortBy?: 'title' | 'author' | 'addedAt';
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<{ books: Book[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
        const {
            pageSize = 20,
            startAfterDoc,
            genre,
            searchTerm,
            sortBy = 'addedAt',
            sortOrder = 'desc'
        } = options;

        const cacheKey = getCacheKey('getBooks', { 
            pageSize, 
            genre, 
            searchTerm, 
            sortBy, 
            sortOrder,
            startAfter: startAfterDoc?.id 
        });

        // Check cache first (only for first page without search)
        if (!startAfterDoc && !searchTerm) {
            const cached = getCache(cacheKey);
            if (cached) return cached;
        }

        try {
            let booksQuery = collection(db, 'books');

            // Apply filters
            const constraints: any[] = [];

            if (genre && genre !== 'all') {
                constraints.push(where('genre', '==', genre));
            }

            // For search, we need to implement client-side filtering since Firestore
            // doesn't support full-text search natively
            if (!searchTerm) {
                constraints.push(orderBy(sortBy, sortOrder));
                
                if (startAfterDoc) {
                    constraints.push(startAfter(startAfterDoc));
                }
                
                constraints.push(limit(pageSize + 1)); // Get one extra to check for hasMore
            }

            const finalQuery = query(booksQuery, ...constraints);
            const snapshot = await getDocs(finalQuery);

            let books = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Book[];

            // Client-side search filtering
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                books = books.filter(book => 
                    book.title.toLowerCase().includes(searchLower) ||
                    book.author.toLowerCase().includes(searchLower) ||
                    book.isbn?.toLowerCase().includes(searchLower)
                );
                
                // Apply sorting after filtering
                books.sort((a, b) => {
                    const aValue = a[sortBy as keyof Book];
                    const bValue = b[sortBy as keyof Book];
                    
                    if (sortOrder === 'asc') {
                        return (aValue as any) > (bValue as any) ? 1 : -1;
                    } else {
                        return (aValue as any) < (bValue as any) ? 1 : -1;
                    }
                });

                // Apply pagination after filtering and sorting
                const startIndex = startAfterDoc ? 
                    books.findIndex(book => book.id === startAfterDoc.id) + 1 : 0;
                books = books.slice(startIndex, startIndex + pageSize + 1);
            }

            const hasMore = books.length > pageSize;
            if (hasMore) {
                books = books.slice(0, pageSize);
            }

            const lastDoc = snapshot.docs[Math.min(pageSize - 1, snapshot.docs.length - 1)];

            const result = {
                books,
                hasMore,
                lastDoc
            };

            // Cache the result (only for first page without search)
            if (!startAfterDoc && !searchTerm) {
                setCache(cacheKey, result);
            }

            return result;

        } catch (error) {
            console.error('Error getting books:', error);
            throw new Error('Failed to fetch books');
        }
    }

    // Get book by ID with caching
    async getBookById(bookId: string): Promise<Book | null> {
        const cacheKey = getCacheKey('getBookById', { bookId });
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const bookDoc = await getDoc(doc(db, 'books', bookId));
            
            if (!bookDoc.exists()) {
                return null;
            }

            const book = {
                id: bookDoc.id,
                ...bookDoc.data()
            } as Book;

            setCache(cacheKey, book);
            return book;

        } catch (error) {
            console.error('Error getting book:', error);
            return null;
        }
    }

    // Batch update books
    async updateBooks(updates: Array<{ id: string; data: Partial<Book> }>): Promise<void> {
        if (updates.length === 0) return;

        const batch = writeBatch(db);
        const maxBatchSize = 500;
        
        for (let i = 0; i < updates.length; i += maxBatchSize) {
            const batchUpdates = updates.slice(i, i + maxBatchSize);
            
            for (const update of batchUpdates) {
                const bookRef = doc(db, 'books', update.id);
                batch.update(bookRef, {
                    ...update.data,
                    updatedAt: serverTimestamp()
                });
            }
        }

        await batch.commit();
        
        // Clear relevant cache
        clearCacheByPattern('getBooks');
        updates.forEach(update => {
            cache.delete(getCacheKey('getBookById', { bookId: update.id }));
        });
    }
}

// Optimized user operations
export class OptimizedUserService {
    private static instance: OptimizedUserService;
    
    static getInstance(): OptimizedUserService {
        if (!OptimizedUserService.instance) {
            OptimizedUserService.instance = new OptimizedUserService();
        }
        return OptimizedUserService.instance;
    }

    async getUserById(userId: string): Promise<Reader | null> {
        const cacheKey = getCacheKey('getUserById', { userId });
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            
            if (!userDoc.exists()) {
                return null;
            }

            const user = {
                id: userDoc.id,
                ...userDoc.data()
            } as Reader;

            setCache(cacheKey, user, 2 * 60 * 1000); // 2 minutes for user data
            return user;

        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    async getUserBorrowingHistory(userId: string, limitCount: number = 10): Promise<BorrowRecord[]> {
        const cacheKey = getCacheKey('getUserBorrowingHistory', { userId, limit: limitCount });
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            const borrowalsQuery = query(
                collection(db, 'borrowals'),
                where('userId', '==', userId),
                orderBy('borrowedAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(borrowalsQuery);
            const borrowals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BorrowRecord[];

            setCache(cacheKey, borrowals, 2 * 60 * 1000); // 2 minutes
            return borrowals;

        } catch (error) {
            console.error('Error getting borrowing history:', error);
            return [];
        }
    }
}

// Optimized analytics service
export class AnalyticsService {
    private static instance: AnalyticsService;
    
    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    async getDashboardStats(): Promise<{
        totalBooks: number;
        totalUsers: number;
        booksOut: number;
        overdueBooks: number;
    }> {
        const cacheKey = getCacheKey('getDashboardStats');
        const cached = getCache(cacheKey);
        if (cached) return cached;

        try {
            // Get stats using separate queries (can't use collections in transactions)
            const [booksSnapshot, usersSnapshot, borrowalsSnapshot] = await Promise.all([
                getDocs(collection(db, 'books')),
                getDocs(collection(db, 'users')),
                getDocs(query(collection(db, 'borrowals'), where('returnedAt', '==', null)))
            ]);

            const now = new Date();
            const overdueBooks = borrowalsSnapshot.docs.filter(doc => {
                const data = doc.data();
                const dueDate = data.dueDate?.toDate();
                return dueDate && dueDate < now;
            });

            const stats = {
                totalBooks: booksSnapshot.size,
                totalUsers: usersSnapshot.size,
                booksOut: borrowalsSnapshot.size,
                overdueBooks: overdueBooks.length
            };

            setCache(cacheKey, stats, 5 * 60 * 1000); // 5 minutes
            return stats;

        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return {
                totalBooks: 0,
                totalUsers: 0,
                booksOut: 0,
                overdueBooks: 0
            };
        }
    }
}

// Export singleton instances
export const bookService = OptimizedBookService.getInstance();
export const userService = OptimizedUserService.getInstance();
export const analyticsService = AnalyticsService.getInstance();

// Cache management utilities
export const cacheUtils = {
    clear: () => cache.clear(),
    clearPattern: clearCacheByPattern,
    size: () => cache.size,
    getStats: () => ({
        totalEntries: cache.size,
        memoryUsage: JSON.stringify(Array.from(cache.values())).length
    })
};