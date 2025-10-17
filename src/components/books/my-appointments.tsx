'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { Appointment, toDate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, XCircle } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, safeOnSnapshot } from '@/lib/firebase';

export function MyAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    // Use Firestore onSnapshot for real-time updates
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('userId', '==', user.id)
    );

    const unsubscribe = safeOnSnapshot(appointmentsQuery, (snapshot: any) => {
      try {
        const appointmentsList = snapshot.docs.map((doc: any) => {
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
        appointmentsList.sort((a: any, b: any) => a.pickupTime.getTime() - b.pickupTime.getTime());
        
        setAppointments(appointmentsList);
        setLoading(false);
      } catch (error) {
        console.error('Error processing appointments:', error);
        setAppointments([]);
        setLoading(false);
      }
    }, (error) => {
      console.error('Error listening to appointments:', error);
      setAppointments([]);
      setLoading(false);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách lịch hẹn từ cơ sở dữ liệu.',
        variant: 'destructive',
      });
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return;

    setCancelling(appointmentId);
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancellationReason: 'Hủy bởi người dùng',
      });

      toast({
        title: 'Đã hủy lịch hẹn',
        description: 'Lịch hẹn của bạn đã được hủy thành công',
      });

    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể hủy lịch hẹn',
        variant: 'destructive',
      });
    } finally {
      setCancelling(null);
    }
  };

  const getStatusBadge = (appointment: Appointment) => {
    const now = new Date();
    const pickupTime = new Date(appointment.pickupTime);

    switch (appointment.status) {
      case 'confirmed':
        return <Badge className="bg-green-600">✓ Đã xác nhận</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">✗ Đã hủy</Badge>;
      case 'expired':
        return <Badge variant="destructive">⏱ Quá hạn</Badge>;
      case 'pending': {
        const hoursLate = differenceInHours(now, pickupTime);
        const hoursUntilPickup = differenceInHours(pickupTime, now);

        if (hoursLate > 2) {
          return <Badge variant="destructive">Quá hạn ({hoursLate}h trễ)</Badge>;
        } else if (hoursLate > 0) {
          return <Badge className="bg-orange-500 text-white">⚠ Trễ {hoursLate}h</Badge>;
        } else if (hoursUntilPickup <= 1) {
          return <Badge className="bg-green-500 text-white">🔔 Sắp đến</Badge>;
        } else {
          return <Badge variant="outline">⏰ Chờ đến</Badge>;
        }
      }
      default:
        return <Badge variant="outline">{appointment.status}</Badge>;
    }
  };

  const pendingAppointments = appointments.filter((a) => a.status === 'pending');
  const completedAppointments = appointments.filter((a) => a.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch hẹn mượn sách</CardTitle>
          <CardDescription>Danh sách các lịch hẹn của bạn</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lịch hẹn đang chờ ({pendingAppointments.length})
          </CardTitle>
          <CardDescription>
            Các lịch hẹn chưa xác nhận. Vui lòng đến đúng giờ (tối đa trễ 2 giờ).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Bạn chưa có lịch hẹn nào đang chờ
            </p>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.map((appointment) => {
                const now = new Date();
                const pickupTime = new Date(appointment.pickupTime);
                const hoursLate = differenceInHours(now, pickupTime);
                const isExpired = hoursLate > 2;

                return (
                  <div
                    key={appointment.id}
                    className={`p-4 border rounded-lg space-y-3 ${
                      isExpired ? 'bg-red-50 border-red-300' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold text-lg">{appointment.bookTitle}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Thời gian nhận:{' '}
                            <strong>
                              {format(pickupTime, 'HH:mm - dd/MM/yyyy (EEEE)', { locale: vi })}
                            </strong>
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Đặt lúc: {format(toDate(appointment.createdAt) || new Date(), 'HH:mm dd/MM/yyyy', { locale: vi })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(appointment)}
                        {!isExpired && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(appointment.id)}
                            disabled={cancelling === appointment.id}
                          >
                            {cancelling === appointment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Hủy
                              </>
                            )}
                          </Button>
                        )}
                        {isExpired && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(appointment.id)}
                            disabled={cancelling === appointment.id}
                          >
                            {cancelling === appointment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Xóa'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpired && (
                      <div className="bg-red-100 text-red-800 p-2 rounded text-sm">
                        ⚠️ Lịch hẹn đã quá hạn. Vui lòng hủy và đặt lại nếu vẫn muốn mượn sách này.
                      </div>
                    )}

                    {appointment.agreedToTerms && (
                      <div className="text-xs text-muted-foreground italic">
                        ✓ Đã cam kết đến đúng giờ (tối đa trễ 2 giờ)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed/Cancelled Appointments */}
      {completedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử lịch hẹn ({completedAppointments.length})</CardTitle>
            <CardDescription>Các lịch hẹn đã xác nhận hoặc đã hủy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedAppointments.map((appointment) => (
                <div key={appointment.id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-medium">{appointment.bookTitle}</h4>
                      <div className="text-sm text-muted-foreground">
                        Thời gian nhận:{' '}
                        {format(new Date(appointment.pickupTime), 'HH:mm dd/MM/yyyy', { locale: vi })}
                      </div>
                      {appointment.confirmedAt && (
                        <div className="text-xs text-green-700">
                          Đã xác nhận lúc:{' '}
                          {format(new Date(appointment.confirmedAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
                        </div>
                      )}
                      {appointment.cancellationReason && (
                        <div className="text-xs text-red-700">
                          Lý do hủy: {appointment.cancellationReason}
                        </div>
                      )}
                    </div>
                    <div>{getStatusBadge(appointment)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
