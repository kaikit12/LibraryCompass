/**
 * Optimized Book List Component for Performance
 * - Intersection Observer for lazy loading
 * - Infinite scroll support
 * - Responsive grid layout
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo
} from 'react';
import { useIntersectionObserver } from '../../hooks/use-intersection-observer';
import { OptimizedBookCard, BookCardSkeleton, BookCardErrorBoundary } from './book-card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import type { Book } from '@/lib/types';

interface OptimizedBookListProps {
  books: Book[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onBookAction?: (book: Book, action: 'borrow' | 'reserve' | 'wishlist') => void;
  variant?: 'default' | 'compact' | 'detailed';
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

// Loading indicator component
const LoadingIndicator = memo(() => (
  <div className="flex items-center justify-center py-8">
    <div className="flex items-center gap-2 text-muted-foreground">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <span>Loading more books...</span>
    </div>
  </div>
));

LoadingIndicator.displayName = 'LoadingIndicator';

// Error component
const ErrorDisplay = memo(({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry?: () => void; 
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try again
      </Button>
    )}
  </div>
));

ErrorDisplay.displayName = 'ErrorDisplay';

export const OptimizedBookList = memo(({
  books,
  loading = false,
  hasMore = false,
  onLoadMore,
  onBookAction,
  variant = 'default',
  error = null,
  onRetry,
  className = ''
}: OptimizedBookListProps) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const { isIntersecting } = useIntersectionObserver(loadMoreRef, {
    threshold: 0.1,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  if (error) {
    return <ErrorDisplay message={error} onRetry={onRetry} />;
  }

  if (books.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No books found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  const gridCols = variant === 'compact' ? 
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' :
    variant === 'detailed' ?
    'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
    'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Books Grid */}
      <div className={`grid gap-4 ${gridCols}`}>
        {books.map((book, index) => (
          <BookCardErrorBoundary key={book.id}>
            <OptimizedBookCard
              book={book}
              onQuickAction={onBookAction}
              variant={variant}
              priority={index < 8} // Priority for first 8 books
            />
          </BookCardErrorBoundary>
        ))}
        
        {/* Loading skeletons */}
        {loading && Array.from({ length: 4 }).map((_, index) => (
          <BookCardSkeleton key={`skeleton-${index}`} variant={variant} />
        ))}
      </div>

      {/* Load more indicator */}
      {hasMore && (
        <div ref={loadMoreRef}>
          {loading ? (
            <LoadingIndicator />
          ) : (
            <div className="text-center py-4">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={loading}
              >
                Load more books
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Initial loading skeleton */}
      {loading && books.length === 0 && (
        <div className={`grid gap-4 ${gridCols}`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <BookCardSkeleton key={index} variant={variant} />
          ))}
        </div>
      )}
    </div>
  );
});

OptimizedBookList.displayName = 'OptimizedBookList';

// Hook for managing optimized list state
export function useOptimizedBookList({
  initialBooks = [],
  pageSize = 20
}: {
  initialBooks?: Book[];
  pageSize?: number;
} = {}) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async (
    loadFunction: (lastBook?: Book) => Promise<{ books: Book[]; hasMore: boolean }>
  ) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const lastBook = books[books.length - 1];
      const result = await loadFunction(lastBook);
      
      setBooks(prev => [...prev, ...result.books]);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [books, loading]);

  const reset = useCallback((newBooks: Book[] = []) => {
    setBooks(newBooks);
    setHasMore(true);
    setError(null);
  }, []);

  const retry = useCallback(() => {
    setError(null);
  }, []);

  return {
    books,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    retry,
    setBooks,
    setLoading,
    setHasMore,
    setError
  };
}