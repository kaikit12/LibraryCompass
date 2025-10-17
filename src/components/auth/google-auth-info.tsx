'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

export function GoogleAuthInfo() {
  return (
    <Alert className="max-w-2xl mx-auto">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Thông tin đăng nhập Google</AlertTitle>
      <AlertDescription className="space-y-2 mt-2">
        <p>
          <strong>Popup bị chặn:</strong> Trình duyệt đang chặn popup Google Auth. 
        </p>
        <p>
          <strong>Giải pháp:</strong> Sử dụng phương pháp <em>&ldquo;Chuyển hướng&rdquo;</em> bên dưới.
        </p>
        <p>
          <strong>Cách thức:</strong> Bạn sẽ được chuyển đến trang Google, sau khi đăng nhập sẽ quay lại tự động.
        </p>
      </AlertDescription>
    </Alert>
  );
}