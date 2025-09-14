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
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

interface OverdueEntry {
  bookTitle: string;
  userName: string;
  dueDate: string;
  daysOverdue: number;
}

export default function OverdueBooks() {
  const { toast } = useToast();
  const [overdueEntries, setOverdueEntries] = useState<OverdueEntry[]>([]);

  useEffect(() => {
    const borrowalsColRef = collection(db, "borrowals");
    const q = query(borrowalsColRef, where("status", "==", "borrowed"));

    const unsubscribe = onSnapshot(q, async (borrowalsSnapshot) => {
        const booksSnapshot = await getDocs(collection(db, "books"));
        const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));

        const readersSnapshot = await getDocs(collection(db, "users"));
        const readersMap = new Map(readersSnapshot.docs.map(doc => [doc.id, doc.data() as Reader]));

        const newOverdueEntries: OverdueEntry[] = [];
        borrowalsSnapshot.forEach(doc => {
            const borrowalData = doc.data();
            const dueDate = borrowalData.dueDate.toDate();

            // Client-side filtering for overdue books
            if (isPast(dueDate)) {
                const user = readersMap.get(borrowalData.userId);
                const book = booksMap.get(borrowalData.bookId);

                if (user && book) {
                    const daysOverdue = differenceInDays(new Date(), dueDate);
                    newOverdueEntries.push({
                        bookTitle: book.title,
                        userName: user.name,
                        dueDate: format(dueDate, 'PPP'),
                        daysOverdue: daysOverdue > 0 ? daysOverdue : 1,
                    });
                }
            }
        });
        setOverdueEntries(newOverdueEntries);
    });

    return () => unsubscribe();
  }, []);
  
  const handleNotify = (bookTitle: string, userName: string) => {
    const showNotification = () => {
      new Notification('Overdue Book Reminder', {
        body: `Hi ${userName}, the book "${bookTitle}" is overdue. Please return it soon.`,
        icon: '/favicon.ico' // Optional: you can add an icon
      });
      toast({
        title: '✅ Notification Sent',
        description: `A reminder for "${bookTitle}" has been sent to ${userName}.`,
      });
    };

    if (!('Notification' in window)) {
      toast({ variant: 'destructive', title: 'Error', description: 'This browser does not support desktop notification.' });
      return;
    }

    if (Notification.permission === 'granted') {
      showNotification();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          showNotification();
        } else {
            toast({ title: '🔔 Notification Skipped', description: 'Permission was not granted for notifications.' });
        }
      });
    } else {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Notifications are blocked. Please enable them in your browser settings.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Overdue Books</CardTitle>
        <CardDescription>Books that are past their due date.</CardDescription>
      </CardHeader>
      <CardContent>
        {overdueEntries.length > 0 ? (
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
                      <Button variant="outline" size="sm" onClick={() => handleNotify(entry.bookTitle, entry.userName)}>
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
