"use client"
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { Bell } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';


interface OverdueBooksProps {
  initialBooks: Book[];
  initialReaders: Reader[];
}

export default function OverdueBooks({ initialBooks, initialReaders }: OverdueBooksProps) {
  const { toast } = useToast();
  const [books, setBooks] = useState(initialBooks);
  const [readers, setReaders] = useState(initialReaders);

  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book)));
    });
     const unsubscribeReaders = onSnapshot(collection(db, "readers"), (snapshot) => {
      setReaders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader)));
    });

    return () => {
        unsubscribeBooks();
        unsubscribeReaders();
    };
  }, []);

  const overdueBooks = books.filter(book => 
    book.status === 'Borrowed' && book.dueDate && new Date(book.dueDate) < new Date()
  );

  const getReaderName = (readerId?: string) => {
    return readers.find(r => r.id === readerId)?.name || 'Unknown Reader';
  };
  
  const handleNotify = (bookTitle: string, readerName: string) => {
    toast({
      title: 'Notification Sent',
      description: `A reminder for "${bookTitle}" has been sent to ${readerName}.`,
    });
  };

  const getDaysOverdue = (dueDate: string) => {
    const days = differenceInDays(new Date(), parseISO(dueDate));
    return days > 0 ? days : 1; // Show at least 1 day if overdue
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Overdue Books</CardTitle>
        <CardDescription>Books that are past their due date.</CardDescription>
      </CardHeader>
      <CardContent>
        {overdueBooks.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Borrowed By</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.title}</TableCell>
                    <TableCell>{getReaderName(book.borrowedBy)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{getDaysOverdue(book.dueDate!)} days</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleNotify(book.title, getReaderName(book.borrowedBy))}>
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
