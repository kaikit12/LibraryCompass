"use client";
import { useState, useEffect } from 'react';
import { Book, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Users, Library, AlertTriangle, DollarSign, BookUp, BookDown, CalendarClock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { startOfDay, endOfDay } from 'date-fns';

interface StatsCardsProps {
}

export default function StatsCards({ }: StatsCardsProps) {
  const [totalBookCopies, setTotalBookCopies] = useState(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lateFeeRevenue, setLateFeeRevenue] = useState(0);
  const [borrowedToday, setBorrowedToday] = useState(0);
  const [dueToday, setDueToday] = useState(0);
  const [returnedToday, setReturnedToday] = useState(0);

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

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let fees = 0;
      snapshot.forEach(doc => {
        const user = doc.data() as User;
        fees += user.lateFees || 0;
      });
      setTotalUsers(snapshot.size);
      setLateFeeRevenue(fees);
    });

    const fetchDailyStats = async () => {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        const booksSnapshot = await getDocs(collection(db, "books"));
        let overdueBooks = 0;
        let borrowedTodayCount = 0;
        let dueTodayCount = 0;
        let returnedTodayCount = 0;

        for(const bookDoc of booksSnapshot.docs) {
            const borrowalsColRef = collection(db, "books", bookDoc.id, "borrowals");
            
            // Overdue
            const overdueQuery = query(borrowalsColRef, where("status", "==", "borrowed"), where("dueDate", "<", Timestamp.fromDate(today)));
            const overdueSnapshot = await getDocs(overdueQuery);
            overdueBooks += overdueSnapshot.size;

            // Borrowed Today
            const borrowedQuery = query(borrowalsColRef, where("borrowedAt", ">=", Timestamp.fromDate(startOfToday)), where("borrowedAt", "<=", Timestamp.fromDate(endOfToday)));
            const borrowedSnapshot = await getDocs(borrowedQuery);
            borrowedTodayCount += borrowedSnapshot.size;

            // Due Today
            const dueQuery = query(borrowalsColRef, where("status", "==", "borrowed"), where("dueDate", ">=", Timestamp.fromDate(startOfToday)), where("dueDate", "<=", Timestamp.fromDate(endOfToday)));
            const dueSnapshot = await getDocs(dueQuery);
            dueTodayCount += dueSnapshot.size;

            // Returned Today
            const returnedQuery = query(borrowalsColRef, where("returnedAt", ">=", Timestamp.fromDate(startOfToday)), where("returnedAt", "<=", Timestamp.fromDate(endOfToday)));
            const returnedSnapshot = await getDocs(returnedQuery);
            returnedTodayCount += returnedSnapshot.size;
        }
        setOverdueCount(overdueBooks);
        setBorrowedToday(borrowedTodayCount);
        setDueToday(dueTodayCount);
        setReturnedToday(returnedTodayCount);
    }
    fetchDailyStats();
    const interval = setInterval(fetchDailyStats, 60000); // Check for stats every minute

    return () => {
        unsubscribeBooks();
        unsubscribeUsers();
        clearInterval(interval);
    };
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  const borrowedPercentage = totalBookCopies > 0 ? (borrowedBooksCount / totalBookCopies) * 100 : 0;

  const stats = [
    { title: 'Total Book Copies', value: totalBookCopies, icon: Library },
    { title: 'Books Borrowed', value: borrowedBooksCount, icon: BookCopy, progress: borrowedPercentage, description: `${borrowedPercentage.toFixed(0)}% of all books` },
    { title: 'Total Users', value: totalUsers, icon: Users },
    { title: 'Overdue Books', value: overdueCount, icon: AlertTriangle },
    { title: 'Late Fee Revenue', value: formatCurrency(lateFeeRevenue), icon: DollarSign }
  ];

  const dailyStats = [
      { title: 'Borrowed Today', value: borrowedToday, icon: BookUp },
      { title: 'Due Today', value: dueToday, icon: CalendarClock },
      { title: 'Returned Today', value: returnedToday, icon: BookDown },
  ]

  return (
    <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat, index) => (
                <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">{stat.value}</div>
                    {stat.progress !== undefined && (
                    <>
                        <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        <Progress value={stat.progress} className="mt-2 h-2" />
                    </>
                    )}
                </CardContent>
                </Card>
            ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
            {dailyStats.map((stat) => (
                <Card key={stat.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">on {new Date().toLocaleDateString()}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
