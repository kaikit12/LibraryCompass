"use client";

import { useState, useEffect } from 'react';
import { Appointment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Check, X, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { differenceInHours, format } from 'date-fns';
import { vi } from 'date-fns/locale';

export function AppointmentsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadAppointments();
    // Auto-refresh every minute to check for expired appointments
    const interval = setInterval(loadAppointments, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/appointments?status=pending');
      if (!response.ok) throw new Error('Failed to fetch appointments');
      
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (appointment: Appointment) => {
    if (!user) return;

    setProcessingId(appointment.id);
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          action: 'confirm',
          confirmedBy: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể xác nhận lịch đặt');
      }

      toast({
        title: '✅ Đã xác nhận',
        description: `Đã cho ${appointment.userName} mượn sách "${appointment.bookTitle}"`,
      });

      // Reload appointments
      await loadAppointments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    setProcessingId(appointment.id);
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.id,
          action: 'cancel',
          cancellationReason: 'Hủy bởi thư viện',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể hủy lịch đặt');
      }

      toast({
        title: '✅ Đã hủy',
        description: `Đã hủy lịch đặt của ${appointment.userName}`,
      });

      // Reload appointments
      await loadAppointments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lịch đặt mượn sách ({appointments.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.map((appointment) => {
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
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 <strong>Lưu ý:</strong> Kiểm tra thẻ thư viện (Member ID) trước khi xác nhận. 
            Lịch đặt quá 2 giờ sẽ tự động hủy và trả sách về kho.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
