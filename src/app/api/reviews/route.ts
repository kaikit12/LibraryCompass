import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  getDoc,
  increment,
} from 'firebase/firestore';

// GET - Fetch reviews for a book
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const userId = searchParams.get('userId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'bookId is required' },
        { status: 400 }
      );
    }

    let q;
    if (userId) {
      // Get specific user's review for this book
      q = query(
        collection(db, 'reviews'),
        where('bookId', '==', bookId),
        where('userId', '==', userId)
      );
    } else {
      // Get all reviews for this book
      q = query(collection(db, 'reviews'), where('bookId', '==', bookId));
    }

    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map((doc) => ({
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
    const { bookId, userId, userName, rating, comment } = await request.json();

    if (!bookId || !userId || !userName || !rating) {
      return NextResponse.json(
        { error: 'bookId, userId, userName, and rating are required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user has already reviewed this book
    const existingReviewQuery = query(
      collection(db, 'reviews'),
      where('bookId', '==', bookId),
      where('userId', '==', userId)
    );
    const existingReviews = await getDocs(existingReviewQuery);

    if (!existingReviews.empty) {
      return NextResponse.json(
        { error: 'Bạn đã đánh giá sách này rồi. Vui lòng chỉnh sửa đánh giá cũ.' },
        { status: 400 }
      );
    }

    // Check if user has borrowed this book (optional validation)
    const borrowalsQuery = query(
      collection(db, 'borrowals'),
      where('userId', '==', userId),
      where('bookId', '==', bookId)
    );
    const borrowals = await getDocs(borrowalsQuery);

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
      createdAt: serverTimestamp(),
      helpfulCount: 0,
    };

    const reviewRef = await addDoc(collection(db, 'reviews'), reviewData);

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
    const { reviewId, rating, comment, action } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required' },
        { status: 400 }
      );
    }

    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (!reviewDoc.exists()) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (action === 'helpful') {
      // Increment helpful count
      await updateDoc(reviewRef, {
        helpfulCount: increment(1),
      });

      return NextResponse.json({
        success: true,
        message: 'Đã đánh dấu hữu ích',
      });
    } else {
      // Update rating/comment
      if (!rating || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }

      await updateDoc(reviewRef, {
        rating,
        comment: comment || '',
        updatedAt: serverTimestamp(),
      });

      // Recalculate book's average rating
      const bookId = reviewDoc.data().bookId;
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
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('bookId', '==', bookId)
  );
  const reviewsSnapshot = await getDocs(reviewsQuery);

  if (reviewsSnapshot.empty) {
    // No reviews, reset to 0
    await updateDoc(doc(db, 'books', bookId), {
      rating: 0,
      reviewCount: 0,
    });
    return;
  }

  const reviews = reviewsSnapshot.docs.map((doc) => doc.data());
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;

  await updateDoc(doc(db, 'books', bookId), {
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    reviewCount: reviews.length,
  });
}
