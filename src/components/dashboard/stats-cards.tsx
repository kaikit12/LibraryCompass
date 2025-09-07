"use client";
import { useState, useEffect } from 'react';
import { Book, Reader } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Users, Library } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';


interface StatsCardsProps {
  books: Book[];
  readers: Reader[];
}

export default function StatsCards({ books: initialBooks, readers: initialReaders }: StatsCardsProps) {
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

  const totalBooks = books.length;
  const totalReaders = readers.length;
  const borrowedBooks = books.filter(book => book.status === 'Borrowed').length;

  const stats = [
    { title: 'Total Books', value: totalBooks, icon: Library },
    { title: 'Books Borrowed', value: borrowedBooks, icon: BookCopy },
    { title: 'Total Readers', value: totalReaders, icon: Users },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
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
