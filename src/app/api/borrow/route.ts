import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, arrayUnion } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { bookId, readerId, dueDate } = await request.json();

    if (!bookId || !readerId || !dueDate) {
      return NextResponse.json({ success: false, message: 'Book ID, Reader ID, and Due Date are required.' }, { status: 400 });
    }

    await runTransaction(db, async (transaction) => {
      const bookRef = doc(db, 'books', bookId);
      const readerRef = doc(db, 'readers', readerId);

      const bookDoc = await transaction.get(bookRef);
      const readerDoc = await transaction.get(readerRef);

      if (!bookDoc.exists()) {
        throw new Error('Book not found.');
      }
      if (!readerDoc.exists()) {
        throw new Error('Reader not found.');
      }
      
      const bookData = bookDoc.data();
      
      if (bookData.status === 'Borrowed') {
        throw new Error('Book is already borrowed.');
      }

      // Update book
      transaction.update(bookRef, {
        status: 'Borrowed',
        borrowedBy: readerId,
        dueDate: dueDate,
      });

      // Update reader
      transaction.update(readerRef, {
        booksOut: increment(1),
        borrowedBooks: arrayUnion(bookId)
      });
    });

    return NextResponse.json({ success: true, message: 'Book borrowed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
