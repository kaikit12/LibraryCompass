"use client";

import { useState, useEffect } from 'react';
import { RenewalRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function RenewalRequestsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RenewalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/renewals?status=pending');
      if (!response.ok) throw new Error('Failed to fetch requests');
      
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: 'Không thể tải danh sách yêu cầu gia hạn',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (request: RenewalRequest) => {
    if (!user) return;

    setProcessingId(request.id);
    try {
      const response = await fetch('/api/renewals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalId: request.id,
          action: 'approve',
          processedBy: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể chấp nhận yêu cầu');
      }

      toast({
        title: '✅ Đã chấp nhận',
        description: `Đã gia hạn sách cho ${request.userName}`,
      });

      // Reload requests
      await loadRequests();
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

  const handleRejectClick = (request: RenewalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedRequest || !user) return;

    setProcessingId(selectedRequest.id);
    try {
      const response = await fetch('/api/renewals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalId: selectedRequest.id,
          action: 'reject',
          processedBy: user.id,
          rejectionReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Không thể từ chối yêu cầu');
      }

      toast({
        title: '✅ Đã từ chối',
        description: `Đã từ chối yêu cầu gia hạn của ${selectedRequest.userName}`,
      });

      setRejectDialogOpen(false);
      setSelectedRequest(null);
      
      // Reload requests
      await loadRequests();
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Yêu cầu gia hạn sách
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

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Yêu cầu gia hạn sách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Không có yêu cầu gia hạn nào đang chờ xử lý</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Yêu cầu gia hạn sách ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{request.bookTitle}</h4>
                    <p className="text-sm text-muted-foreground">
                      Người mượn: {request.userName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span>
                        Hạn hiện tại: <strong>{new Date(request.currentDueDate).toLocaleDateString('vi-VN')}</strong>
                      </span>
                      <Badge variant="outline">+{request.requestedDays} ngày</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Yêu cầu lúc: {new Date(request.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processingId === request.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Chấp nhận
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectClick(request)}
                    disabled={processingId === request.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Từ chối
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu gia hạn</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn từ chối yêu cầu gia hạn cho &quot;{selectedRequest?.bookTitle}&quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Lý do từ chối (tùy chọn)</Label>
              <Textarea
                id="reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!!processingId}>
              {processingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
