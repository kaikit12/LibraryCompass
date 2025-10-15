'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, XCircle } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export function MyAppointments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/appointments?userId=${user.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách lịch hẹn',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // Auto-refresh every minute to update status badges
    const interval = setInterval(loadAppointments, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Bạn có chắc muốn hủy lịch hẹn này?')) return;

    setCancelling(appointmentId);
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          action: 'cancel',
          cancellationReason: 'Người dùng tự hủy',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel appointment');
      }

      toast({
        title: 'Đã hủy lịch hẹn',
        description: 'Lịch hẹn của bạn đã được hủy thành công',
      });

      await loadAppointments();
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
                          Đặt lúc: {format(new Date(appointment.createdAt), 'HH:mm dd/MM/yyyy', { locale: vi })}
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
