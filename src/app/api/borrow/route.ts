import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { createNotification } from '@/lib/notifications';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';

const MAX_BOOKS_PER_USER = 5; // Maximum books a user can borrow at once

export async function POST(request: Request) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // Get request data first
    const { bookId, userId, dueDate, borrowerRole } = await request.json();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(request);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    // Verify user can only borrow for themselves (unless admin/librarian)
    if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    if (!bookId || !userId || !dueDate) {
      return NextResponse.json({ success: false, message: 'Book ID, User ID, and Due Date are required.' }, { status: 400 });
    }

    // Check if user is admin or librarian - only they can borrow directly
    if (borrowerRole === 'reader') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Người đọc không được mượn sách trực tiếp. Vui lòng đặt lịch hẹn nhận sách.' 
        }, 
        { status: 403 }
      );
    }

    let bookTitle = '';

    // Use Admin SDK transaction
    await db.runTransaction(async (transaction) => {
      const bookRef = db.collection('books').doc(bookId);
      const userRef = db.collection('users').doc(userId);

      const bookDoc = await transaction.get(bookRef);
      const userDoc = await transaction.get(userRef);

      if (!bookDoc.exists) {
        throw new Error('Book not found.');
      }
      if (!userDoc.exists) {
        throw new Error('Reader not found.');
      }
      
      const userData = userDoc.data();
      const bookData = bookDoc.data();
      
      // Check if user has reached maximum books limit
      if (userData && userData.booksOut >= MAX_BOOKS_PER_USER) {
        throw new Error(`Bạn đã mượn tối đa ${MAX_BOOKS_PER_USER} cuốn sách. Vui lòng trả sách trước khi mượn thêm.`);
      }
      
      // Check if user's email is verified (only for readers, not admin/librarian)
      if (userData && userData.role === 'reader' && userData.emailVerified === false) {
        throw new Error('Reader email is not verified. Please verify email before borrowing books.');
      }
      
      if (bookData) {
        bookTitle = bookData.title; // Capture book title for notification
        if (bookData.available <= 0) {
          throw new Error('No copies of this book are available.');
        }

        // Update book - decrement available copies and increment totalBorrows
        transaction.update(bookRef, {
          available: FieldValue.increment(-1),
          totalBorrows: FieldValue.increment(1), // Track popularity
        });

        // Update book status if it's the last copy
        if (bookData.available - 1 === 0) {
          transaction.update(bookRef, { status: 'Borrowed' });
        }
        
        // Create new borrowal record
        const newBorrowalRef = db.collection("borrowals").doc();
        transaction.set(newBorrowalRef, {
          bookId: bookId,
          userId: userId,
          borrowedAt: FieldValue.serverTimestamp(),
          dueDate: new Date(dueDate),
          status: 'borrowed',
          isOverdue: false,
        });

        // Update user
        transaction.update(userRef, {
          booksOut: FieldValue.increment(1),
          borrowedBooks: FieldValue.arrayUnion(bookId)
        });
      }
    });

    // Create notification after successful transaction
    await createNotification(userId, {
      message: `You have successfully borrowed "${bookTitle}". It is due on ${new Date(dueDate).toLocaleDateString()}.`,
      type: 'success',
    });

    return NextResponse.json({ success: true, message: 'Book borrowed successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
