'use client';

import { useState, useEffect } from 'react';
import { Book } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection } from 'firebase/firestore';
import { safeOnSnapshot } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookConditionManager } from '@/components/books/book-condition-manager';
import { Search, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { PageHeader } from '@/components/layout/page-header';

const conditionIcons = {
  good: CheckCircle,
  fair: Clock,
  damaged: AlertTriangle,
  lost: XCircle
};

const conditionColors = {
  good: 'text-green-600 bg-green-50 border-green-200',
  fair: 'text-blue-600 bg-blue-50 border-blue-200',
  damaged: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  lost: 'text-red-600 bg-red-50 border-red-200'
};

const conditionLabels = {
  good: 'Tốt',
  fair: 'Khá', 
  damaged: 'Hư hỏng',
  lost: 'Mất'
};

export default function BookConditionPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = safeOnSnapshot(collection(db, 'books'), (snapshot: any) => {
      const booksData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(booksData);
      setLoading(false);
    }, (err) => {
      console.error('Permission or listener error loading books:', err);
      setLoading(false);
    });

    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const getConditionSummary = () => {
    const summary = books.reduce((acc, book) => {
      if (book.conditionDetails && book.conditionDetails.length > 0) {
        book.conditionDetails.forEach(detail => {
          acc[detail.condition] = (acc[detail.condition] || 0) + 1;
        });
      } else {
        const condition = book.condition || 'good';
        acc[condition] = (acc[condition] || 0) + book.quantity;
      }
      return acc;
    }, {} as Record<string, number>);

    return summary;
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCondition === 'all') return matchesSearch;
    
    if (book.conditionDetails && book.conditionDetails.length > 0) {
      return matchesSearch && book.conditionDetails.some(detail => detail.condition === selectedCondition);
    } else {
      return matchesSearch && book.condition === selectedCondition;
    }
  });

  const summary = getConditionSummary();
  const totalBooks = Object.values(summary).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requiredRole={['admin', 'librarian']}>
      <div className="space-y-6">
        <PageHeader
          title="Quản lý tình trạng sách"
          description="Theo dõi và cập nhật tình trạng từng cuốn sách trong thư viện"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalBooks}</div>
                <div className="text-sm text-muted-foreground">Tổng số cuốn</div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(conditionLabels).map(([condition, label]) => {
            const count = summary[condition] || 0;
            const Icon = conditionIcons[condition as keyof typeof conditionIcons];
            
            return (
              <Card key={condition} className={`border ${conditionColors[condition as keyof typeof conditionColors]}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-sm">{label}</div>
                    </div>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {totalBooks > 0 ? Math.round((count / totalBooks) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Lọc và tìm kiếm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Tìm kiếm sách</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Tìm theo tên sách hoặc tác giả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Label htmlFor="condition">Lọc theo tình trạng</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={selectedCondition === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCondition('all')}
                  >
                    Tất cả
                  </Button>
                  {Object.entries(conditionLabels).map(([condition, label]) => (
                    <Button
                      key={condition}
                      variant={selectedCondition === condition ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCondition(condition)}
                    >
                      {label} ({summary[condition] || 0})
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books List */}
        <div className="grid gap-4">
          {filteredBooks.length > 0 ? (
            filteredBooks.map(book => (
              <Card key={book.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{book.title}</h3>
                        <Badge variant="outline">{book.author}</Badge>
                        {book.libraryId && (
                          <Badge variant="secondary">{book.libraryId}</Badge>
                        )}
                      </div>
                      
                      {book.conditionDetails && book.conditionDetails.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Chi tiết tình trạng ({book.conditionDetails.length} cuốn):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {book.conditionDetails.map(detail => {
                              const config = conditionColors[detail.condition as keyof typeof conditionColors];
                              const Icon = conditionIcons[detail.condition as keyof typeof conditionIcons];
                              
                              return (
                                <Badge
                                  key={detail.copyId}
                                  variant="outline"
                                  className={`gap-2 ${config}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {detail.copyId.split('-').pop()} - {conditionLabels[detail.condition as keyof typeof conditionLabels]}
                                  {detail.notes && (
                                    <span className="text-xs">({detail.notes})</span>
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={conditionColors[book.condition as keyof typeof conditionColors]}
                          >
                            {conditionLabels[book.condition as keyof typeof conditionLabels]} (Tất cả {book.quantity} cuốn)
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <BookConditionManager
                        book={book}
                        onUpdate={(updatedBook) => {
                          setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy sách</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedCondition !== 'all' 
                    ? 'Không có sách nào phù hợp với bộ lọc hiện tại.'
                    : 'Chưa có sách nào trong thư viện.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}