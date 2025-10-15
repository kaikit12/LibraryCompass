"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { addHours, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface BookAppointmentDialogProps {
  bookId: string;
  bookTitle: string;
  disabled?: boolean;
}

export function BookAppointmentDialog({ bookId, bookTitle, disabled = false }: BookAppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Generate time options (8:00 AM to 8:00 PM, every hour)
  const timeOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8; // Start from 8 AM
    return {
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${hour}:00`,
    };
  });

  // Generate date options (today + next 7 days)
  const dateOptions = Array.from({ length: 8 }, (_, i) => {
    const date = addHours(new Date(), 24 * i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'dd/MM/yyyy (EEEE)', { locale: vi }),
    };
  });

  const handleSubmit = async () => {
    if (!pickupDate || !pickupTime) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Vui lòng chọn ngày và giờ nhận sách',
      });
      return;
    }

    if (!agreedToTerms) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Vui lòng đồng ý với điều khoản',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Vui lòng đăng nhập',
      });
      return;
    }

    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}:00`);

    setIsLoading(true);
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookTitle,
          userId: user.id,
          userName: user.name,
          userMemberId: user.memberId,
          pickupTime: pickupDateTime.toISOString(),
          agreedToTerms: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể đặt lịch mượn sách');
      }

      toast({
        title: '✅ Đã đặt lịch thành công',
        description: `Vui lòng đến thư viện lúc ${pickupDateTime.toLocaleString('vi-VN')} để nhận sách. Nhớ mang theo thẻ thư viện!`,
      });

      setIsOpen(false);
      // Reset form
      setPickupDate('');
      setPickupTime('');
      setAgreedToTerms(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Đặt lịch thất bại',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="flex-1 gradient-primary border-0"
          disabled={disabled}
        >
          <CalendarIcon className="h-4 w-4 mr-1" />
          Đặt lịch mượn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt lịch mượn sách</DialogTitle>
          <DialogDescription>
            Chọn thời gian đến thư viện để nhận &quot;{bookTitle}&quot;
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="p-3 bg-secondary rounded-lg space-y-1">
            <p className="text-sm font-medium">Thông tin của bạn:</p>
            <p className="text-sm">Họ tên: <strong>{user?.name}</strong></p>
            {user?.memberId && (
              <p className="text-sm">Mã thẻ: <strong>#{user.memberId}</strong></p>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="date">Ngày nhận sách</Label>
            <select
              id="date"
              className="w-full p-2 border rounded-md bg-background"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
            >
              <option value="">-- Chọn ngày --</option>
              {dateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Picker */}
          <div className="space-y-2">
            <Label htmlFor="time">Giờ nhận sách</Label>
            <select
              id="time"
              className="w-full p-2 border rounded-md bg-background"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            >
              <option value="">-- Chọn giờ --</option>
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-tight cursor-pointer text-orange-800 dark:text-orange-300"
            >
              <strong>⚠️ Điều khoản:</strong> Tôi cam kết sẽ đến đúng giờ. 
              Nếu trễ <strong>quá 2 giờ</strong> mà không thông báo, lịch đặt sẽ 
              <strong> tự động hủy</strong> và sách sẽ được trả lại kho.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận đặt lịch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
