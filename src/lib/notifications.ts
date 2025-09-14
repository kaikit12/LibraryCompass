import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';

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
    } catch (error) {
        console.error("Error creating notification:", error);
    }
}
