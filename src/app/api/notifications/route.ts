import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';

// Common handler for both POST and DELETE to reduce duplication
async function handleRequest(request: Request, action: 'mark-all-read' | 'clear-all') {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
        }
        
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const querySnapshot = await getDocs(notificationsRef);

        if (querySnapshot.empty) {
            return NextResponse.json({ success: true, message: 'No notifications to process.' });
        }

        const batch = writeBatch(db);

        querySnapshot.forEach((document) => {
            const docRef = doc(db, 'users', userId, 'notifications', document.id);
            if (action === 'mark-all-read') {
                if (!document.data().isRead) {
                    batch.update(docRef, { isRead: true });
                }
            } else if (action === 'clear-all') {
                batch.delete(docRef);
            }
        });
        
        await batch.commit();

        const successMessage = action === 'mark-all-read' 
            ? 'All notifications marked as read.' 
            : 'All notifications cleared.';

        return NextResponse.json({ success: true, message: successMessage });

    } catch (error: any) {
        console.error(`Error in ${action} API:`, error);
        return NextResponse.json({ success: false, message: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}


/**
 * @description Marks all notifications for a user as read.
 * @body { userId: string }
 */
export async function POST(request: Request) {
  return handleRequest(request, 'mark-all-read');
}

/**
 * @description Deletes all notifications for a user.
 * @body { userId: string }
 */
export async function DELETE(request: Request) {
    return handleRequest(request, 'clear-all');
}
