import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';

/**
 * Cleanup expired appointments
 * 
 * This endpoint should be called by a cron job to automatically expire appointments
 * that are more than 2 hours old and still in 'pending' status.
 * 
 * Returns books to available inventory when appointments expire.
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (server-side only)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    // Find all pending appointments older than 2 hours
    const appointmentsRef = collection(db, 'appointments');
    const expiredQuery = query(
      appointmentsRef,
      where('status', '==', 'pending'),
      where('createdAt', '<', Timestamp.fromDate(twoHoursAgo))
    );

    const querySnapshot = await getDocs(expiredQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json({
        message: 'No expired appointments found',
        count: 0,
      });
    }

    const updates: Promise<void>[] = [];
    const expiredAppointments: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const appointmentId = docSnap.id;
      const appointment = docSnap.data();
      
      expiredAppointments.push(appointmentId);

      // Update appointment status to expired
      const appointmentUpdate = updateDoc(doc(db, 'appointments', appointmentId), {
        status: 'expired',
        updatedAt: Timestamp.now(),
      });
      updates.push(appointmentUpdate);

      // Return book to available inventory
      const bookId = appointment.bookId;
      if (bookId) {
        const bookUpdate = updateDoc(doc(db, 'books', bookId), {
          status: 'available',
          updatedAt: Timestamp.now(),
        });
        updates.push(bookUpdate);
      }
    });

    // Execute all updates
    await Promise.all(updates);

    console.log(`Cleaned up ${expiredAppointments.length} expired appointments:`, expiredAppointments);

    return NextResponse.json({
      message: 'Expired appointments cleaned up successfully',
      count: expiredAppointments.length,
      appointmentIds: expiredAppointments,
    });

  } catch (error: any) {
    console.error('Error cleaning up expired appointments:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup appointments', details: error.message },
      { status: 500 }
    );
  }
}
