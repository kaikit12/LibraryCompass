"use client";

import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Barcode from "react-barcode";
import { useRef } from "react";

export function UserIdCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLDivElement>(null);

  if (!user) return null;

  const displayId = user.memberId?.toString() || user.uid;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayId);
    toast({
      title: "✅ Đã sao chép",
      description: "ID của bạn đã được sao chép vào clipboard.",
      duration: 3000,
    });
  };

  const handleDownloadBarcode = () => {
    if (!barcodeRef.current) return;

    const svg = barcodeRef.current.querySelector("svg");
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.download = `barcode-${displayId}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(url);
        toast({
          title: "✅ Đã tải xuống",
          description: "Mã vạch đã được lưu.",
          duration: 3000,
        });
      });
    };

    img.src = url;
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Thẻ Thành Viên</CardTitle>
          </div>
          {/* Only show verification badge for readers */}
          {user.role === 'reader' && (
            <>
              {user.emailVerified !== false && (
                <Badge variant="default" className="gap-1">
                  ✓ Đã xác thực
                </Badge>
              )}
              {user.emailVerified === false && (
                <Badge variant="destructive" className="gap-1">
                  ✗ Chưa xác thực
                </Badge>
              )}
            </>
          )}
        </div>
        <CardDescription>
          Mã thành viên của bạn - Xuất trình khi mượn sách
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Họ tên:</span>
            <span className="font-semibold">{user.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Email:</span>
            <span className="font-medium text-sm">{user.email}</span>
          </div>
        </div>

        {/* User ID */}
        <div className="bg-white dark:bg-gray-950 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">ID Thành Viên:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-8 gap-2"
            >
              <Copy className="h-3 w-3" />
              Sao chép
            </Button>
          </div>
          <p className="font-mono text-4xl font-bold text-center text-primary py-4">
            {displayId}
          </p>
          {user.memberId && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Mã số thành viên: {user.memberId.toString().padStart(6, '0')}
            </p>
          )}
        </div>

        {/* Barcode */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Mã vạch:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadBarcode}
              className="h-8 gap-2 text-gray-700 hover:bg-gray-100"
            >
              <Download className="h-3 w-3" />
              Tải xuống
            </Button>
          </div>
          <div ref={barcodeRef} className="flex justify-center bg-white">
            <Barcode 
              value={displayId} 
              width={2}
              height={80}
              displayValue={true}
              background="#ffffff"
              lineColor="#000000"
              fontSize={16}
            />
          </div>
          <p className="text-xs text-center text-gray-600 mt-2">
            Quét mã này khi mượn/trả sách tại thư viện
          </p>
        </div>

        {/* Warning for unverified email (only for readers) */}
        {user.role === 'reader' && user.emailVerified === false && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Lưu ý:</strong> Bạn cần xác thực email trước khi có thể mượn sách.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
