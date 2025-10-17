'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Review, toDate, getTimestamp } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Star, ThumbsUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReviewDialogProps {
  bookId: string;
  bookTitle: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function ReviewDialog({
  bookId,
  bookTitle,
  isOpen,
  setIsOpen,
}: ReviewDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && bookId) {
      loadReviews();
    }
  }, [isOpen, bookId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Load all reviews
      const response = await fetch(`/api/reviews?bookId=${bookId}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      setReviews(data.reviews || []);

      // Check if user has already reviewed
      if (user) {
        const userResponse = await fetch(
          `/api/reviews?bookId=${bookId}&userId=${user.id}`
        );
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.reviews && userData.reviews.length > 0) {
            const existingReview = userData.reviews[0];
            setUserReview(existingReview);
            setRating(existingReview.rating);
            setComment(existingReview.comment || '');
          }
        }
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải đánh giá',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng đăng nhập để đánh giá',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn số sao',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (userReview) {
        // Update existing review
        const response = await fetch('/api/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewId: userReview.id,
            rating,
            comment,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update review');
        }

        toast({
          title: 'Thành công',
          description: 'Đã cập nhật đánh giá của bạn',
        });
      } else {
        // Add new review
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId,
            userId: user.id,
            userName: user.name,
            rating,
            comment,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add review');
        }

        toast({
          title: 'Thành công',
          description: 'Đã thêm đánh giá của bạn',
        });
      }

      await loadReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể gửi đánh giá',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          action: 'helpful',
        }),
      });

      if (!response.ok) throw new Error('Failed to mark as helpful');

      await loadReviews();
    } catch (error) {
      console.error('Error marking as helpful:', error);
    }
  };

  const renderStars = (
    currentRating: number,
    onRate?: (rating: number) => void,
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate?.(star)}
            onMouseEnter={() => onRate && setHoveredRating(star)}
            onMouseLeave={() => onRate && setHoveredRating(0)}
            className={onRate ? 'cursor-pointer transition-transform hover:scale-110' : ''}
            disabled={!onRate}
          >
            <Star
              className={`${sizeClass} ${
                star <= (hoveredRating || currentRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Đánh giá: {bookTitle}</DialogTitle>
          <DialogDescription>
            {reviews.length > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  ({reviews.length} đánh giá)
                </span>
              </div>
            ) : (
              'Chưa có đánh giá nào'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* User's Review Form */}
          {user && user.role === 'reader' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold">
                {userReview ? 'Đánh giá của bạn' : 'Viết đánh giá'}
              </h3>
              
              <div className="space-y-2">
                <Label>Chọn số sao</Label>
                {renderStars(rating, setRating, 'lg')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Nhận xét (không bắt buộc)</Label>
                <Textarea
                  id="comment"
                  placeholder="Chia sẻ suy nghĩ của bạn về cuốn sách này..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={submitting || rating === 0}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang gửi...
                  </>
                ) : userReview ? (
                  'Cập nhật đánh giá'
                ) : (
                  'Gửi đánh giá'
                )}
              </Button>
            </div>
          )}

          <Separator />

          {/* All Reviews */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tất cả đánh giá</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có đánh giá nào. Hãy là người đầu tiên!
              </p>
            ) : (
              <div className="space-y-4">
                {reviews
                  .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
                  .map((review) => (
                    <div
                      key={review.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{review.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(toDate(review.createdAt) || new Date(), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            {review.updatedAt && ' (đã chỉnh sửa)'}
                          </p>
                        </div>
                        {renderStars(review.rating, undefined, 'sm')}
                      </div>

                      {review.comment && (
                        <p className="text-sm mt-2">{review.comment}</p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkHelpful(review.id)}
                          className="text-xs"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Hữu ích ({review.helpfulCount || 0})
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
