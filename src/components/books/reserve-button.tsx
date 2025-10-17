"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Reservation } from "@/lib/types";

interface ReserveButtonProps {
  bookId: string;
  bookTitle: string;
  isAvailable: boolean;
  className?: string;
}

export function ReserveButton({ bookId, bookTitle, isAvailable, className }: ReserveButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [isCheckingReservation, setIsCheckingReservation] = useState(true);

  // Check if user has an active reservation for this book
  useEffect(() => {
    if (!user?.id) {
      setIsCheckingReservation(false);
      return;
    }

    const checkReservation = async () => {
      try {
        const response = await fetch(`/api/reservations?userId=${user.id}&bookId=${bookId}`);
        const data = await response.json();
        const activeReservation = data.find((r: Reservation) => r.status === 'active');
        setReservation(activeReservation || null);
      } catch (error) {
        console.error('Error checking reservation:', error);
      } finally {
        setIsCheckingReservation(false);
      }
    };

    checkReservation();
  }, [user?.id, bookId]);

  const handleReserve = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Vui lòng đăng nhập để đặt chỗ sách",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          userId: user.id,
          bookTitle,
          userName: user.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể đặt chỗ sách');
      }

      toast({
        title: "✅ Đặt chỗ thành công",
        description: `Vị trí trong hàng đợi: ${data.position}. Bạn sẽ nhận thông báo khi sách sẵn sàng.`,
      });

      // Dispatch event to trigger refresh in MyReservations component
      window.dispatchEvent(new Event('reservationCreated'));

      // Refresh reservation status
      setReservation({
        id: data.reservationId,
        bookId,
        readerId: user.id,
        userId: user.id,
        bookTitle,
        userName: user.name,
        status: 'active',
        priority: 1,
        expirationDate: { seconds: Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000), nanoseconds: 0, toDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        notificationSent: false,
        position: data.position,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date() },
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Đặt chỗ thất bại",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reservations?id=${reservation.id}&userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể hủy đặt chỗ');
      }

      toast({
        title: "✅ Đã hủy đặt chỗ",
        description: `Đã hủy đặt chỗ cho "${bookTitle}"`,
      });

      // Dispatch event to trigger refresh in MyReservations component
      window.dispatchEvent(new Event('reservationCreated'));

      setReservation(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Hủy đặt chỗ thất bại",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if book is available
  if (isAvailable) {
    return null;
  }

  // Don't show for non-readers
  if (user?.role !== 'reader') {
    return null;
  }

  if (isCheckingReservation) {
    return (
      <Button size="sm" disabled className={className}>
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        Đang kiểm tra...
      </Button>
    );
  }

  if (reservation) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={handleCancelReservation}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <BookmarkCheck className="h-4 w-4 mr-1" />
        )}
        Đã đặt chỗ #{reservation.position}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className={className}
      onClick={handleReserve}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <Bookmark className="h-4 w-4 mr-1" />
      )}
      Đặt chỗ
    </Button>
  );
}
