import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

// GET - Fetch user's wishlist
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const q = query(collection(db, 'wishlist'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
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
    const { userId, bookId, priority, notes } = await request.json();

    if (!userId || !bookId) {
      return NextResponse.json(
        { error: 'userId and bookId are required' },
        { status: 400 }
      );
    }

    // Check if already in wishlist
    const existingQuery = query(
      collection(db, 'wishlist'),
      where('userId', '==', userId),
      where('bookId', '==', bookId)
    );
    const existingItems = await getDocs(existingQuery);

    if (!existingItems.empty) {
      return NextResponse.json(
        { error: 'Sách đã có trong danh sách đọc của bạn' },
        { status: 400 }
      );
    }

    // Get book details
    const bookRef = doc(db, 'books', bookId);
    const bookDoc = await getDoc(bookRef);

    if (!bookDoc.exists()) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const bookData = bookDoc.data();

    // Add to wishlist
    const wishlistData = {
      userId,
      bookId,
      bookTitle: bookData.title,
      bookAuthor: bookData.author,
      bookImageUrl: bookData.imageUrl || '',
      addedAt: serverTimestamp(),
      priority: priority || 'medium',
      notes: notes || '',
    };

    const wishlistRef = await addDoc(collection(db, 'wishlist'), wishlistData);

    // Create notification
    await addDoc(collection(db, 'notifications'), {
      userId,
      message: `Đã thêm "${bookData.title}" vào danh sách đọc của bạn`,
      type: 'info',
      createdAt: serverTimestamp(),
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
    const { searchParams } = new URL(request.url);
    const wishlistId = searchParams.get('wishlistId');

    if (!wishlistId) {
      return NextResponse.json(
        { error: 'wishlistId is required' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, 'wishlist', wishlistId));

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
    const { wishlistId, priority, notes } = await request.json();

    if (!wishlistId) {
      return NextResponse.json(
        { error: 'wishlistId is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (priority) updateData.priority = priority;
    if (notes !== undefined) updateData.notes = notes;

    await updateDoc(doc(db, 'wishlist', wishlistId), updateData);

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
