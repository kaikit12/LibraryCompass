import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { Reservation, getTimestamp } from '@/lib/types';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';

// GET /api/reservations - Get user's reservations or all reservations (admin)
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
    const bookId = searchParams.get('bookId');

    // Verify user can only access their own reservations (unless admin/librarian)
    if (userId && authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    let queryRef;
    if (bookId) {
      // Get all reservations for a specific book
      queryRef = db.collection('reservations').where('bookId', '==', bookId);
    } else if (userId) {
      // Get all reservations for a specific user
      queryRef = db.collection('reservations').where('userId', '==', userId);
    } else {
      // Get all reservations (admin view)
      queryRef = db.collection('reservations');
    }

    const snapshot = await queryRef.get();
    
    if (snapshot.empty) {
      return NextResponse.json([]);
    }
    
    let reservations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        bookId: data.bookId || '',
        readerId: data.readerId || data.userId || '',
        status: data.status || 'active',
        priority: data.priority || 1,
        expirationDate: data.expirationDate || data.expiresAt?.toDate?.() || null,
        notificationSent: data.notificationSent || false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        notifiedAt: data.notifiedAt?.toDate?.() || null,
        expiresAt: data.expiresAt?.toDate?.() || null,
      } as Reservation;
    });

    // Filter by status and sort for bookId query
    if (bookId) {
      reservations = reservations
        .filter(r => r.status === 'active')
        .sort((a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)); // FIFO order
      
      // Update queue positions
      reservations.forEach((res, index) => {
        res.position = index + 1;
      });
    } else {
      // Sort by createdAt desc for user/admin view
      reservations = reservations.sort((a, b) =>
        getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
      );
    }

    return NextResponse.json(reservations);
  } catch (error: any) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/reservations - Create a new reservation
export async function POST(req: NextRequest) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    // Get request data first
    const body = await req.json();
    const { bookId, userId, bookTitle, userName, userEmail } = body;
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(req);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;
    
    // Verify user can only create reservations for themselves (unless admin/librarian)
    if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    if (!bookId || !userId || !bookTitle || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, userId, bookTitle, userName' },
        { status: 400 }
      );
    }

    // Check if book exists and is unavailable
    const bookDoc = await db.collection('books').doc(bookId).get();
    
    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();
    if (bookData && bookData.available > 0) {
      return NextResponse.json(
        { error: 'Book is currently available, please borrow it directly' },
        { status: 400 }
      );
    }

    // Check if user already has an active reservation for this book
    const existingReservations = await db.collection('reservations')
      .where('bookId', '==', bookId)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    if (!existingReservations.empty) {
      return NextResponse.json(
        { error: 'You already have an active reservation for this book' },
        { status: 400 }
      );
    }

    // Get current queue position (count active reservations + 1)
    const queueSnapshot = await db.collection('reservations')
      .where('bookId', '==', bookId)
      .where('status', '==', 'active')
      .get();
    const position = queueSnapshot.size + 1;

    // Create reservation
    const reservationData = {
      bookId,
      userId,
      bookTitle,
      userName,
      userEmail: userEmail || '',
      status: 'active',
      position,
      createdAt: FieldValue.serverTimestamp(),
      notifiedAt: null,
      expiresAt: null,
    };

    const reservationRef = await db.collection('reservations').add(reservationData);

    // Update book's reservation count
    await db.collection('books').doc(bookId).update({
      reservationCount: FieldValue.increment(1),
    });

    // Create notification for user
    await db.collection('notifications').add({
      userId,
      message: `Đã đặt chỗ cho sách "${bookTitle}". Vị trí trong hàng đợi: ${position}`,
      type: 'info',
      createdAt: FieldValue.serverTimestamp(),
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      reservationId: reservationRef.id,
      position,
    });
  } catch (error: any) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/reservations - Cancel a reservation
export async function DELETE(req: NextRequest) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    // 🚨 SECURITY FIX: Verify authentication
    const authResult = await verifyAuthentication(req);
    if (authResult.error) {
      return authResult.error;
    }
    const authenticatedUser = authResult.user!;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservation ID' },
        { status: 400 }
      );
    }

    const reservationDoc = await db.collection('reservations').doc(reservationId).get();

    if (!reservationDoc.exists) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservationData = reservationDoc.data();
    
    // Verify user can only cancel their own reservations (unless admin/librarian)
    if (reservationData && authenticatedUser.uid !== reservationData.userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Update reservation status to cancelled
    await db.collection('reservations').doc(reservationId).update({
      status: 'cancelled',
    });

    // Update book's reservation count
    if (reservationData) {
      await db.collection('books').doc(reservationData.bookId).update({
        reservationCount: FieldValue.increment(-1),
      });

      // Reorder remaining reservations for this book
      const remainingSnapshot = await db.collection('reservations')
        .where('bookId', '==', reservationData.bookId)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'asc')
        .get();
      
      // Update positions
      const updatePromises = remainingSnapshot.docs.map((doc, index) => 
        doc.ref.update({ position: index + 1 })
      );
      await Promise.all(updatePromises);

      // Notify user
      await db.collection('notifications').add({
        userId: reservationData.userId,
        message: `Đã hủy đặt chỗ cho sách "${reservationData.bookTitle}"`,
        type: 'info',
        createdAt: FieldValue.serverTimestamp(),
        isRead: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reservation', details: error.message },
      { status: 500 }
    );
  }
}
