"use client";
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Users, Library, AlertTriangle, DollarSign } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, query, where } from 'firebase/firestore';

interface StatsCardsProps {
}

export default function StatsCards({ }: StatsCardsProps) {
  const [totalBookCopies, setTotalBookCopies] = useState(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [totalReaders, setTotalReaders] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lateFeeRevenue, setLateFeeRevenue] = useState(0);

  useEffect(() => {
    const unsubscribeBooks = onSnapshot(collection(db, "books"), (snapshot) => {
       let copies = 0;
       let borrowed = 0;
       snapshot.forEach(doc => {
         const book = doc.data() as Book;
         copies += book.quantity || 0;
         borrowed += (book.quantity || 0) - (book.available || 0);
       });
       setTotalBookCopies(copies);
       setBorrowedBooksCount(borrowed);
    });

    const unsubscribeReaders = onSnapshot(collection(db, "readers"), (snapshot) => {
      let fees = 0;
      snapshot.forEach(doc => {
        const reader = doc.data() as Reader;
        fees += reader.lateFees || 0;
      });
      setTotalReaders(snapshot.size);
      setLateFeeRevenue(fees);
    });

    const fetchOverdue = async () => {
        const today = new Date();
        const booksSnapshot = await getDocs(collection(db, "books"));
        let overdueBooks = 0;

        for(const bookDoc of booksSnapshot.docs) {
            const borrowalsColRef = collection(db, "books", bookDoc.id, "borrowals");
            const q = query(borrowalsColRef, where("status", "==", "borrowed"), where("dueDate", "<", today));
            const overdueSnapshot = await getDocs(q);
            overdueBooks += overdueSnapshot.size;
        }
        setOverdueCount(overdueBooks);
    }
    fetchOverdue();
    const interval = setInterval(fetchOverdue, 60000); // Check for overdue books every minute

    return () => {
        unsubscribeBooks();
        unsubscribeReaders();
        clearInterval(interval);
    };
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const stats = [
    { title: 'Total Book Copies', value: totalBookCopies, icon: Library },
    { title: 'Books Borrowed', value: borrowedBooksCount, icon: BookCopy },
    { title: 'Total Readers', value: totalReaders, icon: Users },
    { title: 'Overdue Books', value: overdueCount, icon: AlertTriangle },
    { title: 'Late Fee Revenue', value: formatCurrency(lateFeeRevenue), icon: DollarSign }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={stat.title} className={index === 4 ? "lg:col-span-2 xl:col-span-1" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
