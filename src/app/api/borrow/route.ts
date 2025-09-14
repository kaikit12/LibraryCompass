import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, arrayUnion, collection, addDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { bookId, userId, dueDate } = await request.json();

    if (!bookId || !userId || !dueDate) {
      return NextResponse.json({ success: false, message: 'Book ID, User ID, and Due Date are required.' }, { status: 400 });
    }

    await runTransaction(db, async (transaction) => {
      const bookRef = doc(db, 'books', bookId);
      const userRef = doc(db, 'users', userId);

      const bookDoc = await transaction.get(bookRef);
      const userDoc = await transaction.get(userRef);

      if (!bookDoc.exists()) {
        throw new Error('Book not found.');
      }
      if (!userDoc.exists()) {
        throw new Error('Reader not found.');
      }
      
      const bookData = bookDoc.data();
      
      if (bookData.available <= 0) {
        throw new Error('No copies of this book are available.');
      }

      // Update book - decrement available copies
      transaction.update(bookRef, {
        available: increment(-1),
      });

      // Update book status if it's the last copy
      if (bookData.available - 1 === 0) {
        transaction.update(bookRef, { status: 'Borrowed' });
      }
      
      // Add a record to the root 'borrowals' collection
      // This is done outside the transaction in the final implementation step.
      // For now, we keep writes inside. A separate step can create a Cloud Function for this.
      const newBorrowalRef = doc(collection(db, "borrowals"));
      transaction.set(newBorrowalRef, {
        bookId: bookId,
        userId: userId,
        borrowedAt: new Date(),
        dueDate: new Date(dueDate),
        status: 'borrowed',
        isOverdue: false
      });


      // Update user
      transaction.update(userRef, {
        booksOut: increment(1),
        borrowedBooks: arrayUnion(bookId)
      });
    });

    return NextResponse.json({ success: true, message: 'Book borrowed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
