
"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode.react";
import Image from "next/image";
import type { Book } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface QRCodeDialogProps {
  book: Book | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function QRCodeDialog({ book, isOpen, setIsOpen }: QRCodeDialogProps) {
  const [bookUrl, setBookUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (book && isOpen) {
      setIsLoading(true);
      // Store Library ID in QR code for quick scanner access
      const url = book.libraryId || book.id;
      setBookUrl(url);
      // Give a brief moment for the state to update before hiding skeleton
      setTimeout(() => setIsLoading(false), 100); 
    }
  }, [book, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setBookUrl("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mã QR Thư viện</DialogTitle>
          <DialogDescription>
            Quét để tìm kiếm và quản lý sách nhanh chóng
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-[200px] w-[200px]" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              {bookUrl && (
                <div className="p-4 bg-white rounded-lg shadow-sm border-2 border-dashed">
                  <QRCode
                    value={bookUrl}
                    size={200}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>
              )}
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">{book?.title}</p>
                <p className="text-sm text-muted-foreground">{book?.author}</p>
                {book?.libraryId && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Mã thư viện:</span>
                    <code className="px-2 py-1 bg-muted rounded font-mono text-sm font-semibold">
                      {book.libraryId}
                    </code>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  In QR code này và dán lên sách để quét tìm kiếm
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
