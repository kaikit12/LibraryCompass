"use client";
import { useState, useEffect } from "react";
import { Book, Reader } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatISO, format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "@/context/auth-context";
import { Search, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BorrowDialogProps {
  book: Book | null;
  readers: Reader[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function BorrowDialog({
  book,
  readers,
  isOpen,
  setIsOpen,
}: BorrowDialogProps) {
  const { user } = useAuth();
  const [memberId, setMemberId] = useState<string>("");
  const [selectedReader, setSelectedReader] = useState<Reader | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    // If the dialog is open and the current user is a reader, pre-fill their info
    if (isOpen && user?.role === 'reader' && user?.id) {
      setMemberId(user.memberId?.toString() || "");
      setSelectedReader(user as Reader);
    }
  }, [user, isOpen]);

  // Auto-fill user info when memberId changes
  useEffect(() => {
    if (!memberId) {
      setSelectedReader(null);
      return;
    }

    // Find reader by memberId
    const reader = readers.find(r => r.memberId?.toString() === memberId);
    if (reader) {
      setSelectedReader(reader);
    } else {
      setSelectedReader(null);
    }
  }, [memberId, readers]);

  const handleConfirmBorrow = async () => {
    if (!book || !selectedReader || !dueDate) {
      toast({ variant: 'destructive', title: '❌ Lỗi', description: 'Vui lòng nhập ID bạn đọc và ngày trả.'});
      return;
    }

    // dueDate is already a Date object from Calendar, no need to validate again
    // Calendar component already enforces min/max dates

    try {
      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          userId: selectedReader.id,
          dueDate: formatISO(dueDate),
          borrowerRole: user?.role, // Pass user's role for authorization check
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Mượn sách thất bại.");
      }

      toast({
        title: "✅ Mượn sách thành công!",
        description: `${book.title} đã được mượn.`,
      });
      handleClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Mượn sách thất bại.';
      toast({
        variant: "destructive",
        title: "❌ Mượn sách thất bại",
        description: message,
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Only reset if not a reader
    if (user?.role !== 'reader') {
      setMemberId("");
      setSelectedReader(null);
    }
    setDueDate(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mượn sách: {book?.title}</DialogTitle>
          <DialogDescription>
            Nhập ID bạn đọc và ngày trả để mượn cuốn sách này.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Member ID Input (for admin/librarian only) */}
          {(user?.role === 'admin' || user?.role === 'librarian') && (
            <div className="space-y-2">
              <Label htmlFor="member-id">ID Thành Viên</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="member-id"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập hoặc quét ID..."
                  value={memberId}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setMemberId(value);
                  }}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
              {memberId && !selectedReader && (
                <p className="text-sm text-destructive">Không tìm thấy bạn đọc với ID này</p>
              )}
            </div>
          )}

          {/* Auto-filled Reader Info (Read-only) */}
          {selectedReader && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reader-name">Tên bạn đọc</Label>
                <Input
                  id="reader-name"
                  value={selectedReader.name}
                  readOnly
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reader-email">Email</Label>
                <Input
                  id="reader-email"
                  value={selectedReader.email}
                  readOnly
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reader-phone">Số điện thoại</Label>
                <Input
                  id="reader-phone"
                  value={selectedReader.phone || "Chưa có"}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date">Ngày trả</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? (
                    format(dueDate, "dd/MM/yyyy (EEEE)", { locale: vi })
                  ) : (
                    <span>Chọn ngày trả sách</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => {
                    const tomorrow = addDays(new Date(), 1);
                    const maxDate = addDays(new Date(), 90);
                    return date < tomorrow || date > maxDate;
                  }}
                  initialFocus
                  locale={vi}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Chọn từ ngày mai đến tối đa 90 ngày
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Hủy
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirmBorrow}
            disabled={!selectedReader || !dueDate}
          >
            Xác nhận mượn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
