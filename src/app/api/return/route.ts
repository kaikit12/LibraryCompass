import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { differenceInDays, addDays } from 'date-fns';
import { createNotification } from '@/lib/notifications';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';

const DEFAULT_LATE_FEE_PER_DAY = 1.00; // Default $1 per day if not specified on the book
const MAX_LATE_DAYS = 90; // Cap at 90 days
const MAX_LATE_FEE = 50.00; // Maximum late fee of $50

export async function POST(request: Request) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // Get request data first
    const { bookId, userId } = await request.json();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(request);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    // Verify user can only return books for themselves (unless admin/librarian)
    if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    if (!bookId || !userId) {
      return NextResponse.json({ success: false, message: 'Book ID and User ID are required.' }, { status: 400 });
    }

    // Step 1: Find the active borrowal record OUTSIDE the transaction.
    const borrowalSnapshot = await db.collection('borrowals')
      .where("bookId", "==", bookId)
      .where("userId", "==", userId) 
      .where("status", "==", "borrowed")
      .get();    if (borrowalSnapshot.empty) {
        throw new Error('Return not found. No active borrowal record for this user and book.');
    }
    
    const borrowalDoc = borrowalSnapshot.docs[0];
    const borrowalDocRef = borrowalDoc.ref; 

    let lateFee = 0;
    let daysLate = 0;
    let bookTitle = '';
    // Step 2: Run transaction to update book, user, and borrowal records
    await db.runTransaction(async (transaction) => {
        const bookRef = db.collection('books').doc(bookId);
        const userRef = db.collection('users').doc(userId);

        // Read documents inside the transaction
        const bookDoc = await transaction.get(bookRef);
        const userDoc = await transaction.get(userRef);
        const currentBorrowalDoc = await transaction.get(borrowalDocRef); 

        if (!bookDoc.exists) {
          throw new Error("Book not found during transaction.");
        }
        if (!userDoc.exists) {
          throw new Error("Reader not found during transaction.");
        }
        if (!currentBorrowalDoc.exists){
            throw new Error("Borrowal record disappeared during transaction.");
        }
        
        const bookData = bookDoc.data()!;
        bookTitle = bookData.title;
        const borrowalData = currentBorrowalDoc.data()!;
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
            available: FieldValue.increment(1),
            status: 'Available'
        });

        const userUpdate: any = {
            booksOut: FieldValue.increment(-1),
            borrowedBooks: FieldValue.arrayRemove(bookId),
        };
        if (lateFee > 0) {
            userUpdate.lateFees = FieldValue.increment(lateFee);
            
            const transactionRef = db.collection('transactions').doc();
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
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // Get the first active reservation in queue (ordered by createdAt)
    const reservationsSnapshot = await db.collection('reservations')
      .where('bookId', '==', bookId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'asc')
      .get();
    
    if (reservationsSnapshot.empty) {
      return; // No reservations, nothing to do
    }

    const firstReservation = reservationsSnapshot.docs[0];
    const reservationData = firstReservation.data();
    const reservationRef = firstReservation.ref;

    // Calculate expiration time (48 hours from now)
    const expirationDate = addDays(new Date(), 2);

    // Mark reservation as fulfilled
    await reservationRef.update({
      status: 'fulfilled',
      notifiedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expirationDate),
    });

    // Update book's reservation count
    const bookRef = db.collection('books').doc(bookId);
    await bookRef.update({
      reservationCount: FieldValue.increment(-1),
    });

    // Update positions for remaining reservations
    const remainingReservations = reservationsSnapshot.docs.slice(1);
    const updatePromises = remainingReservations.map((doc: any, index: number) => 
      doc.ref.update({ position: index + 1 })
    );
    await Promise.all(updatePromises);

    // Notify the user their reserved book is available
    await db.collection('notifications').add({
      userId: reservationData.userId,
      message: `📚 Sách "${bookTitle}" đã sẵn sàng! Bạn có 48 giờ để mượn sách.`,
      type: 'success',
      createdAt: FieldValue.serverTimestamp(),
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

