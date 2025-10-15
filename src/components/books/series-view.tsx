'use client';

import { useMemo } from 'react';
import { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SeriesViewProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  userBorrowedBooks?: string[]; // IDs of books user has borrowed/read
}

interface SeriesGroup {
  seriesName: string;
  books: Book[];
  totalBooks: number;
  readCount: number;
  progress: number;
}

export function SeriesView({ books, onBookClick, userBorrowedBooks = [] }: SeriesViewProps) {
  const seriesGroups = useMemo(() => {
    // Group books by series
    const groups: Record<string, Book[]> = {};
    
    books.forEach(book => {
      if (book.series) {
        if (!groups[book.series]) {
          groups[book.series] = [];
        }
        groups[book.series].push(book);
      }
    });

    // Convert to array and sort
    const seriesArray: SeriesGroup[] = Object.entries(groups).map(([seriesName, seriesBooks]) => {
      // Sort books by seriesOrder
      const sortedBooks = [...seriesBooks].sort((a, b) => 
        (a.seriesOrder || 0) - (b.seriesOrder || 0)
      );

      const totalBooks = sortedBooks[0]?.totalInSeries || sortedBooks.length;
      const readCount = sortedBooks.filter(book => userBorrowedBooks.includes(book.id)).length;
      const progress = totalBooks > 0 ? (readCount / totalBooks) * 100 : 0;

      return {
        seriesName,
        books: sortedBooks,
        totalBooks,
        readCount,
        progress
      };
    });

    // Sort series by name
    return seriesArray.sort((a, b) => a.seriesName.localeCompare(b.seriesName));
  }, [books, userBorrowedBooks]);

  if (seriesGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Chưa có bộ sách nào trong thư viện.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {seriesGroups.map((series) => (
        <Card key={series.seriesName} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <span className="text-2xl">📚</span>
                  {series.seriesName}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{series.totalBooks} tập</span>
                  <span>•</span>
                  <span>{series.books.length} cuốn có sẵn</span>
                  {series.readCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Đã đọc {series.readCount}/{series.totalBooks}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {series.readCount > 0 && (
                <div className="min-w-[120px]">
                  <div className="text-xs text-muted-foreground mb-1">Tiến độ</div>
                  <Progress value={series.progress} className="h-2" />
                  <div className="text-xs text-right mt-1 font-medium">
                    {Math.round(series.progress)}%
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {series.books.map((book) => {
                const isRead = userBorrowedBooks.includes(book.id);
                const isAvailable = book.status === 'Available';

                return (
                  <div
                    key={book.id}
                    className={cn(
                      "group relative rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer",
                      isRead && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    )}
                    onClick={() => onBookClick?.(book)}
                  >
                    {/* Read status badge */}
                    {isRead && (
                      <div className="absolute -top-2 -right-2 z-10">
                        <Badge className="bg-green-600 hover:bg-green-600 shadow-md">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Đã đọc
                        </Badge>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {/* Book cover */}
                      <div className="relative w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-muted">
                        {book.imageUrl ? (
                          <Image
                            src={book.imageUrl}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            📖
                          </div>
                        )}
                      </div>

                      {/* Book info */}
                      <div className="flex-1 min-w-0">
                        {/* Series order badge */}
                        {book.seriesOrder && (
                          <Badge variant="outline" className="text-xs mb-1">
                            Tập {book.seriesOrder}
                            {book.totalInSeries && `/${book.totalInSeries}`}
                          </Badge>
                        )}

                        <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                          {book.title}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {book.author}
                        </p>

                        {/* Status */}
                        <div className="flex items-center gap-1 text-xs">
                          {isAvailable ? (
                            <>
                              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                              <span className="text-green-600 dark:text-green-400">
                                Có sẵn ({book.available})
                              </span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-2 w-2 fill-red-500 text-red-500" />
                              <span className="text-red-600 dark:text-red-400">
                                Đã mượn hết
                              </span>
                            </>
                          )}
                        </div>

                        {/* Rating */}
                        {book.rating && (
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-medium">{book.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hover arrow */}
                    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}

              {/* Show missing books placeholder */}
              {series.totalBooks > series.books.length &&
                Array.from({ length: series.totalBooks - series.books.length }).map((_, idx) => (
                  <div
                    key={`placeholder-${idx}`}
                    className="rounded-lg border border-dashed p-4 flex items-center justify-center text-muted-foreground"
                  >
                    <div className="text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Chưa có trong thư viện</p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Next to read suggestion */}
            {series.readCount > 0 && series.readCount < series.totalBooks && (
              <div className="mt-4 pt-4 border-t">
                {(() => {
                  // Find next unread book in series
                  const nextBook = series.books.find(
                    (book) => !userBorrowedBooks.includes(book.id)
                  );
                  
                  if (nextBook) {
                    return (
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">💡</div>
                          <div>
                            <div className="text-sm font-semibold">Đọc tiếp</div>
                            <div className="text-xs text-muted-foreground">
                              {nextBook.title}
                              {nextBook.seriesOrder && ` (Tập ${nextBook.seriesOrder})`}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookClick?.(nextBook);
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
