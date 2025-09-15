import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, arrayRemove, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { differenceInDays } from 'date-fns';
import { createNotification } from '@/lib/notifications';

const DEFAULT_LATE_FEE_PER_DAY = 1.00; // Default $1 per day if not specified on the book

export async function POST(request: Request) {
  try {
    const { bookId, userId } = await request.json();

    if (!bookId || !userId) {
      return NextResponse.json({ success: false, message: 'Book ID and User ID are required.' }, { status: 400 });
    }

    // Step 1: Find the active borrowal record OUTSIDE the transaction.
    const borrowalsRef = collection(db, 'borrowals');
    const q = query(borrowalsRef, where("bookId", "==", bookId), where("userId", "==", userId), where("status", "==", "borrowed"));
    
    const borrowalSnapshot = await getDocs(q);

    if (borrowalSnapshot.empty) {
        throw new Error('Return not found. No active borrowal record for this user and book.');
    }
    
    const borrowalDoc = borrowalSnapshot.docs[0];
    const borrowalDocRef = borrowalDoc.ref; 

    let lateFee = 0;
    let daysLate = 0;
    let bookTitle = '';
    let transactionId: string | null = null;

    await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, 'books', bookId);
        const userRef = doc(db, 'users', userId);

        // Read documents inside the transaction
        const bookDoc = await transaction.get(bookRef);
        const userDoc = await transaction.get(userRef);
        const currentBorrowalDoc = await transaction.get(borrowalDocRef); 

        if (!bookDoc.exists()) {
          throw new Error("Book not found during transaction.");
        }
        if (!userDoc.exists()) {
          throw new Error("Reader not found during transaction.");
        }
        if (!currentBorrowalDoc.exists()){
            throw new Error("Borrowal record disappeared during transaction.");
        }
        
        const bookData = bookDoc.data();
        bookTitle = bookData.title;
        const borrowalData = currentBorrowalDoc.data();
        const dueDate = borrowalData.dueDate.toDate();
        const returnDate = new Date();

        daysLate = differenceInDays(returnDate, dueDate);
        if (daysLate > 0) {
          const lateFeePerDay = bookData.lateFeePerDay || DEFAULT_LATE_FEE_PER_DAY;
          lateFee = daysLate * lateFeePerDay;
        }

        // Perform writes
        transaction.update(bookRef, {
            available: increment(1),
            status: 'Available'
        });

        const userUpdate: { [key: string]: any } = {
            booksOut: increment(-1),
            borrowedBooks: arrayRemove(bookId),
        };
        if (lateFee > 0) {
            userUpdate.lateFees = increment(lateFee);
            
            const transactionRef = doc(collection(db, 'transactions'));
            transactionId = transactionRef.id;
            transaction.set(transactionRef, {
              userId,
              bookId,
              borrowalId: borrowalDoc.id,
              amount: lateFee,
              type: 'late_fee',
              createdAt: new Date(),
            });
        }
        transaction.update(userRef, userUpdate);

        transaction.update(borrowalDocRef, {
            status: 'returned',
            returnedAt: returnDate,
        });
    });

    let message = 'Book returned successfully.';
    let notifMessage = `You have successfully returned "${bookTitle}".`;
    let notifType: 'success' | 'warning' = 'success';

    if (lateFee > 0) {
        message += ` A late fee of $${lateFee.toFixed(2)} for ${daysLate} day(s) has been added to the reader's account.`;
        notifMessage = `"${bookTitle}" was returned ${daysLate} day(s) late. A fee of $${lateFee.toFixed(2)} has been charged.`;
        notifType = 'warning';
    }

    // Send notification
    await createNotification(userId, { message: notifMessage, type: notifType });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error("Return API error:", error);
    return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
