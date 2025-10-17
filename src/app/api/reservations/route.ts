import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { Reservation, getTimestamp } from '@/lib/types';

// GET /api/reservations - Get user's reservations or all reservations (admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const bookId = searchParams.get('bookId');

    let q;
    if (bookId) {
      // Get all reservations for a specific book
      // Filter and sort in memory to avoid composite index
      q = query(
        collection(db, 'reservations'),
        where('bookId', '==', bookId)
      );
    } else if (userId) {
      // Get all reservations for a specific user
      q = query(
        collection(db, 'reservations'),
        where('userId', '==', userId)
      );
    } else {
      // Get all reservations (admin view)
      q = collection(db, 'reservations');
    }

    const snapshot = await getDocs(q);
    
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
    const body = await req.json();
    const { bookId, userId, bookTitle, userName, userEmail } = body;

    if (!bookId || !userId || !bookTitle || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, userId, bookTitle, userName' },
        { status: 400 }
      );
    }

    // Check if book exists and is unavailable
    const bookRef = doc(db, 'books', bookId);
    const bookDoc = await getDoc(bookRef);
    
    if (!bookDoc.exists()) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();
    if (bookData.available > 0) {
      return NextResponse.json(
        { error: 'Book is currently available, please borrow it directly' },
        { status: 400 }
      );
    }

    // Check if user already has an active reservation for this book
    const existingReservationQuery = query(
      collection(db, 'reservations'),
      where('bookId', '==', bookId),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const existingSnapshot = await getDocs(existingReservationQuery);
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'You already have an active reservation for this book' },
        { status: 400 }
      );
    }

    // Get current queue position (count active reservations + 1)
    const queueQuery = query(
      collection(db, 'reservations'),
      where('bookId', '==', bookId),
      where('status', '==', 'active')
    );
    const queueSnapshot = await getDocs(queueQuery);
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
      createdAt: serverTimestamp(),
      notifiedAt: null,
      expiresAt: null,
    };

    const reservationRef = await addDoc(collection(db, 'reservations'), reservationData);

    // Update book's reservation count
    await updateDoc(bookRef, {
      reservationCount: increment(1),
    });

    // Create notification for user
    await addDoc(collection(db, 'notifications'), {
      userId,
      message: `Đã đặt chỗ cho sách "${bookTitle}". Vị trí trong hàng đợi: ${position}`,
      type: 'info',
      createdAt: serverTimestamp(),
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
    const { searchParams } = new URL(req.url);
    const reservationId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Missing reservation ID' },
        { status: 400 }
      );
    }

    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationDoc = await getDoc(reservationRef);

    if (!reservationDoc.exists()) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const reservationData = reservationDoc.data();

    // Verify user owns this reservation (unless admin)
    if (userId && reservationData.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update reservation status to cancelled
    await updateDoc(reservationRef, {
      status: 'cancelled',
    });

    // Update book's reservation count
    const bookRef = doc(db, 'books', reservationData.bookId);
    await updateDoc(bookRef, {
      reservationCount: increment(-1),
    });

    // Reorder remaining reservations for this book
    const remainingQuery = query(
      collection(db, 'reservations'),
      where('bookId', '==', reservationData.bookId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc')
    );
    const remainingSnapshot = await getDocs(remainingQuery);
    
    // Update positions
    const updatePromises = remainingSnapshot.docs.map((doc, index) => 
      updateDoc(doc.ref, { position: index + 1 })
    );
    await Promise.all(updatePromises);

    // Notify user
    await addDoc(collection(db, 'notifications'), {
      userId: reservationData.userId,
      message: `Đã hủy đặt chỗ cho sách "${reservationData.bookTitle}"`,
      type: 'info',
      createdAt: serverTimestamp(),
      isRead: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel reservation', details: error.message },
      { status: 500 }
    );
  }
}
