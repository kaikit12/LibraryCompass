import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Appointment } from '@/lib/types';
import { addDays, differenceInHours } from 'date-fns';

// GET /api/appointments - Get appointments
export async function GET(req: NextRequest) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(req);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let appointmentsSnapshot;
    if (userId) {
      // Verify user can only access their own appointments (unless admin/librarian)
      if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }
      
      appointmentsSnapshot = await db.collection('appointments')
        .where('userId', '==', userId)
        .get();
    } else {
      // Get all appointments (admin view only)
      if (!isAdminOrLibrarian(authenticatedUser)) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      appointmentsSnapshot = await db.collection('appointments').get();
    }

    if (appointmentsSnapshot.empty) {
      return NextResponse.json([]);
    }
    
    let appointments = appointmentsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        bookId: data.bookId || '',
        readerId: data.readerId || data.userId || '',
        scheduledDate: data.scheduledDate || data.pickupTime?.toDate?.() || new Date(),
        status: data.status || 'pending',
        type: data.type || 'pickup',
        pickupTime: data.pickupTime?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        confirmedAt: data.confirmedAt?.toDate?.() || null,
      } as Appointment;
    });

    // Filter by status if provided
    if (status) {
      appointments = appointments.filter((a: any) => a.status === status);
    }

    // Sort by pickupTime asc (soonest first)
    appointments = appointments.sort((a: any, b: any) => 
      a.pickupTime.getTime() - b.pickupTime.getTime()
    );

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appointments', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(req: NextRequest) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(req);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    const body = await req.json();
    const { bookId, userId, bookTitle, userName, userMemberId, pickupTime, agreedToTerms } = body;

    if (!bookId || !userId || !bookTitle || !userName || !pickupTime || agreedToTerms !== true) {
      return NextResponse.json(
        { error: 'Missing required fields or terms not agreed' },
        { status: 400 }
      );
    }

    // Verify user can only create appointments for themselves (unless admin/librarian)
    if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const pickupDate = new Date(pickupTime);
    const now = new Date();

    // Validate pickup time is in the future
    if (pickupDate <= now) {
      return NextResponse.json(
        { error: 'Thời gian nhận sách phải trong tương lai' },
        { status: 400 }
      );
    }

    // Check if book is available
    const bookDoc = await db.collection('books').doc(bookId).get();
    
    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data()!;
    if (bookData.available <= 0) {
      return NextResponse.json(
        { error: 'Sách hiện không có sẵn. Vui lòng đặt chỗ trong hàng đợi.' },
        { status: 400 }
      );
    }

    // Check if user already has a pending appointment for this book
    const existingSnapshot = await db.collection('appointments')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .where('status', '==', 'pending')
      .get();
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'Bạn đã có lịch đặt mượn sách này rồi' },
        { status: 400 }
      );
    }

    // Create appointment
    const appointmentData = {
      bookId,
      userId,
      bookTitle,
      userName,
      userMemberId: userMemberId || null,
      pickupTime: Timestamp.fromDate(pickupDate),
      agreedToTerms,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      confirmedAt: null,
      confirmedBy: null,
      borrowalId: null,
      cancellationReason: null,
    };

    const appointmentRef = await db.collection('appointments').add(appointmentData);

    // Reserve the book (decrease available count temporarily)
    await db.collection('books').doc(bookId).update({
      available: FieldValue.increment(-1),
      status: bookData.available - 1 === 0 ? 'Borrowed' : 'Available',
    });

    // Create notification for user
    await db.collection('notifications').add({
      userId,
      message: `Đã đặt lịch mượn sách "${bookTitle}". Thời gian nhận: ${pickupDate.toLocaleString('vi-VN')}. Lưu ý: Trễ quá 2 giờ sẽ tự động hủy.`,
      type: 'info',
      createdAt: FieldValue.serverTimestamp(),
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointmentRef.id,
      pickupTime: pickupDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/appointments - Confirm, cancel, or expire appointment
export async function PATCH(req: NextRequest) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(req);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    const body = await req.json();
    const { appointmentId, action, confirmedBy, cancellationReason } = body;

    if (!appointmentId || !action) {
      return NextResponse.json(
        { error: 'Missing appointmentId or action' },
        { status: 400 }
      );
    }

    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();

    if (!appointmentDoc.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const appointmentData = appointmentDoc.data()!;

    if (appointmentData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Appointment already processed' },
        { status: 400 }
      );
    }

    if (action === 'confirm') {
      // Only admin/librarian can confirm appointments
      if (!isAdminOrLibrarian(authenticatedUser)) {
        return NextResponse.json(
          { error: 'Admin or librarian access required' },
          { status: 403 }
        );
      }
      
      if (!confirmedBy) {
        return NextResponse.json(
          { error: 'confirmedBy is required for confirmation' },
          { status: 400 }
        );
      }

      // Check if user arrived within 2 hours of pickup time
      const now = new Date();
      const pickupTime = appointmentData.pickupTime.toDate();
      const hoursLate = differenceInHours(now, pickupTime);

      if (hoursLate > 2) {
        // Expired - too late
        await db.collection('appointments').doc(appointmentId).update({
          status: 'expired',
          cancellationReason: `Quá thời hạn ${hoursLate} giờ (tối đa 2 giờ)`,
        });

        // Release the book
        const bookDoc = await db.collection('books').doc(appointmentData.bookId).get();
        if (bookDoc.exists) {
          const bookData = bookDoc.data()!;
          await db.collection('books').doc(appointmentData.bookId).update({
            available: FieldValue.increment(1),
            status: bookData.available + 1 > 0 ? 'Available' : 'Borrowed',
          });
        }

        // Notify user
        await db.collection('notifications').add({
          userId: appointmentData.userId,
          message: `❌ Lịch đặt mượn sách "${appointmentData.bookTitle}" đã bị hủy do đến nhận muộn quá 2 giờ.`,
          type: 'error',
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
        });

        return NextResponse.json({
          success: false,
          error: 'Appointment expired - too late',
        }, { status: 400 });
      }

      // Create borrowal
      const dueDate = addDays(now, 14); // Default 14 days borrowing period
      const borrowalData = {
        userId: appointmentData.userId,
        bookId: appointmentData.bookId,
        borrowedAt: FieldValue.serverTimestamp(),
        dueDate: Timestamp.fromDate(dueDate),
        status: 'borrowed',
        returnedAt: null,
      };

      const borrowalRef = await db.collection('borrowals').add(borrowalData);

      // Update user's borrowed books
      await db.collection('users').doc(appointmentData.userId).update({
        booksOut: FieldValue.increment(1),
        borrowedBooks: FieldValue.arrayUnion(appointmentData.bookId),
      });

      // Update book popularity counter
      await db.collection('books').doc(appointmentData.bookId).update({
        totalBorrows: FieldValue.increment(1),
      });

      // Update appointment
      await db.collection('appointments').doc(appointmentId).update({
        status: 'confirmed',
        confirmedAt: FieldValue.serverTimestamp(),
        confirmedBy,
        borrowalId: borrowalRef.id,
      });

      // Notify user
      await db.collection('notifications').add({
        userId: appointmentData.userId,
        message: `✅ Đã xác nhận mượn sách "${appointmentData.bookTitle}". Hạn trả: ${dueDate.toLocaleDateString('vi-VN')}`,
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
            type: 'appointment-confirmed',
            to: appointmentData.userEmail,
            data: {
              userName: appointmentData.userName,
              bookTitle: appointmentData.bookTitle,
              pickupTime: appointmentData.pickupTime.toDate(),
            },
          }),
        });
      } catch (emailError) {
        console.error('Failed to send appointment confirmed email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Appointment confirmed and borrowal created',
        borrowalId: borrowalRef.id,
      });

    } else if (action === 'cancel') {
      // Verify user can only cancel their own appointments or admin/librarian can cancel any
      if (authenticatedUser.uid !== appointmentData.userId && !isAdminOrLibrarian(authenticatedUser)) {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }
      
      // User or admin cancels the appointment
      await db.collection('appointments').doc(appointmentId).update({
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Người dùng hủy',
      });

      // Release the book
      const bookDoc = await db.collection('books').doc(appointmentData.bookId).get();
      if (bookDoc.exists) {
        const bookData = bookDoc.data()!;
        await db.collection('books').doc(appointmentData.bookId).update({
          available: FieldValue.increment(1),
          status: bookData.available + 1 > 0 ? 'Available' : 'Borrowed',
        });
      }

      // Notify user
      await db.collection('notifications').add({
        userId: appointmentData.userId,
        message: `Lịch đặt mượn sách "${appointmentData.bookTitle}" đã bị hủy. Lý do: ${cancellationReason || 'Không rõ'}`,
        type: 'warning',
        createdAt: FieldValue.serverTimestamp(),
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Appointment cancelled',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error processing appointment:', error);
    return NextResponse.json(
      { error: 'Failed to process appointment', details: error.message },
      { status: 500 }
    );
  }
}
