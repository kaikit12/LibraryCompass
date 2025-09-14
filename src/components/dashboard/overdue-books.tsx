"use client"
import { useState, useEffect } from 'react';
import { Book, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';
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
    const fetchData = async () => {
      const booksSnapshot = await getDocs(collection(db, "books"));
      const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));

      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));
      
      const today = new Date();
      const newOverdueEntries: OverdueEntry[] = [];

      for (const [bookId, book] of booksMap.entries()) {
        const borrowalsColRef = collection(db, "books", bookId, "borrowals");
        const q = query(borrowalsColRef, where("status", "==", "borrowed"), where("dueDate", "<", today));
        const overdueSnapshot = await getDocs(q);

        overdueSnapshot.forEach(doc => {
          const borrowalData = doc.data();
          const user = usersMap.get(borrowalData.userId);
          if (user) {
            const dueDate = borrowalData.dueDate.toDate();
            const daysOverdue = differenceInDays(today, dueDate);
            newOverdueEntries.push({
              bookTitle: book.title,
              userName: user.name,
              dueDate: format(dueDate, 'PPP'),
              daysOverdue: daysOverdue > 0 ? daysOverdue : 1,
            });
          }
        });
      }
      setOverdueEntries(newOverdueEntries);
    };

    const unsubscribe = onSnapshot(collection(db, "books"), fetchData);
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => {
        unsubscribe();
        clearInterval(interval);
    }
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
