import StatsCards from '@/components/dashboard/stats-cards';
import OverdueBooks from '@/components/dashboard/overdue-books';
import { db } from '@/lib/firebase';
import type { Book, Reader } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';

async function getData() {
  const booksCollection = collection(db, 'books');
  const readersCollection = collection(db, 'readers');

  const bookSnapshot = await getDocs(booksCollection);
  const readerSnapshot = await getDocs(readersCollection);

  const books = bookSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
  const readers = readerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));

  return { books, readers };
}


export default async function DashboardPage() {
  const { books, readers } = await getData();
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold font-headline text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          An overview of your library's activities.
        </p>
      </header>

      <StatsCards initialBooks={books} initialReaders={readers} />

      <OverdueBooks initialBooks={books} initialReaders={readers} />
    </div>
  );
}
