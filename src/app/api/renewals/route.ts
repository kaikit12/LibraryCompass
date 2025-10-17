import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { RenewalRequest } from '@/lib/types';
import { addDays } from 'date-fns';

// GET /api/renewals - Get renewal requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let q;
    if (userId) {
      // Get all renewal requests for a specific user
      q = query(
        collection(db, 'renewals'),
        where('userId', '==', userId)
      );
    } else {
      // Get all renewal requests (admin view)
      q = collection(db, 'renewals');
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return NextResponse.json([]);
    }
    
    let renewals = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        borrowRecordId: data.borrowRecordId || '',
        readerId: data.readerId || data.userId || '',
        bookId: data.bookId || '',
        requestedAt: data.requestedAt || data.createdAt?.toDate?.() || new Date(),
        status: data.status || 'pending',
        currentDueDate: data.currentDueDate?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        processedAt: data.processedAt?.toDate?.() || null,
      } as RenewalRequest;
    });

    // Filter by status if provided
    if (status) {
      renewals = renewals.filter(r => r.status === status);
    }

    // Sort by createdAt desc
    renewals = renewals.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json(renewals);
  } catch (error: any) {
    console.error('Error fetching renewals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch renewals', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/renewals - Create a new renewal request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrowalId, bookId, userId, bookTitle, userName, currentDueDate, requestedDays = 14 } = body;

    if (!borrowalId || !bookId || !userId || !bookTitle || !userName || !currentDueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if borrowal exists and is active
    const borrowalRef = doc(db, 'borrowals', borrowalId);
    const borrowalDoc = await getDoc(borrowalRef);
    
    if (!borrowalDoc.exists()) {
      return NextResponse.json({ error: 'Borrowal not found' }, { status: 404 });
    }

    const borrowalData = borrowalDoc.data();
    if (borrowalData.status !== 'borrowed') {
      return NextResponse.json(
        { error: 'Book is not currently borrowed' },
        { status: 400 }
      );
    }

    // Check if book has pending reservations
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('bookId', '==', bookId),
      where('status', '==', 'active')
    );
    const reservationsSnapshot = await getDocs(reservationsQuery);
    
    if (!reservationsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Cannot renew: Book has pending reservations' },
        { status: 400 }
      );
    }

    // Check if user already has a pending renewal request for this borrowal
    const existingRenewalQuery = query(
      collection(db, 'renewals'),
      where('borrowalId', '==', borrowalId),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingRenewalQuery);
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'You already have a pending renewal request for this book' },
        { status: 400 }
      );
    }

    // Create renewal request
    const renewalData = {
      borrowalId,
      bookId,
      userId,
      bookTitle,
      userName,
      currentDueDate: Timestamp.fromDate(new Date(currentDueDate)),
      requestedDays,
      status: 'pending',
      createdAt: serverTimestamp(),
      processedAt: null,
      processedBy: null,
      rejectionReason: null,
    };

    const renewalRef = await addDoc(collection(db, 'renewals'), renewalData);

    // Create notification for user
    await addDoc(collection(db, 'notifications'), {
      userId,
      message: `Yêu cầu gia hạn sách "${bookTitle}" đã được gửi. Vui lòng chờ xác nhận.`,
      type: 'info',
      createdAt: serverTimestamp(),
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      renewalId: renewalRef.id,
    });
  } catch (error: any) {
    console.error('Error creating renewal:', error);
    return NextResponse.json(
      { error: 'Failed to create renewal request', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/renewals - Approve or reject a renewal request
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { renewalId, action, processedBy, rejectionReason } = body;

    if (!renewalId || !action || !processedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: renewalId, action, processedBy' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const renewalRef = doc(db, 'renewals', renewalId);
    const renewalDoc = await getDoc(renewalRef);

    if (!renewalDoc.exists()) {
      return NextResponse.json({ error: 'Renewal request not found' }, { status: 404 });
    }

    const renewalData = renewalDoc.data();

    if (renewalData.status !== 'pending') {
      return NextResponse.json(
        { error: 'This renewal request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Update the borrowal's due date
      const borrowalRef = doc(db, 'borrowals', renewalData.borrowalId);
      const borrowalDoc = await getDoc(borrowalRef);

      if (!borrowalDoc.exists()) {
        return NextResponse.json({ error: 'Borrowal not found' }, { status: 404 });
      }

      const currentDueDate = renewalData.currentDueDate.toDate();
      const newDueDate = addDays(currentDueDate, renewalData.requestedDays);

      await updateDoc(borrowalRef, {
        dueDate: Timestamp.fromDate(newDueDate),
      });

      // Update renewal status
      await updateDoc(renewalRef, {
        status: 'approved',
        processedAt: serverTimestamp(),
        processedBy,
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: renewalData.userId,
        message: `✅ Yêu cầu gia hạn sách "${renewalData.bookTitle}" đã được chấp nhận. Hạn mới: ${newDueDate.toLocaleDateString('vi-VN')}`,
        type: 'success',
        createdAt: serverTimestamp(),
        isRead: false,
      });

      // Send email notification
      try {
        // Fetch user email
        const userDoc = await getDoc(doc(db, 'users', renewalData.userId));
        const userEmail = userDoc.data()?.email;

        if (userEmail) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'renewal-approved',
              to: userEmail,
              data: {
                userName: renewalData.userName,
                bookTitle: renewalData.bookTitle,
                newDueDate: newDueDate,
              },
            }),
          });
        }
      } catch (emailError) {
        console.error('Failed to send renewal approved email:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Renewal approved successfully',
        newDueDate: newDueDate.toISOString(),
      });
    } else {
      // Reject the renewal
      await updateDoc(renewalRef, {
        status: 'rejected',
        processedAt: serverTimestamp(),
        processedBy,
        rejectionReason: rejectionReason || 'No reason provided',
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: renewalData.userId,
        message: `❌ Yêu cầu gia hạn sách "${renewalData.bookTitle}" đã bị từ chối. Lý do: ${rejectionReason || 'Không có lý do'}`,
        type: 'warning',
        createdAt: serverTimestamp(),
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: 'Renewal rejected successfully',
      });
    }
  } catch (error: any) {
    console.error('Error processing renewal:', error);
    return NextResponse.json(
      { error: 'Failed to process renewal', details: error.message },
      { status: 500 }
    );
  }
}
