
import { NextResponse } from 'next/server';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';
import { createNotification } from '@/lib/notifications';

// Common handler for both POST and DELETE to reduce duplication
async function handleRequest(request: Request) {
    try {
        // 🚨 SECURITY FIX: Initialize Firebase Admin
        initializeFirebaseAdmin();
        const db = getAdminDB();
        
        // 🚨 SECURITY FIX: Verify authentication
        const authResult = await verifyAuthentication(request);
        if (authResult.error) {
            return authResult.error;
        }
        const authenticatedUser = authResult.user!;
        
        const { userId, action, message, type } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
        }
        
        // Verify user can only manage their own notifications (unless admin/librarian)
        if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
            return NextResponse.json(
                { error: 'Unauthorized access' },
                { status: 403 }
            );
        }

        // Action: Create a specific notification for a user (e.g., overdue reminder)
        if (action === 'create-notification' && message && type) {
            // Only admin/librarian can create notifications for others
            if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
                return NextResponse.json(
                    { error: 'Admin access required to create notifications for others' },
                    { status: 403 }
                );
            }
            await createNotification(userId, { message, type });
            return NextResponse.json({ success: true, message: `Notification sent to user ${userId}.` });
        }

        // --- Actions on existing notifications ---
        const notificationsSnapshot = await db.collection('users').doc(userId).collection('notifications').get();

        if (notificationsSnapshot.empty && (action === 'mark-all-read' || action === 'clear-all')) {
            return NextResponse.json({ success: true, message: 'No notifications to process.' });
        }

        const batch = db.batch();

        if (action === 'mark-all-read') {
             notificationsSnapshot.forEach((document) => {
                if (!document.data().isRead) {
                    batch.update(document.ref, { isRead: true });
                }
            });
            await batch.commit();
            return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
        }

        if (action === 'clear-all') {
            notificationsSnapshot.forEach((document) => {
                batch.delete(document.ref);
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
