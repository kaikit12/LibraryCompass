"use client";

import { useState, useEffect } from 'react';
import { Reservation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MyReservationsProps {
  userId: string;
}

export function MyReservations({ userId }: MyReservationsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadReservations();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const loadReservations = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/reservations?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Only show active and fulfilled reservations
      const activeReservations = data.filter(
        (r: Reservation) => r.status === 'active' || r.status === 'fulfilled'
      );
      setReservations(activeReservations);
    } catch (error: any) {
      console.error('Error loading reservations:', error);
      // Don't show toast error on initial load - just show empty state
      // This prevents annoying errors when user has no reservations
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    setCancellingId(reservationId);
    try {
      const response = await fetch(`/api/reservations?id=${reservationId}&userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể hủy đặt chỗ');
      }

      toast({
        title: '✅ Đã hủy đặt chỗ',
        description: 'Đặt chỗ của bạn đã được hủy thành công',
      });

      // Reload reservations
      await loadReservations();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Hủy đặt chỗ thất bại',
        description: error.message,
      });
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Sách đã đặt chỗ
          </CardTitle>
          <CardDescription>
            Danh sách các sách bạn đang chờ mượn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Sách đã đặt chỗ
          </CardTitle>
          <CardDescription>
            Danh sách các sách bạn đang chờ mượn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Bạn chưa đặt chỗ sách nào</p>
            <p className="text-sm mt-2">
              Khi sách bạn muốn mượn hết, hãy đặt chỗ để được ưu tiên khi có sách trả lại
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          Sách đã đặt chỗ ({reservations.length})
        </CardTitle>
        <CardDescription>
          Danh sách các sách bạn đang chờ mượn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <Link href={`/books/${reservation.bookId}`}>
                  <h4 className="font-semibold hover:text-primary transition-colors">
                    {reservation.bookTitle}
                  </h4>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  {reservation.status === 'fulfilled' ? (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      ✅ Sẵn sàng - Có 48h để mượn
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Vị trí: #{reservation.position}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Đặt lúc: {new Date(reservation.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {reservation.status === 'fulfilled' && reservation.expiresAt && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⏰ Hết hạn: {new Date(reservation.expiresAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancellingId === reservation.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {cancellingId === reservation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hủy đặt chỗ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn hủy đặt chỗ cho &quot;{reservation.bookTitle}&quot;?
                      {reservation.status === 'active' && (
                        <span className="block mt-2 text-sm">
                          Vị trí của bạn sẽ được nhường cho người khác trong hàng đợi.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Không</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleCancelReservation(reservation.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Hủy đặt chỗ
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
        
        {reservations.some(r => r.status === 'active') && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Lưu ý:</strong> Khi sách sẵn sàng, bạn sẽ nhận được thông báo và có 48 giờ để mượn sách.
              Sau 48 giờ, sách sẽ được chuyển cho người tiếp theo trong hàng đợi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
