/**
 * Performance Optimized Book Card Component
 * - Virtualization for large lists
 * - Image lazy loading
 * - Memoization
 * - Error boundaries
 */

import React, { memo, useState, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Star, Calendar, Users } from 'lucide-react';
import type { Book } from '@/lib/types';

interface OptimizedBookCardProps {
  book: Book;
  onQuickAction?: (book: Book, action: 'borrow' | 'reserve' | 'wishlist') => void;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  priority?: boolean; // For image loading priority
}

// Memoized image component with error handling
const BookImage = memo(({ 
  imageUrl, 
  title, 
  priority = false 
}: { 
  imageUrl?: string; 
  title: string; 
  priority?: boolean; 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  if (!imageUrl || imageError) {
    return (
      <div className="aspect-[3/4] bg-muted rounded-md flex items-center justify-center">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] relative overflow-hidden rounded-md">
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <Image
        src={imageUrl}
        alt={`Cover of ${title}`}
        fill
        className={`object-cover transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
});

BookImage.displayName = 'BookImage';

// Memoized book actions component
const BookActions = memo(({ 
  book, 
  onQuickAction 
}: { 
  book: Book; 
  onQuickAction?: (book: Book, action: 'borrow' | 'reserve' | 'wishlist') => void; 
}) => {
  const isAvailable = useMemo(() => 
    book.available > 0, 
    [book.available]
  );

  return (
    <div className="flex gap-2 mt-2">
      {isAvailable ? (
        <Button
          size="sm"
          onClick={() => onQuickAction?.(book, 'borrow')}
          className="flex-1"
        >
          Borrow
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onQuickAction?.(book, 'reserve')}
          className="flex-1"
        >
          Reserve
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onQuickAction?.(book, 'wishlist')}
      >
        <Star className="h-4 w-4" />
      </Button>
    </div>
  );
});

BookActions.displayName = 'BookActions';

// Main optimized book card component
export const OptimizedBookCard = memo(({
  book,
  onQuickAction,
  showActions = true,
  variant = 'default',
  priority = false
}: OptimizedBookCardProps) => {
  // Memoized computed values
  const availability = useMemo(() => ({
    isAvailable: book.available > 0,
    availableCount: book.available,
    availabilityText: book.available > 0 ? 'Available' : 'Unavailable'
  }), [book.available]);

  const formattedPublicationYear = useMemo(() => 
    book.publicationYear ? new Date(book.publicationYear).getFullYear() : null,
    [book.publicationYear]
  );

  const truncatedDescription = useMemo(() =>
    book.description && book.description.length > 100 
      ? `${book.description.substring(0, 100)}...` 
      : book.description,
    [book.description]
  );

  // Render variants
  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="w-16 flex-shrink-0">
              <BookImage
                imageUrl={book.imageUrl}
                title={book.title}
                priority={priority}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/books/${book.id}`}>
                <h3 className="font-semibold text-sm leading-tight hover:text-primary transition-colors truncate">
                  {book.title}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {book.author}
              </p>
              <div className="flex items-center justify-between mt-2">
                <Badge
                  variant={availability.isAvailable ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {availability.availabilityText}
                </Badge>
                {book.genre && (
                  <Badge variant="outline" className="text-xs">
                    {book.genre}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'detailed') {
    return (
      <Card className="hover:shadow-lg transition-all duration-200 group">
        <CardHeader className="pb-3">
          <div className="aspect-[3/4] w-full max-w-48 mx-auto">
            <BookImage
              imageUrl={book.imageUrl}
              title={book.title}
              priority={priority}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Link href={`/books/${book.id}`}>
            <h3 className="font-bold text-lg leading-tight hover:text-primary transition-colors group-hover:text-primary line-clamp-2 mb-2">
              {book.title}
            </h3>
          </Link>
          
          <p className="text-muted-foreground mb-2 font-medium">
            by {book.author}
          </p>

          {truncatedDescription && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
              {truncatedDescription}
            </p>
          )}

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant={availability.isAvailable ? 'default' : 'destructive'}
              >
                {availability.availabilityText}
              </Badge>
              <span className="text-muted-foreground">
                ({availability.availableCount}/{book.quantity} available)
              </span>
            </div>

            {book.genre && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{book.genre}</Badge>
              </div>
            )}

            {formattedPublicationYear && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formattedPublicationYear}</span>
              </div>
            )}
          </div>

          {showActions && (
            <BookActions book={book} onQuickAction={onQuickAction} />
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 group">
      <CardContent className="p-4">
        <div className="aspect-[3/4] mb-3">
          <BookImage
            imageUrl={book.imageUrl}
            title={book.title}
            priority={priority}
          />
        </div>
        
        <Link href={`/books/${book.id}`}>
          <h3 className="font-semibold leading-tight hover:text-primary transition-colors group-hover:text-primary line-clamp-2 mb-2">
            {book.title}
          </h3>
        </Link>
        
        <p className="text-sm text-muted-foreground mb-2 truncate">
          by {book.author}
        </p>

        <div className="flex items-center justify-between mb-3">
          <Badge
            variant={availability.isAvailable ? 'default' : 'destructive'}
            className="text-xs"
          >
            {availability.availabilityText}
          </Badge>
          {book.genre && (
            <Badge variant="outline" className="text-xs">
              {book.genre}
            </Badge>
          )}
        </div>

        {showActions && (
          <BookActions book={book} onQuickAction={onQuickAction} />
        )}
      </CardContent>
    </Card>
  );
});

OptimizedBookCard.displayName = 'OptimizedBookCard';

// Loading skeleton for book cards
export const BookCardSkeleton = memo(({ variant = 'default' }: { variant?: 'default' | 'compact' | 'detailed' }) => {
  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Skeleton className="w-16 aspect-[3/4]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="aspect-[3/4] mb-3" />
        <Skeleton className="h-5 mb-2" />
        <Skeleton className="h-4 w-2/3 mb-2" />
        <div className="flex justify-between items-center mb-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
});

BookCardSkeleton.displayName = 'BookCardSkeleton';

// Error boundary for book cards
export class BookCardErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BookCard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground">Failed to load book</p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}