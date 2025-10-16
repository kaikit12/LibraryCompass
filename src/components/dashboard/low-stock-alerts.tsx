'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Search, TrendingDown, Package } from 'lucide-react';
import { Book } from '@/lib/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface LowStockBook extends Book {
  stockLevel: 'critical' | 'low' | 'warning';
}

export function LowStockAlerts() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'books'),
      (snapshot) => {
        const booksList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Book[];
        
        console.log('🔔 Low Stock Alerts - Loaded books:', booksList.length, booksList);
        setBooks(booksList);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to books:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter to get low stock books with stock levels
  const lowStockBooks: LowStockBook[] = books
    .filter(book => {
      // Only include books that are in good condition and not lost
      if (book.condition === 'lost') return false;
      
      // Books with available <= 2 are considered low stock
      return book.available <= 2;
    })
    .map(book => {
      let stockLevel: 'critical' | 'low' | 'warning';
      
      if (book.available === 0) {
        stockLevel = 'critical';
      } else if (book.available === 1) {
        stockLevel = 'low';
      } else {
        stockLevel = 'warning';
      }
      
      return {
        ...book,
        stockLevel
      };
    })
    .sort((a, b) => a.available - b.available); // Sort by available count (lowest first)

  // Filter by search ID
  const filteredBooks = lowStockBooks.filter((book) => {
    if (!searchId.trim()) return true;
    const search = searchId.trim().toLowerCase();
    return (
      book.id.toLowerCase().includes(search) ||
      book.title.toLowerCase().includes(search) ||
      book.author.toLowerCase().includes(search) ||
      (book.libraryId && book.libraryId.toLowerCase().includes(search))
    );
  });

  const getStockBadge = (book: LowStockBook) => {
    switch (book.stockLevel) {
      case 'critical':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Hết hàng
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200">
            <TrendingDown className="h-3 w-3 mr-1" />
            Sắp hết
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">
            <Package className="h-3 w-3 mr-1" />
            Ít hàng
          </Badge>
        );
    }
  };

  const getConditionBadge = (condition: string) => {
    if (condition === 'damaged') {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
          ⚠️ Hư hỏng
        </Badge>
      );
    }
    return null;
  };

  // Statistics
  const criticalCount = lowStockBooks.filter(b => b.stockLevel === 'critical').length;
  const lowCount = lowStockBooks.filter(b => b.stockLevel === 'low').length;
  const warningCount = lowStockBooks.filter(b => b.stockLevel === 'warning').length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Cảnh báo tồn kho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cảnh báo tồn kho
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredBooks.length}/{lowStockBooks.length})
              </span>
            </CardTitle>
            <CardDescription>
              Sách có số lượng tồn kho thấp (≤ 2 cuốn)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm theo ID, tên sách..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10 w-64"
                aria-label="Tìm kiếm sách tồn kho thấp"
              />
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm">Hết hàng: {criticalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm">Sắp hết: {lowCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm">Ít hàng: {warningCount}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchId ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Không tìm thấy sách nào với từ khóa "{searchId}"</p>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>🎉 Tất cả sách đều có đủ tồn kho!</p>
                <p className="text-sm">Không có sách nào cần cảnh báo</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  book.stockLevel === 'critical' && "border-red-200 bg-red-50/50",
                  book.stockLevel === 'low' && "border-orange-200 bg-orange-50/50",
                  book.stockLevel === 'warning' && "border-yellow-200 bg-yellow-50/50"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{book.title}</h3>
                      {getStockBadge(book)}
                      {getConditionBadge(book.condition || 'good')}
                    </div>
                    
                    <p className="text-muted-foreground mb-2">{book.author}</p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      {book.libraryId && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Mã:</span>
                          <Badge variant="outline">{book.libraryId}</Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Tồn kho:</span>
                        <span className={cn(
                          "font-semibold",
                          book.stockLevel === 'critical' && "text-red-600",
                          book.stockLevel === 'low' && "text-orange-600",
                          book.stockLevel === 'warning' && "text-yellow-600"
                        )}>
                          {book.available} / {book.quantity}
                        </span>
                      </div>
                      
                      {book.series && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Bộ:</span>
                          <Badge variant="secondary" className="text-xs">
                            {book.series}
                            {book.seriesOrder && ` (${book.seriesOrder})`}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Open edit dialog to update quantity
                        console.log('Edit book:', book.id);
                      }}
                    >
                      Cập nhật số lượng
                    </Button>
                    
                    {book.stockLevel === 'critical' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => {
                          // TODO: Mark as need to order
                          console.log('Mark as need to order:', book.id);
                        }}
                      >
                        Cần đặt hàng
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}