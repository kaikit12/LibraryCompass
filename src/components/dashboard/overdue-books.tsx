"use client"
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format, isPast } from 'date-fns';
import { Bell } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface OverdueEntry {
  userId: string;
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
                                bookTitle: book.title,
                                userName: user.name,
                                dueDate: format(dueDate, 'PPP'),
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
            title: '❌ Error', 
            description: 'User ID is missing. Cannot send notification.' 
          });
          return;
      }
      try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'create-notification',
                userId: entry.userId,
                message: `Your borrowed book "${entry.bookTitle}" is ${entry.daysOverdue} days overdue. Please return it as soon as possible.`,
                type: 'warning'
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send notification.');
        }

        toast({
            title: '✅ Reminder Sent',
            description: `A notification has been sent to ${entry.userName}.`,
        });

      } catch (error: any) {
           toast({ 
            variant: 'destructive', 
            title: '❌ Error', 
            description: error.message || 'Could not send notification.' 
        });
      }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Overdue Books</CardTitle>
        <CardDescription>Books that are past their due date.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground p-8">Loading...</div>
        ) : overdueEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Borrowed By</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                    <TableCell>{entry.userName}</TableCell>
                    <TableCell>{entry.dueDate}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{entry.daysOverdue} days</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleNotify(entry)}>
                        <Bell className="mr-2 h-4 w-4" />
                        Notify
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No overdue books. Great job!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
