
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Book, Reader } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, Unsubscribe } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCopy, CheckCircle, XCircle, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BorrowDialog } from "@/components/books/borrow-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  const { toast } = useToast();
  const { user: currentUser } = useAuth();


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

    let unsubscribeReaders: Unsubscribe | undefined;

    // Only fetch readers if a user is logged in
    if (currentUser) {
        if (currentUser.role === 'admin' || currentUser.role === 'librarian') {
            unsubscribeReaders = onSnapshot(collection(db, "users"), (snapshot) => {
                const liveReaders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reader));
                setReaders(liveReaders);
            });
        } else {
            // If the user is a reader, they don't need the full list.
            // We just create a list containing only them to pass to the borrow dialog.
            setReaders([currentUser]);
        }
    }


    return () => {
        unsubscribeBook();
        if (unsubscribeReaders) {
            unsubscribeReaders();
        }
    };
  }, [bookId, currentUser]);
  
  const handleBorrowClick = () => {
    if (!currentUser) {
      router.push('/login');
    } else {
      setIsBorrowOpen(true);
    }
  };

  const handleReturnBook = async () => {
    if (!book) return;
    
    // This logic is for librarians/admins, so `readers` will be populated.
    const userWithBook = readers.find(reader => (reader.borrowedBooks ?? []).includes(book.id));
    
    if (!userWithBook) {
      toast({ variant: 'destructive', title: '❌ Trả sách thất bại', description: "Không tìm thấy bạn đọc đang mượn sách này."});
      return;
    }
    
    try {
        const response = await fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookId: book.id, userId: userWithBook.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

      toast({ title: '✅ Trả sách thành công!', description: data.message});
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    toast({ variant: 'destructive', title: '❌ Trả sách thất bại', description: message});
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
            <Skeleton className="h-40 w-full" />
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
      <h1 className="text-2xl font-bold">Không tìm thấy sách</h1>
      <p className="text-muted-foreground">Cuốn sách bạn tìm không tồn tại.</p>
            <Button asChild className="mt-4">
        <Link href="/books"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại Kho sách</Link>
            </Button>
        </div>
    );
  }

  const isBorrowable = book.status === 'Available' && book.available > 0;
  const showReturnButton = currentUser && (currentUser.role === 'admin' || currentUser.role === 'librarian');
  const isReturnable = showReturnButton && book.available < book.quantity;

  return (
    <div className="max-w-2xl mx-auto">
        <div className="mb-6">
            <Button asChild variant="outline" size="sm">
        <Link href="/books">
                    <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại tất cả sách
                </Link>
            </Button>
        </div>

      <Card>
        {book.imageUrl && (
            <div className="relative h-64 w-full">
        <Image
          src={book.imageUrl}
          alt={`Ảnh bìa ${book.title}`}
          fill
          className="object-cover rounded-t-lg"
          sizes="(max-width: 768px) 100vw, 768px"
        />
            </div>
        )}
        <CardHeader className={!book.imageUrl ? '' : 'pt-6'}>
          <CardTitle className="font-headline text-3xl">{book.title}</CardTitle>
          <CardDescription>Tác giả {book.author}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                  <Badge variant="secondary" className="text-lg">{book.genre}</Badge>
                  {book.libraryId && <Badge variant="outline" className="text-md ml-2">ID: {book.libraryId}</Badge>}
                </div>
                <div className="text-right">
                    <div className="font-bold text-lg">{book.available} / {book.quantity}</div>
                    <div className="text-sm text-muted-foreground">Có sẵn</div>
                </div>
            </div>

            {book.description && (
                <p className="text-muted-foreground italic border-l-4 pl-4">{book.description}</p>
            )}

            <div className="flex items-center gap-2">
                { isBorrowable ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" /> }
        <span className={`font-medium ${isBorrowable ? 'text-foreground' : 'text-muted-foreground'}`}>
           Trạng thái: {book.status === 'Available' ? 'Có sẵn' : book.status === 'Borrowed' ? 'Đang mượn' : book.status}
                </span>
            </div>
            
            <div className="pt-4 border-t">
              {showReturnButton ? (
                  <div className="flex gap-4">
            <Button onClick={handleBorrowClick} disabled={!isBorrowable} className="flex-1">
              <BookCopy className="mr-2" /> Mượn
                      </Button>
            <Button onClick={handleReturnBook} disabled={!isReturnable} variant="outline" className="flex-1">
              <Users className="mr-2" /> Trả
                      </Button>
                  </div>
              ) : (
          <Button onClick={handleBorrowClick} disabled={!isBorrowable} className="w-full">
            <BookCopy className="mr-2" /> 
            {currentUser ? 'Mượn cuốn sách này' : 'Đăng nhập để mượn'}
                  </Button>
              )}
            </div>
        </CardContent>
      </Card>

      {/* The BorrowDialog is only mounted if there is a logged-in user, as it requires user context */}
      {currentUser && (
        <BorrowDialog
            book={book}
            readers={readers}
            isOpen={isBorrowOpen}
            setIsOpen={setIsBorrowOpen}
        />
      )}
    </div>
  );
}

