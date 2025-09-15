
"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode.react";
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
      // Ensure book.id is encoded if it could contain special characters
      const encodedBookId = encodeURIComponent(book.id);
      const url = `${window.location.origin}/books/${encodedBookId}`;
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
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Book QR Code: {book?.title}</DialogTitle>
          <DialogDescription>
            Scan to view details and borrow/return the book.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-[180px] w-[180px] rounded-md" />
              <Skeleton className="h-[160px] w-[160px]" />
            </>
          ) : (
            <>
              {book?.imageUrl ? (
                  <img
                      src={book.imageUrl}
                      alt={`Cover of ${book.title}`}
                      width={180}
                      height={180}
                      className="rounded-md object-cover w-[180px] h-[180px]"
                  />
              ) : (
                <div className="h-[180px] w-[180px] bg-muted rounded-md flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No Image</p>
                </div>
              )}
              {bookUrl && (
                <div className="p-2 bg-white rounded-md">
                  <QRCode
                    value={bookUrl}
                    size={160}
                    bgColor={"#ffffff"}
                    fgColor={"#000000"}
                    level={"L"}
                    includeMargin={true}
                  />
                </div>
              )}
            </>
          )}
           <p className="text-sm text-muted-foreground">Scan to see book details</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
