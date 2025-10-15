import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface NotificationPayload {
    message: string;
    type: 'success' | 'warning' | 'info' | 'error';
}

/**
 * Creates a notification for a specific user.
 * @param userId - The ID of the user to send the notification to.
 * @param payload - The notification content.
 */
export async function createNotification(userId: string, payload: NotificationPayload) {
    if (!userId) {
        console.error("Cannot create notification for an unknown user.");
        return;
    }
    try {
        const notificationsColRef = collection(db, 'users', userId, 'notifications');
        await addDoc(notificationsColRef, {
            ...payload,
            isRead: false,
            createdAt: serverTimestamp(),
        });
    } catch (error: unknown) {
        console.error("Error creating notification:", error);
    }
}

/**
 * Check for borrowals that are due in 3 days and send reminder emails
 */
export async function sendDueReminders() {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    // Query borrowals that haven't been returned and are due in 3 days
    const borrowalsQuery = query(
      collection(db, 'borrowals'),
      where('returnedAt', '==', null),
      where('dueDate', '>=', Timestamp.fromDate(threeDaysFromNow)),
      where('dueDate', '<', Timestamp.fromDate(fourDaysFromNow))
    );

    const snapshot = await getDocs(borrowalsQuery);
    const emailPromises = [];

    for (const doc of snapshot.docs) {
      const borrowal = doc.data();
      
      // Fetch book details
      const bookDoc = await getDocs(query(collection(db, 'books'), where('__name__', '==', borrowal.bookId)));
      const book = bookDoc.docs[0]?.data();

      if (!book) continue;

      const daysUntilDue = Math.ceil(
        (borrowal.dueDate.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send email
      const emailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'due-reminder',
          to: borrowal.userEmail,
          data: {
            userName: borrowal.userName,
            bookTitle: book.title,
            dueDate: borrowal.dueDate.toDate(),
            daysUntilDue,
          },
        }),
      });

      emailPromises.push(emailPromise);
    }

    await Promise.all(emailPromises);
    console.log(`Sent ${emailPromises.length} due reminder emails`);
    
    return { success: true, count: emailPromises.length };
  } catch (error) {
    console.error('Error sending due reminders:', error);
    return { success: false, error };
  }
}

/**
 * Check for overdue borrowals and send overdue notices
 */
export async function sendOverdueNotices() {
  try {
    const now = new Date();

    // Query borrowals that haven't been returned and are past due date
    const borrowalsQuery = query(
      collection(db, 'borrowals'),
      where('returnedAt', '==', null),
      where('dueDate', '<', Timestamp.fromDate(now))
    );

    const snapshot = await getDocs(borrowalsQuery);
    const emailPromises = [];

    for (const doc of snapshot.docs) {
      const borrowal = doc.data();
      
      // Fetch book details
      const bookDoc = await getDocs(query(collection(db, 'books'), where('__name__', '==', borrowal.bookId)));
      const book = bookDoc.docs[0]?.data();

      if (!book) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - borrowal.dueDate.toDate().getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only send if overdue by 1, 3, 7, or 14+ days to avoid spam
      if (![1, 3, 7, 14].includes(daysOverdue) && daysOverdue < 14) {
        continue;
      }

      // Send email
      const emailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'overdue',
          to: borrowal.userEmail,
          data: {
            userName: borrowal.userName,
            bookTitle: book.title,
            dueDate: borrowal.dueDate.toDate(),
            daysOverdue,
          },
        }),
      });

      emailPromises.push(emailPromise);
    }

    await Promise.all(emailPromises);
    console.log(`Sent ${emailPromises.length} overdue notice emails`);
    
    return { success: true, count: emailPromises.length };
  } catch (error) {
    console.error('Error sending overdue notices:', error);
    return { success: false, error };
  }
}

/**
 * Check for available reserved books and notify users
 */
export async function notifyAvailableReservations() {
  try {
    // Query reservations where status is 'ready' (book is available)
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('status', '==', 'ready'),
      where('notified', '==', false)
    );

    const snapshot = await getDocs(reservationsQuery);
    const emailPromises: Promise<any>[] = [];

    for (const doc of snapshot.docs) {
      const reservation = doc.data();
      
      // Send notification to user
      if (reservation.userId) {
        await createNotification(reservation.userId, {
          message: `Sách "${reservation.bookTitle || 'đã đặt trước'}" đã sẵn sàng để mượn!`,
          type: 'success'
        });
      }

      // TODO: Send email notification
      // emailPromises.push(sendEmail(...));
    }

    await Promise.all(emailPromises);
    console.log(`Sent ${emailPromises.length} reservation notifications`);
    return { success: true, sent: emailPromises.length };
  } catch (error) {
    console.error('Error sending reservation notifications:', error);
    return { success: false, error };
  }
}

/**
 * Utility function to send email notification
 * Can be called from other API routes when events happen
 */
export async function sendEmailNotification(
  type: 'due-reminder' | 'overdue' | 'reservation-ready' | 'appointment-confirmed' | 'renewal-approved',
  to: string,
  data: any
) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, to, data }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error };
  }
}
