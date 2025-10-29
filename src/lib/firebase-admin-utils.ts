import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

// Firebase Admin initialization function
export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    try {
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      if (!privateKey) {
  throw new Error('FIREBASE_ADMIN_PRIVATE_KEY environment variable is not set');
      }
      
      // Handle both escaped and unescaped private keys
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin:', error);
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