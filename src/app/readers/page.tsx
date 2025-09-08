import { ReaderActions } from "@/components/readers/reader-actions";
import { db } from '@/lib/firebase';
import type { Book, Reader } from '@/lib/types';
import { collection, getDocs } from 'firebase/firestore';


async function getData() {
  const booksCollection = collection(db, 'books');
  const readersCollection = collection(db, 'readers');

  const bookSnapshot = await getDocs(booksCollection);
  const readerSnapshot = await getDocs(readersCollection);

  const books = bookSnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
          id: doc.id, 
          ...data,
          dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
      } as Book
  });
  const readers = readerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));

  // This is a simple way to populate borrowing history on readers based on book data for the prototype
  readers.forEach(reader => {
    reader.borrowingHistory = books.filter(book => book.borrowedBy === reader.id).map(b => b.title);
  });

  return { books, readers };
}

export default async function ReadersPage() {
    
    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold font-headline text-primary">Reader Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage member profiles and their borrowing history.
                </p>
            </header>
            <ReaderActions />
        </div>
    );
}
