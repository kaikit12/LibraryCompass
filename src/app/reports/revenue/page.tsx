
"use client";
import { useState, useEffect } from 'react';
import { Book, Reader, Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';

interface RevenueEntry {
  transactionId: string;
  bookTitle: string;
  userName: string;
  date: string;
  amount: number;
}

export default function RevenueReportPage() {
  const { user: currentUser } = useAuth();
  const [revenueEntries, setRevenueEntries] = useState<RevenueEntry[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const transactionsQuery = query(collection(db, "transactions"), orderBy("createdAt", "desc"));
    const booksQuery = collection(db, "books");
    const readersQuery = collection(db, "users");

    const unsubTransactions = onSnapshot(transactionsQuery, (transactionsSnapshot) => {
        const unsubBooks = onSnapshot(booksQuery, (booksSnapshot) => {
            const unsubReaders = onSnapshot(readersQuery, (readersSnapshot) => {
                setLoading(true);
                const booksMap = new Map(booksSnapshot.docs.map(doc => [doc.id, doc.data() as Book]));
                const readersMap = new Map(readersSnapshot.docs.map(doc => [doc.id, doc.data() as Reader]));
                
                const newRevenueEntries: RevenueEntry[] = [];
                let currentTotalRevenue = 0;

                transactionsSnapshot.forEach(doc => {
                    const transactionData = doc.data();
                    
                    if (transactionData.type === 'late_fee') {
                        const user = readersMap.get(transactionData.userId);
                        const book = booksMap.get(transactionData.bookId);
                        const createdAt = transactionData.createdAt.toDate();
                        
                        newRevenueEntries.push({
                            transactionId: doc.id,
                            bookTitle: book?.title || 'Unknown Book',
                            userName: user?.name || 'Unknown User',
                            date: format(createdAt, 'PPP'),
                            amount: transactionData.amount,
                        });
                        
                        currentTotalRevenue += transactionData.amount;
                    }
                });

                setRevenueEntries(newRevenueEntries);
                setTotalRevenue(currentTotalRevenue);
                setLoading(false);
            });
            return () => unsubReaders();
        });
        return () => unsubBooks();
    });

    return () => unsubTransactions();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  if (currentUser?.role === 'reader') {
      return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
       <header>
            <h1 className="text-4xl font-bold font-headline text-primary">Revenue Report</h1>
            <p className="text-muted-foreground mt-2">
                A detailed history of all late fee transactions.
            </p>
        </header>

        <Card>
            <CardHeader>
                <CardTitle>Total Late Fee Revenue</CardTitle>
                <CardDescription>The sum of all late fees collected.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            </CardContent>
        </Card>

        <Card>
        <CardHeader>
            <CardTitle className="font-headline">Transaction History</CardTitle>
            <CardDescription>A list of all individual late fee charges.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
            <div className="text-center text-muted-foreground p-8">Loading...</div>
            ) : revenueEntries.length > 0 ? (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Book Title</TableHead>
                    <TableHead>Reader</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {revenueEntries.map((entry) => (
                    <TableRow key={entry.transactionId}>
                        <TableCell className="font-medium">{entry.bookTitle}</TableCell>
                        <TableCell>{entry.userName}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            ) : (
            <div className="text-center text-muted-foreground p-8">
                No late fee transactions have been recorded yet.
            </div>
            )}
        </CardContent>
        </Card>
    </div>
  );
}
