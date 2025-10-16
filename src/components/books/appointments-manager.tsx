"use client";

import { useState, useEffect } from 'react';
import { Appointment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2, Check, X, Clock, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { differenceInHours, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, increment, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function AppointmentsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');

  // Don't render if user doesn't have proper access
  if (!user || (user.role !== 'admin' && user.role !== 'librarian')) {
    return null;
  }

  useEffect(() => {
    // Only load appointments if user is authenticated and has proper role
    if (user && (user.role === 'admin' || user.role === 'librarian')) {
      // Use Firestore onSnapshot for real-time updates
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
        try {
          const appointmentsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              pickupTime: data.pickupTime?.toDate?.() || new Date(),
              createdAt: data.createdAt?.toDate?.() || new Date(),
              confirmedAt: data.confirmedAt?.toDate?.() || null,
            } as Appointment;
          });

          // Sort by pickupTime asc (soonest first)
          appointmentsList.sort((a, b) => a.pickupTime.getTime() - b.pickupTime.getTime());
          
          setAppointments(appointmentsList);
          setIsLoading(false);
        } catch (error) {
          console.error('Error processing appointments:', error);
          setAppointments([]);
          setIsLoading(false);
        }
      }, (error) => {
        console.error('Error listening to appointments:', error);
        setAppointments([]);
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: '❌ Lỗi',
          description: 'Không thể tải danh sách lịch hẹn từ cơ sở dữ liệu.',
        });
      });

      return () => unsubscribe();
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  const handleConfirm = async (appointment: Appointment) => {
    if (!user) return;

    setProcessingId(appointment.id);
    try {
      // Update appointment status
      const appointmentRef = doc(db, 'appointments', appointment.id);
      await updateDoc(appointmentRef, {
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: user.id,
      });

      // Create borrowal record
      const borrowalData = {
        bookId: appointment.bookId,
        userId: appointment.userId,
        bookTitle: appointment.bookTitle,
        userName: appointment.userName,
        userMemberId: appointment.userMemberId,
        borrowedAt: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'borrowed',
        appointmentId: appointment.id,
      };

      const borrowalRef = await addDoc(collection(db, 'borrowals'), borrowalData);

      // Update book availability
      const bookRef = doc(db, 'books', appointment.bookId);
      await updateDoc(bookRef, {
        available: increment(-1),
      });

      // Update user's borrowed books
      const userRef = doc(db, 'users', appointment.userId);
      await updateDoc(userRef, {
        booksOut: increment(1),
        borrowedBooks: arrayUnion(appointment.bookId),
      });

      // Update appointment with borrowal ID
      await updateDoc(appointmentRef, {
        borrowalId: borrowalRef.id,
      });

      toast({
        title: '✅ Đã xác nhận',
        description: `Đã cho ${appointment.userName} mượn sách "${appointment.bookTitle}"`,
      });

    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message || 'Không thể xác nhận lịch hẹn',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    setProcessingId(appointment.id);
    try {
      const appointmentRef = doc(db, 'appointments', appointment.id);
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancellationReason: 'Hủy bởi thư viện',
      });

      toast({
        title: '✅ Đã hủy',
        description: `Đã hủy lịch đặt của ${appointment.userName}`,
      });

    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message || 'Không thể hủy lịch hẹn',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (appointment: Appointment) => {
    const now = new Date();
    const pickupTime = new Date(appointment.pickupTime);
    const hoursUntilPickup = differenceInHours(pickupTime, now);
    const hoursLate = differenceInHours(now, pickupTime);

    if (hoursLate > 2) {
      return <Badge variant="destructive">Quá hạn ({hoursLate}h trễ)</Badge>;
    } else if (hoursLate > 0) {
      return <Badge variant="secondary" className="bg-orange-500 text-white">Trễ {hoursLate}h</Badge>;
    } else if (hoursUntilPickup <= 1) {
      return <Badge variant="default" className="bg-green-500">Sắp đến ({Math.abs(hoursUntilPickup)}h)</Badge>;
    } else {
      return <Badge variant="outline">Chờ đến</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lịch đặt mượn sách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lịch đặt mượn sách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Không có lịch đặt mượn sách nào đang chờ</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter appointments by search ID
  const filteredAppointments = appointments.filter((appointment) => {
    if (!searchId.trim()) return true;
    const search = searchId.trim().toLowerCase();
    return (
      appointment.id.toLowerCase().includes(search) ||
      appointment.userId.toLowerCase().includes(search) ||
      appointment.bookId.toLowerCase().includes(search) ||
      appointment.userName.toLowerCase().includes(search) ||
      (appointment.userMemberId && String(appointment.userMemberId).toLowerCase().includes(search))
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lịch đặt mượn sách ({filteredAppointments.length}/{appointments.length})
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Lọc theo ID, mã thẻ..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Không tìm thấy lịch đặt nào với từ khóa &quot;{searchId}&quot;</p>
          </div>
        ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appointment) => {
            const now = new Date();
            const hoursLate = differenceInHours(now, new Date(appointment.pickupTime));
            const isExpired = hoursLate > 2;

            return (
              <div
                key={appointment.id}
                className={`flex flex-col gap-3 p-4 border rounded-lg transition-colors ${
                  isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'hover:bg-accent/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{appointment.bookTitle}</h4>
                    <p className="text-sm text-muted-foreground">
                      Người đặt: <strong>{appointment.userName}</strong>
                      {appointment.userMemberId && ` (ID: #${appointment.userMemberId})`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {format(new Date(appointment.pickupTime), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
                      </span>
                      {getStatusBadge(appointment)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Đặt lúc: {format(new Date(appointment.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                    </p>
                  </div>
                </div>

                {isExpired ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancel(appointment)}
                      disabled={processingId === appointment.id}
                      className="flex-1"
                    >
                      {processingId === appointment.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Hủy (Quá hạn)
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(appointment)}
                      disabled={processingId === appointment.id}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      {processingId === appointment.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Xác nhận cho mượn
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(appointment)}
                      disabled={processingId === appointment.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        
        {filteredAppointments.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Lưu ý:</strong> Kiểm tra thẻ thư viện (Member ID) trước khi xác nhận. 
            Lịch đặt quá 2 giờ sẽ tự động hủy và trả sách về kho.
          </p>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
