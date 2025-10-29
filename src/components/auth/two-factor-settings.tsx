'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Setup2FADialog } from './setup-2fa-dialog';

interface TwoFactorSettingsProps {
  userId: string;
  isEnabled: boolean;
  onUpdate: () => void;
}

export function TwoFactorSettings({
  userId,
  isEnabled,
  onUpdate,
}: TwoFactorSettingsProps) {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast({
        title: 'Mã không hợp lệ',
        description: 'Vui lòng nhập mã xác thực 6 chữ số',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/2fa/setup?userId=${userId}&token=${disableCode}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      toast({
        title: 'Đã tắt 2FA',
        description: 'Xác thực hai yếu tố đã được tắt',
      });

      setShowDisableDialog(false);
      setDisableCode('');
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Tắt thất bại',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Xác thực hai yếu tố
              </CardTitle>
              <CardDescription>
                Thêm lớp bảo mật bổ sung cho tài khoản của bạn
              </CardDescription>
            </div>
            {isEnabled ? (
              <Badge variant="default" className="bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Đã bật
              </Badge>
            ) : (
              <Badge variant="secondary">
                <ShieldOff className="h-3 w-3 mr-1" />
                Đã tắt
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {isEnabled ? (
                <>
                  Xác thực hai yếu tố đã được <strong>bật</strong> cho tài khoản của bạn. Bạn
                  sẽ cần nhập mã xác thực từ ứng dụng authenticator khi đăng nhập.
                </>
              ) : (
                <>
                  Xác thực hai yếu tố thêm lớp bảo mật bổ sung bằng cách yêu cầu mã
                  xác thực từ điện thoại của bạn ngoài mật khẩu.
                </>
              )}
            </AlertDescription>
          </Alert>

          {isEnabled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Nếu bạn muốn tắt 2FA, bạn sẽ cần xác thực danh tính bằng mã
                xác thực từ ứng dụng authenticator của bạn.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Tắt 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Lợi ích của 2FA:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Bảo vệ tài khoản của bạn ngay cả khi mật khẩu bị lộ</li>
                  <li>Ngăn chặn truy cập trái phép vào thông tin cá nhân của bạn</li>
                  <li>Hoạt động với các ứng dụng authenticator phổ biến như Google Authenticator</li>
                </ul>
              </div>
              <Button onClick={() => setShowSetupDialog(true)}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Bật 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Setup2FADialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        userId={userId}
        onSuccess={onUpdate}
      />

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tắt xác thực hai yếu tố?</AlertDialogTitle>
            <AlertDialogDescription>
              Điều này sẽ làm cho tài khoản của bạn kém an toàn hơn. Để xác nhận, vui lòng nhập
              mã xác thực từ ứng dụng authenticator của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="disable-code">Mã xác thực</Label>
            <Input
              id="disable-code"
              type="text"
              placeholder="000000"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDisableCode('');
                setShowDisableDialog(false);
              }}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={loading || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tắt...
                </>
              ) : (
                'Tắt 2FA'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
