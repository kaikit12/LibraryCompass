'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CameraOff, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (data: string) => void;
  mode?: 'isbn' | 'library-id' | 'both'; // Scan mode
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onScanSuccess,
  mode = 'both',
  title = 'Quét mã vạch sách',
  description = 'Hướng camera vào mã vạch ISBN hoặc QR code thư viện',
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'barcode-scanner-region';

  const startScanner = async () => {
    try {
      setError(''); // Clear previous errors
      
      // Check if element exists
      const element = document.getElementById(scannerElementId);
      if (!element) {
        console.error('Scanner element not found');
        return;
      }

      // Request camera permission first
      try {
        // This will prompt for permission if not granted yet
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (permErr: any) {
        throw permErr; // Re-throw to be caught by outer catch
      }
      
      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      const config = {
        fps: 10,
        qrbox: { width: 300, height: 150 },
        aspectRatio: 16 / 9,
      };

      await scannerRef.current.start(
        { facingMode: 'environment' }, // Use back camera
        config,
        (decodedText) => {
          // Successfully scanned
          let result: string | null = null;

          if (mode === 'isbn') {
            result = extractISBN(decodedText);
            if (!result) {
              setError('Mã vạch không phải ISBN hợp lệ. Vui lòng quét mã ISBN 10 hoặc 13 số.');
              return;
            }
          } else if (mode === 'library-id') {
            result = decodedText; // QR code contains library ID directly
            if (!result) {
              setError('Không thể đọc QR code. Vui lòng thử lại.');
              return;
            }
          } else {
            // mode === 'both': Try ISBN first, then use raw data
            result = extractISBN(decodedText) || decodedText;
          }

          if (result) {
            setLastScanned(result);
            onScanSuccess(result);
            stopScanner();
            onOpenChange(false);
          }
        },
        (errorMessage) => {
          // Scanning in progress (no match yet)
          // This fires continuously, so we don't log it
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      // Don't log to console if it's just a permission error
      if (!err.message?.includes('NotAllowedError') && !err.message?.includes('Permission') && err.name !== 'NotAllowedError') {
        console.error('Scanner error:', err);
      }
      
      const isPermissionError = err.message?.includes('NotAllowedError') || 
                                err.message?.includes('Permission') || 
                                err.name === 'NotAllowedError';
      
      setError(
        isPermissionError
          ? 'Bạn đã từ chối quyền truy cập camera. Vui lòng nhấn "Bắt đầu quét" lại và chọn "Cho phép" khi trình duyệt hỏi.'
          : 'Không thể khởi động camera. Vui lòng kiểm tra thiết bị của bạn.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const extractISBN = (text: string): string | null => {
    // Remove all non-digit characters
    const digits = text.replace(/[^0-9]/g, '');

    // Check for ISBN-13 (13 digits)
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      return digits;
    }

    // Check for ISBN-10 (10 digits)
    if (digits.length === 10) {
      return digits;
    }

    // Try to find ISBN pattern in text
    const isbn13Match = text.match(/(?:978|979)[0-9]{10}/);
    if (isbn13Match) {
      return isbn13Match[0];
    }

    const isbn10Match = text.match(/\b[0-9]{9}[0-9X]\b/);
    if (isbn10Match) {
      return isbn10Match[0];
    }

    return null;
  };

  useEffect(() => {
    if (open) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }

    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{error}</p>
                  {error.includes('từ chối') && (
                    <div className="text-sm space-y-1 mt-2 border-t pt-2">
                      <p className="font-medium">💡 Lưu ý:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Nhấn nút &quot;Bắt đầu quét&quot; bên dưới một lần nữa</li>
                        <li>Khi trình duyệt hỏi quyền camera, chọn &quot;Cho phép&quot;</li>
                        <li>Nếu không thấy popup, có thể bạn đã chặn vĩnh viễn</li>
                      </ul>
                      <p className="text-xs mt-2 opacity-80">
                        Nếu vẫn không được, nhấn biểu tượng 🔒 trên thanh địa chỉ → Quyền → Camera → Cho phép
                      </p>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {lastScanned && !error && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Đã quét thành công: <strong>{lastScanned}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Scanner Region */}
          <div className="relative">
            <div
              id={scannerElementId}
              className="rounded-lg overflow-hidden border-2 border-dashed border-blue-300 bg-gray-50"
              style={{ minHeight: '300px' }}
            />

            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-blue-300">
                <div className="text-center space-y-3">
                  <Camera className="h-16 w-16 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Nhấn &quot;Bắt đầu quét&quot; để kích hoạt camera
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {mode === 'isbn' ? (
                  <>
                    <li>Hướng camera vào mã vạch ISBN (thường ở mặt sau sách)</li>
                    <li>Giữ camera ổn định và đảm bảo đủ ánh sáng</li>
                    <li>Mã vạch sẽ được quét tự động khi nhận diện</li>
                    <li>Hỗ trợ cả ISBN-10 (10 số) và ISBN-13 (13 số)</li>
                  </>
                ) : mode === 'library-id' ? (
                  <>
                    <li>Hướng camera vào QR code trên nhãn thư viện</li>
                    <li>QR code chứa mã định danh duy nhất của sách</li>
                    <li>Sử dụng để tìm kiếm và quản lý sách nhanh chóng</li>
                    <li>Đảm bảo QR code không bị nhăn hoặc hư hỏng</li>
                  </>
                ) : (
                  <>
                    <li>Hướng camera vào mã vạch ISBN hoặc QR code thư viện</li>
                    <li>Giữ camera ổn định và đảm bảo đủ ánh sáng</li>
                    <li>Mã sẽ được quét tự động khi nhận diện</li>
                    <li>Hỗ trợ: ISBN-10, ISBN-13, và QR code thư viện</li>
                  </>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Controls */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Bắt đầu quét
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="flex-1">
                <CameraOff className="h-4 w-4 mr-2" />
                Dừng quét
              </Button>
            )}
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
