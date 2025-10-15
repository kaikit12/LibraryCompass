"use client"
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Bell, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';

interface OverdueEntry {
  userId: string;
  bookId: string;
  bookTitle: string;
  userName: string;
  dueDate: string;
  daysOverdue: number;
}

export default function OverdueBooks() {
  const { toast } = useToast();
  const [overdueEntries, setOverdueEntries] = useState<OverdueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const borrowalsQuery = query(collection(db, "borrowals"), where("status", "==", "borrowed"));
    const booksQuery = collection(db, "books");
    const readersQuery = collection(db, "users");

    // This is a multi-listener setup. It's a bit complex, but ensures data is always in sync.
    const unsubBorrowals = onSnapshot(borrowalsQuery, (borrowalsSnapshot) => {
        const unsubBooks = onSnapshot(booksQuery, (booksSnapshot) => {
            const unsubReaders = onSnapshot(readersQuery, (readersSnapshot) => {
                setLoading(true);
                const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));
                const readersMap = new Map(readersSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Reader]));
                
                const newOverdueEntries: OverdueEntry[] = [];
                const today = new Date();

        borrowalsSnapshot.forEach(doc => {
          const borrowalData = doc.data();
          const dueDate = borrowalData.dueDate.toDate();
                    
                    if (isPast(dueDate)) {
                        const user = readersMap.get(borrowalData.userId);
                        const book = booksMap.get(borrowalData.bookId);
                        
                        if (user && book) {
                            const daysOverdue = differenceInDays(today, dueDate);
              newOverdueEntries.push({
                userId: borrowalData.userId, // Directly use the ID from the borrowal record
                bookId: borrowalData.bookId,
                bookTitle: book.title,
                userName: user.name,
                                dueDate: format(dueDate, 'PPP', { locale: vi }),
                daysOverdue: daysOverdue > 0 ? daysOverdue : 1, // Show at least 1 day overdue
              });
                        }
                    }
                });

                newOverdueEntries.sort((a, b) => b.daysOverdue - a.daysOverdue);
                setOverdueEntries(newOverdueEntries);
                setLoading(false);
            });
            return () => unsubReaders();
        });
        return () => unsubBooks();
    });

    return () => unsubBorrowals();
  }, []);
  
  const handleNotify = async (entry: OverdueEntry) => {
      if (!entry.userId) {
          toast({ 
            variant: 'destructive', 
            title: 'Lỗi', 
            description: 'Thiếu mã người dùng. Không thể gửi thông báo.' 
          });
          return;
      }
      
      try {
        await createNotification(entry.userId, {
            message: `Sách "${entry.bookTitle}" bạn mượn đã quá hạn ${entry.daysOverdue} ngày. Vui lòng trả sớm nhất có thể.`,
            type: 'warning'
        });
        
        toast({
            title: 'Đã gửi nhắc nhở',
            description: `Đã gửi thông báo tới ${entry.userName}.`,
        });

      } catch (error: unknown) {
           const message = error instanceof Error ? error.message : 'Không thể gửi thông báo.';
           toast({ 
            variant: 'destructive', 
            title: 'Lỗi', 
            description: message
        });
      }
  };

  const handleConfirmReturn = async (entry: OverdueEntry) => {
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: entry.bookId, userId: entry.userId })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || 'Trả sách thất bại.');
      }
      toast({ title: 'Đã xác nhận trả sách', description: `"${entry.bookTitle}" đã được trả.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra khi trả sách.';
      toast({ variant: 'destructive', title: 'Lỗi', description: message });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Sách quá hạn</CardTitle>
        <CardDescription>Danh sách sách đã quá hạn trả.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground p-8">Đang tải...</div>
        ) : overdueEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Người mượn</TableHead>
                  <TableHead>Ngày đến hạn</TableHead>
                  <TableHead>Số ngày trễ</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                    <TableCell>{entry.userName}</TableCell>
                    <TableCell>{entry.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{entry.daysOverdue} ngày</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleNotify(entry)}>
                          <Bell className="mr-2 h-4 w-4" />
                          Nhắc nhở
                        </Button>
                        <Button variant="default" size="sm" onClick={() => handleConfirmReturn(entry)}>
                          <Check className="mr-2 h-4 w-4" />
                          Xác nhận trả
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            Không có sách quá hạn.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
