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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatISO } from "date-fns";
import { useAuth } from "@/context/auth-context";

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
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user?.role === 'reader' && user?.id) {
        setSelectedUserId(user.id);
    }
  }, [user, isOpen]);

  const handleConfirmBorrow = async () => {
    if (!book || !selectedUserId || !dueDate) {
        toast({ variant: 'destructive', title: '❌ Error', description: 'Please select a reader and a due date.'});
        return;
    }

    try {
      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          userId: selectedUserId,
          dueDate: formatISO(new Date(dueDate)),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to borrow book.");
      }

      toast({
        title: "✅ Borrow successful!",
        description: `"${book.title}" has been borrowed.`,
      });
      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "❌ Borrow failed",
        description: error.message,
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if(user?.role !== 'reader') {
        setSelectedUserId("");
    }
    setDueDate("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Borrow Book: {book?.title}</DialogTitle>
          <DialogDescription>
            Select a reader and a return date to borrow this book.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
         { (user?.role === 'admin' || user?.role === 'librarian') && (
            <div className="space-y-2">
                <Label htmlFor="user">Reader</Label>
                <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                <SelectTrigger id="user">
                    <SelectValue placeholder="Select a reader" />
                </SelectTrigger>
                <SelectContent>
                    {readers.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                        {r.name}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="due-date">Return Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirmBorrow}
            disabled={!selectedUserId || !dueDate}
          >
            Confirm Borrow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
