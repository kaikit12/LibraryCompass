import { NextResponse } from 'next/server';

// This endpoint supports privileged deletion of a user (Firestore + Firebase Auth)
// when the Firebase Admin SDK is configured via environment variables. If not
// configured, it returns a helpful 403 explaining what to set up.

// Lazy load dependencies so this file can be imported in environments without
// admin credentials (e.g. during local dev) without crashing.
let admin: any = null;
let adminInitialized = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const adminModule = require('firebase-admin');

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId) {
    if (!adminModule.apps || adminModule.apps.length === 0) {
      adminModule.initializeApp({
        credential: adminModule.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }
    admin = adminModule;
    adminInitialized = true;
  }
} catch (err) {
  // Not fatal: admin remains uninitialized and endpoint will return guidance
  adminInitialized = false;
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    if (!adminInitialized || !admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Server is not configured with Firebase Admin credentials. Please set FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, and FIREBASE_ADMIN_PROJECT_ID, and install firebase-admin on the server to enable privileged deletes.',
        },
        { status: 403 }
      );
    }

    // Use Admin SDK Firestore for privileged operations
    const afs = admin.firestore();
    const userRef = afs.doc(`users/${userId}`);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    const userData = userSnapshot.data();
    if (userData?.booksOut > 0) {
      return NextResponse.json({ success: false, message: 'Cannot delete user with borrowed books.' }, { status: 400 });
    }

    // Backup user doc for audit/restore
    await afs.collection('deletedUsers').doc(`${userId}_${Date.now()}`).set({
      ...userData,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Delete Firestore document
    await userRef.delete();

    // Delete from Firebase Auth (best-effort)
    try {
      await admin.auth().deleteUser(userId);
    } catch (authErr: any) {
      console.error('Failed to delete user from Auth:', authErr?.message || authErr);
      // Do not fail the request; Firestore doc has been removed and we saved backup
    }

    return NextResponse.json({ success: true, message: 'User deleted from Firestore and Auth (where possible).' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
