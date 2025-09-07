import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { bookId, readerId } = await request.json();

    if (!bookId || !readerId) {
      return NextResponse.json({ success: false, message: 'Book ID and Reader ID are required.' }, { status: 400 });
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
        const readerData = readerDoc.data();

        if (bookData.status !== 'Borrowed' || bookData.borrowedBy !== readerId) {
            throw new Error('This book was not borrowed by this reader.');
        }

        // Update book
        transaction.update(bookRef, {
            status: 'Available',
            borrowedBy: null,
            dueDate: null,
        });

        // Update reader
        const newBooksOut = Math.max(0, (readerData.booksOut || 1) - 1);
        const newBorrowedBooks = (readerData.borrowedBooks || []).filter(
            (title: string) => title !== bookData.title
        );

        transaction.update(readerRef, {
            booksOut: newBooksOut,
            borrowedBooks: newBorrowedBooks,
        });
    });

    return NextResponse.json({ success: true, message: 'Book returned successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
