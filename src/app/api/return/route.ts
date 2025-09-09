import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, FieldValue } from 'firebase/firestore';

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

        if (!bookDoc.exists() || !readerDoc.exists()) {
            // Throw a specific error to be caught and handled with a 400 status
            const error = new Error('Return not found');
            (error as any).status = 400;
            throw error;
        }
        
        const bookData = bookDoc.data();
        
        if (bookData.status !== 'Borrowed' || bookData.borrowedBy !== readerId) {
            const error = new Error('Return not found');
            (error as any).status = 400;
            throw error;
        }

        // Update book
        transaction.update(bookRef, {
            status: 'Available',
            borrowedBy: null,
            dueDate: null,
        });

        // Update reader
        transaction.update(readerRef, {
            booksOut: FieldValue.increment(-1),
            borrowedBooks: FieldValue.arrayRemove(bookId),
        });
    });

    return NextResponse.json({ success: true, message: 'Book returned successfully.' });
  } catch (error: any) {
    if (error.status === 400) {
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
