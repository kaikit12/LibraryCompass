'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface Setup2FADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function Setup2FADialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: Setup2FADialogProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup 2FA');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep('verify');
      toast({
        title: 'Tạo mã QR thành công',
        description: 'Quét mã QR bằng ứng dụng authenticator của bạn',
      });
    } catch (error: any) {
      toast({
        title: 'Thiết lập thất bại',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Mã không hợp lệ',
        description: 'Vui lòng nhập mã xác thực 6 chữ số',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast({
        title: 'Đã bật 2FA',
        description: 'Xác thực hai yếu tố đã được bật thành công',
      });

      onSuccess?.();
      onOpenChange(false);
      
      // Reset state
      setStep('setup');
      setQrCode('');
      setSecret('');
      setVerificationCode('');
    } catch (error: any) {
      toast({
        title: 'Xác thực thất bại',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast({
      title: 'Đã sao chép',
      description: 'Mã bí mật đã được sao chép vào clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Bật xác thực hai yếu tố
          </DialogTitle>
          <DialogDescription>
            Thêm lớp bảo mật bổ sung cho tài khoản của bạn
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Xác thực hai yếu tố (2FA) giúp bảo vệ tài khoản của bạn bằng cách yêu cầu mã
                xác thực từ điện thoại của bạn ngoài mật khẩu.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Bạn sẽ cần:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Ứng dụng authenticator (Google Authenticator, Authy, v.v.)</li>
                <li>Điện thoại của bạn để quét mã QR</li>
              </ul>
            </div>

            <Button
              onClick={handleSetup}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo mã QR'
              )}
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Bước 1: Quét mã QR</h4>
              <p className="text-sm text-muted-foreground">
                Mở ứng dụng authenticator và quét mã QR này:
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                {qrCode && (
                  <Image
                    src={qrCode}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                    className="rounded"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Hoặc nhập mã bí mật này thủ công:</h4>
              <div className="flex gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copySecret}
                  title="Sao chép mã bí mật"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Bước 2: Nhập mã xác thực</h4>
              <Label htmlFor="verification-code">
                Nhập mã 6 chữ số từ ứng dụng authenticator của bạn:
              </Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('setup');
                  setQrCode('');
                  setSecret('');
                  setVerificationCode('');
                }}
                disabled={loading}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={handleVerify}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  'Xác thực & Bật'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
