import { NextResponse } from 'next/server';
import { 
  initializeFirebaseAdmin, 
  verifyAuthentication, 
  isAdminOrLibrarian, 
  getAdminDB 
} from '@/lib/firebase-admin-utils';
import { FieldValue } from 'firebase-admin/firestore';

// GET - Fetch reviews for a book
export async function GET(request: Request) {
  try {
    // 🚨 SECURITY FIX: Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getAdminDB();
    
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const userId = searchParams.get('userId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    let reviewsSnapshot;
    if (userId) {
      // Get specific user's review for this book
      reviewsSnapshot = await db.collection('reviews')
        .where('bookId', '==', bookId)
        .where('userId', '==', userId)
        .get();
    } else {
      // Get all reviews for this book
      reviewsSnapshot = await db.collection('reviews')
        .where('bookId', '==', bookId)
        .get();
    }

    const reviews = reviewsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST - Add a new review
export async function POST(request: Request) {
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
    
    const { bookId, userId, userName, rating, comment } = await request.json();

    if (!bookId || !userId || !userName || !rating) {
      return NextResponse.json(
        { error: 'bookId, userId, userName, and rating are required' },
        { status: 400 }
      );
    }

    // Verify user can only create reviews for themselves (unless admin/librarian)
    if (authenticatedUser.uid !== userId && !isAdminOrLibrarian(authenticatedUser)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user has already reviewed this book
    const existingReviews = await db.collection('reviews')
      .where('bookId', '==', bookId)
      .where('userId', '==', userId)
      .get();

    if (!existingReviews.empty) {
      return NextResponse.json(
        { error: 'Bạn đã đánh giá sách này rồi. Vui lòng chỉnh sửa đánh giá cũ.' },
        { status: 400 }
      );
    }

    // Check if user has borrowed this book (optional validation)
    const borrowals = await db.collection('borrowals')
      .where('userId', '==', userId)
      .where('bookId', '==', bookId)
      .get();

    if (borrowals.empty) {
      return NextResponse.json(
        { error: 'Chỉ người đã mượn sách mới có thể đánh giá' },
        { status: 403 }
      );
    }

    // Add review
    const reviewData = {
      bookId,
      userId,
      userName,
      rating,
      comment: comment || '',
      createdAt: FieldValue.serverTimestamp(),
      helpfulCount: 0,
    };

    const reviewRef = await db.collection('reviews').add(reviewData);

    // Update book's average rating and review count
    await updateBookRating(bookId);

    return NextResponse.json({
      success: true,
      reviewId: reviewRef.id,
      message: 'Đánh giá đã được thêm thành công',
    });
  } catch (error) {
    console.error('Error adding review:', error);
    return NextResponse.json(
      { error: 'Failed to add review' },
      { status: 500 }
    );
  }
}

// PATCH - Update a review
export async function PATCH(request: Request) {
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
    
    const { reviewId, rating, comment, action } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      );
    }

    const reviewDoc = await db.collection('reviews').doc(reviewId).get();

    if (!reviewDoc.exists) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const reviewData = reviewDoc.data()!;
    
    if (action === 'helpful') {
      // Anyone can mark as helpful
      await db.collection('reviews').doc(reviewId).update({
        helpfulCount: FieldValue.increment(1),
      });

      return NextResponse.json({
        success: true,
        message: 'Đã đánh dấu hữu ích',
      });
    } else {
      // Update rating/comment - only review owner or admin/librarian can edit
      if (authenticatedUser.uid !== reviewData.userId && !isAdminOrLibrarian(authenticatedUser)) {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }
      
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }

      await db.collection('reviews').doc(reviewId).update({
        rating,
        comment: comment || '',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Recalculate book's average rating
      const bookId = reviewData.bookId;
      await updateBookRating(bookId);

      return NextResponse.json({
        success: true,
        message: 'Đánh giá đã được cập nhật',
      });
    }
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// Helper function to update book's average rating
async function updateBookRating(bookId: string) {
  // 🚨 SECURITY FIX: Initialize Firebase Admin for helper function
  initializeFirebaseAdmin();
  const db = getAdminDB();
  
  const reviewsSnapshot = await db.collection('reviews')
    .where('bookId', '==', bookId)
    .get();

  if (reviewsSnapshot.empty) {
    // No reviews, reset to 0
    await db.collection('books').doc(bookId).update({
      rating: 0,
      reviewCount: 0,
    });
    return;
  }

  const reviews = reviewsSnapshot.docs.map((doc: any) => doc.data());
  const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await db.collection('books').doc(bookId).update({
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    reviewCount: reviews.length,
  });
}
