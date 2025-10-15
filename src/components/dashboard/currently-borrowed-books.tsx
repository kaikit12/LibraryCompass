"use client"
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface BorrowedEntry {
  bookId: string;
  userId: string;
  bookTitle: string;
  userName: string;
  borrowedAt: string;
  dueDate: string;
}

export default function CurrentlyBorrowedBooks() {
  const { user } = useAuth();
  const currentUserRole = user?.role;
  const { toast } = useToast();
  const [borrowedEntries, setBorrowedEntries] = useState<BorrowedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [returningBookIds, setReturningBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const borrowalsQuery = query(collection(db, "borrowals"), where("status", "==", "borrowed"));
    const booksQuery = collection(db, "books");
    const readersQuery = collection(db, "users");

    const unsubBorrowals = onSnapshot(borrowalsQuery, (borrowalsSnapshot) => {
        const unsubBooks = onSnapshot(booksQuery, (booksSnapshot) => {
            const unsubReaders = onSnapshot(readersQuery, (readersSnapshot) => {
                setLoading(true);
                const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));
                const readersMap = new Map(readersSnapshot.docs.map(doc => [doc.id, doc.data() as Reader]));

                const newBorrowedEntries: BorrowedEntry[] = [];
                borrowalsSnapshot.forEach(doc => {
                    const borrowalData = doc.data();
                    const borrowedAt = borrowalData.borrowedAt.toDate();
                    const dueDate = borrowalData.dueDate.toDate();
                    const user = readersMap.get(borrowalData.userId);
                    const book = booksMap.get(borrowalData.bookId);

                    if (user && book) {
                        newBorrowedEntries.push({
                            bookId: borrowalData.bookId,
                            userId: borrowalData.userId,
                            bookTitle: book.title,
                            userName: user.name,
                            borrowedAt: format(borrowedAt, 'PPP', { locale: vi }),
                            dueDate: format(dueDate, 'PPP', { locale: vi }),
                        });
                    }
                });

                newBorrowedEntries.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                setBorrowedEntries(newBorrowedEntries);
                setLoading(false);
            });
            return () => unsubReaders();
        });
        return () => unsubBooks();
    });

    return () => unsubBorrowals();
  }, []);
  
  const handleReturnBook = async (entry: BorrowedEntry) => {
    setReturningBookIds(prev => new Set(prev).add(entry.bookId));
    
    try {
      const response = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: entry.bookId, userId: entry.userId }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message);
      
      toast({ 
        title: '✅ Trả sách thành công!', 
        description: `"${entry.bookTitle}" đã được trả bởi ${entry.userName}.`
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      toast({ 
        variant: 'destructive', 
        title: '❌ Trả sách thất bại', 
        description: message
      });
    } finally {
      setReturningBookIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(entry.bookId);
        return newSet;
      });
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Sách đang được mượn</CardTitle>
        <CardDescription>Danh sách tất cả sách đang được mượn tại thư viện.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
           <div className="text-center text-muted-foreground p-8">Đang tải...</div>
        ) : borrowedEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Người mượn</TableHead>
                  <TableHead>Ngày mượn</TableHead>
                  <TableHead>Ngày đến hạn</TableHead>
                  {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                    <TableHead className="text-right">Thao tác</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                    <TableCell>{entry.userName}</TableCell>
                    <TableCell>{entry.borrowedAt}</TableCell>
                    <TableCell>{entry.dueDate}</TableCell>
                    {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReturnBook(entry)}
                          disabled={returningBookIds.has(entry.bookId)}
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {returningBookIds.has(entry.bookId) ? 'Đang xử lý...' : 'Xác nhận trả'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            Không có sách nào đang được mượn.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
