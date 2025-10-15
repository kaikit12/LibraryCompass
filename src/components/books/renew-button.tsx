"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';

interface RenewButtonProps {
  borrowalId: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  currentDueDate: Date;
  disabled?: boolean;
}

export function RenewButton({
  borrowalId,
  bookId,
  bookTitle,
  userId,
  userName,
  currentDueDate,
  disabled = false,
}: RenewButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestedDays, setRequestedDays] = useState(14);

  const handleRenew = async () => {
    if (requestedDays < 1 || requestedDays > 30) {
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Số ngày gia hạn phải từ 1 đến 30 ngày',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowalId,
          bookId,
          userId,
          bookTitle,
          userName,
          currentDueDate: currentDueDate.toISOString(),
          requestedDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể gửi yêu cầu gia hạn');
      }

      toast({
        title: '✅ Đã gửi yêu cầu gia hạn',
        description: `Yêu cầu gia hạn ${requestedDays} ngày đã được gửi. Vui lòng chờ xác nhận từ thư viện.`,
      });

      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '❌ Gửi yêu cầu thất bại',
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
          variant="outline"
          size="sm"
          disabled={disabled}
          className="border-primary/30 hover:bg-primary/10"
        >
          <Calendar className="h-4 w-4 mr-1" />
          Gia hạn
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yêu cầu gia hạn sách</DialogTitle>
          <DialogDescription>
            Gửi yêu cầu gia hạn thời gian mượn cho &quot;{bookTitle}&quot;
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Hạn trả hiện tại</Label>
            <div className="p-2 bg-secondary rounded text-sm">
              {currentDueDate.toLocaleDateString('vi-VN')}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="days">Số ngày muốn gia hạn</Label>
            <Input
              id="days"
              type="number"
              min="1"
              max="30"
              value={requestedDays}
              onChange={(e) => setRequestedDays(parseInt(e.target.value) || 14)}
            />
            <p className="text-xs text-muted-foreground">
              Từ 1 đến 30 ngày (mặc định: 14 ngày)
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Lưu ý:</strong> Yêu cầu gia hạn sẽ được xem xét bởi thư viện. 
              Sách có người đặt chỗ sẽ không được gia hạn.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Hủy
          </Button>
          <Button onClick={handleRenew} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gửi yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
