"use client";

import { useState, useEffect } from 'react';
import { RenewalRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Loader2, Check, X, Search } from 'lucide-react';
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
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function RenewalRequestsManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RenewalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchId, setSearchId] = useState('');
  
  useEffect(() => {
    // Only load requests if user is authenticated and has proper role
    if (user && (user.role === 'admin' || user.role === 'librarian')) {
      // Use Firestore onSnapshot for real-time updates
      const renewalsQuery = query(
        collection(db, 'renewals'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(renewalsQuery, (snapshot) => {
        try {
          const renewalsList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              currentDueDate: data.currentDueDate?.toDate?.() || new Date(),
              createdAt: data.createdAt?.toDate?.() || new Date(),
              processedAt: data.processedAt?.toDate?.() || null,
            } as RenewalRequest;
          });

          // Sort by createdAt desc
          renewalsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          setRequests(renewalsList);
          setIsLoading(false);
        } catch (error) {
          console.error('Error processing renewal requests:', error);
          setRequests([]);
          setIsLoading(false);
        }
      }, (error) => {
        console.error('Error listening to renewal requests:', error);
        setRequests([]);
        setIsLoading(false);
        toast({
          variant: 'destructive',
          title: '❌ Lỗi',
          description: 'Không thể tải danh sách yêu cầu gia hạn từ cơ sở dữ liệu.',
        });
      });

      return () => unsubscribe();
    } else {
      setIsLoading(false); // Stop loading if no proper access
    }
  }, [user, toast]); // Depend on user state changes

  const handleApprove = async (request: RenewalRequest) => {
    if (!user) return;

    setProcessingId(request.id);
    try {
      // Update renewal request status
      const renewalRef = doc(db, 'renewals', request.id);
      await updateDoc(renewalRef, {
        status: 'approved',
        processedAt: new Date(),
        processedBy: user.id,
      });

      // Update the borrowal due date
      if (request.borrowalId) {
        const borrowalRef = doc(db, 'borrowals', request.borrowalId);
        const newDueDate = new Date(request.currentDueDate);
        newDueDate.setDate(newDueDate.getDate() + (request.requestedDays || 14));
        
        await updateDoc(borrowalRef, {
          dueDate: newDueDate,
        });
      }

      toast({
        title: '✅ Đã chấp nhận',
        description: `Đã gia hạn sách cho ${request.userName}`,
      });

    } catch (error: any) {
      console.error('Error approving renewal:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message || 'Không thể chấp nhận yêu cầu',
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
      const renewalRef = doc(db, 'renewals', selectedRequest.id);
      await updateDoc(renewalRef, {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: user.id,
        rejectionReason: rejectionReason || undefined,
      });

      toast({
        title: '✅ Đã từ chối',
        description: `Đã từ chối yêu cầu gia hạn của ${selectedRequest.userName}`,
      });

      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');

    } catch (error: any) {
      console.error('Error rejecting renewal:', error);
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: error.message || 'Không thể từ chối yêu cầu',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Don't render if user doesn't have proper access
  if (!user || (user.role !== 'admin' && user.role !== 'librarian')) {
    return null;
  }

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

  // Filter requests by search ID
  const filteredRequests = requests.filter((request) => {
    if (!searchId.trim()) return true;
    const search = searchId.trim().toLowerCase();
    return (
      request.id.toLowerCase().includes(search) ||
      request.userId.toLowerCase().includes(search) ||
      request.bookId.toLowerCase().includes(search) ||
      request.userName.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Yêu cầu gia hạn sách ({filteredRequests.length}/{requests.length})
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
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không tìm thấy yêu cầu nào với từ khóa &quot;{searchId}&quot;</p>
            </div>
          ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
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
          )}
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
