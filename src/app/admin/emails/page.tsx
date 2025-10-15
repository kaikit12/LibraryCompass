'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Clock, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';

export default function EmailNotificationsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if not admin/librarian
  if (user?.role !== 'admin' && user?.role !== 'librarian') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Bạn không có quyền truy cập trang này.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sendEmails = async (type: string) => {
    setLoading(type);
    try {
      const response = await fetch(`/api/scheduled/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'librarycompass-cron-secret-2024'}`,
        }
      });

      const result = await response.json();
      
      setResults(prev => ({
        ...prev,
        [type]: result
      }));

      if (response.ok) {
        toast({
          title: "✅ Thành công!",
          description: result.message || `Đã gửi ${result.count || 0} email`,
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "❌ Lỗi",
        description: error.message || "Không thể gửi email",
        variant: "destructive"
      });
      setResults(prev => ({
        ...prev,
        [type]: { error: error.message }
      }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📧 Quản lý Email Thông báo</h1>
        <p className="text-muted-foreground mt-2">
          Gửi email thông báo thủ công cho người dùng
        </p>
      </div>

      {/* Instructions */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Hướng dẫn sử dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>📬 Nhắc nhở trả sách:</strong> Gửi mỗi sáng (8-9h) cho người mượn sắp đến hạn (2 ngày trước)</p>
          <p><strong>⏰ Thông báo quá hạn:</strong> Gửi sau 9h mỗi ngày để thông báo phí phạt cho người quá hạn</p>
          <p><strong>🔔 Sách đặt trước:</strong> Gửi khi có sách được trả về để thông báo người chờ</p>
        </CardContent>
      </Card>

      {/* Email Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Send Reminders */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              Nhắc nhở trả sách
            </CardTitle>
            <CardDescription>
              Email cho người mượn sắp đến hạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              • Gửi 2 ngày trước hạn trả<br/>
              • Nhắc nhở thân thiện<br/>
              • Tránh quá hạn
            </div>
            <Button 
              onClick={() => sendEmails('send-reminders')}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === 'send-reminders' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading === 'send-reminders' ? 'Đang gửi...' : '📬 Gửi ngay'}
            </Button>
            {results['send-reminders'] && (
              <div className="mt-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {results['send-reminders'].count || 0} email đã gửi
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Overdue */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-red-600" />
              Thông báo quá hạn
            </CardTitle>
            <CardDescription>
              Email cho người mượn đã quá hạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              • Thông báo phí phạt<br/>
              • Nhắc trả sách ngay<br/>
              • Tính phí tự động
            </div>
            <Button 
              onClick={() => sendEmails('send-overdue')}
              disabled={loading !== null}
              className="w-full"
              variant="destructive"
            >
              {loading === 'send-overdue' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading === 'send-overdue' ? 'Đang gửi...' : '⏰ Gửi ngay'}
            </Button>
            {results['send-overdue'] && (
              <div className="mt-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-red-600" />
                  <span className="font-medium">
                    {results['send-overdue'].count || 0} email đã gửi
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notify Reservations */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-green-600" />
              Sách đặt trước
            </CardTitle>
            <CardDescription>
              Thông báo sách đã sẵn sàng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              • Sách đã có sẵn<br/>
              • Sẵn sàng nhận sách<br/>
              • Giữ chỗ 24h
            </div>
            <Button 
              onClick={() => sendEmails('notify-reservations')}
              disabled={loading !== null}
              className="w-full"
              variant="secondary"
            >
              {loading === 'notify-reservations' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading === 'notify-reservations' ? 'Đang gửi...' : '🔔 Gửi ngay'}
            </Button>
            {results['notify-reservations'] && (
              <div className="mt-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {results['notify-reservations'].count || 0} email đã gửi
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Khuyến nghị</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">✅ Nên làm:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Gửi nhắc nhở mỗi sáng (8-9h)</li>
                <li>• Gửi quá hạn sau 9h hàng ngày</li>
                <li>• Gửi reservation khi có sách về</li>
                <li>• Kiểm tra kết quả sau khi gửi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">❌ Không nên:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Gửi email quá nhiều lần/ngày</li>
                <li>• Gửi vào nửa đêm (người dùng ngủ)</li>
                <li>• Bỏ qua kiểm tra kết quả</li>
                <li>• Spam người dùng</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              ● ACTIVE
            </Badge>
            Trạng thái hệ thống
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email Service:</span>
            <span className="font-medium text-green-600">✓ Resend API</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Authentication:</span>
            <span className="font-medium text-green-600">✓ Protected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery Method:</span>
            <span className="font-medium">Manual Trigger</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
