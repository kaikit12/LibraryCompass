import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, increment, arrayRemove, collection, query, where, getDocs, orderBy, updateDoc, serverTimestamp, addDoc, Timestamp } from 'firebase/firestore';
import { differenceInDays, addDays } from 'date-fns';
import { createNotification } from '@/lib/notifications';

const DEFAULT_LATE_FEE_PER_DAY = 1.00; // Default $1 per day if not specified on the book
const MAX_LATE_DAYS = 90; // Cap at 90 days
const MAX_LATE_FEE = 50.00; // Maximum late fee of $50

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
  // note: transaction document id can be inferred from Firestore if needed; not used here

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
          // Cap days late at maximum
          const cappedDaysLate = Math.min(daysLate, MAX_LATE_DAYS);
          const lateFeePerDay = bookData.lateFeePerDay || DEFAULT_LATE_FEE_PER_DAY;
          
          // Calculate fee and cap at maximum
          lateFee = Math.min(cappedDaysLate * lateFeePerDay, MAX_LATE_FEE);
        }

        // Perform writes
        transaction.update(bookRef, {
            available: increment(1),
            status: 'Available'
        });

  const userUpdate: any = {
            booksOut: increment(-1),
            borrowedBooks: arrayRemove(bookId),
        };
        if (lateFee > 0) {
            userUpdate.lateFees = increment(lateFee);
            
            const transactionRef = doc(collection(db, 'transactions'));
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

    // Check for reservations and auto-assign to next person in queue
    await handleReservationQueue(bookId, bookTitle);

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    console.error("Return API error:", error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, message: message }, { status: 500 });
  }
}

// Helper function to handle reservation queue when book is returned
async function handleReservationQueue(bookId: string, bookTitle: string) {
  try {
    // Get the first active reservation in queue (ordered by createdAt)
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('bookId', '==', bookId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc')
    );
    
    const reservationsSnapshot = await getDocs(reservationsQuery);
    
    if (reservationsSnapshot.empty) {
      return; // No reservations, nothing to do
    }

    const firstReservation = reservationsSnapshot.docs[0];
    const reservationData = firstReservation.data();
    const reservationRef = firstReservation.ref;

    // Calculate expiration time (48 hours from now)
    const expirationDate = addDays(new Date(), 2);

    // Mark reservation as fulfilled
    await updateDoc(reservationRef, {
      status: 'fulfilled',
      notifiedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expirationDate),
    });

    // Update book's reservation count
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      reservationCount: increment(-1),
    });

    // Update positions for remaining reservations
    const remainingReservations = reservationsSnapshot.docs.slice(1);
    const updatePromises = remainingReservations.map((doc, index) => 
      updateDoc(doc.ref, { position: index + 1 })
    );
    await Promise.all(updatePromises);

    // Notify the user their reserved book is available
    await addDoc(collection(db, 'notifications'), {
      userId: reservationData.userId,
      message: `📚 Sách "${bookTitle}" đã sẵn sàng! Bạn có 48 giờ để mượn sách.`,
      type: 'success',
      createdAt: serverTimestamp(),
      isRead: false,
    });

    // Send email notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reservation-ready',
          to: reservationData.userEmail,
          data: {
            userName: reservationData.userName,
            bookTitle: bookTitle,
            expiresAt: expirationDate,
          },
        }),
      });
    } catch (emailError) {
      console.error('Failed to send reservation ready email:', emailError);
      // Don't fail the entire operation if email fails
    }

    console.log(`Assigned book "${bookTitle}" to user ${reservationData.userName} from reservation queue`);
  } catch (error) {
    console.error('Error handling reservation queue:', error);
    // Don't throw - we don't want to fail the return if reservation handling fails
  }
}

