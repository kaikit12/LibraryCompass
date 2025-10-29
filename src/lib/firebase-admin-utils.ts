import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

// Firebase Admin initialization function
export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
      // Lấy các biến
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const base64Key = process.env.FIREBASE_ADMIN_PRIVATE_KEY; // Đây là key đã mã hóa

      if (!projectId || !clientEmail || !base64Key) {
        throw new Error('Missing Firebase Admin environment variables (PROJECT_ID, CLIENT_EMAIL, or Base64 KEY)');
      }

      // GIẢI MÃ key từ Base64 trở lại định dạng PEM ban đầu
      const privateKey = Buffer.from(base64Key, 'base64').toString('utf8');

      // Khởi tạo app
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey, // Dùng key đã được giải mã
        }),
      });

      console.log('Firebase Admin initialized successfully (Base64 method)');

    } catch (error) {
      console.error('Failed to initialize Firebase Admin (Base64 method):', error);
      throw error;
    }
  }
}

// Authentication verification function
export async function verifyAuthentication(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      ),
      user: null
    };
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    return { user: decodedToken, error: null };
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
      user: null
    };
  }
}

// Check if user has admin or librarian role
export function isAdminOrLibrarian(user: any): boolean {
  return user.role === 'admin' || user.role === 'librarian';
}

// Get Firebase Admin database instance
export function getAdminDB() {
  return getFirestore();
}