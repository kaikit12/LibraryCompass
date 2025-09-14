import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, arrayRemove, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';

const LATE_FEE_PER_DAY = 1.00; // $1 per day

export async function POST(request: Request) {
  try {
    const { bookId, userId } = await request.json();

    if (!bookId || !userId) {
      return NextResponse.json({ success: false, message: 'Book ID and User ID are required.' }, { status: 400 });
    }

    let lateFee = 0;
    let daysLate = 0;

    await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, 'books', bookId);
        const userRef = doc(db, 'users', userId);

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("Reader not found.");
        }

        // Get the specific borrowal record from the root collection
        const borrowalsRef = collection(db, 'borrowals');
        const q = query(borrowalsRef, where("bookId", "==", bookId), where("userId", "==", userId), where("status", "==", "borrowed"));
        
        // This must be a getDocs outside the transaction to read first, then update.
        const borrowalSnapshot = await getDocs(q);

        if (borrowalSnapshot.empty) {
             throw new Error('Return not found. No active borrowal record for this user and book.');
        }

        // Assuming a user can only borrow one copy of a book at a time.
        const borrowalDoc = borrowalSnapshot.docs[0];
        const borrowalData = borrowalDoc.data();
        const dueDate = borrowalData.dueDate.toDate();
        const returnDate = new Date();

        daysLate = differenceInDays(returnDate, dueDate);
        if (daysLate > 0) {
          lateFee = daysLate * LATE_FEE_PER_DAY;
        }

        // Update book: increment available copies
        transaction.update(bookRef, {
            available: increment(1),
            status: 'Available' // Set status to available since at least one is returned
        });

        // Update user: decrement booksOut and remove bookId
        const userUpdate: { [key: string]: any } = {
            booksOut: increment(-1),
            borrowedBooks: arrayRemove(bookId),
        };
        if (lateFee > 0) {
            userUpdate.lateFees = increment(lateFee);
        }
        transaction.update(userRef, userUpdate);

        // Update the specific borrowal record to 'returned'
        transaction.update(borrowalDoc.ref, {
            status: 'returned',
            returnedAt: returnDate,
        });
    });

    let message = 'Book returned successfully.';
    if (lateFee > 0) {
        message += ` A late fee of $${lateFee.toFixed(2)} for ${daysLate} day(s) has been added to the reader's account.`
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
