
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';

// Common handler for both POST and DELETE to reduce duplication
async function handleRequest(request: Request) {
    try {
        const { userId, action, message, type } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
        }
        
        const notificationsRef = collection(db, 'users', userId, 'notifications');

        // Action: Create a specific notification for a user (e.g., overdue reminder)
        if (action === 'create-notification' && message && type) {
            await createNotification(userId, { message, type });
            return NextResponse.json({ success: true, message: `Notification sent to user ${userId}.` });
        }

        // --- Actions on existing notifications ---
        const querySnapshot = await getDocs(notificationsRef);

        if (querySnapshot.empty && (action === 'mark-all-read' || action === 'clear-all')) {
            return NextResponse.json({ success: true, message: 'No notifications to process.' });
        }

        const batch = writeBatch(db);

        if (action === 'mark-all-read') {
             querySnapshot.forEach((document) => {
                const docRef = doc(db, 'users', userId, 'notifications', document.id);
                if (!document.data().isRead) {
                    batch.update(docRef, { isRead: true });
                }
            });
            await batch.commit();
            return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
        }

        if (action === 'clear-all') {
            querySnapshot.forEach((document) => {
                const docRef = doc(db, 'users', userId, 'notifications', document.id);
                batch.delete(docRef);
            });
            await batch.commit();
            return NextResponse.json({ success: true, message: 'All notifications cleared.' });
        }
        
        return NextResponse.json({ success: false, message: 'Invalid action specified.' }, { status: 400 });


    } catch (error: unknown) {
        console.error(`Error in notifications API:`, error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}


/**
 * @description Handles various notification actions:
 * - Mark all notifications for a user as read.
 * - Create a new notification for a user.
 * @body { userId: string, action: 'mark-all-read' | 'create-notification', message?: string, type?: 'success' | 'warning' | 'info' | 'error' }
 */
export async function POST(request: Request) {
  return handleRequest(request);
}

/**
 * @description Deletes all notifications for a user.
 * @body { userId: string, action: 'clear-all' }
 */
export async function DELETE(request: Request) {
    return handleRequest(request);
}
