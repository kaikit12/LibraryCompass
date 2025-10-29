import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Firebase Admin initialization function
function initializeFirebaseAdmin() {
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

// GET - Fetch user's wishlist
export async function GET(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify user can only access their own wishlist (unless admin/librarian)
    if (decodedToken.uid !== userId && 
        decodedToken.role !== 'admin' && 
        decodedToken.role !== 'librarian') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const wishlistRef = db.collection('wishlist').where('userId', '==', userId);
    const querySnapshot = await wishlistRef.get();
    
    const wishlist = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate() || new Date(),
    }));

    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

// POST - Add book to wishlist
export async function POST(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    const { userId, bookId, priority, notes } = await request.json();

    if (!userId || !bookId) {
      return NextResponse.json(
        { error: 'userId and bookId are required' },
        { status: 400 }
      );
    }

    // Verify user can only add to their own wishlist (unless admin/librarian)
    if (decodedToken.uid !== userId && 
        decodedToken.role !== 'admin' && 
        decodedToken.role !== 'librarian') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    // Check if already in wishlist
    const existingQuery = db.collection('wishlist')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId);
    const existingItems = await existingQuery.get();

    if (!existingItems.empty) {
      return NextResponse.json(
        { error: 'Sách đã có trong danh sách đọc của bạn' },
        { status: 400 }
      );
    }

    // Get book details
    const bookDoc = await db.collection('books').doc(bookId).get();

    if (!bookDoc.exists) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();

    // Add to wishlist
    const wishlistData = {
      userId,
      bookId,
      bookTitle: bookData?.title,
      bookAuthor: bookData?.author,
      bookImageUrl: bookData?.imageUrl || '',
      addedAt: FieldValue.serverTimestamp(),
      priority: priority || 'medium',
      notes: notes || '',
    };

    const wishlistRef = await db.collection('wishlist').add(wishlistData);

    // Create notification
    await db.collection('notifications').add({
      userId,
      message: `Đã thêm "${bookData?.title}" vào danh sách đọc của bạn`,
      type: 'info',
      createdAt: FieldValue.serverTimestamp(),
      isRead: false,
    });

    return NextResponse.json({
      success: true,
      wishlistId: wishlistRef.id,
      message: 'Đã thêm vào danh sách đọc',
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove book from wishlist
export async function DELETE(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    const { searchParams } = new URL(request.url);
    const wishlistId = searchParams.get('wishlistId');

    if (!wishlistId) {
      return NextResponse.json(
        { error: 'wishlistId is required' },
        { status: 400 }
      );
    }

    // Get the wishlist item to verify ownership
    const wishlistDoc = await db.collection('wishlist').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      return NextResponse.json(
        { error: 'Wishlist item not found' },
        { status: 404 }
      );
    }

    const wishlistData = wishlistDoc.data();
    
    // Verify user can only delete their own wishlist items (unless admin/librarian)
    if (decodedToken.uid !== wishlistData?.userId && 
        decodedToken.role !== 'admin' && 
        decodedToken.role !== 'librarian') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    await db.collection('wishlist').doc(wishlistId).delete();

    return NextResponse.json({
      success: true,
      message: 'Đã xóa khỏi danh sách đọc',
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}

// PATCH - Update wishlist item (priority, notes)
export async function PATCH(request: Request) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();
    
    // 🚨 SECURITY FIX: Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    const { wishlistId, priority, notes } = await request.json();

    if (!wishlistId) {
      return NextResponse.json(
        { error: 'wishlistId is required' },
        { status: 400 }
      );
    }

    // 🚨 SECURITY FIX: Get the wishlist item to verify ownership
    const wishlistDoc = await db.collection('wishlist').doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      return NextResponse.json(
        { error: 'Wishlist item not found' },
        { status: 404 }
      );
    }

    const wishlistData = wishlistDoc.data();
    
    // 🚨 SECURITY FIX: Verify user can only update their own wishlist items (unless admin/librarian)
    if (decodedToken.uid !== wishlistData?.userId && 
        decodedToken.role !== 'admin' && 
        decodedToken.role !== 'librarian') {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (priority) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    await db.collection('wishlist').doc(wishlistId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật danh sách đọc',
    });
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return NextResponse.json(
      { error: 'Failed to update wishlist' },
      { status: 500 }
    );
  }
}
