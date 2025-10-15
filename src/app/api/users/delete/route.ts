import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    // Check if user exists and has no books out
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData.booksOut > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Cannot delete user with borrowed books.' 
      }, { status: 400 });
    }

    // Delete user from Firestore
    await deleteDoc(userRef);

    // Note: Deleting from Firebase Auth requires Admin SDK
    // This should be handled by a Cloud Function or Admin SDK endpoint
    // For now, we only delete from Firestore
    // Admin should manually delete from Firebase Console if needed

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted from Firestore successfully. Please delete from Firebase Auth manually if needed.' 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
