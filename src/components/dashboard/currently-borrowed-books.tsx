"use client"
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

interface BorrowedEntry {
  bookTitle: string;
  userName: string;
  borrowedAt: string;
  dueDate: string;
}

export default function CurrentlyBorrowedBooks() {
  const [borrowedEntries, setBorrowedEntries] = useState<BorrowedEntry[]>([]);

  useEffect(() => {
    const borrowalsColRef = collection(db, "borrowals");
    const q = query(borrowalsColRef, where("status", "==", "borrowed"));

    const unsubscribe = onSnapshot(q, async (borrowalsSnapshot) => {
        const booksSnapshot = await getDocs(collection(db, "books"));
        const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));

        const readersSnapshot = await getDocs(collection(db, "users"));
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
                    bookTitle: book.title,
                    userName: user.name,
                    borrowedAt: format(borrowedAt, 'PPP'),
                    dueDate: format(dueDate, 'PPP'),
                });
            }
        });
        // Sort by due date, oldest first
        newBorrowedEntries.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setBorrowedEntries(newBorrowedEntries);
    });

    return () => unsubscribe();
  }, []);
  

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Currently Borrowed Books</CardTitle>
        <CardDescription>A list of all books currently checked out from the library.</CardDescription>
      </CardHeader>
      <CardContent>
        {borrowedEntries.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Borrowed By</TableHead>
                  <TableHead>Borrowed On</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowedEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                    <TableCell>{entry.userName}</TableCell>
                    <TableCell>{entry.borrowedAt}</TableCell>
                    <TableCell>{entry.dueDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No books are currently borrowed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
