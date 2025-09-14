"use client";

import { useState, useEffect } from "react";
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (book && isOpen) {
      setIsLoading(true);
      const dataToEncode = `${window.location.origin}/books/${book.id}`;
      // Using a free QR code API
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dataToEncode)}`;
      setQrCodeUrl(url);
    }
  }, [book, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setQrCodeUrl("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>QR Code for: {book?.title}</DialogTitle>
          <DialogDescription>
            Scan this code to quickly access book details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4">
          {isLoading && <Skeleton className="h-[250px] w-[250px]" />}
          {qrCodeUrl && (
            <Image
              src={qrCodeUrl}
              alt={`QR Code for ${book?.title}`}
              width={250}
              height={250}
              onLoad={() => setIsLoading(false)}
              className={isLoading ? "hidden" : "block"}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
