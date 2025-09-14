"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Book, Reader } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCopy, CheckCircle, XCircle, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { BorrowDialog } from "@/components/books/borrow-dialog";
import { useToast } from "@/hooks/use-toast";

// NOTE: In a real app, you'd get this from your auth context
const currentUserRole: Reader['role'] = 'admin';

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.id as string;
  const { toast } = useToast();

  const [book, setBook] = useState<Book | null>(null);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);

  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  
  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    const bookRef = doc(db, "books", bookId);
    const unsubscribeBook = onSnapshot(bookRef, (doc) => {
      if (doc.exists()) {
        setBook({ id: doc.id, ...doc.data() } as Book);
      } else {
        setBook(null);
      }
      setLoading(false);
    });

    const unsubscribeReaders = onSnapshot(collection(db, "readers"), (snapshot) => {
        const liveReaders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));
        setReaders(liveReaders);
    });

    return () => {
        unsubscribeBook();
        unsubscribeReaders();
    };
  }, [bookId]);

  const handleReturnBook = async () => {
    if (!book) return;
    
    const readerWithBook = readers.find(reader => reader.borrowedBooks.includes(book.id));
    
    if (!readerWithBook) {
      toast({ variant: 'destructive', title: '❌ Return failed', description: "Could not find a reader who has this book borrowed."});
      return;
    }
    
    try {
        const response = await fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, readerId: readerWithBook.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        toast({ title: '✅ Return successful!', description: data.message});
    } catch (error: any) {
         toast({ variant: 'destructive', title: '❌ Return failed', description: error.message});
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!book) {
    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold">Book Not Found</h1>
            <p className="text-muted-foreground">The book you are looking for does not exist.</p>
            <Button asChild className="mt-4">
                <Link href="/books"><ArrowLeft className="mr-2 h-4 w-4" />Back to Books</Link>
            </Button>
        </div>
    );
  }

  const isBorrowable = book.status === 'Available' && book.available > 0;
  const isReturnable = book.available < book.quantity;

  return (
    <div className="max-w-2xl mx-auto">
        <div className="mb-6">
            <Button asChild variant="outline" size="sm">
                <Link href="/books">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Books
                </Link>
            </Button>
        </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{book.title}</CardTitle>
          <CardDescription>By {book.author}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
                <Badge variant="secondary" className="text-lg">{book.genre}</Badge>
                <div className="text-right">
                    <div className="font-bold text-lg">{book.available} / {book.quantity}</div>
                    <div className="text-sm text-muted-foreground">Available</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                { isBorrowable ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" /> }
                <span className={`font-medium ${isBorrowable ? 'text-foreground' : 'text-muted-foreground'}`}>
                   Status: {book.status}
                </span>
            </div>
            
            {(currentUserRole === 'admin' || currentUserRole === 'librarian') && (
                <div className="flex gap-4 pt-4 border-t">
                    <Button onClick={() => setIsBorrowOpen(true)} disabled={!isBorrowable} className="flex-1">
                        <BookCopy className="mr-2" /> Borrow
                    </Button>
                    <Button onClick={handleReturnBook} disabled={!isReturnable} variant="outline" className="flex-1">
                        <Users className="mr-2" /> Return
                    </Button>
                </div>
            )}
             {currentUserRole === 'reader' && (
                <div className="pt-4 border-t">
                    <Button onClick={() => setIsBorrowOpen(true)} disabled={!isBorrowable} className="w-full">
                        <BookCopy className="mr-2" /> Borrow This Book
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>

      <BorrowDialog
        book={book}
        readers={readers}
        isOpen={isBorrowOpen}
        setIsOpen={setIsBorrowOpen}
      />
    </div>
  );
}
