"use client";
import { useState, useEffect } from 'react';
import { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Users, Library, AlertTriangle, DollarSign, BookUp, BookDown, CalendarClock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { isToday, isPast, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

export default function StatsCards() {
  const [totalBookCopies, setTotalBookCopies] = useState(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [totalReaders, setTotalReaders] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [lateFeeRevenue, setLateFeeRevenue] = useState(0);
  const [borrowedToday, setBorrowedToday] = useState(0);
  const [dueToday, setDueToday] = useState(0);
  const [returnedToday, setReturnedToday] = useState(0);

  useEffect(() => {
    // This subscription updates total books and copies
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

    // This subscription updates total readers
    const unsubscribeReaders = onSnapshot(collection(db, "users"), (snapshot) => {
      let readerCount = 0;
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.role === 'reader') {
          readerCount++;
        }
      });
      setTotalReaders(readerCount);
    });
    
    // This subscription handles all time-based stats by listening to the `borrowals` collection
    const borrowalsColRef = collection(db, "borrowals");
    const unsubscribeBorrowals = onSnapshot(borrowalsColRef, (snapshot) => {
        let borrowedTodayCount = 0;
        let returnedTodayCount = 0;
        let dueTodayCount = 0;
        let overdueCountValue = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const borrowedAt = data.borrowedAt?.toDate();
            const returnedAt = data.returnedAt?.toDate();
            const dueDate = data.dueDate?.toDate();

            if(borrowedAt && isToday(borrowedAt)) {
                borrowedTodayCount++;
            }
            if(returnedAt && isToday(returnedAt)) {
                returnedTodayCount++;
            }
            if(data.status === 'borrowed' && dueDate) {
                if(isToday(dueDate)) {
                    dueTodayCount++;
                }
                if(isPast(dueDate) && !isToday(dueDate)) { // Check if due date is in the past but not today
                    overdueCountValue++;
                }
            }
        });
        
        setBorrowedToday(borrowedTodayCount);
        setReturnedToday(returnedTodayCount);
        setDueToday(dueTodayCount);
        setOverdueCount(overdueCountValue);
    });
    
    // This subscription calculates late fee revenue for THIS WEEK from the `transactions` collection
    const transactionsColRef = query(collection(db, "transactions"), where("type", "==", "late_fee"));
    const unsubscribeTransactions = onSnapshot(transactionsColRef, (snapshot) => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
        
        let weeklyRevenue = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate();
            
            // Only count transactions from this week
            if (createdAt && isWithinInterval(createdAt, { start: weekStart, end: weekEnd })) {
                weeklyRevenue += data.amount || 0;
            }
        });
        setLateFeeRevenue(weeklyRevenue);
    });

    // Cleanup all subscriptions on component unmount
    return () => {
        unsubscribeBooks();
        unsubscribeReaders();
        unsubscribeBorrowals();
        unsubscribeTransactions();
    };
  }, []);
  
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
    }

  const borrowedPercentage = totalBookCopies > 0 ? (borrowedBooksCount / totalBookCopies) * 100 : 0;

    const stats = [
        { title: 'Tổng số bản sách', value: totalBookCopies, icon: Library, gradient: 'from-purple-500 to-indigo-500' },
        { title: 'Đang được mượn', value: borrowedBooksCount, icon: BookCopy, progress: borrowedPercentage, description: `${borrowedPercentage.toFixed(0)}% tổng số sách`, gradient: 'from-blue-500 to-cyan-500' },
        { title: 'Tổng số bạn đọc', value: totalReaders, icon: Users, gradient: 'from-green-500 to-emerald-500' },
        { title: 'Sách quá hạn', value: overdueCount, icon: AlertTriangle, gradient: 'from-orange-500 to-red-500' },
        { title: 'Doanh thu tuần này', value: formatCurrency(lateFeeRevenue), icon: DollarSign, gradient: 'from-pink-500 to-rose-500' }
    ];

  const dailyStats = [
      { title: 'Mượn hôm nay', value: borrowedToday, icon: BookUp, gradient: 'from-blue-400 to-blue-600' },
      { title: 'Đến hạn hôm nay', value: dueToday, icon: CalendarClock, gradient: 'from-amber-400 to-orange-500' },
      { title: 'Trả hôm nay', value: returnedToday, icon: BookDown, gradient: 'from-emerald-400 to-green-600' },
  ]

  return (
    <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {stats.map((stat) => (
                <Card key={stat.title} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                        <stat.icon className="h-5 w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</div>
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
                <Card key={stat.title} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                            <stat.icon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">ngày {new Date().toLocaleDateString('vi-VN')}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
